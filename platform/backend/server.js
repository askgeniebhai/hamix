#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.HAMIX_PORT || 8787);
const DB_PATH = path.resolve(process.env.HAMIX_DB_PATH || path.join(__dirname, 'data', 'hamix.sqlite'));
const SESSION_SECRET = process.env.HAMIX_SESSION_SECRET || 'development-secret-change-me';
const COOKIE_SECURE = String(process.env.HAMIX_COOKIE_SECURE || 'false') === 'true';
const SESSION_DAYS = 7;
const loginAttempts = new Map();

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
execFileSync('sqlite3', [DB_PATH], { input: fs.readFileSync(path.join(__dirname, 'schema.sql')) });
for (const statement of [
  'ALTER TABLE leads ADD COLUMN normalized_mobile TEXT',
  'ALTER TABLE leads ADD COLUMN normalized_email TEXT',
  'ALTER TABLE leads ADD COLUMN source_key TEXT',
  'ALTER TABLE leads ADD COLUMN business_identity TEXT',
  'ALTER TABLE leads ADD COLUMN pipeline_stage TEXT'
]) {
  try { execFileSync('sqlite3', [DB_PATH, statement], { stdio: 'ignore' }); } catch {}
}

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};
const safeError = (res, status, message) => json(res, status, { error: message });
const sqlString = (value) => value === null || value === undefined ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;
const db = (sql) => execFileSync('sqlite3', ['-json', DB_PATH, sql], { encoding: 'utf8' }).trim();
const run = (sql) => execFileSync('sqlite3', [DB_PATH, sql]);
const all = (sql) => { const out = db(sql); return out ? JSON.parse(out) : []; };
const one = (sql) => all(sql)[0] || null;
const parseCookies = (req) => Object.fromEntries(String(req.headers.cookie || '').split(';').filter(Boolean).map(v => {
  const index = v.indexOf('=');
  return [decodeURIComponent(v.slice(0, index).trim()), decodeURIComponent(v.slice(index + 1).trim())];
}));
const setSessionCookie = (res, token, maxAge) => {
  const parts = [`hamix_session=${encodeURIComponent(token)}`, 'HttpOnly', 'Path=/', 'SameSite=Lax', `Max-Age=${maxAge}`];
  if (COOKIE_SECURE) parts.push('Secure');
  res.setHeader('set-cookie', parts.join('; '));
};
const readBody = async (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 1_000_000) reject(new Error('Request body too large'));
  });
  req.on('end', () => resolve(body ? JSON.parse(body) : {}));
  req.on('error', reject);
});
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const hashToken = (token) => crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
const publicUser = (row) => ({ id: row.user_id || row.id, email: row.email, name: row.name, role: row.role, tenantId: row.workspace_id, tenantName: row.workspace_name });
const audit = (session, action, entityType, entityId, metadata = {}) => {
  const workspaceId = session?.workspace_id || metadata.workspaceId;
  if (!workspaceId) return;
  run(`INSERT INTO audit_logs (id, workspace_id, user_id, action, entity_type, entity_id, metadata, created_at) VALUES (${sqlString(id('audit'))}, ${sqlString(workspaceId)}, ${sqlString(session?.user_id || null)}, ${sqlString(action)}, ${sqlString(entityType)}, ${sqlString(entityId || null)}, ${sqlString(JSON.stringify(metadata))}, ${sqlString(now())})`);
};
const getSession = (req) => {
  const token = parseCookies(req).hamix_session;
  if (!token) return null;
  return one(`SELECT sessions.*, users.email, users.name, workspace_memberships.role, workspaces.name AS workspace_name FROM sessions JOIN users ON users.id = sessions.user_id JOIN workspaces ON workspaces.id = sessions.workspace_id JOIN workspace_memberships ON workspace_memberships.user_id = users.id AND workspace_memberships.workspace_id = workspaces.id WHERE sessions.token_hash=${sqlString(hashToken(token))} AND sessions.revoked_at IS NULL AND sessions.expires_at > ${sqlString(now())}`);
};
const requireSession = (req, res) => {
  const session = getSession(req);
  if (!session) safeError(res, 401, 'Authentication required.');
  return session;
};
const PIPELINE_STAGES = ['New Lead', 'Contact Attempted', 'Interested', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
const normalizeEmail = (email) => String(email || '').trim().toLowerCase() || null;
const normalizeMobile = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
};
const classifyPhone = (lead) => {
  const raw = lead.whatsapp || lead.phone || '';
  const normalizedMobile = normalizeMobile(raw);
  return {
    phoneExtracted: Boolean(String(raw).trim()),
    normalizedMobile,
    mobileDetected: Boolean(normalizedMobile),
    whatsappEligibility: Boolean(normalizedMobile),
    whatsappVerified: false,
    consentStatus: lead.consentStatus || 'unknown',
    phoneType: normalizedMobile ? 'mobile' : (raw ? 'landline_or_unknown' : 'missing')
  };
};
const businessIdentity = (lead) => {
  const name = String(lead.businessName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const address = String(lead.address || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return name && address ? `${name}|${address}` : null;
};
const qualifyLead = (lead) => {
  const phone = classifyPhone(lead);
  const hasWebsite = Boolean(lead.website && !['http://', 'https://'].includes(lead.website));
  const rating = Number(lead.rating || 0);
  const reviews = Number(lead.reviews || 0);
  const leadScore = Math.min(100, (phone.mobileDetected ? 35 : 0) + (hasWebsite ? 15 : 0) + Math.min(20, rating * 4) + Math.min(20, Math.floor(reviews / 10)) + (lead.email ? 10 : 0));
  const priority = leadScore >= 75 ? 'High' : leadScore >= 45 ? 'Medium' : 'Low';
  return {
    ...lead,
    ...phone,
    websiteStatus: hasWebsite ? 'Website found' : 'No website found',
    digitalPresence: hasWebsite ? 'Established web presence' : 'Limited web presence',
    seoScore: hasWebsite ? 50 : 20,
    businessPotential: priority,
    leadScore,
    score: leadScore,
    priority,
    opportunityValue: priority === 'High' ? 'High' : priority === 'Medium' ? 'Moderate' : 'Early-stage',
    qualificationExplanation: `Estimated score based on ${phone.mobileDetected ? 'mobile availability' : 'missing mobile'}, ${hasWebsite ? 'website presence' : 'website gap'}, rating, reviews, and contact completeness.`,
    lastQualificationAt: now(),
    aiScoreLabel: 'Estimated recommendation'
  };
};
const validateLead = (lead, { outreachReady = false } = {}) => {
  if (!lead || !String(lead.businessName || '').trim()) throw new Error('Business name is required.');
  const phone = classifyPhone(lead);
  if (outreachReady && !phone.mobileDetected) throw new Error(phone.phoneExtracted ? 'Skipped: landline or non-mobile number is not WhatsApp eligible.' : 'Skipped: no phone number found.');
  const normalizedEmail = normalizeEmail(lead.email);
  return {
    ...lead,
    ...phone,
    businessName: String(lead.businessName).trim(),
    email: normalizedEmail || lead.email || '',
    normalizedEmail,
    normalizedMobile: phone.normalizedMobile,
    sourceKey: lead.sourceKey || lead.mapsUrl || lead.sourceUrl || null,
    businessIdentity: businessIdentity(lead),
    status: lead.status || 'New',
    pipelineStage: lead.pipelineStage || 'New Lead'
  };
};
const findDuplicateLead = (workspaceId, lead) => {
  if (lead.normalizedMobile) { const row = one(`SELECT data FROM leads WHERE workspace_id=${sqlString(workspaceId)} AND normalized_mobile=${sqlString(lead.normalizedMobile)}`); if (row) return JSON.parse(row.data); }
  if (lead.normalizedEmail) { const row = one(`SELECT data FROM leads WHERE workspace_id=${sqlString(workspaceId)} AND normalized_email=${sqlString(lead.normalizedEmail)}`); if (row) return JSON.parse(row.data); }
  if (lead.sourceKey) { const row = one(`SELECT data FROM leads WHERE workspace_id=${sqlString(workspaceId)} AND source_key=${sqlString(lead.sourceKey)}`); if (row) return JSON.parse(row.data); }
  if (lead.businessIdentity) { const row = one(`SELECT data FROM leads WHERE workspace_id=${sqlString(workspaceId)} AND business_identity=${sqlString(lead.businessIdentity)}`); if (row) return JSON.parse(row.data); }
  return null;
};
const saveEntity = (table, workspaceId, payload) => {
  const entity = table === 'leads' ? validateLead(payload) : payload;
  const entityId = entity.id || id(table.slice(0, -1));
  const timestamp = now();
  const exists = one(`SELECT id FROM ${table} WHERE id=${sqlString(entityId)} AND workspace_id=${sqlString(workspaceId)}`);
  const data = JSON.stringify({ ...entity, id: entityId });
  if (exists && table === 'leads') run(`UPDATE leads SET data=${sqlString(data)}, status=${sqlString(entity.status || 'New')}, pipeline_stage=${sqlString(entity.pipelineStage || 'New Lead')}, normalized_mobile=${sqlString(entity.normalizedMobile)}, normalized_email=${sqlString(entity.normalizedEmail)}, source_key=${sqlString(entity.sourceKey)}, business_identity=${sqlString(entity.businessIdentity)}, updated_at=${sqlString(timestamp)} WHERE id=${sqlString(entityId)} AND workspace_id=${sqlString(workspaceId)}`);
  else if (exists) run(`UPDATE ${table} SET data=${sqlString(data)}, updated_at=${sqlString(timestamp)} WHERE id=${sqlString(entityId)} AND workspace_id=${sqlString(workspaceId)}`);
  else if (table === 'leads') run(`INSERT INTO leads (id, workspace_id, data, status, pipeline_stage, normalized_mobile, normalized_email, source_key, business_identity, created_at, updated_at) VALUES (${sqlString(entityId)}, ${sqlString(workspaceId)}, ${sqlString(data)}, ${sqlString(entity.status || 'New')}, ${sqlString(entity.pipelineStage || 'New Lead')}, ${sqlString(entity.normalizedMobile)}, ${sqlString(entity.normalizedEmail)}, ${sqlString(entity.sourceKey)}, ${sqlString(entity.businessIdentity)}, ${sqlString(timestamp)}, ${sqlString(timestamp)})`);
  else run(`INSERT INTO ${table} (id, workspace_id, data, created_at, updated_at) VALUES (${sqlString(entityId)}, ${sqlString(workspaceId)}, ${sqlString(data)}, ${sqlString(timestamp)}, ${sqlString(timestamp)})`);
  return { ...entity, id: entityId };
};
const listEntities = (table, workspaceId) => all(`SELECT data FROM ${table} WHERE workspace_id=${sqlString(workspaceId)} ORDER BY created_at DESC`).map(row => JSON.parse(row.data));


const DIAGNOSTIC_STATUSES = ['Draft', 'Reviewed', 'Approved', 'Archived'];
const buildBusinessDiagnostic = (body, source = {}) => {
  const hasWebsite = Boolean(source.website);
  const hasMobile = Boolean(source.normalizedMobile || source.mobileDetected || source.phone);
  const reviews = Number(source.reviews || 0);
  const rating = Number(source.rating || 0);
  const opportunityScore = Math.min(100, (hasMobile ? 25 : 0) + (hasWebsite ? 15 : 25) + Math.min(20, rating * 4) + Math.min(20, Math.floor(reviews / 10)) + (source.leadScore ? Math.floor(Number(source.leadScore) / 5) : 10));
  return {
    title: body.title || `Business Diagnostic for ${source.businessName || 'HAMIX Prospect'}`,
    status: 'Draft',
    verifiedInformation: {
      businessName: source.businessName || null,
      contact: source.normalizedMobile || source.phone || source.email || null,
      category: source.category || source.industry || null,
      website: source.website || null,
      rating: source.rating || null,
      reviews: source.reviews || null
    },
    inferredFindings: {
      digitalPresence: hasWebsite ? 'Has web presence' : 'Website gap identified',
      outreachReadiness: hasMobile ? 'Mobile outreach possible; WhatsApp not verified' : 'Mobile outreach not ready',
      marketSignal: reviews > 100 ? 'Strong review footprint' : 'Limited public review footprint'
    },
    recommendations: [
      hasWebsite ? 'Review current website conversion path' : 'Create a conversion-focused landing page',
      'Use HAMIX CRM stages to track lead-to-customer progression',
      'Review proposal scope and pricing before sending to customer'
    ],
    estimates: {
      opportunityScore,
      confidenceScore: Math.min(100, (source.businessName ? 25 : 0) + (source.category ? 25 : 0) + (source.phone || source.email ? 25 : 0) + (source.address ? 25 : 0)),
      suggestedBudgetBand: opportunityScore >= 75 ? 'Premium' : opportunityScore >= 45 ? 'Standard' : 'Starter'
    },
    unavailableData: [
      ...(source.whatsappVerified ? [] : ['WhatsApp verification unavailable']),
      ...(source.website ? [] : ['Existing website unavailable']),
      'Customer-approved budget unavailable',
      'Decision-maker confirmation unavailable'
    ],
    proposalDraftGuidance: {
      suggestedScope: hasWebsite ? 'Website optimization, CRM setup, and growth automation' : 'Website generation, CRM setup, and growth automation',
      suggestedDeliverables: ['Business analysis summary', 'Proposal-ready scope', 'Onboarding checklist'],
      pricingGuidance: 'Estimate only; user must review and approve commercial totals.'
    },
    aiLabel: 'Deterministic HAMIX diagnostic estimate - user review required',
    inputs: {
      goals: body.goals || [],
      constraints: body.constraints || [],
      sourceType: body.leadId ? 'lead' : body.customerId ? 'customer' : 'manual'
    },
    notes: body.notes || '',
    approvedAt: null,
    approvedBy: null
  };
};
const diagnosticRowToJson = (row) => row ? { ...JSON.parse(row.data), id: row.id, leadId: row.lead_id, customerId: row.customer_id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at } : null;

const PROPOSAL_STATUSES = ['Draft', 'Under Review', 'Sent', 'Revision Requested', 'Accepted', 'Rejected', 'Expired', 'Cancelled'];
const PROPOSAL_TRANSITIONS = {
  Draft: ['Under Review', 'Sent', 'Cancelled'],
  'Under Review': ['Draft', 'Sent', 'Cancelled'],
  Sent: ['Revision Requested', 'Accepted', 'Rejected', 'Expired'],
  'Revision Requested': ['Draft', 'Under Review', 'Sent', 'Cancelled'],
  Accepted: [],
  Rejected: ['Draft'],
  Expired: ['Draft'],
  Cancelled: []
};
const nextProposalNumber = (workspaceId) => {
  const year = new Date().getUTCFullYear();
  const prefix = `HAMIX-${year}-`;
  const row = one(`SELECT proposal_number FROM proposals WHERE workspace_id=${sqlString(workspaceId)} AND proposal_number LIKE ${sqlString(prefix + '%')} ORDER BY proposal_number DESC LIMIT 1`);
  const next = row ? Number(row.proposal_number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
};
const calculateProposalTotals = (items = []) => {
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  const lineItems = items.map((item) => {
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? 0);
    const itemTax = Number(item.tax ?? 0);
    const itemDiscount = Number(item.discount ?? 0);
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Line-item quantity cannot be negative or invalid.');
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Line-item unit price cannot be negative or invalid.');
    if (!Number.isFinite(itemTax) || itemTax < 0 || !Number.isFinite(itemDiscount) || itemDiscount < 0) throw new Error('Line-item tax/discount cannot be negative or invalid.');
    const lineSubtotal = quantity * unitPrice;
    const lineTotal = Math.max(0, lineSubtotal + itemTax - itemDiscount);
    subtotal += lineSubtotal;
    tax += itemTax;
    discount += itemDiscount;
    return { description: item.description || 'HAMIX service', quantity, unitPrice, tax: itemTax, discount: itemDiscount, lineTotal };
  });
  return { lineItems, subtotal, tax, discount, total: Math.max(0, subtotal + tax - discount) };
};
const buildProposalData = (body, source = {}) => {
  const totals = calculateProposalTotals(body.lineItems || [{ description: 'HAMIX Business Growth Platform setup', quantity: 1, unitPrice: 25000, tax: 0, discount: 0 }]);
  return {
    title: body.title || `HAMIX Proposal for ${source.businessName || 'Prospect'}`,
    scope: body.scope || 'AI-assisted business growth setup, CRM onboarding, lead workflow configuration, and website-generation readiness.',
    deliverables: body.deliverables || ['Lead workflow setup', 'Business analysis summary', 'Website-generation readiness', 'Customer onboarding workspace'],
    exclusions: body.exclusions || ['Paid ad spend', 'Third-party subscription fees', 'Customer-supplied credentials'],
    timeline: body.timeline || '2-4 weeks after onboarding discovery completion.',
    paymentTerms: body.paymentTerms || '50% advance and 50% before final handover.',
    inputs: {
      goals: body.goals || [],
      constraints: body.constraints || [],
      sourceType: body.leadId ? 'lead' : body.customerId ? 'customer' : 'manual'
    },
    notes: body.notes || '',
    approvedAt: null,
    approvedBy: null,
    validityDate: body.validityDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    currency: body.currency || 'INR',
    aiSuggestionLabel: 'Suggested draft - user review required before sending.',
    businessAnalysis: body.businessAnalysis || {
      verified: { businessName: source.businessName || null, contact: source.normalizedMobile || source.phone || source.email || null },
      inferred: { opportunityValue: source.opportunityValue || null, priority: source.priority || null },
      recommendation: source.qualificationExplanation || 'Review lead qualification before final commercial terms.',
      estimate: { leadScore: source.leadScore || source.score || null },
      unavailable: []
    },
    lineItems: totals.lineItems,
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total
  };
};
const getOwnedLead = (workspaceId, leadId) => leadId ? one(`SELECT data FROM leads WHERE id=${sqlString(leadId)} AND workspace_id=${sqlString(workspaceId)}`) : null;
const getOwnedCustomer = (workspaceId, customerId) => customerId ? one(`SELECT data FROM customers WHERE id=${sqlString(customerId)} AND workspace_id=${sqlString(workspaceId)}`) : null;
const saveProposalVersion = (session, proposalId, version, data) => {
  run(`INSERT INTO proposal_versions VALUES (${sqlString(id('proposal_version'))}, ${sqlString(session.workspace_id)}, ${sqlString(proposalId)}, ${version}, ${sqlString(JSON.stringify(data))}, ${sqlString(session.user_id)}, ${sqlString(now())})`);
};
const proposalRowToJson = (row) => row ? { ...JSON.parse(row.data), id: row.id, proposalNumber: row.proposal_number, status: row.status, version: row.version, leadId: row.lead_id, customerId: row.customer_id, subtotal: row.subtotal, tax: row.tax, discount: row.discount, total: row.total, createdAt: row.created_at, updatedAt: row.updated_at, sentAt: row.sent_at, acceptedAt: row.accepted_at, rejectedAt: row.rejected_at } : null;
const getOwnedProposal = (workspaceId, proposalId) => one(`SELECT * FROM proposals WHERE id=${sqlString(proposalId)} AND workspace_id=${sqlString(workspaceId)}`);
const upsertProjectForProposal = (session, proposal) => {
  let customerId = proposal.customer_id;
  const data = JSON.parse(proposal.data);
  if (!customerId && proposal.lead_id) {
    const converted = convertLeadToCustomer(session, proposal.lead_id, { proposalId: proposal.id });
    customerId = converted.id;
  }
  if (!customerId) throw new Error('Accepted proposal requires a customer or convertible lead.');
  const existing = one(`SELECT * FROM projects WHERE workspace_id=${sqlString(session.workspace_id)} AND customer_id=${sqlString(customerId)}`);
  const projectData = existing ? JSON.parse(existing.data) : { id: id('project'), customerId, sourceLeadId: proposal.lead_id, status: 'Onboarding', discoveryStatus: 'Pending', createdAt: now() };
  projectData.acceptedProposalId = proposal.id;
  projectData.projectName = data.title;
  projectData.scopeSummary = data.scope;
  projectData.expectedStartDate = data.expectedStartDate || null;
  projectData.expectedCompletionDate = data.expectedCompletionDate || null;
  projectData.updatedAt = now();
  if (existing) run(`UPDATE projects SET data=${sqlString(JSON.stringify(projectData))}, updated_at=${sqlString(now())} WHERE id=${sqlString(existing.id)} AND workspace_id=${sqlString(session.workspace_id)}`);
  else run(`INSERT INTO projects (id, workspace_id, customer_id, source_lead_id, data, created_at, updated_at) VALUES (${sqlString(projectData.id)}, ${sqlString(session.workspace_id)}, ${sqlString(customerId)}, ${sqlString(proposal.lead_id)}, ${sqlString(JSON.stringify(projectData))}, ${sqlString(now())}, ${sqlString(now())})`);
  return projectData;
};
const convertLeadToCustomer = (session, leadId, extra = {}) => {
  const lead = one(`SELECT * FROM leads WHERE id=${sqlString(leadId)} AND workspace_id=${sqlString(session.workspace_id)}`);
  if (!lead) throw new Error('Lead not found.');
  const existing = one(`SELECT data FROM customers WHERE workspace_id=${sqlString(session.workspace_id)} AND source_lead_id=${sqlString(leadId)}`);
  if (existing) return JSON.parse(existing.data);
  const leadData = JSON.parse(lead.data);
  leadData.pipelineStage = 'Won';
  leadData.status = 'Customer';
  saveEntity('leads', session.workspace_id, leadData);
  const customer = { ...leadData, id: id('customer'), sourceLeadId: leadId, acceptedProposalId: extra.proposalId || null, joinedAt: now() };
  run(`INSERT INTO customers (id, workspace_id, source_lead_id, data, created_at, updated_at) VALUES (${sqlString(customer.id)}, ${sqlString(session.workspace_id)}, ${sqlString(leadId)}, ${sqlString(JSON.stringify(customer))}, ${sqlString(now())}, ${sqlString(now())})`);
  audit(session, 'customer_conversion_triggered', 'customer', customer.id, { sourceLeadId: leadId, proposalId: extra.proposalId || null });
  return customer;
};

const serveStatic = (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filePath = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return safeError(res, 404, 'Not found.');
  const ext = path.extname(filePath);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res);
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true });

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      if (!email || !body.password || String(body.password).length < 8 || !body.name) return safeError(res, 400, 'Name, email, and 8+ character password are required.');
      if (one(`SELECT id FROM users WHERE email=${sqlString(email)}`)) return safeError(res, 409, 'Account already exists.');
      const userId = id('user');
      const workspaceId = id('workspace');
      const salt = crypto.randomBytes(16).toString('hex');
      run(`INSERT INTO users VALUES (${sqlString(userId)}, ${sqlString(email)}, ${sqlString(body.name)}, ${sqlString(hashPassword(body.password, salt))}, ${sqlString(salt)}, ${sqlString(now())})`);
      run(`INSERT INTO workspaces VALUES (${sqlString(workspaceId)}, ${sqlString(body.tenantName || `${body.name}'s Workspace`)}, ${sqlString(now())})`);
      run(`INSERT INTO workspace_memberships VALUES (${sqlString(userId)}, ${sqlString(workspaceId)}, 'Owner', ${sqlString(now())})`);
      const token = crypto.randomBytes(32).toString('base64url');
      run(`INSERT INTO sessions VALUES (${sqlString(id('session'))}, ${sqlString(userId)}, ${sqlString(workspaceId)}, ${sqlString(hashToken(token))}, datetime('now', '+${SESSION_DAYS} days'), NULL, ${sqlString(now())})`);
      setSessionCookie(res, token, SESSION_DAYS * 86400);
      const session = getSession({ headers: { cookie: `hamix_session=${token}` } });
      audit(session, 'registration', 'user', userId, { workspaceId });
      return json(res, 201, { user: publicUser(session) });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const attempt = loginAttempts.get(email) || { count: 0, until: 0 };
      if (attempt.until > Date.now()) return safeError(res, 429, 'Too many login attempts. Try again later.');
      const user = one(`SELECT * FROM users WHERE email=${sqlString(email)}`);
      if (!user || hashPassword(body.password || '', user.password_salt) !== user.password_hash) {
        attempt.count += 1; if (attempt.count >= 5) attempt.until = Date.now() + 60_000; loginAttempts.set(email, attempt);
        return safeError(res, 401, 'Invalid email or password.');
      }
      loginAttempts.delete(email);
      const membership = one(`SELECT workspace_id FROM workspace_memberships WHERE user_id=${sqlString(user.id)} LIMIT 1`);
      const token = crypto.randomBytes(32).toString('base64url');
      run(`INSERT INTO sessions VALUES (${sqlString(id('session'))}, ${sqlString(user.id)}, ${sqlString(membership.workspace_id)}, ${sqlString(hashToken(token))}, datetime('now', '+${SESSION_DAYS} days'), NULL, ${sqlString(now())})`);
      setSessionCookie(res, token, SESSION_DAYS * 86400);
      const session = getSession({ headers: { cookie: `hamix_session=${token}` } });
      audit(session, 'login', 'user', user.id);
      return json(res, 200, { user: publicUser(session) });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = parseCookies(req).hamix_session;
      const session = getSession(req);
      if (token) run(`UPDATE sessions SET revoked_at=${sqlString(now())} WHERE token_hash=${sqlString(hashToken(token))}`);
      if (session) audit(session, 'logout', 'user', session.user_id);
      setSessionCookie(res, '', 0);
      return json(res, 200, { ok: true });
    }

    const session = requireSession(req, res);
    if (!session) return;
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { user: publicUser(session) });


    if (req.method === 'POST' && url.pathname === '/api/leads/import') {
      const body = await readBody(req);
      const result = { total: 0, imported: 0, skipped: 0, failed: 0, duplicates: 0, details: [] };
      for (const raw of body.leads || []) {
        result.total++;
        try {
          const lead = validateLead(raw, { outreachReady: true });
          const duplicate = findDuplicateLead(session.workspace_id, lead);
          if (duplicate) {
            result.duplicates++;
            result.skipped++;
            result.details.push({ businessName: lead.businessName, status: 'skipped', reason: 'Duplicate lead in this workspace.', duplicateId: duplicate.id });
            continue;
          }
          const saved = saveEntity('leads', session.workspace_id, qualifyLead(lead));
          result.imported++;
          result.details.push({ businessName: saved.businessName, id: saved.id, status: 'imported' });
        } catch (error) {
          const skipped = String(error.message || '').startsWith('Skipped:');
          if (skipped) result.skipped++;
          else result.failed++;
          result.details.push({ businessName: raw.businessName || 'Unknown', status: skipped ? 'skipped' : 'failed', reason: error.message });
        }
      }
      audit(session, 'lead_import', 'lead', null, result);
      return json(res, 200, result);
    }

    const qualifyMatch = url.pathname.match(/^\/api\/leads\/([^/]+)\/qualify$/);
    if (qualifyMatch && req.method === 'POST') {
      const row = one(`SELECT data FROM leads WHERE id=${sqlString(qualifyMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!row) return safeError(res, 404, 'Lead not found.');
      const qualified = qualifyLead(JSON.parse(row.data));
      const saved = saveEntity('leads', session.workspace_id, qualified);
      audit(session, 'lead_qualified', 'lead', saved.id, { leadScore: saved.leadScore, priority: saved.priority });
      return json(res, 200, saved);
    }

    const stageMatch = url.pathname.match(/^\/api\/leads\/([^/]+)\/stage$/);
    if (stageMatch && req.method === 'POST') {
      const body = await readBody(req);
      if (!PIPELINE_STAGES.includes(body.stage)) return safeError(res, 400, 'Invalid pipeline stage.');
      const row = one(`SELECT data, pipeline_stage FROM leads WHERE id=${sqlString(stageMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!row) return safeError(res, 404, 'Lead not found.');
      const previous = row.pipeline_stage || JSON.parse(row.data).pipelineStage || 'New Lead';
      const currentIndex = PIPELINE_STAGES.indexOf(previous);
      const nextIndex = PIPELINE_STAGES.indexOf(body.stage);
      if (previous === 'Won' || previous === 'Lost') return safeError(res, 400, 'Closed leads cannot change pipeline stage.');
      if (nextIndex < currentIndex && !['Lost'].includes(body.stage)) return safeError(res, 400, 'Pipeline stage cannot move backward except to Lost.');
      const lead = { ...JSON.parse(row.data), pipelineStage: body.stage, status: body.stage === 'Won' ? 'Customer' : body.stage, updatedAt: now() };
      const saved = saveEntity('leads', session.workspace_id, lead);
      run(`INSERT INTO pipeline_events VALUES (${sqlString(id('pipe'))}, ${sqlString(session.workspace_id)}, ${sqlString(saved.id)}, ${sqlString(session.user_id)}, ${sqlString(previous)}, ${sqlString(body.stage)}, ${sqlString(now())})`);
      audit(session, 'pipeline_stage_change', 'lead', saved.id, { previousStage: previous, newStage: body.stage });
      return json(res, 200, saved);
    }

    const activityMatch = url.pathname.match(/^\/api\/leads\/([^/]+)\/activities$/);
    if (activityMatch && req.method === 'GET') {
      const rows = all(`SELECT * FROM lead_activities WHERE workspace_id=${sqlString(session.workspace_id)} AND lead_id=${sqlString(activityMatch[1])} ORDER BY created_at DESC`);
      return json(res, 200, { data: rows });
    }
    if (activityMatch && req.method === 'POST') {
      const body = await readBody(req);
      const lead = one(`SELECT id FROM leads WHERE id=${sqlString(activityMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!lead) return safeError(res, 404, 'Lead not found.');
      const activity = { id: id('activity'), type: body.activityType || 'note', notes: body.notes || '', outcome: body.outcome || '', nextAction: body.nextAction || '', followUpAt: body.followUpAt || null, createdAt: now() };
      run(`INSERT INTO lead_activities (id, workspace_id, lead_id, user_id, activity_type, notes, outcome, next_action, follow_up_at, created_at) VALUES (${sqlString(activity.id)}, ${sqlString(session.workspace_id)}, ${sqlString(activityMatch[1])}, ${sqlString(session.user_id)}, ${sqlString(activity.type)}, ${sqlString(activity.notes)}, ${sqlString(activity.outcome)}, ${sqlString(activity.nextAction)}, ${sqlString(activity.followUpAt)}, ${sqlString(activity.createdAt)})`);
      audit(session, 'lead_activity_create', 'lead', activityMatch[1], { activityType: activity.type });
      return json(res, 201, activity);
    }

    for (const table of ['leads', 'customers', 'campaigns']) {
      if (url.pathname === `/api/${table}` && req.method === 'GET') return json(res, 200, { data: listEntities(table, session.workspace_id) });
      if (url.pathname === `/api/${table}` && req.method === 'POST') {
        const entity = saveEntity(table, session.workspace_id, await readBody(req));
        audit(session, `${table.slice(0, -1)}_upsert`, table.slice(0, -1), entity.id);
        return json(res, 200, entity);
      }
      const match = url.pathname.match(new RegExp(`^/api/${table}/([^/]+)$`));
      if (match && req.method === 'DELETE') {
        run(`DELETE FROM ${table} WHERE id=${sqlString(match[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
        audit(session, `${table.slice(0, -1)}_delete`, table.slice(0, -1), match[1]);
        return json(res, 200, { ok: true });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/customers/convert') {
      const body = await readBody(req);
      const lead = one(`SELECT * FROM leads WHERE id=${sqlString(body.leadId)} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!lead) return safeError(res, 404, 'Lead not found.');
      const existing = one(`SELECT data FROM customers WHERE workspace_id=${sqlString(session.workspace_id)} AND source_lead_id=${sqlString(body.leadId)}`);
      if (existing) return json(res, 200, JSON.parse(existing.data));
      const customer = convertLeadToCustomer(session, body.leadId, body.customer || {});
      run(`INSERT INTO pipeline_events VALUES (${sqlString(id('pipe'))}, ${sqlString(session.workspace_id)}, ${sqlString(body.leadId)}, ${sqlString(session.user_id)}, ${sqlString(lead.pipeline_stage || 'New Lead')}, 'Won', ${sqlString(now())})`);
      const project = upsertProjectForProposal(session, { id: null, customer_id: customer.id, lead_id: body.leadId, data: JSON.stringify({ title: `${customer.businessName} Onboarding`, scope: 'Customer onboarding created from lead conversion.' }) });
      audit(session, 'customer_conversion', 'customer', customer.id, { sourceLeadId: body.leadId, projectId: project.id });
      return json(res, 201, { ...customer, project });
    }



    if (url.pathname === '/api/diagnostics' && req.method === 'GET') {
      const rows = all(`SELECT * FROM business_diagnostics WHERE workspace_id=${sqlString(session.workspace_id)} ORDER BY created_at DESC`);
      return json(res, 200, { data: rows.map(diagnosticRowToJson) });
    }
    if (url.pathname === '/api/diagnostics' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.leadId && !body.customerId) return safeError(res, 400, 'Diagnostic requires a leadId or customerId.');
      let source = {};
      if (body.leadId) {
        const lead = getOwnedLead(session.workspace_id, body.leadId);
        if (!lead) return safeError(res, 404, 'Lead not found.');
        source = JSON.parse(lead.data);
      }
      if (body.customerId) {
        const customer = getOwnedCustomer(session.workspace_id, body.customerId);
        if (!customer) return safeError(res, 404, 'Customer not found.');
        source = { ...source, ...JSON.parse(customer.data) };
      }
      const diagnosticId = id('diagnostic');
      const data = buildBusinessDiagnostic(body, source);
      run(`INSERT INTO business_diagnostics (id, workspace_id, lead_id, customer_id, status, data, created_by, created_at, updated_at) VALUES (${sqlString(diagnosticId)}, ${sqlString(session.workspace_id)}, ${sqlString(body.leadId || null)}, ${sqlString(body.customerId || null)}, 'Draft', ${sqlString(JSON.stringify(data))}, ${sqlString(session.user_id)}, ${sqlString(now())}, ${sqlString(now())})`);
      audit(session, 'business_diagnostic_created', 'diagnostic', diagnosticId, { leadId: body.leadId || null, customerId: body.customerId || null, opportunityScore: data.estimates.opportunityScore, aiLabel: data.aiLabel });
      return json(res, 201, diagnosticRowToJson(one(`SELECT * FROM business_diagnostics WHERE id=${sqlString(diagnosticId)} AND workspace_id=${sqlString(session.workspace_id)}`)));
    }
    const diagnosticMatch = url.pathname.match(/^\/api\/diagnostics\/([^/]+)$/);
    if (diagnosticMatch && req.method === 'GET') {
      const row = one(`SELECT * FROM business_diagnostics WHERE id=${sqlString(diagnosticMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!row) return safeError(res, 404, 'Diagnostic not found.');
      return json(res, 200, diagnosticRowToJson(row));
    }
    if (diagnosticMatch && req.method === 'POST') {
      const row = one(`SELECT * FROM business_diagnostics WHERE id=${sqlString(diagnosticMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!row) return safeError(res, 404, 'Diagnostic not found.');
      const body = await readBody(req);
      if (body.status && !DIAGNOSTIC_STATUSES.includes(body.status)) return safeError(res, 400, 'Unsupported diagnostic status.');
      const existingData = JSON.parse(row.data);
      const data = {
        ...existingData,
        verifiedInformation: body.verifiedInformation || existingData.verifiedInformation,
        inferredFindings: body.inferredFindings || existingData.inferredFindings,
        recommendations: body.recommendations || existingData.recommendations,
        estimates: body.estimates || existingData.estimates,
        unavailableData: body.unavailableData || existingData.unavailableData,
        notes: body.notes ?? existingData.notes,
        userReviewedAt: now()
      };
      if (body.status === 'Approved') { data.approvedAt = now(); data.approvedBy = session.user_id; }
      run(`UPDATE business_diagnostics SET data=${sqlString(JSON.stringify(data))}, status=${sqlString(body.status || row.status)}, updated_at=${sqlString(now())} WHERE id=${sqlString(row.id)} AND workspace_id=${sqlString(session.workspace_id)}`);
      audit(session, body.status === 'Approved' ? 'business_diagnostic_approved' : 'business_diagnostic_updated', 'diagnostic', row.id, { status: body.status || row.status });
      return json(res, 200, diagnosticRowToJson(one(`SELECT * FROM business_diagnostics WHERE id=${sqlString(row.id)} AND workspace_id=${sqlString(session.workspace_id)}`)));
    }

    if (url.pathname === '/api/proposals' && req.method === 'GET') {
      const rows = all(`SELECT * FROM proposals WHERE workspace_id=${sqlString(session.workspace_id)} ORDER BY created_at DESC`);
      return json(res, 200, { data: rows.map(proposalRowToJson) });
    }
    if (url.pathname === '/api/proposals' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.leadId && !body.customerId) return safeError(res, 400, 'Diagnostic requires a leadId or customerId.');
      let source = {};
      if (body.leadId) {
        const lead = getOwnedLead(session.workspace_id, body.leadId);
        if (!lead) return safeError(res, 404, 'Lead not found.');
        source = JSON.parse(lead.data);
      }
      if (body.customerId) {
        const customer = getOwnedCustomer(session.workspace_id, body.customerId);
        if (!customer) return safeError(res, 404, 'Customer not found.');
        source = { ...source, ...JSON.parse(customer.data) };
      }
      const proposalId = id('proposal');
      const proposalNumber = nextProposalNumber(session.workspace_id);
      if (body.diagnosticId) {
        const diagnostic = one(`SELECT status, data FROM business_diagnostics WHERE id=${sqlString(body.diagnosticId)} AND workspace_id=${sqlString(session.workspace_id)}`);
        if (!diagnostic) return safeError(res, 404, 'Diagnostic not found.');
        const diagnosticData = JSON.parse(diagnostic.data);
        if (diagnostic.status !== 'Approved') return safeError(res, 400, 'Diagnostic must be approved before proposal drafting.');
        body.businessAnalysis = diagnosticData;
        body.scope = body.scope || diagnosticData.proposalDraftGuidance?.suggestedScope;
        body.deliverables = body.deliverables || diagnosticData.proposalDraftGuidance?.suggestedDeliverables;
        body.diagnosticId = body.diagnosticId;
      }
      const data = buildProposalData(body, source);
      const timestamp = now();
      run(`INSERT INTO proposals (id, workspace_id, lead_id, customer_id, proposal_number, status, version, currency, data, subtotal, tax, discount, total, created_by, created_at, updated_at) VALUES (${sqlString(proposalId)}, ${sqlString(session.workspace_id)}, ${sqlString(body.leadId || null)}, ${sqlString(body.customerId || null)}, ${sqlString(proposalNumber)}, 'Draft', 1, ${sqlString(data.currency)}, ${sqlString(JSON.stringify(data))}, ${data.subtotal}, ${data.tax}, ${data.discount}, ${data.total}, ${sqlString(session.user_id)}, ${sqlString(timestamp)}, ${sqlString(timestamp)})`);
      saveProposalVersion(session, proposalId, 1, data);
      run(`INSERT INTO proposal_events VALUES (${sqlString(id('proposal_event'))}, ${sqlString(session.workspace_id)}, ${sqlString(proposalId)}, ${sqlString(session.user_id)}, NULL, 'Draft', 'Proposal created', ${sqlString(timestamp)})`);
      audit(session, 'proposal_created', 'proposal', proposalId, { proposalNumber, leadId: body.leadId || null, customerId: body.customerId || null, diagnosticId: body.diagnosticId || null, total: data.total });
      if (body.diagnosticId) audit(session, 'diagnostic_linked_to_proposal', 'diagnostic', body.diagnosticId, { proposalId });
      return json(res, 201, proposalRowToJson(getOwnedProposal(session.workspace_id, proposalId)));
    }
    const proposalMatch = url.pathname.match(/^\/api\/proposals\/([^/]+)$/);
    if (proposalMatch && req.method === 'GET') {
      const row = getOwnedProposal(session.workspace_id, proposalMatch[1]);
      if (!row) return safeError(res, 404, 'Proposal not found.');
      return json(res, 200, proposalRowToJson(row));
    }
    if (proposalMatch && req.method === 'POST') {
      const row = getOwnedProposal(session.workspace_id, proposalMatch[1]);
      if (!row) return safeError(res, 404, 'Proposal not found.');
      if (row.status === 'Accepted') return safeError(res, 400, 'Accepted proposals are read-only without an amendment.');
      const body = await readBody(req);
      const previousData = JSON.parse(row.data);
      const nextVersion = ['Sent', 'Accepted'].includes(row.status) ? row.version + 1 : row.version;
      const data = buildProposalData({ ...previousData, ...body }, previousData.businessAnalysis?.verified || {});
      const status = row.status === 'Sent' ? 'Revision Requested' : row.status;
      run(`UPDATE proposals SET data=${sqlString(JSON.stringify(data))}, status=${sqlString(status)}, version=${nextVersion}, currency=${sqlString(data.currency)}, subtotal=${data.subtotal}, tax=${data.tax}, discount=${data.discount}, total=${data.total}, updated_at=${sqlString(now())} WHERE id=${sqlString(row.id)} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (nextVersion !== row.version) saveProposalVersion(session, row.id, nextVersion, data);
      audit(session, nextVersion !== row.version ? 'proposal_version_created' : 'proposal_updated', 'proposal', row.id, { version: nextVersion });
      return json(res, 200, proposalRowToJson(getOwnedProposal(session.workspace_id, row.id)));
    }
    const statusMatch = url.pathname.match(/^\/api\/proposals\/([^/]+)\/status$/);
    if (statusMatch && req.method === 'POST') {
      const row = getOwnedProposal(session.workspace_id, statusMatch[1]);
      if (!row) return safeError(res, 404, 'Proposal not found.');
      const body = await readBody(req);
      const nextStatus = body.status;
      if (!PROPOSAL_STATUSES.includes(nextStatus)) return safeError(res, 400, 'Unsupported proposal status.');
      if (!PROPOSAL_TRANSITIONS[row.status].includes(nextStatus)) return safeError(res, 400, `Invalid proposal transition from ${row.status} to ${nextStatus}.`);
      const timestamp = now();
      const sentAt = nextStatus === 'Sent' ? timestamp : row.sent_at;
      const acceptedAt = nextStatus === 'Accepted' ? timestamp : row.accepted_at;
      const rejectedAt = nextStatus === 'Rejected' ? timestamp : row.rejected_at;
      let project = null;
      let customer = null;
      if (nextStatus === 'Accepted') {
        customer = row.customer_id ? JSON.parse(getOwnedCustomer(session.workspace_id, row.customer_id).data) : convertLeadToCustomer(session, row.lead_id, { proposalId: row.id });
        project = upsertProjectForProposal(session, { ...row, customer_id: customer.id });
      }
      run(`UPDATE proposals SET status=${sqlString(nextStatus)}, customer_id=${sqlString(customer?.id || row.customer_id)}, sent_at=${sqlString(sentAt)}, accepted_at=${sqlString(acceptedAt)}, rejected_at=${sqlString(rejectedAt)}, updated_at=${sqlString(timestamp)} WHERE id=${sqlString(row.id)} AND workspace_id=${sqlString(session.workspace_id)}`);
      run(`INSERT INTO proposal_events VALUES (${sqlString(id('proposal_event'))}, ${sqlString(session.workspace_id)}, ${sqlString(row.id)}, ${sqlString(session.user_id)}, ${sqlString(row.status)}, ${sqlString(nextStatus)}, ${sqlString(body.note || body.reason || '')}, ${sqlString(timestamp)})`);
      audit(session, nextStatus === 'Sent' ? 'proposal_marked_sent' : nextStatus === 'Accepted' ? 'proposal_accepted' : nextStatus === 'Rejected' ? 'proposal_rejected' : 'proposal_status_changed', 'proposal', row.id, { previousStatus: row.status, newStatus: nextStatus, projectId: project?.id || null });
      return json(res, 200, { proposal: proposalRowToJson(getOwnedProposal(session.workspace_id, row.id)), customer, project });
    }
    const printMatch = url.pathname.match(/^\/api\/proposals\/([^/]+)\/print$/);
    if (printMatch && req.method === 'GET') {
      const row = getOwnedProposal(session.workspace_id, printMatch[1]);
      if (!row) return safeError(res, 404, 'Proposal not found.');
      const proposal = proposalRowToJson(row);
      const html = `<!doctype html><html><head><title>${proposal.proposalNumber}</title><style>body{font-family:Inter,Arial,sans-serif;margin:40px;color:#0f172a}table{width:100%;border-collapse:collapse}td,th{border:1px solid #e5e7eb;padding:8px;text-align:left}.total{text-align:right;font-weight:700}</style></head><body><h1>HAMIX Proposal</h1><h2>${proposal.proposalNumber} · v${proposal.version}</h2><p>Status: ${proposal.status}</p><h3>${proposal.title}</h3><p>${proposal.scope}</p><h4>Deliverables</h4><ul>${proposal.deliverables.map(item => `<li>${item}</li>`).join('')}</ul><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Tax</th><th>Discount</th><th>Total</th></tr></thead><tbody>${proposal.lineItems.map(item => `<tr><td>${item.description}</td><td>${item.quantity}</td><td>${item.unitPrice}</td><td>${item.tax}</td><td>${item.discount}</td><td>${item.lineTotal}</td></tr>`).join('')}</tbody></table><p class="total">Total ${proposal.currency} ${proposal.total}</p><p>Validity: ${proposal.validityDate}</p><p>Terms: ${proposal.paymentTerms}</p><script>window.print()</script></body></html>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    const discoveryMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/discovery$/);
    if (discoveryMatch && req.method === 'GET') {
      const project = one(`SELECT id FROM projects WHERE id=${sqlString(discoveryMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!project) return safeError(res, 404, 'Project not found.');
      const row = one(`SELECT data FROM project_discovery WHERE project_id=${sqlString(discoveryMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      return json(res, 200, { data: row ? JSON.parse(row.data) : {} });
    }
    if (discoveryMatch && req.method === 'POST') {
      const body = await readBody(req);
      const project = one(`SELECT id FROM projects WHERE id=${sqlString(discoveryMatch[1])} AND workspace_id=${sqlString(session.workspace_id)}`);
      if (!project) return safeError(res, 404, 'Project not found.');
      const data = { companyInfo: body.companyInfo || '', primaryContact: body.primaryContact || '', logo: body.logo || '', brandColours: body.brandColours || [], products: body.products || [], services: body.services || [], targetAudience: body.targetAudience || '', competitors: body.competitors || [], existingWebsite: body.existingWebsite || '', domain: body.domain || '', contentStatus: body.contentStatus || '', images: body.images || [], videos: body.videos || [], technicalRequirements: body.technicalRequirements || '', notes: body.notes || '' };
      run(`INSERT INTO project_discovery (project_id, workspace_id, data, updated_by, updated_at) VALUES (${sqlString(discoveryMatch[1])}, ${sqlString(session.workspace_id)}, ${sqlString(JSON.stringify(data))}, ${sqlString(session.user_id)}, ${sqlString(now())}) ON CONFLICT(project_id) DO UPDATE SET data=excluded.data, updated_by=excluded.updated_by, updated_at=excluded.updated_at`);
      audit(session, 'onboarding_updated', 'project', discoveryMatch[1]);
      return json(res, 200, data);
    }

    if (url.pathname === '/api/settings') {
      if (req.method === 'GET') {
        const row = one(`SELECT data FROM settings WHERE workspace_id=${sqlString(session.workspace_id)}`);
        return json(res, 200, { data: row ? JSON.parse(row.data) : {} });
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        run(`INSERT INTO settings (workspace_id, data, updated_at) VALUES (${sqlString(session.workspace_id)}, ${sqlString(JSON.stringify(body))}, ${sqlString(now())}) ON CONFLICT(workspace_id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at`);
        audit(session, 'settings_update', 'settings', session.workspace_id);
        return json(res, 200, body);
      }
    }

    if (url.pathname === '/api/import-history' && req.method === 'GET') return json(res, 200, { data: listEntities('import_history', session.workspace_id) });
    if (url.pathname === '/api/audit-logs' && req.method === 'GET') return json(res, 200, { data: all(`SELECT action, entity_type, entity_id, metadata, created_at FROM audit_logs WHERE workspace_id=${sqlString(session.workspace_id)} ORDER BY created_at DESC LIMIT 100`) });
    if (url.pathname === '/api/migration/import-local' && req.method === 'POST') {
      const body = await readBody(req);
      const result = { imported: 0, skipped: 0, failed: 0 };
      for (const lead of body.leads || []) { try { saveEntity('leads', session.workspace_id, lead); result.imported++; } catch { result.failed++; } }
      for (const customer of body.customers || []) { try { saveEntity('customers', session.workspace_id, customer); result.imported++; } catch { result.failed++; } }
      for (const campaign of body.campaigns || []) { try { saveEntity('campaigns', session.workspace_id, campaign); result.imported++; } catch { result.failed++; } }
      audit(session, 'local_migration_import', 'workspace', session.workspace_id, result);
      return json(res, 200, result);
    }

    return safeError(res, 404, 'Not found.');
  } catch (error) {
    console.error(error);
    return safeError(res, 500, 'Request failed.');
  }
});

server.listen(PORT, () => console.log(`HAMIX backend listening on http://localhost:${PORT}`));

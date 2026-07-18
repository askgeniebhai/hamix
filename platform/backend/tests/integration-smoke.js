#!/usr/bin/env node
const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.HAMIX_TEST_PORT || 8810);
const DB_PATH = process.env.HAMIX_TEST_DB || path.join(os.tmpdir(), `hamix-integration-${Date.now()}.sqlite`);
const BASE = `http://127.0.0.1:${PORT}`;
const COOKIE_A = path.join(os.tmpdir(), `hamix-a-${Date.now()}.cookie`);
const COOKIE_B = path.join(os.tmpdir(), `hamix-b-${Date.now()}.cookie`);
const COOKIE_MEMBER = path.join(os.tmpdir(), `hamix-member-${Date.now()}.cookie`);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const curl = async (cookie, method, route, body, fail = true) => {
  const args = ['-sS', '-X', method, '-c', cookie, '-b', cookie, '-H', 'content-type: application/json'];
  if (body !== undefined) args.push('--data', JSON.stringify(body));
  args.push(`${BASE}${route}`);
  const { execFileSync } = require('child_process');
  const out = execFileSync('curl', args, { encoding: 'utf8' });
  const data = JSON.parse(out);
  if (fail && data.error) throw new Error(`${method} ${route}: ${JSON.stringify(data)}`);
  return data;
};

(async () => {
  for (const file of [DB_PATH, COOKIE_A, COOKIE_B, COOKIE_MEMBER]) { try { fs.unlinkSync(file); } catch {} }
  const server = spawn(process.execPath, ['platform/backend/server.js'], {
    env: { ...process.env, HAMIX_PORT: String(PORT), HAMIX_DB_PATH: DB_PATH, HAMIX_SESSION_SECRET: 'test-secret' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await delay(1000);
  try {
    assert.equal((await curl(COOKIE_A, 'GET', '/api/health')).ok, true);
    assert.ok('providers' in (await curl(COOKIE_A, 'GET', '/api/ready')));
    await curl(COOKIE_A, 'POST', '/api/auth/register', { name: 'Owner A', tenantName: 'A Co', email: 'owner-a@example.com', password: 'password123' });
    await curl(COOKIE_B, 'POST', '/api/auth/register', { name: 'Owner B', tenantName: 'B Co', email: 'owner-b@example.com', password: 'password123' });
    await curl(COOKIE_A, 'POST', '/api/workspace/members', { name: 'Member A', email: 'member-a@example.com', password: 'password123', role: 'Member' });
    await curl(COOKIE_MEMBER, 'POST', '/api/auth/login', { email: 'member-a@example.com', password: 'password123' });
    assert.ok((await curl(COOKIE_MEMBER, 'POST', '/api/leads', { businessName: 'Blocked Member Write' }, false)).error);

    const leadId = (await curl(COOKIE_A, 'POST', '/api/leads/import', { leads: [{ businessName: 'Hardening Shop', phone: '9876543210', category: 'Retail', address: 'Street 1' }] })).details[0].id;
    await curl(COOKIE_A, 'POST', `/api/leads/${leadId}/qualify`, {});
    await curl(COOKIE_A, 'POST', `/api/leads/${leadId}/stage`, { stage: 'Contact Attempted' });
    let diagnostic = await curl(COOKIE_A, 'POST', '/api/diagnostics', { leadId });
    diagnostic = await curl(COOKIE_A, 'POST', `/api/diagnostics/${diagnostic.id}`, { status: 'Approved', notes: 'Approved' });
    let proposal = await curl(COOKIE_A, 'POST', '/api/proposals', { leadId, diagnosticId: diagnostic.id, lineItems: [{ description: 'Setup', quantity: 1, unitPrice: 10000 }] });
    proposal = (await curl(COOKIE_A, 'POST', `/api/proposals/${proposal.id}/status`, { status: 'Sent' })).proposal;
    const accepted = await curl(COOKIE_A, 'POST', `/api/proposals/${proposal.id}/status`, { status: 'Accepted' });
    const projectId = accepted.project.id;
    await curl(COOKIE_A, 'POST', `/api/projects/${projectId}/discovery`, { companyInfo: 'Hardening Shop', domain: 'hardening.example', notes: 'Discovery complete' });
    let website = await curl(COOKIE_A, 'POST', '/api/websites', { projectId });
    website = await curl(COOKIE_A, 'POST', `/api/websites/${website.id}/status`, { status: 'Approved' });
    const deployment = await curl(COOKIE_A, 'POST', '/api/deployments', { websiteProjectId: website.id, domain: 'hardening.example' });
    const success = await curl(COOKIE_A, 'POST', '/api/customer-success', { customerId: accepted.customer.id, projectId, status: 'Onboarding', satisfaction: 4 });
    const successId = (success.success || success).id;
    await curl(COOKIE_A, 'POST', `/api/customer-success/${successId}/activities`, { activityType: 'follow_up', notes: 'Hardening smoke follow-up' });

    assert.ok((await curl(COOKIE_B, 'GET', `/api/proposals/${proposal.id}`, undefined, false)).error);
    assert.ok((await curl(COOKIE_B, 'POST', `/api/customer-success/${successId}`, { status: 'Active' }, false)).error);
    assert.ok((await curl(COOKIE_A, 'POST', `/api/customer-success/${successId}/activities`, { activityType: 'email', notes: 'send' }, false)).error);
    assert.ok((await curl(COOKIE_A, 'POST', '/api/auth/login', { email: 'none@example.com', password: 'bad' }, false)).error);

    server.kill('SIGTERM');
    await delay(1000);
    const restarted = spawn(process.execPath, ['platform/backend/server.js'], {
      env: { ...process.env, HAMIX_PORT: String(PORT), HAMIX_DB_PATH: DB_PATH, HAMIX_SESSION_SECRET: 'test-secret' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await delay(1000);
    assert.equal((await curl(COOKIE_A, 'GET', '/api/customer-success')).data.length, 1);
    restarted.kill('SIGTERM');
    console.log('integration smoke passed');
  } finally {
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});

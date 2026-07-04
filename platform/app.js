/**
 * HAMIX CRM Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    initNavigation();
    loadDashboardStats();

    // Initial icon render
    if (window.lucide) lucide.createIcons();

    // Check if we have default customer data
    loadInitialData();

    // Listen for workflow updates
    window.addEventListener('hamix:workflow-update', (e) => {
        const activePage = document.querySelector('.sidebar-nav li.active').dataset.page;
        if (activePage === 'customers' || activePage === 'dashboard' || activePage === 'leads') {
            renderPage(activePage);
        }
    });

    // Lead Form Handling
    const leadForm = document.getElementById('form-lead');
    if (leadForm) {
        leadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const leadId = leadForm.dataset.editId;
            const formData = {
                businessName: document.getElementById('lead-businessName').value,
                category: document.getElementById('lead-category').value,
                phone: document.getElementById('lead-phone').value,
                whatsapp: document.getElementById('lead-whatsapp').value,
                email: document.getElementById('lead-email').value,
                website: document.getElementById('lead-website').value,
                address: document.getElementById('lead-address').value,
                rating: parseFloat(document.getElementById('lead-rating').value) || 0,
                reviews: parseInt(document.getElementById('lead-reviews').value) || 0,
                industry: document.getElementById('lead-industry').value,
                notes: document.getElementById('lead-notes').value,
                assignedTo: document.getElementById('lead-assignedTo').value,
                status: document.getElementById('lead-status').value
            };

            const leads = window.HAMIX_DAL.getLeads();

            if (leadId) {
                const index = leads.findIndex(l => l.id === leadId);
                if (index !== -1) {
                    leads[index] = { ...leads[index], ...formData, updatedAt: new Date().toISOString() };
                    window.LeadEngine.validateLead(leads[index], leads);
                }
            } else {
                const newLead = window.LeadEngine.createLead(formData);
                window.LeadEngine.validateLead(newLead, leads);
                leads.push(newLead);
            }

            window.HAMIX_DAL.saveLeads(leads);
            window.closeModal('lead');
            renderPage(document.querySelector('.sidebar-nav li.active').dataset.page);
        });
    }

    // Import Logic
    initImportLogic();
});

function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav li');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            if (!pageId) return;

            // Update active state
            document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
            link.classList.add('active');

            renderPage(pageId);
        });
    });
}

function renderPage(page) {
    const contentBody = document.querySelector('.content-body');
    const headerTitle = document.querySelector('.top-header h1');
    const currentUser = window.HAMIX_Admin.getCurrentUser();

    headerTitle.innerText = page.charAt(0).toUpperCase() + page.slice(1);

    // RBAC Check
    if (page === 'users' && !window.HAMIX_Admin.canPerform(currentUser.role, 'manage_users')) {
        contentBody.innerHTML = '<div class="empty-state"><h2>Access Denied</h2><p>You do not have permission to view this page.</p></div>';
        return;
    }

    switch(page) {
        case 'dashboard': renderDashboard(contentBody); break;
        case 'leads': renderLeads(contentBody); break;
        case 'customers': renderCustomers(contentBody); break;
        case 'templates': renderTemplates(contentBody); break;
        case 'operations': renderOperations(contentBody); break;
        case 'github deployments': renderGithub(contentBody); break;
        case 'users': renderUsers(contentBody); break;
        case 'settings': renderSettings(contentBody); break;
        default: contentBody.innerHTML = `<div class="empty-state"><h2>${page}</h2><p>Coming soon.</p></div>`;
    }

    if (window.lucide) lucide.createIcons();
}

function renderDashboard(container) {
    const customers = window.HAMIX_DAL.getCustomers();
    const leads = window.HAMIX_DAL.getLeads();
    const activeSites = customers.filter(c => c.status === 'Ready for Publishing' || c.status === 'Published').length;
    const deployments = customers.filter(c => c.deploymentPackage).length;

    container.innerHTML = `
        <div class="welcome-section">
            <h2>Welcome to HAMIX</h2>
            <p>The control centre of your platform.</p>
        </div>
        <div class="dashboard-grid">
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="users"></i></div>
                <div class="stat-data">
                    <h3>Total Leads</h3>
                    <p class="stat-value">${leads.length}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="user-check"></i></div>
                <div class="stat-data">
                    <h3>Total Customers</h3>
                    <p class="stat-value">${customers.length}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="globe"></i></div>
                <div class="stat-data">
                    <h3>Active Websites</h3>
                    <p class="stat-value">${activeSites}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="zap"></i></div>
                <div class="stat-data">
                    <h3>Deployments</h3>
                    <p class="stat-value">${deployments}</p>
                </div>
            </div>
        </div>
    `;
}

function renderLeads(container) {
    const leads = window.HAMIX_DAL.getLeads();

    container.innerHTML = `
        <div class="page-header" style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 20px;">
            <div>
                <h2>Leads Management</h2>
                <p>Manage and track your business leads.</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="window.openModal('import')"><i data-lucide="download"></i> Import Leads</button>
                <button class="btn btn-primary" onclick="window.openLeadEditor()"><i data-lucide="plus"></i> Add Lead</button>
            </div>
        </div>
        ${leads.length === 0 ? `
            <div class="empty-state">
                <i data-lucide="users" style="width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 24px;"></i>
                <h2>No leads found</h2>
                <p>Start by adding or importing a new lead.</p>
            </div>
        ` : `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Lead Name</th>
                            <th>Category</th>
                            <th>Score</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leads.map(l => `
                            <tr>
                                <td>
                                    <div class="customer-info-cell">
                                        <strong>${l.businessName}</strong>
                                        <span>${l.email || l.phone || ''}</span>
                                    </div>
                                </td>
                                <td>${l.category || 'Lead'}</td>
                                <td><span class="badge badge-new">${l.opportunityScore || '70'}%</span></td>
                                <td><span class="badge badge-${l.status.toLowerCase().replace(/ /g, '-')}">${l.status}</span></td>
                                <td>
                                    <div class="action-btns">
                                        <button class="btn-icon" onclick="window.openLeadEditor('${l.id}')"><i data-lucide="edit-2"></i></button>
                                        <button class="btn btn-primary btn-sm" onclick="convertLeadById('${l.id}')"><i data-lucide="zap"></i> Process</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
}

function renderCustomers(container) {
    let customers = window.HAMIX_DAL.getCustomers();
    const userRole = window.HAMIX_Admin.getCurrentUser().role;

    container.innerHTML = `
        <div class="page-header" style="margin-bottom: 20px;">
            <h2>Customer Management</h2>
            <p>Manage your active customers and deployments.</p>
        </div>
        ${customers.length === 0 ? `
            <div class="empty-state">
                <i data-lucide="user-check" style="width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 24px;"></i>
                <h2>No customers found</h2>
                <p>Approve leads to see them here.</p>
            </div>
        ` : `
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Customer Name</th>
                            <th>Status</th>
                            <th>Last Activity</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(c => `
                            <tr>
                                <td>
                                    <div class="customer-info-cell">
                                        <strong>${c.businessName}</strong>
                                        <span>${c.email}</span>
                                    </div>
                                </td>
                                <td><span class="badge badge-${c.status.toLowerCase().replace(/\s+/g, '-')}">${c.status}</span></td>
                                <td><span style="font-size: 12px; color: var(--text-muted)">${new Date(c.updatedAt || c.joinedAt).toLocaleDateString()}</span></td>
                                <td>
                                    <div class="action-btns">
                                        <button class="btn-icon" onclick="previewWebsiteById('${c.id}')" title="Preview"><i data-lucide="eye"></i></button>
                                        <button class="btn-icon" onclick="openReviewModal('${c.id}')" title="Review & WhatsApp"><i data-lucide="message-square"></i></button>
                                        <button class="btn-icon" onclick="openOpsModal('${c.id}')" title="Operations"><i data-lucide="cog"></i></button>
                                        ${window.HAMIX_Admin.canPerform(userRole, 'publish_website') ? `<button class="btn-icon" onclick="publishWebsite('${c.id}')" title="Publish"><i data-lucide="upload-cloud"></i></button>` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
}

function renderTemplates(container) {
    container.innerHTML = `
        <div class="templates-grid">
            <div class="template-card active">
                <div class="template-preview"><img src="https://via.placeholder.com/400x300?text=Default+Template" alt="Default"></div>
                <div class="template-info">
                    <h3>Default Template</h3>
                    <p>Clean, modern business layout.</p>
                    <span class="badge">Active</span>
                </div>
            </div>
        </div>
    `;
}

// Reuse other rendering functions from v0.4
function loadDashboardStats() {}
function loadInitialData() {
    const customers = window.HAMIX_DAL.getCustomers();
    const leads = window.HAMIX_DAL.getLeads();
    if (customers.length === 0 && leads.length === 0) {
        fetch('../customers/neela-security-force.json')
            .then(res => res.json())
            .then(data => {
                window.HAMIX_Operations.importFromGoogleMaps([{
                    businessName: data.businessName,
                    category: data.category,
                    phone: data.phone,
                    email: data.email,
                    address: data.address,
                    rating: data.rating,
                    reviews: data.reviews,
                    logo: data.logo
                }]);
            }).catch(e => console.error(e));
    }
}

// Global UI Helpers
window.openModal = (id) => {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) modal.classList.add('active');
};
window.closeModal = (id) => {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) modal.classList.remove('active');
};
window.openLeadEditor = (id = null) => {
    const form = document.getElementById('form-lead');
    document.getElementById('modal-lead-title').innerText = id ? 'Edit Lead' : 'Add New Lead';
    form.reset();
    form.dataset.editId = id || '';

    if (id) {
        const lead = window.HAMIX_DAL.getLeads().find(l => l.id === id);
        if (lead) {
            document.getElementById('lead-businessName').value = lead.businessName;
            document.getElementById('lead-category').value = lead.category;
            document.getElementById('lead-phone').value = lead.phone || '';
            document.getElementById('lead-whatsapp').value = lead.whatsapp || '';
            document.getElementById('lead-email').value = lead.email || '';
            document.getElementById('lead-website').value = lead.website || '';
            document.getElementById('lead-address').value = lead.address || '';
            document.getElementById('lead-rating').value = lead.rating || 0;
            document.getElementById('lead-reviews').value = lead.reviews || 0;
            document.getElementById('lead-industry').value = lead.industry || '';
            document.getElementById('lead-notes').value = lead.notes || '';
            document.getElementById('lead-assignedTo').value = lead.assignedTo || '';
            document.getElementById('lead-status').value = lead.status;
        }
    }
    window.openModal('lead');
};

function initImportLogic() {
    const btnProcessGMaps = document.getElementById('btn-process-gmaps');
    if (btnProcessGMaps) {
        btnProcessGMaps.addEventListener('click', () => {
            const rawData = document.getElementById('gmaps-import-data').value;
            if (!rawData.trim()) return;
            const parsed = window.LeadEngine.parseGMapsData(rawData);
            window.HAMIX_Operations.importFromGoogleMaps(parsed);
            window.closeModal('import');
            renderPage('leads');
        });
    }
}

// Migration of v0.4 UI actions
window.convertLeadById = async (id) => {
    const leads = window.HAMIX_DAL.getLeads();
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    // Show Progress
    if (window.showProgressOverlay) window.showProgressOverlay(lead.businessName);

    // Remove from leads
    window.HAMIX_DAL.saveLeads(leads.filter(l => l.id !== id));

    // Transition
    await window.HAMIX_Workflow.transitionTo(lead, window.HAMIX_Workflow.STAGES.CUSTOMER);
};

// ... existing v0.4 functions ...
function showProgressOverlay(businessName) {
    const overlay = document.createElement('div');
    overlay.className = 'progress-overlay';
    overlay.innerHTML = `
        <div class="progress-card">
            <div class="progress-spinner"></div>
            <h3>Processing ${businessName}</h3>
            <p>HAMIX AI is building your website...</p>
            <div class="progress-steps">
                <div class="progress-step" id="step-ai"><i data-lucide="circle"></i> AI Content Generation</div>
                <div class="progress-step" id="step-gen"><i data-lucide="circle"></i> Website Generation</div>
                <div class="progress-step" id="step-dep"><i data-lucide="circle"></i> Deployment Packaging</div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();

    window.addEventListener('hamix:workflow-update', function handler(e) {
        const c = e.detail.customer;
        if (c.businessName !== businessName) return;
        if (c.status === 'Ready for Publishing') {
            setTimeout(() => { overlay.remove(); window.removeEventListener('hamix:workflow-update', handler); renderPage('customers'); }, 1000);
        }
    });
}
window.showProgressOverlay = showProgressOverlay;

window.previewWebsiteById = (id) => {
    const customers = window.HAMIX_DAL.getCustomers();
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    const html = window.HAMIX_Engine.generateWebsite(customer, 'Default', 'Indigo', { baseHref: '../' });
    if (window.HAMIX_Modals) window.HAMIX_Modals.openPreview(customer.id, html);
};

window.openReviewModal = (id) => { if (window.HAMIX_Modals) window.HAMIX_Modals.openReview(id); };
window.openOpsModal = (id) => { if (window.HAMIX_Modals) window.HAMIX_Modals.openOperations(id); };
window.publishWebsite = async (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer) await window.HAMIX_Operations.publishWebsite(customer);
};

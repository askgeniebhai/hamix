/**
 * HAMIX CRM Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    initNavigation();
    loadDashboardStats();

    // Check if we have default customer data
    loadInitialData();

    // Listen for workflow updates
    window.addEventListener('hamix:workflow-update', (e) => {
        const activePage = document.querySelector('.sidebar-nav li.active span').innerText.toLowerCase();
        if (activePage === 'customers' || activePage === 'dashboard' || activePage === 'leads') {
            renderPage(activePage);
        }
    });
});

function initNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    const mainContent = document.querySelector('.main-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active state
            document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');

            const page = link.querySelector('span').innerText.toLowerCase();
            renderPage(page);
        });
    });
}

function renderPage(page) {
    const contentBody = document.querySelector('.content-body');
    const headerTitle = document.querySelector('.top-header h1');

    headerTitle.innerText = page.charAt(0).toUpperCase() + page.slice(1);

    switch(page) {
        case 'dashboard':
            renderDashboard(contentBody);
            break;
        case 'leads':
            renderLeads(contentBody);
            break;
        case 'customers':
            renderCustomers(contentBody);
            break;
        case 'templates':
            renderTemplates(contentBody);
            break;
        default:
            contentBody.innerHTML = `<div class="empty-state"><h2>${page}</h2><p>This module is coming soon.</p></div>`;
    }

    // Re-init icons for new content
    if (window.lucide) lucide.createIcons();
}

function renderDashboard(container) {
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
                    <p class="stat-value" id="stat-leads">0</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="user-check"></i></div>
                <div class="stat-data">
                    <h3>Total Customers</h3>
                    <p class="stat-value" id="stat-customers">0</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="globe"></i></div>
                <div class="stat-data">
                    <h3>Active Websites</h3>
                    <p class="stat-value" id="stat-websites">0</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="zap"></i></div>
                <div class="stat-data">
                    <h3>Deployments</h3>
                    <p class="stat-value" id="stat-deployments">0</p>
                </div>
            </div>
        </div>
    `;
    loadDashboardStats();
}

function renderLeads(container) {
    const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');

    if (leads.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="users" style="width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 24px;"></i>
                <h2>No leads found</h2>
                <p>Start by adding a new lead to the platform.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Lead Name</th>
                        <th>Category</th>
                        <th>Score</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${leads.map((l, index) => `
                        <tr>
                            <td>
                                <div class="customer-info-cell">
                                    <strong>${l.businessName}</strong>
                                    <span>${l.email}</span>
                                </div>
                            </td>
                            <td>${l.category || 'Lead'}</td>
                            <td><span class="badge badge-new">${l.opportunityScore || '70'}%</span></td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn btn-primary" onclick="convertLead(${index})"><i data-lucide="zap"></i> Process</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderCustomers(container) {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');

    if (customers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="users" style="width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 24px;"></i>
                <h2>No customers found</h2>
                <p>Convert leads to customers to start building websites.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Customer Name</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.map((c, index) => {
                        const statusClass = (c.status || 'Published').toLowerCase().replace(/\s+/g, '-');
                        return `
                        <tr>
                            <td>
                                <div class="customer-info-cell">
                                    <strong>${c.businessName}</strong>
                                    <span>${c.email}</span>
                                </div>
                            </td>
                            <td>${c.category || 'Security'}</td>
                            <td><span class="badge badge-${statusClass}">${c.status || 'Published'}</span></td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn-icon" onclick="previewWebsite(${index})" title="Preview Website"><i data-lucide="eye"></i></button>
                                    <button class="btn-icon" onclick="downloadWebsite(${index})" title="Download Package"><i data-lucide="download"></i></button>
                                    <button class="btn-icon" onclick="reprocessCustomer(${index})" title="Reprocess AI"><i data-lucide="refresh-cw"></i></button>
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderTemplates(container) {
    container.innerHTML = `
        <div class="templates-grid">
            <div class="template-card active">
                <div class="template-preview">
                    <img src="https://via.placeholder.com/400x300?text=Default+Business+Template" alt="Default Template">
                </div>
                <div class="template-info">
                    <h3>Default Template</h3>
                    <p>Clean, modern business layout.</p>
                    <span class="badge">Active</span>
                </div>
            </div>
            <div class="template-card">
                <div class="template-preview">
                    <img src="https://via.placeholder.com/400x300?text=Premium+Template" alt="Premium Template">
                </div>
                <div class="template-info">
                    <h3>Premium Slate</h3>
                    <p>Professional corporate design.</p>
                    <span class="badge badge-muted">Coming Soon</span>
                </div>
            </div>
        </div>
    `;
}

function loadDashboardStats() {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');

    const leadsStat = document.getElementById('stat-leads');
    const customersStat = document.getElementById('stat-customers');
    const websitesStat = document.getElementById('stat-websites');
    const deploymentsStat = document.getElementById('stat-deployments');

    if (leadsStat) leadsStat.innerText = leads.length;
    if (customersStat) customersStat.innerText = customers.length;
    if (websitesStat) websitesStat.innerText = customers.filter(c => c.status === 'Ready for Publishing').length;
    if (deploymentsStat) deploymentsStat.innerText = customers.filter(c => c.deploymentPackage).length;
}

function loadInitialData() {
    // If no customers, add the sample one
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');

    if (customers.length === 0 && leads.length === 0) {
        fetch('../customers/neela-security-force.json')
            .then(res => res.json())
            .then(data => {
                // Add as a lead first
                data.id = 'lead-' + Date.now();
                data.status = 'Lead';
                data.opportunityScore = window.HAMIX_AI.calculateOpportunityScore(data);
                localStorage.setItem('hamix_leads', JSON.stringify([data]));
                loadDashboardStats();

                // If we are on the leads page, re-render
                const activePage = document.querySelector('.sidebar-nav li.active span').innerText.toLowerCase();
                if (activePage === 'dashboard' || activePage === 'leads') {
                    renderPage(activePage);
                }
            })
            .catch(err => console.error('Error loading sample data:', err));
    }
}

// Workflow Actions
window.convertLead = async (index) => {
    const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');
    const lead = leads[index];

    if (!lead) return;

    // Show Progress Overlay
    showProgressOverlay(lead.businessName);

    // 1. Move from Leads to Customers
    leads.splice(index, 1);
    localStorage.setItem('hamix_leads', JSON.stringify(leads));

    lead.id = 'cust-' + Date.now();
    await window.HAMIX_Workflow.transitionTo(lead, window.HAMIX_Workflow.STAGES.CUSTOMER);

    // The workflow engine will handle the rest of the stages automatically
};

window.reprocessCustomer = async (index) => {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const customer = customers[index];

    if (!customer) return;

    showProgressOverlay(customer.businessName);
    await window.HAMIX_Workflow.transitionTo(customer, window.HAMIX_Workflow.STAGES.AI_PROCESSING);
};

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

    // Simulate/Track progress via workflow events
    window.addEventListener('hamix:workflow-update', function handler(e) {
        const c = e.detail.customer;
        if (c.businessName !== businessName) return;

        updateStep('step-ai', c.status, 'AI Processing');
        updateStep('step-gen', c.status, 'Website Generation');
        updateStep('step-dep', c.status, 'Deployment Package');

        if (c.status === 'Ready for Publishing') {
            setTimeout(() => {
                overlay.remove();
                window.removeEventListener('hamix:workflow-update', handler);
            }, 1000);
        }
    });
}

function updateStep(id, currentStatus, targetStatus) {
    const el = document.getElementById(id);
    if (!el) return;

    const stages = [
        'AI Processing',
        'Website Generation',
        'Deployment Package',
        'Ready for Publishing'
    ];

    const currentIndex = stages.indexOf(currentStatus);
    const targetIndex = stages.indexOf(targetStatus);

    if (currentIndex > targetIndex) {
        el.className = 'progress-step completed';
        el.innerHTML = `<i data-lucide="check-circle" style="color: #10b981"></i> ${el.innerText}`;
    } else if (currentIndex === targetIndex) {
        el.className = 'progress-step active';
        el.innerHTML = `<i data-lucide="loader" class="spin"></i> ${el.innerText}`;
    }

    if (window.lucide) lucide.createIcons();
}

// Global functions for actions
window.previewWebsite = (index) => {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const customer = customers[index];

    if (!customer) return;

    const html = window.HAMIX_Engine.generateWebsite(customer, 'Default', 'Indigo', { baseHref: '../' });

    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    modal.innerHTML = `
        <div class="preview-modal-header">
            <h3>Website Preview: ${customer.businessName}</h3>
            <div class="header-actions">
                <div class="theme-selector">
                    <select onchange="updatePreviewTheme(this.value, ${index})">
                        <option value="Indigo">Indigo Theme</option>
                        <option value="Emerald">Emerald Theme</option>
                        <option value="Slate">Slate Theme</option>
                    </select>
                </div>
                <button onclick="closePreview()" class="btn-close"><i data-lucide="x"></i></button>
            </div>
        </div>
        <div class="preview-iframe-container">
            <iframe id="previewIframe"></iframe>
        </div>
    `;
    document.body.appendChild(modal);

    const iframe = document.getElementById('previewIframe');
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    if (window.lucide) lucide.createIcons();
};

window.updatePreviewTheme = (themeId, index) => {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const customer = customers[index];
    const html = window.HAMIX_Engine.generateWebsite(customer, 'Default', themeId, { baseHref: '../' });

    const iframe = document.getElementById('previewIframe');
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
};

window.closePreview = () => {
    const modal = document.querySelector('.preview-modal');
    if (modal) modal.remove();
};

window.downloadWebsite = (index) => {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const customer = customers[index];
    const html = window.HAMIX_Engine.generateWebsite(customer);

    const pkg = window.HAMIX_Deployment.prepareDeployment(customer, html, 'Indigo');
    window.HAMIX_Deployment.downloadPackage(pkg);
};

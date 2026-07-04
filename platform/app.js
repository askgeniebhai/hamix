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
        case 'operations':
            renderOperations(contentBody);
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
    let customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');

    // Apply Filters (Simulated - would be triggered by UI events)
    const urlParams = new URLSearchParams(window.location.search);
    const filterStatus = urlParams.get('status');
    const searchQuery = urlParams.get('q');

    if (filterStatus && filterStatus !== 'All') {
        customers = customers.filter(c => c.status === filterStatus);
    }
    if (searchQuery) {
        customers = customers.filter(c => c.businessName.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    container.innerHTML = `
        <div class="filters-bar">
            <div class="filter-group">
                <i data-lucide="search" style="width: 16px;"></i>
                <input type="text" placeholder="Search customers..." id="custSearch" onkeyup="handleCustomerSearch(event)" value="${searchQuery || ''}">
            </div>
            <div class="filter-group">
                <span>Status:</span>
                <select onchange="handleStatusFilter(this.value)">
                    <option value="All" ${filterStatus === 'All' ? 'selected' : ''}>All</option>
                    <option value="Ready for Publishing" ${filterStatus === 'Ready for Publishing' ? 'selected' : ''}>Ready</option>
                    <option value="Published" ${filterStatus === 'Published' ? 'selected' : ''}>Published</option>
                    <option value="Updated" ${filterStatus === 'Updated' ? 'selected' : ''}>Updated</option>
                    <option value="Offline" ${filterStatus === 'Offline' ? 'selected' : ''}>Offline</option>
                </select>
            </div>
        </div>

        ${customers.length === 0 ? `
            <div class="empty-state">
                <i data-lucide="users" style="width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 24px;"></i>
                <h2>No customers found</h2>
                <p>Try adjusting your filters or search.</p>
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
                        ${customers.map((c, index) => {
                            const statusClass = (c.status || 'Published').toLowerCase().replace(/\s+/g, '-');
                            const lastActivity = c.updatedAt || c.lastPublished || 'N/A';
                            return `
                            <tr>
                                <td>
                                    <div class="customer-info-cell">
                                        <strong>${c.businessName}</strong>
                                        <span>${c.email}</span>
                                    </div>
                                </td>
                                <td><span class="badge badge-${statusClass}">${c.status || 'Published'}</span></td>
                                <td><span style="font-size: 12px; color: var(--text-muted)">${new Date(lastActivity).toLocaleDateString()}</span></td>
                                <td>
                                    <div class="action-btns">
                                        <button class="btn-icon" onclick="previewWebsiteById('${c.id}')" title="Preview"><i data-lucide="eye"></i></button>
                                        <button class="btn-icon" onclick="publishWebsite('${c.id}')" title="Publish/Update"><i data-lucide="upload-cloud"></i></button>
                                        <button class="btn-icon" onclick="unpublishWebsite('${c.id}')" title="Take Offline"><i data-lucide="cloud-off"></i></button>
                                        <button class="btn-icon" onclick="archiveWebsite('${c.id}')" title="Archive"><i data-lucide="archive"></i></button>
                                        <button class="btn-icon" onclick="deleteCustomer('${c.id}')" title="Delete" style="color: #ef4444"><i data-lucide="trash-2"></i></button>
                                    </div>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
    if (window.lucide) lucide.createIcons();
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

/**
 * Operations Rendering & Logic
 */

function renderOperations(container) {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const publishedToday = customers.filter(c => {
        if (!c.lastPublished) return false;
        const pubDate = new Date(c.lastPublished);
        const today = new Date();
        return pubDate.toDateString() === today.toDateString();
    }).length;

    const pending = customers.filter(c => c.status === 'Ready for Publishing').length;
    const failures = window.HAMIX_Operations.deploymentQueue.filter(j => j.status === 'Error').length;

    container.innerHTML = `
        <div class="welcome-section">
            <h2>Operations Centre</h2>
            <p>Manage platform-wide deployments and website health.</p>
        </div>

        <div class="dashboard-grid" style="margin-bottom: 32px;">
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="globe"></i></div>
                <div class="stat-data">
                    <h3>Total Websites</h3>
                    <p class="stat-value">${customers.length}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="check-circle"></i></div>
                <div class="stat-data">
                    <h3>Published Today</h3>
                    <p class="stat-value">${publishedToday}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="clock"></i></div>
                <div class="stat-data">
                    <h3>Pending Publishing</h3>
                    <p class="stat-value">${pending}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #fee2e2; color: #dc2626;"><i data-lucide="alert-circle"></i></div>
                <div class="stat-data">
                    <h3>Deployment Failures</h3>
                    <p class="stat-value">${failures}</p>
                </div>
            </div>
        </div>

        <div class="ops-grid">
            <div class="ops-card">
                <h3><i data-lucide="loader"></i> Active Deployment Queue</h3>
                <div class="queue-list" id="deploymentQueue">
                    ${renderQueueList()}
                </div>
            </div>
            <div class="ops-card">
                <h3><i data-lucide="terminal"></i> Deployment Logs</h3>
                <div class="log-container" id="deploymentLogs">
                    ${renderLogs()}
                </div>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderQueueList() {
    const queue = window.HAMIX_Operations.deploymentQueue;
    if (queue.length === 0) return '<p style="color: var(--text-muted); font-size: 14px;">No active deployments.</p>';

    return queue.slice(0, 5).map(job => `
        <div class="queue-item">
            <div class="queue-item-header">
                <strong>${job.businessName}</strong>
                <span class="badge badge-${job.status.toLowerCase()}">${job.status}</span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${job.progress}%"></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                <span>${job.type}</span>
                ${job.status === 'Error' ? `<a href="#" onclick="retryJob('${job.id}')" style="color: var(--primary-color)">Retry</a>` : ''}
            </div>
        </div>
    `).join('');
}

function renderLogs() {
    const queue = window.HAMIX_Operations.deploymentQueue;
    const allLogs = queue.flatMap(j => j.logs).reverse();
    if (allLogs.length === 0) return '<div class="log-entry">Waiting for activity...</div>';
    return allLogs.slice(0, 50).map(log => `<div class="log-entry">${log}</div>`).join('');
}

// UI Event Handlers
window.handleStatusFilter = (status) => {
    const url = new URL(window.location);
    url.searchParams.set('status', status);
    window.history.pushState({}, '', url);
    renderPage('customers');
};

window.handleCustomerSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'blur' || e.target.value === '') {
        const url = new URL(window.location);
        url.searchParams.set('q', e.target.value);
        window.history.pushState({}, '', url);
        renderPage('customers');
    }
};

window.publishWebsite = async (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer) {
        await window.HAMIX_Operations.publishWebsite(customer);
    }
};

window.unpublishWebsite = async (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer && confirm('Take this website offline?')) {
        await window.HAMIX_Operations.unpublishWebsite(customer);
    }
};

window.archiveWebsite = async (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer && confirm('Archive this customer?')) {
        await window.HAMIX_Operations.archiveWebsite(customer);
    }
};

window.deleteCustomer = async (id) => {
    if (confirm('Permanently delete this customer and all data? This cannot be undone.')) {
        await window.HAMIX_Operations.deleteCustomer(id);
    }
};

window.retryJob = (id) => {
    window.HAMIX_Operations.retryDeployment(id);
};

window.previewWebsiteById = (id) => {
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    const index = customers.findIndex(c => c.id === id);
    if (index !== -1) window.previewWebsite(index);
};

// Listen for operations updates to refresh components
window.addEventListener('hamix:operations-update', (e) => {
    const activePage = document.querySelector('.sidebar-nav li.active span').innerText.toLowerCase();
    if (activePage === 'operations') {
        const queueContainer = document.getElementById('deploymentQueue');
        const logsContainer = document.getElementById('deploymentLogs');
        if (queueContainer) queueContainer.innerHTML = renderQueueList();
        if (logsContainer) logsContainer.innerHTML = renderLogs();
    }
});

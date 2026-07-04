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
    const currentUser = window.HAMIX_Admin.getCurrentUser();

    headerTitle.innerText = page.charAt(0).toUpperCase() + page.slice(1);

    // RBAC Check for Page access
    if (page === 'users' && !window.HAMIX_Admin.canPerform(currentUser.role, 'manage_users')) {
        contentBody.innerHTML = '<div class="empty-state"><h2>Access Denied</h2><p>You do not have permission to view this page.</p></div>';
        return;
    }

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
        case 'github deployments':
            renderGithub(contentBody);
            break;
        case 'users':
            renderUsers(contentBody);
            break;
        case 'settings':
            renderSettings(contentBody);
            break;
        case 'audit logs':
            renderAuditLogs(contentBody);
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
    const leads = window.HAMIX_DAL ? window.HAMIX_DAL.getLeads() : [];

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
    let customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];

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

    const userRole = window.HAMIX_Admin.getCurrentUser().role;

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
                                    <div class="action-btns">
                                        <button class="btn-icon" onclick="previewWebsiteById('${c.id}')" title="Preview"><i data-lucide="eye"></i></button>
                                        <button class="btn-icon" onclick="openReviewModal('${c.id}')" title="Review & WhatsApp"><i data-lucide="message-square"></i></button>
                                        <button class="btn-icon" onclick="openOpsModal('${c.id}')" title="Website Operations"><i data-lucide="cog"></i></button>
                                        ${window.HAMIX_Admin.canPerform(userRole, 'rollback_website') ? `<button class="btn-icon" onclick="viewHistory('${c.id}')" title="Version History"><i data-lucide="history"></i></button>` : ''}
                                        ${window.HAMIX_Admin.canPerform(userRole, 'publish_website') ? `<button class="btn-icon" onclick="publishWebsite('${c.id}')" title="Publish/Update"><i data-lucide="upload-cloud"></i></button>` : ''}
                                        ${window.HAMIX_Admin.canPerform(userRole, 'manage_customers') ? `
                                            <button class="btn-icon" onclick="unpublishWebsite('${c.id}')" title="Take Offline"><i data-lucide="cloud-off"></i></button>
                                            <button class="btn-icon" onclick="deleteCustomer('${c.id}')" title="Delete" style="color: #ef4444"><i data-lucide="trash-2"></i></button>
                                        ` : ''}
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
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
    const leads = window.HAMIX_DAL ? window.HAMIX_DAL.getLeads() : [];

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
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
    const leads = window.HAMIX_DAL ? window.HAMIX_DAL.getLeads() : [];

    if (customers.length === 0 && leads.length === 0) {
        fetch('../customers/neela-security-force.json')
            .then(res => res.json())
            .then(data => {
                // Store original lead for reference
                const leadData = {
                    businessName: data.businessName,
                    category: data.category,
                    phone: data.phone,
                    website: data.website,
                    address: data.address,
                    rating: data.rating,
                    reviews: data.reviews,
                    logo: data.logo
                };

                // Use the new Import Engine logic
                window.HAMIX_Operations.importFromGoogleMaps([leadData]);
            })
            .catch(err => console.error('Error loading sample data:', err));
    }
}

// Workflow Actions
window.convertLead = async (index) => {
    const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');
    const lead = leads[index];
    if (lead) await window.convertLeadById(lead.id);
};

window.convertLeadById = async (id) => {
    const dal = window.HAMIX_DAL;
    if (!dal) return;

    const leads = dal.getLeads();
    const index = leads.findIndex(l => l.id === id);
    const lead = leads[index];

    if (!lead) return;

    // Show Progress Overlay
    showProgressOverlay(lead.businessName);

    // 1. Move from Leads to Customers
    leads.splice(index, 1);
    dal.saveLeads(leads);

    if (!lead.id.startsWith('cust-')) {
        lead.id = 'cust-' + Date.now() + '-' + Math.floor(Math.random()*1000);
    }

    await window.HAMIX_Workflow.transitionTo(lead, window.HAMIX_Workflow.STAGES.CUSTOMER);
};

window.reprocessCustomer = async (index) => {
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
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
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
    const customer = customers[index];
    if (!customer) return;

    const html = window.HAMIX_Engine.generateWebsite(customer, 'Default', 'Indigo', { baseHref: '../' });
    if (window.HAMIX_Modals) window.HAMIX_Modals.openPreview(customer.id, html, index);
};

window.updatePreviewTheme = (themeId, index) => {
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
    const customer = customers[index];
    const html = window.HAMIX_Engine.generateWebsite(customer, 'Default', themeId, { baseHref: '../' });

    const iframe = document.getElementById('previewIframe');
    if (iframe) {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();
    }
};

window.closePreview = () => {
    if (window.HAMIX_Modals) window.HAMIX_Modals.closeAll();
};

window.openReviewModal = (id) => {
    if (window.HAMIX_Modals) window.HAMIX_Modals.openReview(id);
};

window.approveAndSend = async (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    const phone = document.getElementById('reviewPhone').value;
    const message = document.getElementById('reviewMessage').value;

    if (!customer || !phone || !message) return;

    // 1. Update Record with Approval
    const timestamp = new Date().toISOString();
    customer.whatsappApproval = {
        approvedAt: timestamp,
        phone: phone,
        message: message,
        status: 'Sent'
    };

    // Add to activity history (Comprehensive Permanent Record)
    if (!customer.history) customer.history = [];
    customer.history.push({
        stage: 'WhatsApp Approved',
        timestamp: timestamp,
        detail: 'User approved outreach message and triggered WhatsApp deep link',
        metadata: {
            approvedPhone: phone,
            approvedMessage: message
        }
    });

    customer.status = 'Contacted';
    window.HAMIX_Operations.saveCustomer(customer);

    // 2. Log Activity
    if (window.HAMIX_Admin) {
        window.HAMIX_Admin.logActivity('Admin User', 'Approved outreach & initiated WhatsApp', customer.businessName);
    }

    // 3. Open WhatsApp Deep Link
    const waUrl = `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // 4. Cleanup & Feedback
    closePreview();
    renderPage('customers');
};

window.openOpsModal = (id) => {
    if (window.HAMIX_Modals) window.HAMIX_Modals.openOperations(id);
};

window.cloneCust = async (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer && confirm('Create a duplicate of this website?')) {
        await window.HAMIX_Operations.cloneWebsite(customer);
        closePreview();
        renderPage('customers');
    }
};

window.exportCust = async (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer) {
        const data = await window.HAMIX_Operations.exportWebsite(customer);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hamix_export_${customer.id}.json`;
        a.click();
    }
};

window.createBackup = (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer) {
        window.HAMIX_Operations.createVersion(customer);
        alert('Website backup (Version ' + customer.currentVersion + ') created successfully.');
        openOpsModal(id); // Refresh
    }
};

window.viewHistory = (id) => {
    if (window.HAMIX_Modals) window.HAMIX_Modals.openHistory(id);
};

window.rollback = async (id, version) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (customer && confirm(`Rollback to version ${version}? Current published site will be replaced.`)) {
        await window.HAMIX_Operations.rollbackToVersion(customer, version);
        closePreview();
        alert(`Rollback to v${version} initiated.`);
    }
};

window.downloadWebsite = (index) => {
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
    const customer = customers[index];
    const html = window.HAMIX_Engine.generateWebsite(customer);

    const pkg = window.HAMIX_Deployment.prepareDeployment(customer, html, 'Indigo');
    window.HAMIX_Deployment.downloadPackage(pkg);
};

/**
 * Operations Rendering & Logic
 */

function renderOperations(container) {
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
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
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
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

/**
 * Admin & Settings Rendering
 */

function renderUsers(container) {
    const users = window.HAMIX_Admin.users;
    const user = window.HAMIX_Admin.getCurrentUser();
    const canManage = window.HAMIX_Admin.canPerform(user.role, 'manage_users');

    container.innerHTML = `
        <div class="welcome-section">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>Platform Users</h2>
                    <p>Manage access and roles for your platform staff.</p>
                </div>
                ${canManage ? `<button class="btn btn-primary" onclick="alert('Invite user feature coming soon.')"><i data-lucide="user-plus"></i> Invite User</button>` : ''}
            </div>
        </div>

        <div class="user-card-grid">
            ${users.map(u => `
                <div class="user-card">
                    <div class="user-card-avatar" style="background: ${u.status === 'Inactive' ? '#94a3b8' : 'var(--primary-color)'}">${u.avatar}</div>
                    <div class="user-card-info">
                        <h4>${u.name}</h4>
                        <p>${u.email}</p>
                        <span class="user-role-badge">${u.role}</span>
                        <span style="font-size: 11px; margin-left: 8px; color: ${u.status === 'Active' ? '#10b981' : '#f43f5e'}">${u.status}</span>
                    </div>
                    ${canManage ? `<button class="btn-icon" style="position: absolute; top: 12px; right: 12px;" onclick="window.HAMIX_Admin.deleteUser('${u.id}')"><i data-lucide="trash-2"></i></button>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderSettings(container) {
    const config = window.HAMIX_Admin.loadSettings();

    container.innerHTML = `
        <div class="welcome-section">
            <h2>Platform Settings</h2>
            <p>Configure workspace defaults, AI parameters, and deployment targets.</p>
        </div>

        <div class="settings-tabs">
            <div class="settings-tab active" onclick="switchSettingsTab('workspace')">Workspace</div>
            <div class="settings-tab" onclick="switchSettingsTab('ai')">AI Engine</div>
            <div class="settings-tab" onclick="switchSettingsTab('deployment')">Deployment</div>
            <div class="settings-tab" onclick="switchSettingsTab('audit')">Audit Trail</div>
        </div>

        <div id="settingsPanel" class="settings-panel">
            ${renderWorkspaceSettings(config)}
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderAuditLogs(container) {
    const logs = window.HAMIX_Admin.getAuditLogs();

    container.innerHTML = `
        <div class="welcome-section">
            <h2>Audit Trail</h2>
            <p>Platform-wide activity and security logs.</p>
        </div>

        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Target</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 20px;">No activity logs found.</td></tr>' : logs.map(l => `
                        <tr>
                            <td><span style="font-size: 11px; color: var(--text-muted)">${new Date(l.timestamp).toLocaleString()}</span></td>
                            <td><strong>${l.user}</strong></td>
                            <td>${l.action}</td>
                            <td><span class="badge badge-muted">${l.target}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderWorkspaceSettings(config) {
    return `
        <div class="settings-section">
            <h4>General Information</h4>
            <div class="form-group">
                <label>Workspace Name</label>
                <input type="text" value="${config.workspace.name}" onchange="updateConfig('workspace', 'name', this.value)">
            </div>
            <div class="form-group">
                <label>Organization Email</label>
                <input type="email" value="${config.workspace.orgEmail}" onchange="updateConfig('workspace', 'orgEmail', this.value)">
            </div>
        </div>

        <div class="settings-section">
            <h4>Branding & Identity</h4>
            <div class="form-group">
                <label>Organization Logo (URL)</label>
                <input type="text" value="${config.workspace.orgLogo}" placeholder="https://..." onchange="updateConfig('workspace', 'orgLogo', this.value)">
            </div>
            <div class="form-group">
                <label>Primary Brand Color</label>
                <div style="display: flex; gap: 8px;">
                    <input type="color" value="${config.workspace.orgPrimaryColor}" onchange="updateConfig('workspace', 'orgPrimaryColor', this.value)" style="width: 40px; padding: 0; border: none; height: 40px;">
                    <input type="text" value="${config.workspace.orgPrimaryColor}" onchange="updateConfig('workspace', 'orgPrimaryColor', this.value)">
                </div>
            </div>
        </div>
        <div class="settings-section">
            <h4>Defaults & Regions</h4>
            <div class="form-group">
                <label>Default Branding Theme</label>
                <select onchange="updateConfig('workspace', 'branding', this.value)">
                    <option value="Indigo" ${config.workspace.branding === 'Indigo' ? 'selected' : ''}>Indigo (SaaS Default)</option>
                    <option value="Emerald" ${config.workspace.branding === 'Emerald' ? 'selected' : ''}>Emerald (Growth)</option>
                    <option value="Slate" ${config.workspace.branding === 'Slate' ? 'selected' : ''}>Slate (Corporate)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Primary Deployment Region</label>
                <select onchange="updateConfig('workspace', 'deploymentRegion', this.value)">
                    <option value="EU-West-1">EU-West-1 (Dublin)</option>
                    <option value="US-East-1">US-East-1 (N. Virginia)</option>
                    <option value="AP-Southeast-1">AP-Southeast-1 (Singapore)</option>
                </select>
            </div>
        </div>
        <button class="btn btn-primary" onclick="alert('Settings saved successfully!')">Save Changes</button>
    `;
}

window.switchSettingsTab = (tab) => {
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');

    const panel = document.getElementById('settingsPanel');
    const config = window.HAMIX_Admin.config;

    if (tab === 'workspace') {
        panel.innerHTML = renderWorkspaceSettings(config);
    } else if (tab === 'audit') {
        renderAuditLogs(panel);
    } else if (tab === 'ai') {
        panel.innerHTML = `
            <div class="form-group">
                <label>AI Model</label>
                <select onchange="updateConfig('ai', 'engine', this.value)">
                    <option value="GPT-4o">GPT-4o (Recommended)</option>
                    <option value="GPT-4-Turbo">GPT-4 Turbo</option>
                    <option value="Claude-3.5-Sonnet">Claude 3.5 Sonnet</option>
                </select>
            </div>
            <div class="form-group">
                <label>Creativity (Temperature)</label>
                <input type="range" min="0" max="1" step="0.1" value="${config.ai.temperature}" onchange="updateConfig('ai', 'temperature', this.value)">
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
                    <span>Precise</span>
                    <span>Creative</span>
                </div>
            </div>
        `;
    } else if (tab === 'deployment') {
        panel.innerHTML = `
            <div class="form-group">
                <label>Deployment Provider</label>
                <input type="text" value="${config.deployment.provider}" disabled>
            </div>
            <div class="form-group">
                <label>GitHub Repository Prefix</label>
                <input type="text" value="${config.deployment.repoPrefix}" onchange="updateConfig('deployment', 'repoPrefix', this.value)">
            </div>
        `;
    }
};

window.updateConfig = (section, key, value) => {
    window.HAMIX_Admin.config[section][key] = value;
    window.HAMIX_Admin.saveSettings(window.HAMIX_Admin.config);
};

window.addEventListener('hamix:admin-update', () => {
    const activePage = document.querySelector('.sidebar-nav li.active span').innerText.toLowerCase();
    if (activePage === 'users') renderUsers(document.querySelector('.content-body'));
});

/**
 * Global Search UI Logic
 */

window.handleGlobalSearch = (query) => {
    const results = window.HAMIX_Admin.globalSearch(query);
    const overlay = document.getElementById('searchResults');

    if (!results || query.length < 2) {
        overlay.classList.remove('active');
        return;
    }

    let html = '';

    if (results.customers.length > 0) {
        html += '<div class="search-section-header">Customers</div>';
        results.customers.forEach(c => {
            html += `
                <div class="search-item" onclick="navigateTo('customers', '${c.id}')">
                    <i data-lucide="user-check"></i>
                    <div class="search-item-info">
                        <strong>${c.businessName}</strong>
                        <span>${c.status}</span>
                    </div>
                </div>
            `;
        });
    }

    if (results.leads.length > 0) {
        html += '<div class="search-section-header">Leads</div>';
        results.leads.forEach(l => {
            html += `
                <div class="search-item" onclick="navigateTo('leads')">
                    <i data-lucide="users"></i>
                    <div class="search-item-info">
                        <strong>${l.businessName}</strong>
                        <span>${l.category}</span>
                    </div>
                </div>
            `;
        });
    }

    if (results.users.length > 0) {
        html += '<div class="search-section-header">Staff</div>';
        results.users.forEach(u => {
            html += `
                <div class="search-item" onclick="navigateTo('users')">
                    <i data-lucide="shield-check"></i>
                    <div class="search-item-info">
                        <strong>${u.name}</strong>
                        <span>${u.role}</span>
                    </div>
                </div>
            `;
        });
    }

    if (results.logs && results.logs.length > 0) {
        html += '<div class="search-section-header">Audit Logs</div>';
        results.logs.forEach(l => {
            html += `
                <div class="search-item" onclick="navigateTo('audit logs')">
                    <i data-lucide="activity"></i>
                    <div class="search-item-info">
                        <strong>${l.action}</strong>
                        <span>${l.target} - ${new Date(l.timestamp).toLocaleDateString()}</span>
                    </div>
                </div>
            `;
        });
    }

    if (html === '') {
        html = '<div style="padding: 16px; font-size: 13px; color: var(--text-muted);">No results found.</div>';
    }

    overlay.innerHTML = html;
    overlay.classList.add('active');
    if (window.lucide) lucide.createIcons();
};

window.navigateTo = (page, id = null) => {
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('globalSearchInput').value = '';

    // Update sidebar active state
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    navLinks.forEach(link => {
        const span = link.querySelector('span');
        if (span && span.innerText.toLowerCase() === page) {
            document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');
        }
    });

    renderPage(page);
};

// Close search overlay on click outside
document.addEventListener('click', (e) => {
    const searchBar = document.querySelector('.search-bar');
    if (!searchBar.contains(e.target)) {
        document.getElementById('searchResults').classList.remove('active');
    }
});

/**
 * GitHub Deployments Rendering
 */

function renderGithub(container) {
    const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
    const deployments = customers.filter(c => c.isPublished);

    container.innerHTML = `
        <div class="welcome-section">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>GitHub Deployments</h2>
                    <p>Track the synchronization state of customer repositories.</p>
                </div>
                <button class="btn btn-primary" onclick="alert('Connect GitHub Organization feature coming soon.')"><i data-lucide="github"></i> Connect Org</button>
            </div>
        </div>

        <div class="dashboard-grid" style="margin-bottom: 32px;">
            <div class="stat-card">
                <div class="stat-icon"><i data-lucide="git-branch"></i></div>
                <div class="stat-data">
                    <h3>Active Repos</h3>
                    <p class="stat-value">${deployments.length}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="color: #10b981"><i data-lucide="server"></i></div>
                <div class="stat-data">
                    <h3>Environment Health</h3>
                    <p class="stat-value">Healthy</p>
                </div>
            </div>
        </div>

        <div class="data-table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Repository</th>
                        <th>Environment</th>
                        <th>Last Commit</th>
                        <th>Build Status</th>
                        <th>URL</th>
                    </tr>
                </thead>
                <tbody>
                    ${deployments.length === 0 ? `
                        <tr><td colspan="5" style="text-align: center; padding: 32px; color: var(--text-muted);">No active GitHub deployments found.</td></tr>
                    ` : deployments.map(d => `
                        <tr>
                            <td>
                                <strong>hamix-client-${d.id.split('-')[1] || d.id}</strong><br>
                                <span style="font-size: 11px; color: var(--text-muted)">main</span>
                            </td>
                            <td>Production</td>
                            <td>${new Date(d.lastPublished).toLocaleTimeString()}</td>
                            <td><span class="badge badge-published">Success</span></td>
                            <td><a href="#" style="color: var(--primary-color); font-size: 12px;"><i data-lucide="external-link" style="width: 12px;"></i> View Site</a></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

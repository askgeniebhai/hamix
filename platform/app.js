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
                        <option value="Rose">Rose Theme</option>
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
    const modal = document.querySelector('.preview-modal, .history-modal, .ops-modal, .review-modal');
    if (modal) modal.remove();
};

window.openReviewModal = (id) => {
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (!customer) return;

    const modal = document.createElement('div');
    modal.className = 'review-modal';
    modal.innerHTML = `
        <div class="preview-modal-header">
            <h3>Final Review & Approval: ${customer.businessName}</h3>
            <button onclick="closePreview()" class="btn-close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body" style="padding: 24px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 350px 1fr 350px; gap: 24px;">

            <!-- Left: Business Intelligence -->
            <div class="review-sidebar">
                <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 24px;">
                    <h4>Business Summary</h4>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">${customer.aiContent?.summary || 'Generating summary...'}</p>
                    <div style="margin-top: 16px; display: flex; gap: 12px;">
                        <div style="flex: 1; text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px;">
                            <strong style="display: block; font-size: 18px; color: var(--primary-color)">${customer.opportunityScore}%</strong>
                            <span style="font-size: 9px; text-transform: uppercase; color: var(--text-muted)">Opp Score</span>
                        </div>
                        <div style="flex: 1; text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px;">
                            <strong style="display: block; font-size: 18px; color: #10b981">${customer.aiConfidenceScore}%</strong>
                            <span style="font-size: 9px; text-transform: uppercase; color: var(--text-muted)">AI Conf</span>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 24px;">
                    <h4>AI Recommendations</h4>
                    <ul style="font-size: 12px; margin-top: 12px; padding-left: 16px; color: var(--text-muted)">
                        ${(customer.aiRecommendations || []).map(r => `<li>${r}</li>`).join('') || '<li>No specific recommendations.</li>'}
                    </ul>
                </div>

                <div class="card" style="padding: 20px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px;">
                    <h4 style="color: #be123c;">Missing Information</h4>
                    <div style="font-size: 12px; color: #be123c; margin-top: 8px;">
                        ${(customer.missingInfo || []).map(m => `<span class="badge badge-offline" style="margin-right: 4px; margin-bottom: 4px; display: inline-block;">${m}</span>`).join('') || 'None identified.'}
                    </div>
                </div>
            </div>

            <!-- Centre: Website Preview -->
            <div class="review-main">
                <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; height: 100%; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h4>Generated Homepage</h4>
                        <a href="${customer.liveWebsiteUrl}" target="_blank" class="btn btn-outline btn-sm"><i data-lucide="external-link"></i> View Live</a>
                    </div>
                    <div style="flex: 1; background: #f1f5f9; border-radius: 8px; position: relative; overflow: hidden; border: 1px solid #e2e8f0;">
                         <iframe srcdoc="${customer.generatedHtml?.replace(/"/g, '&quot;')}" style="width: 200%; height: 200%; transform: scale(0.5); transform-origin: top left; border: none;"></iframe>
                         <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer;" onclick="previewWebsiteById('${customer.id}')"></div>
                    </div>
                </div>
            </div>

            <!-- Right: Outreach Control -->
            <div class="review-sidebar">
                <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; height: 100%;">
                    <h4>Personalized Outreach</h4>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px; margin-bottom: 20px;">Personalize and approve the outreach script.</p>

                    <div class="form-group">
                        <label>Target Phone</label>
                        <input type="text" value="${customer.phone || ''}" id="reviewPhone">
                    </div>

                    <div class="form-group">
                        <label>WhatsApp Message</label>
                        <textarea id="reviewMessage" rows="12" style="font-family: inherit; resize: none; line-height: 1.5; font-size: 13px;">${customer.aiContent?.outreach?.whatsapp || ''}</textarea>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
                        <button class="btn btn-primary" style="justify-content: center; padding: 12px; width: 100%;" onclick="approveAndSend('${customer.id}')">
                            <i data-lucide="check-circle"></i> Approve & Send
                        </button>
                        <button class="btn btn-outline" style="justify-content: center;" onclick="alert('Saving draft script...')">
                            <i data-lucide="save"></i> Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
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
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (!customer) return;

    const modal = document.createElement('div');
    modal.className = 'ops-modal';
    modal.innerHTML = `
        <div class="preview-modal-header">
            <h3>Website Operations: ${customer.businessName}</h3>
            <button onclick="closePreview()" class="btn-close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body" style="padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="ops-section">
                <h4>Management</h4>
                <div class="ops-btn-group">
                    <button class="btn btn-outline" onclick="cloneCust('${customer.id}')"><i data-lucide="copy"></i> Clone Website</button>
                    <button class="btn btn-outline" onclick="exportCust('${customer.id}')"><i data-lucide="download"></i> Export Package</button>
                    <button class="btn btn-outline" onclick="createBackup('${customer.id}')"><i data-lucide="database"></i> Create Backup</button>
                    <button class="btn btn-outline" onclick="archiveWebsite('${customer.id}')"><i data-lucide="archive"></i> Archive Website</button>
                </div>

                <h4 style="margin-top: 24px;">SEO & Metadata</h4>
                <div class="form-group">
                    <label>SEO Title</label>
                    <input type="text" value="${customer.seoTitle || ''}" placeholder="Meta Title">
                </div>
                <div class="form-group">
                    <label>SEO Description</label>
                    <textarea placeholder="Meta Description">${customer.seoDescription || ''}</textarea>
                </div>
            </div>

            <div class="ops-section">
                <h4>Domain & SSL</h4>
                <div class="status-list">
                    <div class="status-item">
                        <span>Custom Domain</span>
                        <span class="badge badge-muted">Not Connected</span>
                    </div>
                    <div class="status-item">
                        <span>SSL Certificate</span>
                        <span class="badge badge-muted">Inactive</span>
                    </div>
                    <div class="status-item">
                        <span>DNS Status</span>
                        <span class="badge badge-muted">Waiting</span>
                    </div>
                </div>

                <h4 style="margin-top: 24px;">Analytics Overview</h4>
                <div class="mini-stats">
                    <div class="mini-stat">
                        <strong>${customer.stats?.visitors || 0}</strong>
                        <span>Visitors</span>
                    </div>
                    <div class="mini-stat">
                        <strong>${customer.stats?.leads || 0}</strong>
                        <span>Leads</span>
                    </div>
                    <div class="mini-stat">
                        <strong>${customer.stats?.conversions || 0}</strong>
                        <span>Conversions</span>
                    </div>
                </div>

                <h4 style="margin-top: 24px;">Deployment History</h4>
                <div class="mini-history">
                    ${(customer.history || []).slice(0, 3).map(h => `
                        <div class="history-item">
                            <span>${h.stage}</span>
                            <span>${new Date(h.timestamp).toLocaleDateString()}</span>
                        </div>
                    `).join('') || 'No history yet.'}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
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
    const customer = window.HAMIX_Operations.getCustomer(id);
    if (!customer) return;

    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.innerHTML = `
        <div class="preview-modal-header">
            <h3>Version History: ${customer.businessName}</h3>
            <button onclick="closePreview()" class="btn-close"><i data-lucide="x"></i></button>
        </div>
        <div class="modal-body" style="padding: 24px;">
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ver</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Theme</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(customer.versions || []).map(v => `
                            <tr>
                                <td><strong>v${v.version}</strong></td>
                                <td><span style="font-size: 11px;">${new Date(v.timestamp).toLocaleString()}</span></td>
                                <td><span class="badge badge-${v.status.toLowerCase()}">${v.status}</span></td>
                                <td>${v.theme}</td>
                                <td>
                                    <button class="btn btn-primary btn-sm" onclick="rollback('${customer.id}', ${v.version})">Rollback</button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" style="text-align:center">No version history found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
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
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
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

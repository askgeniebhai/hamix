/**
 * HAMIX CRM Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    initNavigation();
    loadDashboardStats();

    // Check if we have default customer data
    loadInitialData();
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
                    ${customers.map((c, index) => `
                        <tr>
                            <td>
                                <div class="customer-info-cell">
                                    <strong>${c.businessName}</strong>
                                    <span>${c.email}</span>
                                </div>
                            </td>
                            <td>${c.category || 'Security'}</td>
                            <td><span class="badge badge-published">Published</span></td>
                            <td>
                                <div class="action-btns">
                                    <button class="btn-icon" onclick="previewWebsite(${index})" title="Preview Website"><i data-lucide="eye"></i></button>
                                    <button class="btn-icon" onclick="downloadWebsite(${index})" title="Download Package"><i data-lucide="download"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
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

    if (leadsStat) leadsStat.innerText = leads.length;
    if (customersStat) customersStat.innerText = customers.length;
    if (websitesStat) websitesStat.innerText = customers.length;
}

function loadInitialData() {
    // If no customers, add the sample one
    const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
    if (customers.length === 0) {
        fetch('../customers/neela-security-force.json')
            .then(res => res.json())
            .then(data => {
                localStorage.setItem('hamix_customers', JSON.stringify([data]));
                loadDashboardStats();
            })
            .catch(err => console.error('Error loading sample data:', err));
    }
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

/**
 * HAMIX Platform - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        currentPage: 'dashboard',
        leads: JSON.parse(localStorage.getItem('hamix_leads')) || [],
        customers: JSON.parse(localStorage.getItem('hamix_customers')) || [],
        filters: {
            leads: { search: '', status: 'all', sort: 'newest' },
            customers: { search: '', sort: 'newest' }
        }
    };

    // UI Elements
    const pages = document.querySelectorAll('.page');
    const navItems = document.querySelectorAll('.sidebar-nav li');
    const headerTitle = document.querySelector('.header-left h1');

    // Navigation Logic
    const navigateTo = (pageId) => {
        // Update State
        state.currentPage = pageId;

        // Update UI: Pages
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === `page-${pageId}`) {
                page.classList.add('active');
            }
        });

        // Update UI: Sidebar
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            }
        });

        // Update UI: Header Title
        headerTitle.textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);

        // Refresh page content
        if (pageId === 'dashboard') updateDashboard();
        if (pageId === 'leads') renderLeads();
        if (pageId === 'customers') renderCustomers();

        // Re-initialize icons for new content if necessary
        if (window.lucide) {
            window.lucide.createIcons();
        }
    };

    // Sidebar Navigation Click Handlers
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            if (pageId) navigateTo(pageId);
        });
    });

    // Modal Logic
    const modals = {
        lead: document.getElementById('modal-lead'),
        import: document.getElementById('modal-import'),
        preview: document.getElementById('modal-preview')
    };

    const openModal = (modalId) => {
        if (modals[modalId]) {
            modals[modalId].classList.add('active');
        }
    };

    const closeModal = (modalId) => {
        if (modals[modalId]) {
            modals[modalId].classList.remove('active');
        } else {
            // Close any active modal if modalId not specified
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
    };

    // Modal Event Listeners
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeModal());
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });

    // Form Submissions
    const leadForm = document.getElementById('form-lead');
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

        if (leadId) {
            // Update Existing
            const index = state.leads.findIndex(l => l.id === leadId);
            if (index !== -1) {
                const oldStatus = state.leads[index].status;
                state.leads[index] = { ...state.leads[index], ...formData, updatedAt: new Date().toISOString() };
                LeadEngine.validateLead(state.leads[index], state.leads);

                // Handle conversion to customer if status becomes Approved
                if (oldStatus !== 'Approved' && formData.status === 'Approved') {
                    const customer = LeadEngine.createCustomer(state.leads[index]);
                    state.customers.push(customer);
                    saveCustomers();
                }
            }
        } else {
            // Create New
            const newLead = LeadEngine.createLead(formData);
            LeadEngine.validateLead(newLead, state.leads);
            state.leads.push(newLead);
        }

        saveLeads();
        closeModal('lead');
        leadForm.reset();
        delete leadForm.dataset.editId;

        if (state.currentPage === 'leads') renderLeads();
        if (state.currentPage === 'customers') renderCustomers();
        updateDashboard();
    });

    // Helper: Save Leads to LocalStorage
    const saveLeads = () => {
        localStorage.setItem('hamix_leads', JSON.stringify(state.leads));
    };

    const saveCustomers = () => {
        localStorage.setItem('hamix_customers', JSON.stringify(state.customers));
    };

    // Helper: Update Dashboard Stats
    const updateDashboard = () => {
        const totalLeads = state.leads.length;
        const totalCustomers = state.customers.length;
        const approvedLeads = state.leads.filter(l => l.status === 'Approved').length;
        const pendingLeads = state.leads.filter(l => ['New', 'Validated', 'Follow-up'].includes(l.status)).length;

        document.getElementById('stat-total-leads').textContent = totalLeads;
        document.getElementById('stat-total-customers').textContent = totalCustomers;
        document.getElementById('stat-approved-leads').textContent = approvedLeads;
        document.getElementById('stat-pending-leads').textContent = pendingLeads;

        // Render Pipeline Breakdown
        const pipelineContainer = document.getElementById('pipeline-stats');
        const statuses = Object.values(LeadEngine.STATUS);

        pipelineContainer.innerHTML = statuses.map(status => {
            const count = state.leads.filter(l => l.status === status).length;
            return `
                <div class="pipeline-card">
                    <span class="pipeline-label">${status}</span>
                    <span class="pipeline-value">${count}</span>
                </div>
            `;
        }).join('');
    };

    // Helper: Render Leads Table
    const renderLeads = () => {
        const listContainer = document.getElementById('leads-list');
        const filter = state.filters.leads;

        let filteredLeads = state.leads;

        // Apply Status Filter
        if (filter.status !== 'all') {
            filteredLeads = filteredLeads.filter(l => l.status === filter.status);
        }

        // Apply Search
        if (filter.search) {
            const query = filter.search.toLowerCase();
            filteredLeads = filteredLeads.filter(l =>
                l.businessName.toLowerCase().includes(query) ||
                l.category.toLowerCase().includes(query) ||
                l.email.toLowerCase().includes(query)
            );
        }

        // Apply Sort
        filteredLeads.sort((a, b) => {
            if (filter.sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (filter.sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (filter.sort === 'rating') return b.rating - a.rating;
            if (filter.sort === 'name') return a.businessName.localeCompare(b.businessName);
            return 0;
        });

        if (filteredLeads.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="6" class="empty-state">No leads found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = filteredLeads.map(lead => `
            <tr class="clickable-row" data-id="${lead.id}">
                <td><strong>${lead.businessName}</strong></td>
                <td>${lead.category || '-'}</td>
                <td>
                    <div class="contact-info">
                        ${lead.phone ? `<div><i data-lucide="phone" style="width:12px;height:12px"></i> ${lead.phone}</div>` : ''}
                        ${lead.email ? `<div><i data-lucide="mail" style="width:12px;height:12px"></i> ${lead.email}</div>` : ''}
                    </div>
                </td>
                <td>${lead.rating ? `${lead.rating} ★ (${lead.reviews})` : '-'}</td>
                <td><span class="badge badge-${lead.status.toLowerCase().replace(/ /g, '-')}">${lead.status}</span></td>
                <td>
                    <div class="action-group">
                        <button class="btn-icon edit-lead" data-id="${lead.id}"><i data-lucide="edit-2"></i></button>
                        <button class="btn-icon delete-lead" data-id="${lead.id}"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (window.lucide) lucide.createIcons();

        // Add Handlers
        document.querySelectorAll('.delete-lead').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                state.leads = state.leads.filter(l => l.id !== id);
                saveLeads();
                renderLeads();
                updateDashboard();
            });
        });

        document.querySelectorAll('.edit-lead').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openLeadEditor(btn.dataset.id);
            });
        });
    };

    const openLeadEditor = (id) => {
        const lead = state.leads.find(l => l.id === id);
        if (!lead) return;

        document.getElementById('modal-lead-title').textContent = 'Edit Lead';
        leadForm.dataset.editId = id;

        // Fill form
        document.getElementById('lead-businessName').value = lead.businessName;
        document.getElementById('lead-category').value = lead.category;
        document.getElementById('lead-phone').value = lead.phone;
        document.getElementById('lead-whatsapp').value = lead.whatsapp;
        document.getElementById('lead-email').value = lead.email;
        document.getElementById('lead-website').value = lead.website;
        document.getElementById('lead-address').value = lead.address;
        document.getElementById('lead-rating').value = lead.rating;
        document.getElementById('lead-reviews').value = lead.reviews;
        document.getElementById('lead-industry').value = lead.industry;
        document.getElementById('lead-notes').value = lead.notes;
        document.getElementById('lead-assignedTo').value = lead.assignedTo || '';
        document.getElementById('lead-status').value = lead.status;

        openModal('lead');
    };

    // Render Customers Table
    const renderCustomers = () => {
        const listContainer = document.getElementById('customers-list');
        const filter = state.filters.customers;

        let filteredCustomers = state.customers;

        // Apply Search
        if (filter.search) {
            const query = filter.search.toLowerCase();
            filteredCustomers = filteredCustomers.filter(c =>
                c.businessName.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query)
            );
        }

        if (filteredCustomers.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="6" class="empty-state">No customers found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = filteredCustomers.map(cust => `
            <tr>
                <td><strong>${cust.businessName}</strong></td>
                <td>${cust.category || '-'}</td>
                <td>
                    <div class="contact-info">
                        ${cust.phone ? `<div><i data-lucide="phone" style="width:12px;height:12px"></i> ${cust.phone}</div>` : ''}
                        ${cust.email ? `<div><i data-lucide="mail" style="width:12px;height:12px"></i> ${cust.email}</div>` : ''}
                    </div>
                </td>
                <td><a href="${cust.website}" target="_blank" class="link-text">${cust.website || '-'}</a></td>
                <td><span class="badge badge-validated">${cust.status}</span></td>
                <td>${new Date(cust.joinedAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-secondary btn-sm preview-website" data-id="${cust.id}">
                        <i data-lucide="eye"></i> Preview
                    </button>
                </td>
            </tr>
        `).join('');

        if (window.lucide) lucide.createIcons();

        // Preview Handlers
        document.querySelectorAll('.preview-website').forEach(btn => {
            btn.addEventListener('click', () => {
                openWebsitePreview(btn.dataset.id);
            });
        });
    };

    let activePreviewCustomer = null;

    const openWebsitePreview = (customerId) => {
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer) return;

        activePreviewCustomer = customer;
        updatePreviewFrame();
        openModal('preview');
    };

    const updatePreviewFrame = () => {
        if (!activePreviewCustomer) return;

        const theme = document.getElementById('preview-theme-select').value;
        const html = WebsiteGenerator.generate(activePreviewCustomer, theme);

        const frame = document.getElementById('preview-frame');
        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
    };

    document.getElementById('preview-theme-select').addEventListener('change', updatePreviewFrame);

    // Filter Click Handlers
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.leads.status = btn.dataset.filter;
            renderLeads();
        });
    });

    // Search and Sort Handlers
    document.getElementById('search-leads').addEventListener('input', (e) => {
        state.filters.leads.search = e.target.value;
        renderLeads();
    });

    document.getElementById('sort-leads').addEventListener('change', (e) => {
        state.filters.leads.sort = e.target.value;
        renderLeads();
    });

    document.getElementById('search-customers').addEventListener('input', (e) => {
        state.filters.customers.search = e.target.value;
        renderCustomers();
    });

    // Button Handlers
    // CSV Import Logic
    const csvFileInput = document.getElementById('csv-file-input');
    const csvUploadArea = document.getElementById('csv-upload-area');
    const csvMapping = document.getElementById('csv-mapping');
    const csvFieldsList = document.getElementById('csv-fields-list');
    const importTabCSV = document.getElementById('import-tab-csv');
    const importPreview = document.getElementById('import-preview');
    const previewHeader = document.getElementById('preview-header');
    const previewBody = document.getElementById('preview-body');
    const previewCount = document.getElementById('preview-count');

    let csvData = [];
    let csvHeaders = [];
    let pendingLeads = [];

    csvUploadArea.addEventListener('click', () => csvFileInput.click());

    csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                processCSVText(text);
            };
            reader.readAsText(file);
        }
    });

    const processCSVText = (text) => {
        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return;

        csvHeaders = lines[0].split(',').map(h => h.trim());
        csvData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            csvHeaders.forEach((header, i) => {
                obj[header] = values[i];
            });
            return obj;
        });

        renderMapping();
    };

    const renderMapping = () => {
        csvUploadArea.style.display = 'none';
        csvMapping.style.display = 'block';

        const leadFields = [
            { key: 'businessName', label: 'Business Name *' },
            { key: 'category', label: 'Category' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'website', label: 'Website' },
            { key: 'address', label: 'Address' }
        ];

        csvFieldsList.innerHTML = leadFields.map(field => `
            <div class="form-group" style="margin-bottom: 12px;">
                <label>${field.label}</label>
                <select class="csv-field-map" data-lead-field="${field.key}">
                    <option value="">-- Ignore --</option>
                    ${csvHeaders.map(h => `<option value="${h}" ${h.toLowerCase().includes(field.key.toLowerCase()) ? 'selected' : ''}>${h}</option>`).join('')}
                </select>
            </div>
        `).join('');
    };

    document.getElementById('btn-process-csv').addEventListener('click', () => {
        const mapping = {};
        document.querySelectorAll('.csv-field-map').forEach(select => {
            if (select.value) {
                mapping[select.dataset.leadField] = select.value;
            }
        });

        pendingLeads = csvData.map(row => {
            const leadData = {};
            for (const [leadField, csvField] of Object.entries(mapping)) {
                leadData[leadField] = row[csvField];
            }
            const lead = LeadEngine.createLead(leadData);
            return LeadEngine.validateLead(lead, state.leads);
        });

        showPreview();
    });

    const showPreview = () => {
        document.querySelectorAll('.import-tab-content').forEach(c => c.classList.remove('active'));
        importPreview.style.display = 'block';
        previewCount.textContent = pendingLeads.length;

        const displayFields = ['businessName', 'category', 'phone', 'status'];
        previewHeader.innerHTML = displayFields.map(f => `<th>${f}</th>`).join('');
        previewBody.innerHTML = pendingLeads.slice(0, 10).map(lead => `
            <tr>
                ${displayFields.map(f => `<td>${lead[f]}</td>`).join('')}
            </tr>
        `).join('') + (pendingLeads.length > 10 ? `<tr><td colspan="4" style="text-align:center">... and ${pendingLeads.length - 10} more</td></tr>` : '');
    };

    document.getElementById('btn-confirm-import').addEventListener('click', () => {
        state.leads = [...state.leads, ...pendingLeads];
        saveLeads();
        closeModal('import');
        resetImport();
        if (state.currentPage === 'leads') renderLeads();
        updateDashboard();
    });

    document.getElementById('btn-back-to-import').addEventListener('click', () => {
        importPreview.style.display = 'none';
        const activeTab = document.querySelector('.import-tab.active').dataset.tab;
        document.getElementById(`import-tab-${activeTab}`).classList.add('active');
    });

    const resetImport = () => {
        csvUploadArea.style.display = 'block';
        csvMapping.style.display = 'none';
        importPreview.style.display = 'none';
        csvFileInput.value = '';
        document.getElementById('gmaps-import-data').value = '';
    };

    // Google Maps Import Logic
    document.getElementById('btn-process-gmaps').addEventListener('click', () => {
        const rawData = document.getElementById('gmaps-import-data').value;
        if (!rawData.trim()) return;

        pendingLeads = LeadEngine.parseGMapsData(rawData).map(lead => {
            return LeadEngine.validateLead(lead, state.leads);
        });

        showPreview();
    });

    const btnAddLead = document.getElementById('btn-add-lead');
    const btnImportLeads = document.getElementById('btn-import-leads');
    const topNewLeadBtn = document.querySelector('.header-right .btn-primary');

    if (btnAddLead) btnAddLead.addEventListener('click', () => {
        document.getElementById('modal-lead-title').textContent = 'Add New Lead';
        leadForm.reset();
        delete leadForm.dataset.editId;
        openModal('lead');
    });
    if (btnImportLeads) btnImportLeads.addEventListener('click', () => openModal('import'));
    if (topNewLeadBtn) topNewLeadBtn.addEventListener('click', () => {
        navigateTo('leads');
        openModal('lead');
    });

    // Import Tab Logic
    const importTabs = document.querySelectorAll('.import-tab');
    const importTabContents = document.querySelectorAll('.import-tab-content');

    importTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            importTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            importTabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `import-tab-${targetTab}`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Initial load
    navigateTo('dashboard');
    updateDashboard();
});

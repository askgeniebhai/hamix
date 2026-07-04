/**
 * HAMIX Platform - Main Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        currentPage: 'dashboard',
        leads: JSON.parse(localStorage.getItem('hamix_leads')) || [],
        customers: [],
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
        import: document.getElementById('modal-import')
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
            notes: document.getElementById('lead-notes').value
        };

        const newLead = LeadEngine.createLead(formData);
        LeadEngine.validateLead(newLead, state.leads);

        state.leads.push(newLead);
        saveLeads();

        closeModal('lead');
        leadForm.reset();

        if (state.currentPage === 'leads') renderLeads();
        updateDashboard();
    });

    // Helper: Save Leads to LocalStorage
    const saveLeads = () => {
        localStorage.setItem('hamix_leads', JSON.stringify(state.leads));
    };

    // Helper: Update Dashboard Stats
    const updateDashboard = () => {
        const totalLeads = state.leads.length;
        const totalCustomers = state.customers.length;

        document.getElementById('stat-total-leads').textContent = totalLeads;
        document.getElementById('stat-total-customers').textContent = totalCustomers;
    };

    // Helper: Render Leads Table
    const renderLeads = (filter = 'all') => {
        const listContainer = document.getElementById('leads-list');
        let filteredLeads = state.leads;

        if (filter !== 'all') {
            filteredLeads = state.leads.filter(l => {
                if (filter === 'new') return l.status === LeadEngine.STATUS.NEW;
                if (filter === 'validated') return l.status === LeadEngine.STATUS.VALIDATED;
                if (filter === 'ready') return l.status === LeadEngine.STATUS.READY;
                return true;
            });
        }

        if (filteredLeads.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="6" class="empty-state">No leads found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = filteredLeads.map(lead => `
            <tr>
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
                    <button class="btn-icon delete-lead" data-id="${lead.id}"><i data-lucide="trash-2"></i></button>
                </td>
            </tr>
        `).join('');

        if (window.lucide) lucide.createIcons();

        // Add Delete Handlers
        document.querySelectorAll('.delete-lead').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                state.leads = state.leads.filter(l => l.id !== id);
                saveLeads();
                renderLeads(filter);
                updateDashboard();
            });
        });
    };

    // Filter Click Handlers
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderLeads(btn.dataset.filter);
        });
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

    if (btnAddLead) btnAddLead.addEventListener('click', () => openModal('lead'));
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
});

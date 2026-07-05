/**
 * HAMIX Platform - Main Application Logic (Integrated & Refactored)
 */

document.addEventListener('DOMContentLoaded', () => {
    // State management
    const state = {
        currentPage: 'dashboard',
        leads: StorageService.getLeads(),
        customers: StorageService.getCustomers(),
        campaigns: StorageService.getCampaigns(),
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
        // Handle landing page transition
        if (pageId !== 'landing') {
            document.body.classList.remove('landing-active');
            document.getElementById('landing-page').style.display = 'none';
            document.getElementById('crm-app').style.display = 'flex';
        } else {
            document.body.classList.add('landing-active');
            document.getElementById('landing-page').style.display = 'block';
            document.getElementById('crm-app').style.display = 'none';
            return;
        }

        state.currentPage = pageId;
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === `page-${pageId}`) page.classList.add('active');
        });
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageId) item.classList.add('active');
        });
        headerTitle.textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);

        if (pageId === 'dashboard') updateDashboard();
        if (pageId === 'leads') renderLeads();
        if (pageId === 'campaigns') renderCampaigns();
        if (pageId === 'customers') renderCustomers();

        if (window.lucide) window.lucide.createIcons();
    };

    // Landing Page Buttons
    document.querySelectorAll('.btn-launch-crm').forEach(btn => {
        btn.addEventListener('click', () => navigateTo('dashboard'));
    });

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
        preview: document.getElementById('modal-preview'),
        campaign: document.getElementById('modal-campaign'),
        review: document.getElementById('modal-review-messages')
    };

    const openModal = (modalId) => {
        if (modals[modalId]) modals[modalId].classList.add('active');
    };

    const closeModal = (modalId) => {
        if (modalId && modals[modalId]) {
            modals[modalId].classList.remove('active');
        } else {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
        }
    };

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeModal());
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });

    // Button Handlers
    const btnAddLead = document.getElementById('btn-add-lead');
    const btnImportLeads = document.getElementById('btn-import-leads');
    const topNewLeadBtn = document.querySelector('.header-right .btn-primary');

    if (btnAddLead) btnAddLead.addEventListener('click', () => {
        document.getElementById('modal-lead-title').textContent = 'Add New Lead';
        leadForm.reset();
        delete leadForm.dataset.editId;
        openModal('lead');
    });

    if (btnImportLeads) btnImportLeads.addEventListener('click', () => {
        resetImportUI();
        openModal('import');
    });

    if (topNewLeadBtn) topNewLeadBtn.addEventListener('click', () => {
        navigateTo('leads');
        document.getElementById('modal-lead-title').textContent = 'Add New Lead';
        leadForm.reset();
        delete leadForm.dataset.editId;
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
                if (content.id === `import-tab-${targetTab}`) content.classList.add('active');
            });
        });
    });

    const resetImportUI = () => {
        importTabContents.forEach(c => {
            c.style.display = '';
            c.classList.remove('active');
        });
        document.getElementById('import-summary').style.display = 'none';
        document.getElementById('import-preview').style.display = 'none';
        document.getElementById('csv-upload-area').style.display = 'block';
        document.getElementById('csv-mapping').style.display = 'none';
        document.getElementById('import-tab-gmaps').classList.add('active');
        document.querySelector('.import-tab[data-tab="gmaps"]').classList.add('active');
        document.getElementById('gmaps-import-data').value = '';
        document.getElementById('csv-file-input').value = '';
    };

    // Form Submissions
    const leadForm = document.getElementById('form-lead');
    leadForm.addEventListener('submit', async (e) => {
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
            locality: document.getElementById('lead-locality').value,
            pincode: document.getElementById('lead-pincode').value,
            rating: parseFloat(document.getElementById('lead-rating').value) || 0,
            reviews: parseInt(document.getElementById('lead-reviews').value) || 0,
            industry: document.getElementById('lead-industry').value,
            notes: document.getElementById('lead-notes').value,
            assignedTo: document.getElementById('lead-assignedTo').value,
            status: document.getElementById('lead-status').value
        };

        if (leadId) {
            const index = state.leads.findIndex(l => l.id === leadId);
            if (index !== -1) {
                const oldStatus = state.leads[index].status;
                state.leads[index] = { ...state.leads[index], ...formData, updatedAt: new Date().toISOString() };

                // Handle conversion to customer if status becomes Approved or Customer
                if (oldStatus !== 'Approved' && oldStatus !== 'Customer' && (formData.status === 'Approved' || formData.status === 'Customer')) {
                    const customer = LeadEngine.createCustomer(state.leads[index]);
                    state.customers.push(customer);
                    StorageService.saveCustomers(state.customers);
                }
            }
        } else {
            const result = await PipelineService.process(formData, state.leads);
            if (result.action === 'CREATE') state.leads.push(result.data);
            else {
                const index = state.leads.findIndex(l => l.id === result.data.id);
                state.leads[index] = result.data;
            }
        }

        StorageService.saveLeads(state.leads);
        closeModal('lead');
        navigateTo(state.currentPage);
    });

    // Dashboard
    const updateDashboard = () => {
        const totalLeads = state.leads.length;
        const totalCustomers = state.customers.length;
        const approvedLeads = state.leads.filter(l => ['Approved', 'Customer'].includes(l.status)).length;
        const pendingLeads = state.leads.filter(l => ['New', 'Validated', 'Follow-up'].includes(l.status)).length;

        document.getElementById('stat-total-leads').textContent = totalLeads;
        document.getElementById('stat-total-customers').textContent = totalCustomers;
        document.getElementById('stat-approved-leads').textContent = approvedLeads;
        document.getElementById('stat-pending-leads').textContent = pendingLeads;

        const pipelineContainer = document.getElementById('pipeline-stats');
        const statuses = Object.values(LeadEngine.STATUS);
        pipelineContainer.innerHTML = statuses.slice(0, 10).map(status => {
            const count = state.leads.filter(l => l.status === status).length;
            return `<div class="pipeline-card"><span class="pipeline-label">${status}</span><span class="pipeline-value">${count}</span></div>`;
        }).join('');
    };

    // Leads
    const renderLeads = () => {
        const listContainer = document.getElementById('leads-list');
        const filter = state.filters.leads;
        let filtered = state.leads;

        if (filter.status !== 'all') filtered = filtered.filter(l => l.status === filter.status);
        if (filter.search) {
            const q = filter.search.toLowerCase();
            filtered = filtered.filter(l =>
                l.businessName.toLowerCase().includes(q) ||
                l.phone.includes(q) ||
                (l.category && l.category.toLowerCase().includes(q)) ||
                (l.email && l.email.toLowerCase().includes(q))
            );
        }

        // Apply Sort
        filtered.sort((a, b) => {
            if (filter.sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (filter.sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (filter.sort === 'rating') return b.rating - a.rating;
            if (filter.sort === 'name') return a.businessName.localeCompare(b.businessName);
            return 0;
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="10" class="empty-state">No leads found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = filtered.map(lead => `
            <tr>
                <td><strong>${lead.businessName}</strong></td>
                <td>${lead.phone || '-'}</td>
                <td>${lead.category || '-'}</td>
                <td>${lead.locality || '-'}</td>
                <td>${lead.pincode || '-'}</td>
                <td>${lead.rating || 0} ★</td>
                <td>${lead.reviews || 0}</td>
                <td>${lead.score || 0}</td>
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

        document.querySelectorAll('.edit-lead').forEach(btn => {
            btn.addEventListener('click', () => openLeadEditor(btn.dataset.id));
        });

        document.querySelectorAll('.delete-lead').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                state.leads = state.leads.filter(l => l.id !== id);
                StorageService.saveLeads(state.leads);
                renderLeads();
                updateDashboard();
            });
        });
    };

    const openLeadEditor = (id) => {
        const lead = state.leads.find(l => l.id === id);
        if (!lead) return;
        document.getElementById('modal-lead-title').textContent = 'Edit Lead';
        leadForm.dataset.editId = id;
        document.getElementById('lead-businessName').value = lead.businessName || '';
        document.getElementById('lead-category').value = lead.category || '';
        document.getElementById('lead-phone').value = lead.phone || '';
        document.getElementById('lead-whatsapp').value = lead.whatsapp || '';
        document.getElementById('lead-email').value = lead.email || '';
        document.getElementById('lead-website').value = lead.website || '';
        document.getElementById('lead-address').value = lead.address || '';
        document.getElementById('lead-locality').value = lead.locality || '';
        document.getElementById('lead-pincode').value = lead.pincode || '';
        document.getElementById('lead-rating').value = lead.rating || 0;
        document.getElementById('lead-reviews').value = lead.reviews || 0;
        document.getElementById('lead-industry').value = lead.industry || '';
        document.getElementById('lead-notes').value = lead.notes || '';
        document.getElementById('lead-assignedTo').value = lead.assignedTo || '';
        document.getElementById('lead-status').value = lead.status || 'New';
        openModal('lead');
    };

    // Campaigns
    const renderCampaigns = () => {
        const listContainer = document.getElementById('campaigns-list');
        if (state.campaigns.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="5" class="empty-state">No campaigns yet.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.campaigns.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.leadsCount}</td>
                <td><span class="badge">${c.status}</span></td>
                <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                <td><button class="btn btn-secondary btn-sm review-camp" data-id="${c.id}">Review</button></td>
            </tr>
        `).join('');
        document.querySelectorAll('.review-camp').forEach(btn => {
            btn.addEventListener('click', () => openCampaignReview(btn.dataset.id));
        });
    };

    const openCampaignReview = (id) => {
        const camp = state.campaigns.find(c => c.id === id);
        if (!camp) return;

        const list = document.getElementById('review-leads-list');
        list.innerHTML = camp.messages.map((m, i) => `
            <li class="review-leads-item ${i === 0 ? 'active' : ''}" data-index="${i}">
                ${m.leadName}
            </li>
        `).join('');

        const updateEditor = (index) => {
            const msg = camp.messages[index];
            document.getElementById('message-editor-text').value = msg.message;
            document.getElementById('message-metrics').innerHTML = `
                <div class="metric-card"><span class="metric-label">AI Score</span><span class="metric-value">${msg.personalizationScore}%</span></div>
                <div class="metric-card"><span class="metric-label">Spam Risk</span><span class="metric-value">${msg.spamRisk}%</span></div>
                <div class="metric-card"><span class="metric-label">Relevance</span><span class="metric-value">${msg.relevance}</span></div>
            `;
        };

        updateEditor(0);
        openModal('review');
    };

    // Customers
    const renderCustomers = () => {
        const listContainer = document.getElementById('customers-list');
        if (state.customers.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No customers yet.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.customers.map(c => `
            <tr>
                <td><strong>${c.businessName}</strong></td>
                <td>${c.category || '-'}</td>
                <td>
                    <div class="contact-info">
                        ${c.phone ? `<div><i data-lucide="phone" style="width:12px;height:12px"></i> ${c.phone}</div>` : ''}
                        ${c.email ? `<div><i data-lucide="mail" style="width:12px;height:12px"></i> ${c.email}</div>` : ''}
                    </div>
                </td>
                <td><a href="${c.website}" target="_blank" class="link-text">${c.website || '-'}</a></td>
                <td><span class="badge badge-validated">Active</span></td>
                <td>${new Date(c.joinedAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-secondary btn-sm preview-website" data-id="${c.id}">
                        <i data-lucide="eye"></i> Preview
                    </button>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
        document.querySelectorAll('.preview-website').forEach(btn => {
            btn.addEventListener('click', () => openWebsitePreview(btn.dataset.id));
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

    // Filter Handlers
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.leads.status = btn.dataset.filter;
            renderLeads();
        });
    });

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

    // Acquisition Handlers
    document.getElementById('btn-process-gmaps').addEventListener('click', async () => {
        const rawData = document.getElementById('gmaps-import-data').value;
        if (!rawData.trim()) return;
        const leads = await AcquisitionService.importFromSource('gmaps', rawData);
        processImport(leads);
    });

    document.getElementById('btn-process-clipboard').addEventListener('click', async () => {
        const rawData = document.getElementById('clipboard-import-data').value;
        if (!rawData.trim()) return;
        const leads = await AcquisitionService.importFromSource('clipboard', rawData);
        processImport(leads);
    });

    document.getElementById('ocr-upload-area').addEventListener('click', () => document.getElementById('ocr-file-input').click());
    document.getElementById('ocr-file-input').addEventListener('change', async () => {
        document.getElementById('ocr-status').style.display = 'block';
        const leads = await AcquisitionService.importFromSource('ocr', 'image_data');
        setTimeout(() => {
            document.getElementById('ocr-status').style.display = 'none';
            processImport(leads);
        }, 1500);
    });

    // CSV/File Import Logic with Mapping
    const csvFileInput = document.getElementById('csv-file-input');
    const csvUploadArea = document.getElementById('csv-upload-area');
    const csvMapping = document.getElementById('csv-mapping');
    const csvFieldsList = document.getElementById('csv-fields-list');

    let csvData = [];
    let csvHeaders = [];

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

    document.getElementById('btn-process-csv').addEventListener('click', async () => {
        const mapping = {};
        document.querySelectorAll('.csv-field-map').forEach(select => {
            if (select.value) {
                mapping[select.dataset.leadField] = select.value;
            }
        });

        const rawLeads = await AcquisitionService.importFromSource('csv', csvData, { mapping });
        processImport(rawLeads);
    });

    const processImport = async (rawLeads) => {
        let stats = { total: rawLeads.length, dupes: 0, new: 0 };
        for (const raw of rawLeads) {
            const result = await PipelineService.process(raw, state.leads);
            if (result.action === 'CREATE') {
                state.leads.push(result.data);
                stats.new++;
            } else {
                const idx = state.leads.findIndex(l => l.id === result.data.id);
                state.leads[idx] = result.data;
                stats.dupes++;
            }
        }
        StorageService.saveLeads(state.leads);

        importTabContents.forEach(c => c.style.display = 'none');
        document.getElementById('import-summary').style.display = 'block';
        document.getElementById('summary-total').textContent = stats.total;
        document.getElementById('summary-dupes').textContent = stats.dupes;
        document.getElementById('summary-new').textContent = stats.new;

        if (state.currentPage === 'leads') renderLeads();
        updateDashboard();
    };

    document.getElementById('btn-import-finish').addEventListener('click', () => {
        closeModal('import');
        if (state.currentPage === 'leads') renderLeads();
    });

    // Campaign Handlers
    document.getElementById('btn-new-campaign').addEventListener('click', () => {
        const selector = document.getElementById('campaign-leads-selector');
        selector.innerHTML = state.leads.slice(0, 10).map(l => `
            <div style="margin-bottom: 5px;"><input type="checkbox" value="${l.id}"> ${l.businessName}</div>
        `).join('');
        openModal('campaign');
    });

    document.getElementById('form-campaign').addEventListener('submit', (e) => {
        try {
            e.preventDefault();
            const name = document.getElementById('campaign-name').value;
            const selectedIds = Array.from(document.querySelectorAll('#campaign-leads-selector input:checked')).map(i => i.value);

            if (selectedIds.length === 0) {
                alert('Please select at least one lead for the campaign.');
                return;
            }

            const leads = state.leads.filter(l => selectedIds.includes(l.id));
            const camp = CampaignService.createCampaign(name, leads);

            if (!camp || !camp.messages) {
                throw new Error('Failed to generate campaign messages.');
            }

            state.campaigns.push(camp);
            StorageService.saveCampaigns(state.campaigns);
            closeModal('campaign');
            navigateTo('campaigns');
            openCampaignReview(camp.id);
        } catch (error) {
            console.error('Campaign Generation Error:', error);
            alert('An error occurred while generating the campaign. Please check the console for details.');
        }
    });

    // Approve Message (Demo Mode)
    document.getElementById('btn-approve-msg').addEventListener('click', () => {
        alert('Message approved! (Demo Mode: WhatsApp integration will be available in the next phase)');
        closeModal('review');
    });

    // Initial load
    // Check if we should show landing or dashboard
    const hasSeenLanding = localStorage.getItem('hamix_landing_seen');
    if (hasSeenLanding) {
        navigateTo('dashboard');
    } else {
        navigateTo('landing');
        localStorage.setItem('hamix_landing_seen', 'true');
    }
});

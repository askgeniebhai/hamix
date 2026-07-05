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
        if (pageId === 'attendance') renderAttendanceRecords();
        if (pageId === 'payroll') renderPayroll();

        if (window.lucide) window.lucide.createIcons();
    };

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
        importTabContents.forEach(c => c.style.display = '');
        document.getElementById('import-summary').style.display = 'none';
        document.getElementById('import-tab-gmaps').classList.add('active');
        document.querySelector('.import-tab[data-tab="gmaps"]').classList.add('active');
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
            rating: parseFloat(document.getElementById('lead-rating').value) || 0,
            reviews: parseInt(document.getElementById('lead-reviews').value) || 0,
            industry: document.getElementById('lead-industry').value,
            locality: document.getElementById('lead-locality').value,
            pincode: document.getElementById('lead-pincode').value,
            notes: document.getElementById('lead-notes').value,
            assignedTo: document.getElementById('lead-assignedTo').value,
            status: document.getElementById('lead-status').value
        };

        if (leadId) {
            const index = state.leads.findIndex(l => l.id === leadId);
            if (index !== -1) {
                state.leads[index] = { ...state.leads[index], ...formData, updatedAt: new Date().toISOString() };
                if (formData.status === 'Customer') {
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
        const approvedLeads = state.leads.filter(l => l.status === 'Customer').length;
        const pendingLeads = state.leads.filter(l => ['New', 'Validated'].includes(l.status)).length;

        document.getElementById('stat-total-leads').textContent = totalLeads;
        document.getElementById('stat-total-customers').textContent = totalCustomers;
        document.getElementById('stat-approved-leads').textContent = approvedLeads;
        document.getElementById('stat-pending-leads').textContent = pendingLeads;

        const pipelineContainer = document.getElementById('pipeline-stats');
        const statuses = Object.values(LeadEngine.STATUS);
        pipelineContainer.innerHTML = statuses.slice(0, 7).map(status => {
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
            filtered = filtered.filter(l => l.businessName.toLowerCase().includes(q) || l.phone.includes(q));
        }

        if (filtered.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="6" class="empty-state">No leads found.</td></tr>`;
            return;
        }

        listContainer.innerHTML = filtered.map(lead => `
            <tr>
                <td><strong>${lead.businessName}</strong></td>
                <td>${lead.phone || 'Phone not available'}</td>
                <td>${lead.category || '-'}</td>
                <td>${lead.locality || '-'}</td>
                <td>${lead.pincode || '-'}</td>
                <td>${lead.rating || '-'} ★</td>
                <td>${lead.reviews || 0}</td>
                <td><span class="badge badge-${lead.status.toLowerCase()}">${lead.status}</span></td>
                <td>
                    <button class="btn-icon edit-lead" data-id="${lead.id}"><i data-lucide="edit-2"></i></button>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
        document.querySelectorAll('.edit-lead').forEach(btn => {
            btn.addEventListener('click', () => openLeadEditor(btn.dataset.id));
        });
    };

    const openLeadEditor = (id) => {
        const lead = state.leads.find(l => l.id === id);
        if (!lead) return;
        document.getElementById('modal-lead-title').textContent = 'Edit Lead';
        leadForm.dataset.editId = id;
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
        document.getElementById('lead-locality').value = lead.locality || '';
        document.getElementById('lead-pincode').value = lead.pincode || '';
        document.getElementById('lead-notes').value = lead.notes;
        document.getElementById('lead-assignedTo').value = lead.assignedTo || '';
        document.getElementById('lead-status').value = lead.status;
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
                <td>${c.phone || '-'}</td>
                <td>${c.website || '-'}</td>
                <td><span class="badge">Active</span></td>
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

    // Acquisition Handlers
    const csvFileInput = document.getElementById('csv-file-input');
    const csvUploadArea = document.getElementById('csv-upload-area');
    const csvMappingDiv = document.getElementById('csv-mapping');
    const csvFieldsList = document.getElementById('csv-fields-list');
    let currentCsvData = null;

    if (csvUploadArea) {
        csvUploadArea.addEventListener('click', () => csvFileInput.click());
    }

    if (csvFileInput) {
        csvFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const rows = text.split('\n').map(r => r.split(',').map(cell => cell.trim()));
                const headers = rows[0];
                const data = rows.slice(1).filter(r => r.length === headers.length).map(row => {
                    const obj = {};
                    headers.forEach((h, i) => obj[h] = row[i]);
                    return obj;
                });

                currentCsvData = data;
                renderCsvMapping(headers);
            };
            reader.readAsText(file);
        });
    }

    const renderCsvMapping = (headers) => {
        csvUploadArea.style.display = 'none';
        csvMappingDiv.style.display = 'block';

        const leadFields = [
            { id: 'businessName', label: 'Business Name' },
            { id: 'phone', label: 'Phone' },
            { id: 'category', label: 'Category' },
            { id: 'email', label: 'Email' },
            { id: 'website', label: 'Website' },
            { id: 'address', label: 'Address' }
        ];

        csvFieldsList.innerHTML = leadFields.map(field => `
            <div class="form-group" style="margin-bottom: 10px;">
                <label style="font-size: 13px; font-weight: 500;">${field.label}</label>
                <select class="csv-map-select" data-field="${field.id}" style="width: 100%;">
                    <option value="">-- Skip --</option>
                    ${headers.map(h => `<option value="${h}" ${h.toLowerCase().includes(field.id.toLowerCase()) ? 'selected' : ''}>${h}</option>`).join('')}
                </select>
            </div>
        `).join('');
    };

    document.getElementById('btn-process-csv').addEventListener('click', async () => {
        if (!currentCsvData) return;

        const mapping = {};
        document.querySelectorAll('.csv-map-select').forEach(select => {
            if (select.value) mapping[select.dataset.field] = select.value;
        });

        const leads = await AcquisitionService.importFromSource('csv', currentCsvData, { mapping });
        processImport(leads);
    });

    document.getElementById('btn-process-gmaps').addEventListener('click', async () => {
        const rawData = document.getElementById('gmaps-import-data').value;
        const leads = await AcquisitionService.importFromSource('gmaps', rawData);
        processImport(leads);
    });

    document.getElementById('btn-process-clipboard').addEventListener('click', async () => {
        const rawData = document.getElementById('clipboard-import-data').value;
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

    const processImport = async (rawLeads) => {
        let stats = {
            total: rawLeads.length,
            imported: 0,
            dupes: 0,
            phones: 0,
            websites: 0,
            categories: 0,
            noPhone: 0
        };

        for (const raw of rawLeads) {
            // Count metadata before processing pipeline
            if (raw.phone && raw.phone !== 'Phone not available') stats.phones++;
            else stats.noPhone++;

            if (raw.website) stats.websites++;
            if (raw.category) stats.categories++;

            const result = await PipelineService.process(raw, state.leads);
            if (result.action === 'CREATE') {
                state.leads.push(result.data);
                stats.imported++;
            } else {
                const idx = state.leads.findIndex(l => l.id === result.data.id);
                state.leads[idx] = result.data;
                stats.dupes++;
                stats.imported++;
            }
        }
        StorageService.saveLeads(state.leads);

        importTabContents.forEach(c => c.style.display = 'none');
        document.getElementById('import-summary').style.display = 'block';
        document.getElementById('summary-total').textContent = stats.total;
        document.getElementById('summary-imported').textContent = stats.imported;
        document.getElementById('summary-dupes').textContent = stats.dupes;
        document.getElementById('summary-phones').textContent = stats.phones;
        document.getElementById('summary-websites').textContent = stats.websites;
        document.getElementById('summary-categories').textContent = stats.categories;
        document.getElementById('summary-no-phone').textContent = stats.noPhone;
    };

    // Campaign Handlers
    document.getElementById('btn-new-campaign').addEventListener('click', () => {
        const selector = document.getElementById('campaign-leads-selector');
        selector.innerHTML = state.leads.slice(0, 10).map(l => `
            <div style="margin-bottom: 5px;"><input type="checkbox" value="${l.id}"> ${l.businessName}</div>
        `).join('');
        openModal('campaign');
    });

    document.getElementById('form-campaign').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('campaign-name').value;
        const selectedIds = Array.from(document.querySelectorAll('#campaign-leads-selector input:checked')).map(i => i.value);
        const leads = state.leads.filter(l => selectedIds.includes(l.id));
        const camp = CampaignService.createCampaign(name, leads);
        state.campaigns.push(camp);
        StorageService.saveCampaigns(state.campaigns);
        closeModal('campaign');
        navigateTo('campaigns');
    });

    // Attendance & Payroll Rendering (Placeholders for now)
    const renderAttendanceRecords = () => {
        const container = document.getElementById('attendance-list');
        const records = StorageService.load('nfs_attendance', []);

        if (records.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="empty-state">No attendance records found.</td></tr>`;
            return;
        }

        container.innerHTML = records.map(r => `
            <tr>
                <td><strong>${r.guardName}</strong></td>
                <td>${r.siteName}</td>
                <td>${new Date(r.timestamp).toLocaleTimeString()}</td>
                <td>-</td>
                <td><span class="badge ${r.status === 'Verified' ? 'badge-validated' : 'badge-ready-for-ai'}">${r.status}</span></td>
                <td><small>${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}</small></td>
            </tr>
        `).join('');
    };

    const renderPayroll = () => {
        const container = document.getElementById('payroll-list');
        const attendance = StorageService.load('nfs_attendance', []);

        // Mock Employee Database (Phase 1)
        const employees = {
            "NFS-9921": { name: "John Smith", baseSalary: 25000 }
        };

        const summary = attendance.reduce((acc, curr) => {
            if (!acc[curr.guardId]) {
                acc[curr.guardId] = {
                    name: curr.guardName,
                    days: new Set(),
                    base: employees[curr.guardId]?.baseSalary || 20000
                };
            }
            acc[curr.guardId].days.add(new Date(curr.timestamp).toDateString());
            return acc;
        }, {});

        const rows = Object.values(summary);

        if (rows.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="empty-state">No attendance data found to calculate payroll.</td></tr>`;
            return;
        }

        container.innerHTML = rows.map(r => {
            const daysCount = r.days.size;
            const dailyRate = r.base / 30;
            const netPay = Math.round(dailyRate * daysCount);
            return `
                <tr>
                    <td><strong>${r.name}</strong></td>
                    <td>${daysCount} days</td>
                    <td>₹${r.base.toLocaleString()}</td>
                    <td>-</td>
                    <td><strong>₹${netPay.toLocaleString()}</strong></td>
                    <td><span class="badge badge-new">Draft</span></td>
                </tr>
            `;
        }).join('');
    };

    const btnGuardPortal = document.getElementById('btn-guard-portal');
    if (btnGuardPortal) {
        btnGuardPortal.addEventListener('click', () => {
            window.open('guard-portal.html', '_blank');
        });
    }

    // Initial load
    navigateTo('dashboard');
});

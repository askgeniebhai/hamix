/**
 * HAMIX Platform - Main Application Logic (Integrated & Refactored)
 */

document.addEventListener('DOMContentLoaded', async () => {
    const authScreen = document.getElementById('auth-screen');
    const authForm = document.getElementById('form-auth');
    const authError = document.getElementById('auth-error');
    const authSubmit = document.querySelector('.auth-submit');
    const authTabs = document.querySelectorAll('.auth-tab');
    let authMode = 'login';

    // State management
    const state = {
        currentPage: 'dashboard',
        leads: [],
        customers: [],
        campaigns: [],
        proposals: [],
        diagnostics: [],
        filters: {
            leads: { search: '', status: 'all', sort: 'newest' },
            customers: { search: '', sort: 'newest' }
        }
    };

    const loadWorkspaceState = async () => {
        state.leads = await StorageService.loadLeads();
        state.customers = await StorageService.loadCustomers();
        state.campaigns = await StorageService.loadCampaigns();
        state.proposals = await StorageService.loadProposals();
        state.diagnostics = await StorageService.loadDiagnostics();
    };

    const updateCurrentUser = () => {
        const session = AuthService.getSession();
        const name = document.getElementById('current-user-name');
        const role = document.getElementById('current-user-role');
        const avatar = document.querySelector('.user-avatar');
        if (!session) return;
        if (name) name.textContent = session.name;
        if (role) role.textContent = `${session.role} · ${session.tenantName}`;
        if (avatar) avatar.textContent = session.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    };

    const showAuth = () => {
        document.body.classList.add('auth-locked');
        if (authScreen) authScreen.style.display = 'flex';
        const crmApp = document.getElementById('crm-app');
        if (crmApp) crmApp.style.display = 'none';
    };

    const showApp = async () => {
        await loadWorkspaceState();
        updateCurrentUser();
        document.body.classList.remove('auth-locked');
        if (authScreen) authScreen.style.display = 'none';
        navigateTo('dashboard');
    };

    const setAuthMode = (mode) => {
        authMode = mode;
        document.body.classList.toggle('auth-register-mode', mode === 'register');
        authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.authMode === mode));
        if (authSubmit) authSubmit.textContent = mode === 'register' ? 'Create Workspace' : 'Login';
        if (authError) authError.textContent = '';
    };

    authTabs.forEach(tab => {
        tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode));
    });

    if (authForm) {
        authForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (authError) authError.textContent = '';
            if (authSubmit) authSubmit.disabled = true;
            try {
                const payload = {
                    name: document.getElementById('auth-name').value,
                    tenantName: document.getElementById('auth-tenant').value,
                    email: document.getElementById('auth-email').value,
                    password: document.getElementById('auth-password').value
                };
                if (authMode === 'register') await AuthService.register(payload);
                else await AuthService.login(payload);
                authForm.reset();
                await showApp();
            } catch (error) {
                if (authError) authError.textContent = error.message;
            } finally {
                if (authSubmit) authSubmit.disabled = false;
            }
        });
    }

    const logoutButton = document.getElementById('btn-logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await AuthService.logout();
            state.leads = [];
            state.customers = [];
            state.campaigns = [];
            showAuth();
        });
    }

    // UI Elements
    const pages = document.querySelectorAll('.page');
    const navItems = document.querySelectorAll('.sidebar-nav li');
    const headerTitle = document.querySelector('.header-left h1');

    // Navigation Logic
    const navigateTo = (pageId) => {
        if (pageId !== 'landing' && !AuthService.isAuthenticated()) {
            showAuth();
            return;
        }

        // Handle landing page transition
        if (pageId !== 'landing') {
            document.body.classList.remove('landing-active');
            const landingPage = document.getElementById('landing-page');
            if (landingPage) landingPage.style.display = 'none';
            const crmApp = document.getElementById('crm-app');
            if (crmApp) crmApp.style.display = 'flex';
        } else {
            document.body.classList.add('landing-active');
            const landingPage = document.getElementById('landing-page');
            if (landingPage) landingPage.style.display = 'block';
            const crmApp = document.getElementById('crm-app');
            if (crmApp) crmApp.style.display = 'none';
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
        if (headerTitle) headerTitle.textContent = pageId.charAt(0).toUpperCase() + pageId.slice(1);

        if (pageId === 'dashboard') updateDashboard();
        if (pageId === 'leads') renderLeads();
        if (pageId === 'campaigns') renderCampaigns();
        if (pageId === 'diagnostics') renderDiagnostics();
        if (pageId === 'proposals') renderProposals();
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
        const importPreview = document.getElementById('import-preview');
        if (importPreview) importPreview.style.display = 'none';
        const csvUploadArea = document.getElementById('csv-upload-area');
        if (csvUploadArea) csvUploadArea.style.display = 'block';
        const csvMapping = document.getElementById('csv-mapping');
        if (csvMapping) csvMapping.style.display = 'none';

        const gmapsTab = document.getElementById('import-tab-gmaps');
        if (gmapsTab) gmapsTab.classList.add('active');
        const gmapsNavTab = document.querySelector('.import-tab[data-tab="gmaps"]');
        if (gmapsNavTab) gmapsNavTab.classList.add('active');

        const gmapsInput = document.getElementById('gmaps-import-data');
        if (gmapsInput) gmapsInput.value = '';
        const csvInput = document.getElementById('csv-file-input');
        if (csvInput) csvInput.value = '';
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
                    const hasCustomer = state.customers.some(customer => customer.sourceLeadId === state.leads[index].id);
                    if (!hasCustomer) {
                        const customer = LeadEngine.createCustomer(state.leads[index]);
                        customer.sourceLeadId = state.leads[index].id;
                        const savedCustomer = await StorageService.convertCustomer(state.leads[index].id, customer);
                        state.customers.push(savedCustomer);
                        StorageService.saveCustomers(state.customers);
                    }
                }
            }
        } else {
            const result = await PipelineService.process(formData, state.leads);
            if (result.action === 'CREATE') {
                const savedLead = await StorageService.saveLead(result.data);
                state.leads.push(savedLead);
            }
            else {
                const index = state.leads.findIndex(l => l.id === result.data.id);
                state.leads[index] = await StorageService.saveLead(result.data);
            }
        }

        StorageService.saveLeads(state.leads);
        if (leadId) await StorageService.saveLead(state.leads.find(l => l.id === leadId));
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
                        <button class="btn-icon qualify-lead" data-id="${lead.id}" title="Qualify"><i data-lucide="sparkles"></i></button>
                        <button class="btn-icon stage-lead" data-id="${lead.id}" title="Next stage"><i data-lucide="arrow-right-circle"></i></button>
                        <button class="btn-icon convert-lead" data-id="${lead.id}" title="Convert"><i data-lucide="user-check"></i></button>
                        <button class="btn-icon edit-lead" data-id="${lead.id}"><i data-lucide="edit-2"></i></button>
                        <button class="btn-icon delete-lead" data-id="${lead.id}"><i data-lucide="trash-2"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();


        document.querySelectorAll('.qualify-lead').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                btn.disabled = true;
                try {
                    const qualified = await StorageService.qualifyLead(id);
                    if (qualified) state.leads[state.leads.findIndex(l => l.id === id)] = qualified;
                    renderLeads();
                    updateDashboard();
                } catch (error) {
                    alert(`Qualification failed: ${error.message}`);
                } finally {
                    btn.disabled = false;
                }
            });
        });

        const stages = ['New Lead', 'Contact Attempted', 'Interested', 'Meeting Scheduled', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
        document.querySelectorAll('.stage-lead').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const lead = state.leads.find(l => l.id === id);
                const current = lead.pipelineStage || 'New Lead';
                const next = stages[Math.min(stages.indexOf(current) + 1, stages.length - 1)] || 'Contact Attempted';
                btn.disabled = true;
                try {
                    const updated = await StorageService.changeLeadStage(id, next);
                    if (updated) state.leads[state.leads.findIndex(l => l.id === id)] = updated;
                    renderLeads();
                    updateDashboard();
                } catch (error) {
                    alert(`Stage change failed: ${error.message}`);
                } finally {
                    btn.disabled = false;
                }
            });
        });

        document.querySelectorAll('.convert-lead').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const lead = state.leads.find(l => l.id === id);
                if (!lead) return;
                btn.disabled = true;
                try {
                    const customer = LeadEngine.createCustomer(lead);
                    customer.sourceLeadId = id;
                    const savedCustomer = await StorageService.convertCustomer(id, customer);
                    if (!state.customers.some(c => c.id === savedCustomer.id)) state.customers.push(savedCustomer);
                    StorageService.saveCustomers(state.customers);
                    const idx = state.leads.findIndex(l => l.id === id);
                    state.leads[idx] = { ...state.leads[idx], status: 'Customer', pipelineStage: 'Won' };
                    StorageService.saveLeads(state.leads);
                    alert(savedCustomer.project ? 'Lead converted and onboarding project created.' : 'Lead is already converted to a customer.');
                    renderLeads();
                    renderCustomers();
                    updateDashboard();
                } catch (error) {
                    alert(`Conversion failed: ${error.message}`);
                } finally {
                    btn.disabled = false;
                }
            });
        });

        document.querySelectorAll('.edit-lead').forEach(btn => {
            btn.addEventListener('click', () => openLeadEditor(btn.dataset.id));
        });

        document.querySelectorAll('.delete-lead').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                state.leads = state.leads.filter(l => l.id !== id);
                await StorageService.deleteLead(id);
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



    // Diagnostics
    const renderDiagnostics = () => {
        const listContainer = document.getElementById('diagnostics-list');
        if (!listContainer) return;
        if (!state.diagnostics.length) {
            listContainer.innerHTML = `<tr><td colspan="6" class="empty-state">No diagnostics yet. Generate one from a qualified lead or customer.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.diagnostics.map(diagnostic => `
            <tr>
                <td><strong>${diagnostic.title}</strong><br><small>${diagnostic.aiLabel}</small></td>
                <td>${diagnostic.leadId || diagnostic.customerId || '-'}</td>
                <td>${diagnostic.estimates?.opportunityScore || '-'} / 100</td>
                <td><span class="badge">${diagnostic.status}</span></td>
                <td>${new Date(diagnostic.updatedAt || diagnostic.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-secondary btn-sm diagnostic-review" data-id="${diagnostic.id}">Review/Edit</button>
                    <button class="btn btn-secondary btn-sm diagnostic-approve" data-id="${diagnostic.id}">Approve</button>
                    <button class="btn btn-primary btn-sm diagnostic-proposal" data-id="${diagnostic.id}">Draft Proposal</button>
                </td>
            </tr>
        `).join('');
        document.querySelectorAll('.diagnostic-review').forEach(btn => btn.addEventListener('click', async () => {
            const diagnostic = state.diagnostics.find(item => item.id === btn.dataset.id);
            if (!diagnostic) return;
            const notes = prompt(`Verified: ${JSON.stringify(diagnostic.verifiedInformation)}\n\nInferred: ${JSON.stringify(diagnostic.inferredFindings)}\n\nRecommendations: ${diagnostic.recommendations.join('; ')}\n\nUnavailable: ${diagnostic.unavailableData.join('; ')}\n\nAdd review notes before saving:`, diagnostic.notes || 'Reviewed by user.');
            if (notes === null) return;
            const updated = await StorageService.updateDiagnostic(diagnostic.id, { status: 'Reviewed', notes });
            state.diagnostics[state.diagnostics.findIndex(item => item.id === updated.id)] = updated;
            renderDiagnostics();
        }));
        document.querySelectorAll('.diagnostic-approve').forEach(btn => btn.addEventListener('click', async () => {
            const diagnostic = state.diagnostics.find(item => item.id === btn.dataset.id);
            if (!diagnostic) return;
            const updated = await StorageService.updateDiagnostic(diagnostic.id, { status: 'Approved', notes: diagnostic.notes || 'Approved for proposal drafting.' });
            state.diagnostics[state.diagnostics.findIndex(item => item.id === updated.id)] = updated;
            renderDiagnostics();
            alert('Diagnostic approved for proposal drafting. This is not a customer approval or binding commercial decision.');
        }));
        document.querySelectorAll('.diagnostic-proposal').forEach(btn => btn.addEventListener('click', async () => {
            const diagnostic = state.diagnostics.find(item => item.id === btn.dataset.id);
            if (!diagnostic) return;
            if (diagnostic.status !== 'Approved') {
                alert('Approve the diagnostic before drafting a proposal from it.');
                return;
            }
            try {
                const proposal = await StorageService.createProposal({ leadId: diagnostic.leadId, customerId: diagnostic.customerId, diagnosticId: diagnostic.id, title: `HAMIX Proposal - ${diagnostic.verifiedInformation?.businessName || 'Business Diagnostic'}` });
                state.proposals.unshift(proposal);
                navigateTo('proposals');
                alert(`Proposal ${proposal.proposalNumber} drafted from reviewed diagnostic. Commercial totals still require user review.`);
            } catch (error) {
                alert(`Proposal draft failed: ${error.message}`);
            }
        }));
    };

    const btnNewDiagnostic = document.getElementById('btn-new-diagnostic');
    if (btnNewDiagnostic) {
        btnNewDiagnostic.addEventListener('click', async () => {
            const sourceType = prompt('Create diagnostic from "lead" or "customer"?', 'lead');
            if (!sourceType) return;
            const sourceId = prompt(`Enter ${sourceType} ID:`);
            if (!sourceId) return;
            try {
                const body = sourceType.toLowerCase().startsWith('customer') ? { customerId: sourceId } : { leadId: sourceId };
                btnNewDiagnostic.disabled = true;
                const diagnostic = await StorageService.createDiagnostic(body);
                state.diagnostics.unshift(diagnostic);
                renderDiagnostics();
                alert('Business diagnostic created as an estimate. Review before using it in a proposal.');
            } catch (error) {
                alert(`Diagnostic creation failed: ${error.message}`);
            } finally {
                btnNewDiagnostic.disabled = false;
            }
        });
    }

    // Proposals
    const renderProposals = () => {
        const listContainer = document.getElementById('proposals-list');
        if (!listContainer) return;
        if (!state.proposals.length) {
            listContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No proposals yet. Create one from a qualified lead or customer.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.proposals.map(proposal => `
            <tr>
                <td><strong>${proposal.proposalNumber}</strong><br><small>${proposal.title}</small></td>
                <td>${proposal.leadId || proposal.customerId || '-'}</td>
                <td><span class="badge">${proposal.status}</span></td>
                <td>v${proposal.version}</td>
                <td>${proposal.currency || 'INR'} ${proposal.total || 0}</td>
                <td>${new Date(proposal.updatedAt || proposal.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-group">
                        <button class="btn btn-secondary btn-sm proposal-print" data-id="${proposal.id}">Print</button>
                        <button class="btn btn-secondary btn-sm proposal-send" data-id="${proposal.id}">Mark Sent</button>
                        <button class="btn btn-primary btn-sm proposal-accept" data-id="${proposal.id}">Accept</button>
                        <button class="btn btn-secondary btn-sm proposal-reject" data-id="${proposal.id}">Reject</button>
                    </div>
                </td>
            </tr>
        `).join('');
        document.querySelectorAll('.proposal-print').forEach(btn => btn.addEventListener('click', () => window.open(`/api/proposals/${encodeURIComponent(btn.dataset.id)}/print`, '_blank')));
        document.querySelectorAll('.proposal-send').forEach(btn => btn.addEventListener('click', () => updateProposalStatus(btn.dataset.id, 'Sent', 'Marked sent manually; email provider not configured.')));
        document.querySelectorAll('.proposal-accept').forEach(btn => btn.addEventListener('click', () => updateProposalStatus(btn.dataset.id, 'Accepted', 'Accepted internally on behalf of customer; no e-signature captured.')));
        document.querySelectorAll('.proposal-reject').forEach(btn => btn.addEventListener('click', () => updateProposalStatus(btn.dataset.id, 'Rejected', prompt('Rejection reason (optional):') || 'Rejected internally.')));
    };

    const updateProposalStatus = async (id, status, note) => {
        try {
            const response = await StorageService.changeProposalStatus(id, status, note);
            const proposal = response.proposal || response;
            const index = state.proposals.findIndex(item => item.id === proposal.id);
            if (index !== -1) state.proposals[index] = proposal;
            if (response.customer && !state.customers.some(c => c.id === response.customer.id)) state.customers.push(response.customer);
            if (status === 'Accepted') state.customers = await StorageService.loadCustomers();
            renderProposals();
            updateDashboard();
            alert(`Proposal ${status}. ${status === 'Sent' ? 'Email provider is not configured; this records a manual send state.' : ''}`);
        } catch (error) {
            alert(`Proposal update failed: ${error.message}`);
        }
    };

    const btnNewProposal = document.getElementById('btn-new-proposal');
    if (btnNewProposal) {
        btnNewProposal.addEventListener('click', async () => {
            const sourceType = prompt('Create proposal from "lead" or "customer"?', 'lead');
            if (!sourceType) return;
            const sourceId = prompt(`Enter ${sourceType} ID:`);
            if (!sourceId) return;
            try {
                const body = { title: prompt('Proposal title:', 'HAMIX Growth Proposal') || 'HAMIX Growth Proposal' };
                if (sourceType.toLowerCase().startsWith('customer')) body.customerId = sourceId;
                else body.leadId = sourceId;
                const proposal = await StorageService.createProposal(body);
                state.proposals.unshift(proposal);
                renderProposals();
                alert(`Proposal ${proposal.proposalNumber} created as Draft. Review before marking sent.`);
            } catch (error) {
                alert(`Proposal creation failed: ${error.message}`);
            }
        });
    }

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
        const themeSelect = document.getElementById('preview-theme-select');
        const theme = themeSelect ? themeSelect.value : 'default';
        const html = WebsiteGenerator.generate(activePreviewCustomer, theme);
        const frame = document.getElementById('preview-frame');
        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
    };

    const themeSelect = document.getElementById('preview-theme-select');
    if (themeSelect) {
        themeSelect.addEventListener('change', updatePreviewFrame);
    }

    // Filter Handlers
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filters.leads.status = btn.dataset.filter;
            renderLeads();
        });
    });

    const searchLeadsInput = document.getElementById('search-leads');
    if (searchLeadsInput) {
        searchLeadsInput.addEventListener('input', (e) => {
            state.filters.leads.search = e.target.value;
            renderLeads();
        });
    }

    const sortLeadsSelect = document.getElementById('sort-leads');
    if (sortLeadsSelect) {
        sortLeadsSelect.addEventListener('change', (e) => {
            state.filters.leads.sort = e.target.value;
            renderLeads();
        });
    }

    const searchCustomersInput = document.getElementById('search-customers');
    if (searchCustomersInput) {
        searchCustomersInput.addEventListener('input', (e) => {
            state.filters.customers.search = e.target.value;
            renderCustomers();
        });
    }

    // Acquisition Handlers
    const btnProcessGMaps = document.getElementById('btn-process-gmaps');
    if (btnProcessGMaps) {
        btnProcessGMaps.addEventListener('click', async () => {
            const rawData = document.getElementById('gmaps-import-data').value;
            if (!rawData.trim()) return;
            const leads = await AcquisitionService.importFromSource('gmaps', rawData);
            processImport(leads);
        });
    }

    const btnProcessClipboard = document.getElementById('btn-process-clipboard');
    if (btnProcessClipboard) {
        btnProcessClipboard.addEventListener('click', async () => {
            const rawData = document.getElementById('clipboard-import-data').value;
            if (!rawData.trim()) return;
            const leads = await AcquisitionService.importFromSource('clipboard', rawData);
            processImport(leads);
        });
    }

    const ocrUploadArea = document.getElementById('ocr-upload-area');
    if (ocrUploadArea) {
        ocrUploadArea.addEventListener('click', () => document.getElementById('ocr-file-input').click());
    }
    const ocrFileInput = document.getElementById('ocr-file-input');
    if (ocrFileInput) {
        ocrFileInput.addEventListener('change', async () => {
            const ocrStatus = document.getElementById('ocr-status');
            if (ocrStatus) ocrStatus.style.display = 'block';
            const leads = await AcquisitionService.importFromSource('ocr', 'image_data');
            setTimeout(() => {
                if (ocrStatus) ocrStatus.style.display = 'none';
                processImport(leads);
            }, 1500);
        });
    }

    // CSV/File Import Logic with Mapping
    const csvFileInput = document.getElementById('csv-file-input');
    const csvUploadArea = document.getElementById('csv-upload-area');
    const csvMapping = document.getElementById('csv-mapping');
    const csvFieldsList = document.getElementById('csv-fields-list');

    let csvData = [];
    let csvHeaders = [];

    if (csvUploadArea) {
        csvUploadArea.addEventListener('click', () => csvFileInput.click());
    }

    if (csvFileInput) {
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
    }

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
        if (csvUploadArea) csvUploadArea.style.display = 'none';
        if (csvMapping) csvMapping.style.display = 'block';

        const leadFields = [
            { key: 'businessName', label: 'Business Name *' },
            { key: 'category', label: 'Category' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'website', label: 'Website' },
            { key: 'address', label: 'Address' }
        ];

        if (csvFieldsList) {
            csvFieldsList.innerHTML = leadFields.map(field => `
                <div class="form-group" style="margin-bottom: 12px;">
                    <label>${field.label}</label>
                    <select class="csv-field-map" data-lead-field="${field.key}">
                        <option value="">-- Ignore --</option>
                        ${csvHeaders.map(h => `<option value="${h}" ${h.toLowerCase().includes(field.key.toLowerCase()) ? 'selected' : ''}>${h}</option>`).join('')}
                    </select>
                </div>
            `).join('');
        }
    };

    const btnProcessCsv = document.getElementById('btn-process-csv');
    if (btnProcessCsv) {
        btnProcessCsv.addEventListener('click', async () => {
            const mapping = {};
            document.querySelectorAll('.csv-field-map').forEach(select => {
                if (select.value) {
                    mapping[select.dataset.leadField] = select.value;
                }
            });

            const rawLeads = await AcquisitionService.importFromSource('csv', csvData, { mapping });
            processImport(rawLeads);
        });
    }

    const processImport = async (rawLeads) => {
        let stats = {
            total: rawLeads.length,
            imported: 0,
            dupes: 0,
            phones: 0,
            websites: 0,
            categories: 0,
            noPhone: 0,
            new: 0
        };

        const importResult = await StorageService.importLeads(rawLeads);
        if (importResult) {
            stats.total = importResult.total;
            stats.imported = importResult.imported;
            stats.dupes = importResult.duplicates;
            stats.new = importResult.imported;
            stats.noPhone = importResult.details.filter(item => /no phone/i.test(item.reason || '')).length;
            stats.failed = importResult.failed;
            state.leads = await StorageService.loadLeads();
        } else {
            for (const raw of rawLeads) {
                if (raw.phone && raw.phone !== 'Phone not available') stats.phones++;
                else stats.noPhone++;
                if (raw.website) stats.websites++;
                if (raw.category) stats.categories++;
                const result = await PipelineService.process(raw, state.leads);
                if (result.action === 'CREATE') {
                    const savedLead = await StorageService.saveLead(result.data);
                    state.leads.push(savedLead);
                    stats.new++;
                    stats.imported++;
                } else {
                    const idx = state.leads.findIndex(l => l.id === result.data.id);
                    state.leads[idx] = await StorageService.saveLead(result.data);
                    stats.dupes++;
                    stats.imported++;
                }
            }
            StorageService.saveLeads(state.leads);
        }

        importTabContents.forEach(c => c.style.display = 'none');
        const importSummary = document.getElementById('import-summary');
        if (importSummary) importSummary.style.display = 'block';

        const summaryTotal = document.getElementById('summary-total');
        if (summaryTotal) summaryTotal.textContent = stats.total;

        const summaryImported = document.getElementById('summary-imported');
        if (summaryImported) summaryImported.textContent = stats.imported;

        const summaryDupes = document.getElementById('summary-dupes');
        if (summaryDupes) summaryDupes.textContent = stats.dupes;

        const summaryNew = document.getElementById('summary-new');
        if (summaryNew) summaryNew.textContent = stats.new;

        const summaryPhones = document.getElementById('summary-phones');
        if (summaryPhones) summaryPhones.textContent = stats.phones;

        const summaryWebsites = document.getElementById('summary-websites');
        if (summaryWebsites) summaryWebsites.textContent = stats.websites;

        const summaryCategories = document.getElementById('summary-categories');
        if (summaryCategories) summaryCategories.textContent = stats.categories;

        const summaryNoPhone = document.getElementById('summary-no-phone');
        if (summaryNoPhone) summaryNoPhone.textContent = stats.noPhone;

        if (state.currentPage === 'leads') renderLeads();
        updateDashboard();
    };

    const btnImportFinish = document.getElementById('btn-import-finish');
    if (btnImportFinish) {
        btnImportFinish.addEventListener('click', () => {
            closeModal('import');
            if (state.currentPage === 'leads') renderLeads();
        });
    }

    // Campaign Handlers
    const btnNewCampaign = document.getElementById('btn-new-campaign');
    if (btnNewCampaign) {
        btnNewCampaign.addEventListener('click', () => {
            const selector = document.getElementById('campaign-leads-selector');
            selector.innerHTML = state.leads.slice(0, 10).map(l => `
                <div style="margin-bottom: 5px;"><input type="checkbox" value="${l.id}"> ${l.businessName}</div>
            `).join('');
            openModal('campaign');
        });
    }

    const formCampaign = document.getElementById('form-campaign');
    if (formCampaign) {
        formCampaign.addEventListener('submit', async (e) => {
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

                const savedCampaign = await StorageService.saveCampaign(camp);
                state.campaigns.push(savedCampaign);
                StorageService.saveCampaigns(state.campaigns);
                closeModal('campaign');
                navigateTo('campaigns');
                openCampaignReview(camp.id);
            } catch (error) {
                console.error('Campaign Generation Error:', error);
                alert('An error occurred while generating the campaign. Please check the console for details.');
            }
        });
    }

    // Approve Message (Demo Mode)
    const btnApproveMsg = document.getElementById('btn-approve-msg');
    if (btnApproveMsg) {
        btnApproveMsg.addEventListener('click', () => {
            alert('Message approved! (Demo Mode: WhatsApp integration will be available in the next phase)');
            closeModal('review');
        });
    }

    // Attendance Portal Button
    const btnGuardPortal = document.getElementById('btn-guard-portal');
    if (btnGuardPortal) {
        btnGuardPortal.addEventListener('click', () => {
            window.open('guard-portal.html', '_blank');
        });
    }

    // Initial load
    setAuthMode('login');
    if (await AuthService.refreshSession()) {
        await showApp();
    } else {
        navigateTo('landing');
    }
});

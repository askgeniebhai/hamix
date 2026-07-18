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
        projects: [],
        websites: [],
        deployments: [],
        successRecords: [],
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
        state.projects = await StorageService.loadProjects();
        state.websites = await StorageService.loadWebsites();
        state.deployments = await StorageService.loadDeployments();
        state.successRecords = await StorageService.loadCustomerSuccess();
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
            state.proposals = [];
            state.diagnostics = [];
            state.projects = [];
            state.websites = [];
            state.deployments = [];
            state.successRecords = [];
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
        if (pageId === 'projects') renderProjects();
        if (pageId === 'websites') renderWebsites();
        if (pageId === 'deployments') renderDeployments();
        if (pageId === 'success') renderCustomerSuccess();

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

        const lifecycleContainer = document.getElementById('lifecycle-stats');
        if (lifecycleContainer) {
            const metrics = [
                ['Diagnostics', state.diagnostics.length],
                ['Proposals', state.proposals.length],
                ['Projects', state.projects.length],
                ['Websites', state.websites.length],
                ['Deployments', state.deployments.length],
                ['Success Records', state.successRecords.length]
            ];
            lifecycleContainer.innerHTML = metrics.map(([label, value]) => `<div class="pipeline-card"><span class="pipeline-label">${label}</span><span class="pipeline-value">${value}</span></div>`).join('');
        }
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
                        <button class="btn-icon diagnostic-lead" data-id="${lead.id}" title="Create Diagnostic"><i data-lucide="brain-circuit"></i></button>
                        <button class="btn-icon proposal-lead" data-id="${lead.id}" title="Create Proposal"><i data-lucide="file-text"></i></button>
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

        document.querySelectorAll('.diagnostic-lead').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                    const diagnostic = await StorageService.createDiagnostic({ leadId: btn.dataset.id });
                    state.diagnostics.unshift(diagnostic);
                    alert('Diagnostic created from lead. Review and approve it before proposal drafting.');
                    navigateTo('diagnostics');
                } catch (error) {
                    alert(`Diagnostic creation failed: ${error.message}`);
                } finally {
                    btn.disabled = false;
                }
            });
        });

        document.querySelectorAll('.proposal-lead').forEach(btn => {
            btn.addEventListener('click', async () => {
                btn.disabled = true;
                try {
                    const proposal = await StorageService.createProposal({ leadId: btn.dataset.id, title: 'HAMIX Growth Proposal' });
                    state.proposals.unshift(proposal);
                    alert(`Proposal ${proposal.proposalNumber} created from lead. Review before marking sent.`);
                    navigateTo('proposals');
                } catch (error) {
                    alert(`Proposal creation failed: ${error.message}`);
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
        document.querySelectorAll('.proposal-print').forEach(btn => btn.addEventListener('click', () => window.open(ApiService.urlFor(`/api/proposals/${encodeURIComponent(btn.dataset.id)}/print`), '_blank')));
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
            if (status === 'Accepted') {
                state.customers = await StorageService.loadCustomers();
                state.projects = await StorageService.loadProjects();
        state.websites = await StorageService.loadWebsites();
        state.deployments = await StorageService.loadDeployments();
        state.successRecords = await StorageService.loadCustomerSuccess();
            }
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


    // Projects and onboarding discovery
    const renderProjects = () => {
        const listContainer = document.getElementById('projects-list');
        if (!listContainer) return;
        if (!state.projects.length) {
            listContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No onboarding projects yet. Accept a proposal or convert a lead to create one.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.projects.map(project => `
            <tr>
                <td><strong>${project.projectName || 'HAMIX Onboarding'}</strong><br><small>${project.scopeSummary || ''}</small></td>
                <td>${project.customerId || '-'}</td>
                <td>${project.acceptedProposalId || '-'}</td>
                <td><span class="badge">${project.status || 'Onboarding'}</span></td>
                <td>${project.discoveryStatus || 'Pending'}</td>
                <td>${new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-group">
                        <button class="btn btn-secondary btn-sm project-discovery" data-id="${project.id}">Discovery</button>
                        <button class="btn btn-secondary btn-sm project-asset" data-id="${project.id}">Asset Metadata</button>
                        <button class="btn btn-primary btn-sm project-complete" data-id="${project.id}">Mark Ready</button>
                    </div>
                </td>
            </tr>
        `).join('');
        document.querySelectorAll('.project-discovery').forEach(btn => btn.addEventListener('click', () => editProjectDiscovery(btn.dataset.id, btn)));
        document.querySelectorAll('.project-asset').forEach(btn => btn.addEventListener('click', () => addProjectAssetMetadata(btn.dataset.id, btn)));
        document.querySelectorAll('.project-complete').forEach(btn => btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                const updated = await StorageService.updateProject(btn.dataset.id, { status: 'Discovery Ready', discoveryStatus: 'Complete' });
                const index = state.projects.findIndex(project => project.id === updated.id);
                if (index !== -1) state.projects[index] = updated;
                renderProjects();
            } catch (error) {
                alert(`Project update failed: ${error.message}`);
            } finally {
                btn.disabled = false;
            }
        }));
    };

    const editProjectDiscovery = async (projectId, button) => {
        button.disabled = true;
        try {
            const existing = await StorageService.loadProjectDiscovery(projectId);
            const data = existing.data || {};
            const companyInfo = prompt('Company profile / background:', data.companyInfo || '');
            if (companyInfo === null) return;
            const primaryContact = prompt('Primary contact:', data.primaryContact || (data.contacts || []).join(', '));
            if (primaryContact === null) return;
            const products = prompt('Products (comma separated):', (data.products || []).join(', '));
            if (products === null) return;
            const services = prompt('Services (comma separated):', (data.services || []).join(', '));
            if (services === null) return;
            const targetAudience = prompt('Target audience:', data.targetAudience || '');
            if (targetAudience === null) return;
            const competitors = prompt('Competitors (comma separated):', (data.competitors || []).join(', '));
            if (competitors === null) return;
            const domain = prompt('Domain / desired domain:', data.domain || data.existingWebsite || '');
            if (domain === null) return;
            const contentStatus = prompt('Content status:', data.contentStatus || 'Needs customer content review');
            if (contentStatus === null) return;
            const technicalRequirements = prompt('Technical requirements (do not enter passwords, tokens, or API keys):', data.technicalRequirements || '');
            if (technicalRequirements === null) return;
            const notes = prompt('Discovery notes (no secrets):', data.notes || '');
            if (notes === null) return;
            const saved = await StorageService.saveProjectDiscovery(projectId, { companyInfo, primaryContact, products, services, targetAudience, competitors, domain, contentStatus, technicalRequirements, notes, projectStatus: 'Discovery Ready' });
            const index = state.projects.findIndex(project => project.id === projectId);
            if (index !== -1) state.projects[index] = { ...state.projects[index], status: saved.projectStatus || 'Discovery Ready', discoveryStatus: 'Complete', updatedAt: new Date().toISOString() };
            renderProjects();
            alert('Project discovery saved to backend persistence. Secrets were intentionally blocked from ordinary notes.');
        } catch (error) {
            alert(`Discovery save failed: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    };

    const addProjectAssetMetadata = async (projectId, button) => {
        button.disabled = true;
        try {
            alert('Durable object storage is not configured in this checkout. HAMIX will store metadata only and will not upload or persist the file bytes.');
            const fileName = prompt('Asset file name (metadata only):');
            if (!fileName) return;
            const fileType = prompt('MIME type (image/png, image/jpeg, image/webp, image/svg+xml, application/pdf, text/plain):', 'image/png');
            if (!fileType) return;
            const fileSize = Number(prompt('File size in bytes:', '1024'));
            const notes = prompt('Asset notes/tags (no secrets):', 'Customer-supplied discovery asset metadata only.');
            const asset = await StorageService.addProjectAsset(projectId, { fileName, fileType, fileSize, notes, assetType: 'discovery' });
            alert(`Asset metadata saved (${asset.storageStatus}). Object storage remains an external deployment dependency.`);
        } catch (error) {
            alert(`Asset metadata failed: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    };

    const btnRefreshProjects = document.getElementById('btn-refresh-projects');
    if (btnRefreshProjects) {
        btnRefreshProjects.addEventListener('click', async () => {
            btnRefreshProjects.disabled = true;
            try {
                state.projects = await StorageService.loadProjects();
        state.websites = await StorageService.loadWebsites();
        state.deployments = await StorageService.loadDeployments();
        state.successRecords = await StorageService.loadCustomerSuccess();
                renderProjects();
            } catch (error) {
                alert(`Project refresh failed: ${error.message}`);
            } finally {
                btnRefreshProjects.disabled = false;
            }
        });
    }


    // Website generation engine
    const renderWebsites = () => {
        const listContainer = document.getElementById('websites-list');
        if (!listContainer) return;
        if (!state.websites.length) {
            listContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No website projects yet. Create one from a discovery-ready onboarding project.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.websites.map(site => `
            <tr>
                <td><strong>${site.businessName || site.projectName || 'HAMIX Website'}</strong><br><small>${site.aiProviderStatus === 'missing' ? 'Pending configured AI provider' : 'AI provider configured'}</small></td>
                <td>${site.projectId}</td>
                <td><span class="badge">${site.status || site.generationStatus}</span></td>
                <td>v${site.currentVersion || 1}</td>
                <td>${(site.pages || []).join(', ')}</td>
                <td>${new Date(site.updatedAt || site.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-group">
                        <button class="btn btn-secondary btn-sm website-regenerate" data-project="${site.projectId}">Regenerate</button>
                        <button class="btn btn-secondary btn-sm website-versions" data-id="${site.id}">Versions</button>
                        <button class="btn btn-primary btn-sm website-approve" data-id="${site.id}">Approve</button>
                    </div>
                </td>
            </tr>
        `).join('');
        document.querySelectorAll('.website-regenerate').forEach(btn => btn.addEventListener('click', () => requestWebsiteGeneration(btn.dataset.project, true, btn)));
        document.querySelectorAll('.website-versions').forEach(btn => btn.addEventListener('click', async () => {
            try {
                const response = await StorageService.loadWebsiteVersions(btn.dataset.id);
                alert(`Website versions:\n${response.data.map(v => `v${v.version} · ${v.status} · ${new Date(v.createdAt).toLocaleString()}`).join('\n') || 'No versions found.'}`);
            } catch (error) {
                alert(`Version history failed: ${error.message}`);
            }
        }));
        document.querySelectorAll('.website-approve').forEach(btn => btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                const updated = await StorageService.updateWebsiteProjectStatus(btn.dataset.id, 'Approved');
                const index = state.websites.findIndex(site => site.id === updated.id);
                if (index !== -1) state.websites[index] = updated;
                renderWebsites();
                alert('Website project approved internally. Publishing is handled by the deployment workflow and is not simulated here.');
            } catch (error) {
                alert(`Website approval failed: ${error.message}`);
            } finally {
                btn.disabled = false;
            }
        }));
    };

    const requestWebsiteGeneration = async (projectId, regenerate = false, button = null) => {
        if (button) button.disabled = true;
        try {
            const notes = prompt(regenerate ? 'Regeneration notes:' : 'Generation request notes:', regenerate ? 'Regenerate as a new preserved version.' : 'Generate from approved project discovery.');
            if (notes === null) return;
            const pages = prompt('Pages (comma separated):', 'Home, About, Services, Contact');
            if (pages === null) return;
            const payload = { notes, pages: pages.split(',').map(page => page.trim()).filter(Boolean) };
            const result = regenerate ? await StorageService.regenerateWebsiteProject(projectId, payload) : await StorageService.createWebsiteProject({ ...payload, projectId });
            const website = result.website || result;
            if (result.duplicate) {
                alert(result.message);
            } else if (regenerate) {
                const index = state.websites.findIndex(site => site.id === website.id);
                if (index !== -1) state.websites[index] = website;
                alert(`Website regeneration saved as version ${website.currentVersion}. Status: ${website.status}.`);
            } else {
                state.websites.unshift(website);
                alert(`Website generation request persisted. Status: ${website.status}. Configure an AI provider before generated content is produced.`);
            }
            renderWebsites();
        } catch (error) {
            alert(`Website generation failed: ${error.message}`);
        } finally {
            if (button) button.disabled = false;
        }
    };

    const btnGenerateWebsite = document.getElementById('btn-generate-website');
    if (btnGenerateWebsite) {
        btnGenerateWebsite.addEventListener('click', async () => {
            const projectId = prompt('Enter discovery-ready project ID:');
            if (!projectId) return;
            await requestWebsiteGeneration(projectId, false, btnGenerateWebsite);
        });
    }
    const btnRefreshWebsites = document.getElementById('btn-refresh-websites');
    if (btnRefreshWebsites) {
        btnRefreshWebsites.addEventListener('click', async () => {
            btnRefreshWebsites.disabled = true;
            try {
                state.websites = await StorageService.loadWebsites();
        state.deployments = await StorageService.loadDeployments();
        state.successRecords = await StorageService.loadCustomerSuccess();
                renderWebsites();
            } catch (error) {
                alert(`Website refresh failed: ${error.message}`);
            } finally {
                btnRefreshWebsites.disabled = false;
            }
        });
    }


    // Website deployment workflow
    const renderDeployments = () => {
        const listContainer = document.getElementById('deployments-list');
        if (!listContainer) return;
        if (!state.deployments.length) {
            listContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No deployment requests yet. Approve a website project before requesting deployment.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.deployments.map(deployment => `
            <tr>
                <td><strong>${deployment.id}</strong><br><small>${deployment.providerStatus === 'missing' ? 'Provider not configured' : 'Provider configured'}</small></td>
                <td>${deployment.websiteProjectId}</td>
                <td>v${deployment.version}</td>
                <td><span class="badge">${deployment.status}</span></td>
                <td>${deployment.requestedDomain || '-'}</td>
                <td>${new Date(deployment.updatedAt || deployment.createdAt).toLocaleDateString()}</td>
                <td><button class="btn btn-secondary btn-sm deployment-cancel" data-id="${deployment.id}">Cancel</button></td>
            </tr>
        `).join('');
        document.querySelectorAll('.deployment-cancel').forEach(btn => btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                const updated = await StorageService.updateDeploymentStatus(btn.dataset.id, 'Cancelled');
                const index = state.deployments.findIndex(item => item.id === updated.id);
                if (index !== -1) state.deployments[index] = updated;
                renderDeployments();
            } catch (error) {
                alert(`Deployment update failed: ${error.message}`);
            } finally {
                btn.disabled = false;
            }
        }));
    };

    const requestDeployment = async (button = null) => {
        if (button) button.disabled = true;
        try {
            const websiteProjectId = prompt('Approved website project ID:');
            if (!websiteProjectId) return;
            const domain = prompt('Requested domain (optional):', '');
            const notes = prompt('Deployment notes:', 'Deployment request; provider configuration required before publishing.');
            const result = await StorageService.createDeployment({ websiteProjectId, domain, notes });
            const deployment = result.deployment || result;
            if (result.duplicate) alert(result.message);
            else {
                state.deployments.unshift(deployment);
                alert(`Deployment request saved. Status: ${deployment.status}. Configure a deployment provider before publishing.`);
            }
            renderDeployments();
        } catch (error) {
            alert(`Deployment request failed: ${error.message}`);
        } finally {
            if (button) button.disabled = false;
        }
    };

    const btnRequestDeployment = document.getElementById('btn-request-deployment');
    if (btnRequestDeployment) btnRequestDeployment.addEventListener('click', () => requestDeployment(btnRequestDeployment));
    const btnRefreshDeployments = document.getElementById('btn-refresh-deployments');
    if (btnRefreshDeployments) {
        btnRefreshDeployments.addEventListener('click', async () => {
            btnRefreshDeployments.disabled = true;
            try {
                state.deployments = await StorageService.loadDeployments();
        state.successRecords = await StorageService.loadCustomerSuccess();
                renderDeployments();
            } catch (error) {
                alert(`Deployment refresh failed: ${error.message}`);
            } finally {
                btnRefreshDeployments.disabled = false;
            }
        });
    }


    // Customer success workflow
    const renderCustomerSuccess = () => {
        const listContainer = document.getElementById('success-list');
        if (!listContainer) return;
        if (!state.successRecords.length) {
            listContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No customer-success records yet. Create one from an active customer/project.</td></tr>`;
            return;
        }
        listContainer.innerHTML = state.successRecords.map(record => `
            <tr>
                <td><strong>${record.customerSnapshot?.businessName || record.customerId}</strong><br><small>${record.deploymentStatus || 'No deployment request'}</small></td>
                <td>${record.projectName || record.projectId || '-'}</td>
                <td><span class="badge">${record.status}</span></td>
                <td>${record.onboardingCompletion || 0}%</td>
                <td>${record.satisfaction || 'Not captured'}</td>
                <td>${(record.nextActions || []).join(', ') || '-'}</td>
                <td>
                    <div class="action-group">
                        <button class="btn btn-secondary btn-sm success-update" data-id="${record.id}">Update</button>
                        <button class="btn btn-secondary btn-sm success-activity" data-id="${record.id}">Add Activity</button>
                        <button class="btn btn-primary btn-sm success-history" data-id="${record.id}">History</button>
                    </div>
                </td>
            </tr>
        `).join('');
        document.querySelectorAll('.success-update').forEach(btn => btn.addEventListener('click', () => updateSuccessRecord(btn.dataset.id, btn)));
        document.querySelectorAll('.success-activity').forEach(btn => btn.addEventListener('click', () => addSuccessActivity(btn.dataset.id, btn)));
        document.querySelectorAll('.success-history').forEach(btn => btn.addEventListener('click', async () => {
            try {
                const response = await StorageService.loadCustomerSuccessActivities(btn.dataset.id);
                alert(`Activity history:\n${response.data.map(item => `${item.created_at} · ${item.activity_type}: ${item.notes}`).join('\n') || 'No activities yet.'}`);
            } catch (error) {
                alert(`Activity load failed: ${error.message}`);
            }
        }));
    };

    const createSuccessRecord = async (button = null) => {
        if (button) button.disabled = true;
        try {
            const customerId = prompt('Customer ID:');
            if (!customerId) return;
            const projectId = prompt('Project ID (optional, latest customer project is used if blank):', '');
            const created = await StorageService.createCustomerSuccess({ customerId, projectId: projectId || undefined, status: 'Onboarding', nextActions: ['Complete onboarding review'] });
            const record = created.success || created;
            if (created.duplicate) alert(created.message);
            else {
                state.successRecords.unshift(record);
                alert('Customer-success record created. Provider-dependent email/SMS/monitoring/analytics actions remain blocked until configured.');
            }
            renderCustomerSuccess();
        } catch (error) {
            alert(`Customer success creation failed: ${error.message}`);
        } finally {
            if (button) button.disabled = false;
        }
    };

    const updateSuccessRecord = async (id, button) => {
        button.disabled = true;
        try {
            const current = state.successRecords.find(record => record.id === id);
            const status = prompt('Status (Onboarding, Active, At Risk, Renewal Due, Growth Opportunity, Closed):', current?.status || 'Active');
            if (!status) return;
            const onboardingCompletion = prompt('Onboarding completion %:', current?.onboardingCompletion ?? 50);
            if (onboardingCompletion === null) return;
            const satisfaction = prompt('Satisfaction 1-5 (blank if not captured):', current?.satisfaction || '');
            if (satisfaction === null) return;
            const nextActions = prompt('Next actions (comma separated):', (current?.nextActions || []).join(', '));
            if (nextActions === null) return;
            const updated = await StorageService.updateCustomerSuccess(id, { status, onboardingCompletion, satisfaction, nextActions });
            const index = state.successRecords.findIndex(record => record.id === updated.id);
            if (index !== -1) state.successRecords[index] = updated;
            renderCustomerSuccess();
        } catch (error) {
            alert(`Customer success update failed: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    };

    const addSuccessActivity = async (id, button) => {
        button.disabled = true;
        try {
            const activityType = prompt('Activity type (note, call, meeting, follow_up, support_issue, renewal_review, growth_review):', 'note');
            if (!activityType) return;
            const notes = prompt('Activity notes:');
            if (!notes) return;
            const outcome = prompt('Outcome:', 'Recorded');
            const nextAction = prompt('Next action:', 'Follow up');
            const followUpAt = prompt('Follow-up date/time (optional ISO/date):', '');
            await StorageService.addCustomerSuccessActivity(id, { activityType, notes, outcome, nextAction, followUpAt: followUpAt || null });
            alert('Customer-success activity saved. Provider-dependent notifications were not sent.');
        } catch (error) {
            alert(`Customer success activity failed: ${error.message}`);
        } finally {
            button.disabled = false;
        }
    };

    const btnCreateSuccess = document.getElementById('btn-create-success');
    if (btnCreateSuccess) btnCreateSuccess.addEventListener('click', () => createSuccessRecord(btnCreateSuccess));
    const btnRefreshSuccess = document.getElementById('btn-refresh-success');
    if (btnRefreshSuccess) {
        btnRefreshSuccess.addEventListener('click', async () => {
            btnRefreshSuccess.disabled = true;
            try {
                state.successRecords = await StorageService.loadCustomerSuccess();
                renderCustomerSuccess();
            } catch (error) {
                alert(`Customer success refresh failed: ${error.message}`);
            } finally {
                btnRefreshSuccess.disabled = false;
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
        let customers = [...state.customers];
        const search = state.filters.customers.search.toLowerCase();
        if (search) customers = customers.filter(c => JSON.stringify(c).toLowerCase().includes(search));
        if (state.filters.customers.sort === 'name') customers.sort((a, b) => String(a.businessName || '').localeCompare(String(b.businessName || '')));
        else customers.sort((a, b) => new Date(b.joinedAt || b.createdAt || 0) - new Date(a.joinedAt || a.createdAt || 0));
        if (customers.length === 0) {
            listContainer.innerHTML = `<tr><td colspan="7" class="empty-state">No customers match the current filters.</td></tr>`;
            return;
        }
        listContainer.innerHTML = customers.map(c => `
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


    window.handleGlobalSearch = (query) => {
        const overlay = document.getElementById('searchResults');
        if (!overlay) return;
        const q = String(query || '').trim().toLowerCase();
        if (!q) {
            overlay.innerHTML = '';
            overlay.style.display = 'none';
            return;
        }
        const collections = [
            ['Lead', state.leads, item => item.businessName || item.email || item.phone, 'leads'],
            ['Customer', state.customers, item => item.businessName || item.email || item.phone, 'customers'],
            ['Proposal', state.proposals, item => item.proposalNumber || item.title, 'proposals'],
            ['Project', state.projects, item => item.projectName || item.scopeSummary, 'projects'],
            ['Website', state.websites, item => item.businessName || item.projectName, 'websites'],
            ['Deployment', state.deployments, item => item.requestedDomain || item.status, 'deployments'],
            ['Success', state.successRecords, item => item.customerSnapshot?.businessName || item.status, 'success']
        ];
        const matches = collections.flatMap(([type, items, labeler, page]) => items
            .filter(item => JSON.stringify(item).toLowerCase().includes(q))
            .slice(0, 4)
            .map(item => ({ type, label: labeler(item) || item.id, page }))
        ).slice(0, 10);
        overlay.style.display = 'block';
        overlay.innerHTML = matches.length
            ? matches.map(match => `<button type="button" class="search-result-item" data-page="${match.page}"><strong>${match.type}</strong><span>${match.label}</span></button>`).join('')
            : '<div class="search-result-empty">No matching HAMIX records found.</div>';
        overlay.querySelectorAll('.search-result-item').forEach(item => item.addEventListener('click', () => {
            overlay.style.display = 'none';
            navigateTo(item.dataset.page);
        }));
    };

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
            try {
                const leads = await AcquisitionService.importFromSource('ocr', 'image_data');
                processImport(leads);
            } catch (error) {
                alert(error.message);
            } finally {
                if (ocrStatus) ocrStatus.style.display = 'none';
            }
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
            alert('Message review saved locally. WhatsApp sending is blocked until an approved provider is configured.');
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

/**
 * HAMIX Platform - Storage Service
 * Centralized data persistence layer
 */

const StorageService = (() => {
    const KEYS = {
        LEADS: 'hamix_leads',
        CUSTOMERS: 'hamix_customers',
        CAMPAIGNS: 'hamix_campaigns',
        SETTINGS: 'hamix_settings',
        IMPORT_HISTORY: 'hamix_import_history'
    };

    const scopedKey = (key) => {
        const session = window.AuthService ? window.AuthService.getSession() : null;
        return session && session.tenantId ? `${session.tenantId}:${key}` : key;
    };

    const save = (key, data) => {
        try {
            localStorage.setItem(scopedKey(key), JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage Error:', e);
            return false;
        }
    };

    const load = (key, defaultValue = []) => {
        try {
            const data = localStorage.getItem(scopedKey(key));
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Load Error:', e);
            return defaultValue;
        }
    };

    const useBackend = () => window.ApiService && window.AuthService && AuthService.getSession()?.backend;

    const loadRemote = async (resource, defaultValue = []) => {
        if (!useBackend()) return defaultValue;
        const response = await ApiService.get(`/api/${resource}`);
        return response.data ?? defaultValue;
    };

    const saveRemote = async (resource, item) => {
        if (!useBackend()) return item;
        return ApiService.post(`/api/${resource}`, item);
    };

    const deleteRemote = async (resource, id) => {
        if (!useBackend()) return { ok: true };
        return ApiService.delete(`/api/${resource}/${encodeURIComponent(id)}`);
    };

    return {
        KEYS,
        save,
        load,
        scopedKey,
        getLeads: () => load(KEYS.LEADS),
        saveLeads: (leads) => save(KEYS.LEADS, leads),
        getCustomers: () => load(KEYS.CUSTOMERS),
        saveCustomers: (cust) => save(KEYS.CUSTOMERS, cust),
        getCampaigns: () => load(KEYS.CAMPAIGNS),
        saveCampaigns: (camp) => save(KEYS.CAMPAIGNS, camp),
        loadLeads: () => useBackend() ? loadRemote('leads') : Promise.resolve(load(KEYS.LEADS)),
        saveLead: (lead) => useBackend() ? saveRemote('leads', lead) : Promise.resolve(lead),
        importLeads: (leads) => useBackend() ? ApiService.post('/api/leads/import', { leads }) : Promise.resolve(null),
        qualifyLead: (id) => useBackend() ? ApiService.post(`/api/leads/${encodeURIComponent(id)}/qualify`, {}) : Promise.resolve(null),
        changeLeadStage: (id, stage) => useBackend() ? ApiService.post(`/api/leads/${encodeURIComponent(id)}/stage`, { stage }) : Promise.resolve(null),
        addLeadActivity: (id, activity) => useBackend() ? ApiService.post(`/api/leads/${encodeURIComponent(id)}/activities`, activity) : Promise.resolve(null),
        deleteLead: (id) => useBackend() ? deleteRemote('leads', id) : Promise.resolve({ ok: true }),
        loadCustomers: () => useBackend() ? loadRemote('customers') : Promise.resolve(load(KEYS.CUSTOMERS)),
        saveCustomer: (customer) => useBackend() ? saveRemote('customers', customer) : Promise.resolve(customer),
        convertCustomer: (leadId, customer) => useBackend() ? ApiService.post('/api/customers/convert', { leadId, customer }) : Promise.resolve(customer),
        loadDiagnostics: () => useBackend() ? loadRemote('diagnostics') : Promise.resolve([]),
        createDiagnostic: (diagnostic) => useBackend() ? ApiService.post('/api/diagnostics', diagnostic) : Promise.resolve(null),
        updateDiagnostic: (id, diagnostic) => useBackend() ? ApiService.post(`/api/diagnostics/${encodeURIComponent(id)}`, diagnostic) : Promise.resolve(null),
        loadProposals: () => useBackend() ? loadRemote('proposals') : Promise.resolve([]),
        loadProjects: () => useBackend() ? loadRemote('projects') : Promise.resolve([]),
        updateProject: (id, project) => useBackend() ? ApiService.post(`/api/projects/${encodeURIComponent(id)}`, project) : Promise.resolve(project),
        loadProjectDiscovery: (id) => useBackend() ? ApiService.get(`/api/projects/${encodeURIComponent(id)}/discovery`) : Promise.resolve({ data: {} }),
        saveProjectDiscovery: (id, discovery) => useBackend() ? ApiService.post(`/api/projects/${encodeURIComponent(id)}/discovery`, discovery) : Promise.resolve(discovery),
        loadProjectAssets: (id) => useBackend() ? ApiService.get(`/api/projects/${encodeURIComponent(id)}/assets`) : Promise.resolve({ data: [] }),
        addProjectAsset: (id, asset) => useBackend() ? ApiService.post(`/api/projects/${encodeURIComponent(id)}/assets`, asset) : Promise.resolve(asset),
        createProposal: (proposal) => useBackend() ? ApiService.post('/api/proposals', proposal) : Promise.resolve(null),
        updateProposal: (id, proposal) => useBackend() ? ApiService.post(`/api/proposals/${encodeURIComponent(id)}`, proposal) : Promise.resolve(null),
        changeProposalStatus: (id, status, note) => useBackend() ? ApiService.post(`/api/proposals/${encodeURIComponent(id)}/status`, { status, note }) : Promise.resolve(null),
        loadCampaigns: () => useBackend() ? loadRemote('campaigns') : Promise.resolve(load(KEYS.CAMPAIGNS)),
        saveCampaign: (campaign) => useBackend() ? saveRemote('campaigns', campaign) : Promise.resolve(campaign),
        getImportHistory: () => load(KEYS.IMPORT_HISTORY),
        saveImportHistory: (hist) => save(KEYS.IMPORT_HISTORY, hist)
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}

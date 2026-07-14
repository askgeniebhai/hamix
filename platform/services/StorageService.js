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

    const save = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage Error:', e);
            return false;
        }
    };

    const load = (key, defaultValue = []) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Load Error:', e);
            return defaultValue;
        }
    };

    return {
        KEYS,
        save,
        load,
        getLeads: () => load(KEYS.LEADS),
        saveLeads: (leads) => save(KEYS.LEADS, leads),
        getCustomers: () => load(KEYS.CUSTOMERS),
        saveCustomers: (cust) => save(KEYS.CUSTOMERS, cust),
        getCampaigns: () => load(KEYS.CAMPAIGNS),
        saveCampaigns: (camp) => save(KEYS.CAMPAIGNS, camp),
        getImportHistory: () => load(KEYS.IMPORT_HISTORY),
        saveImportHistory: (hist) => save(KEYS.IMPORT_HISTORY, hist)
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}

/**
 * HAMIX Data Access Layer (DAL)
 * Centralizes all persistence operations for the platform.
 */

const DAL = {
    KEYS: {
        LEADS: 'hamix_leads',
        CUSTOMERS: 'hamix_customers',
        CONFIG: 'hamix_admin_config',
        AUDIT: 'hamix_audit_logs'
    },

    /**
     * Generic fetch from storage
     */
    _get: function(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`DAL: Error reading ${key}`, e);
            return defaultValue;
        }
    },

    /**
     * Generic save to storage
     */
    _set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`DAL: Error saving ${key}`, e);
            return false;
        }
    },

    // --- LEADS ---
    getLeads: function() { return this._get(this.KEYS.LEADS); },
    saveLeads: function(leads) { return this._set(this.KEYS.LEADS, leads); },

    addLead: function(lead) {
        const leads = this.getLeads();
        leads.push(lead);
        return this.saveLeads(leads);
    },

    removeLead: function(id) {
        const leads = this.getLeads().filter(l => l.id !== id);
        return this.saveLeads(leads);
    },

    // --- CUSTOMERS ---
    getCustomers: function() { return this._get(this.KEYS.CUSTOMERS); },
    saveCustomers: function(customers) { return this._set(this.KEYS.CUSTOMERS, customers); },

    getCustomer: function(id) {
        return this.getCustomers().find(c => c.id === id);
    },

    saveCustomer: function(customer) {
        const customers = this.getCustomers();
        const index = customers.findIndex(c => c.id === customer.id);
        if (index !== -1) {
            customers[index] = customer;
        } else {
            customers.push(customer);
        }
        return this.saveCustomers(customers);
    },

    deleteCustomer: function(id) {
        const customers = this.getCustomers().filter(c => c.id !== id);
        return this.saveCustomers(customers);
    },

    // --- CONFIG & SYSTEM ---
    getConfig: function() { return this._get(this.KEYS.CONFIG, null); },
    saveConfig: function(config) { return this._set(this.KEYS.CONFIG, config); },

    getAuditLogs: function() { return this._get(this.KEYS.AUDIT); },
    addAuditLog: function(log) {
        const logs = this.getAuditLogs();
        logs.unshift(log);
        return this._set(this.KEYS.AUDIT, logs.slice(0, 500));
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DAL;
} else {
    window.HAMIX_DAL = DAL;
}

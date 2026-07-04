/**
 * HAMIX Administration Layer
 * Manages users, roles, workspace settings, and global configuration.
 */

const AdminManager = {
    /**
     * Default Platform Settings
     */
    config: {
        workspace: {
            name: 'HAMIX Global',
            branding: 'Indigo',
            deploymentRegion: 'EU-West-1',
            autoPublish: false,
            orgLogo: '',
            orgPrimaryColor: '#4f46e5',
            orgEmail: 'support@hamix.com'
        },
        ai: {
            engine: 'GPT-4o',
            temperature: 0.7,
            maxTokens: 2000
        },
        deployment: {
            provider: 'GitHub',
            repoPrefix: 'hamix-client-',
            branch: 'main'
        }
    },

    /**
     * Initial User List
     */
    users: [
        { id: 'u1', name: 'Admin User', email: 'admin@hamix.com', role: 'Super Admin', status: 'Active', avatar: 'AD' },
        { id: 'u2', name: 'Sarah Jones', email: 'sarah@hamix.com', role: 'Operator', status: 'Active', avatar: 'SJ' },
        { id: 'u3', name: 'Mike Ross', email: 'mike@hamix.com', role: 'Admin', status: 'Inactive', avatar: 'MR' }
    ],

    /**
     * Platform Statistics (Mocked/Aggregated)
     */
    getPlatformStats() {
        const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
        const leads = window.HAMIX_DAL ? window.HAMIX_DAL.getLeads() : [];

        return {
            totalUsers: this.users.length,
            totalLeads: leads.length,
            totalCustomers: customers.length,
            avgConversionRate: customers.length > 0 ? ((customers.length / (leads.length + customers.length)) * 100).toFixed(1) : 0,
            activeDeployments: window.HAMIX_Operations ? window.HAMIX_Operations.deploymentQueue.length : 0,
            uptime: '99.98%'
        };
    },

    /**
     * Save Workspace Settings
     */
    saveSettings(newSettings) {
        this.config = { ...this.config, ...newSettings };
        if (window.HAMIX_DAL) {
            window.HAMIX_DAL.saveConfig(this.config);
        }
        this.logActivity('Admin User', 'Updated workspace settings', 'System');
        console.log('Admin: Settings updated', this.config);
    },

    /**
     * Load Settings from Storage
     */
    loadSettings() {
        const saved = window.HAMIX_DAL ? window.HAMIX_DAL.getConfig() : null;
        if (saved) this.config = saved;
        return this.config;
    },

    /**
     * User CRUD Operations
     */
    addUser(user) {
        if (!this.canPerform('Super Admin', 'manage_users')) return;
        user.id = 'u' + Date.now();
        this.users.push(user);
        this.logActivity('Admin User', 'Added new user', user.name);
        this.notifyUI();
    },

    deleteUser(id) {
        if (!this.canPerform('Super Admin', 'manage_users')) return;
        const user = this.users.find(u => u.id === id);
        this.users = this.users.filter(u => u.id !== id);
        if (user) {
            this.logActivity('Admin User', 'Deleted user', user.name);
        }
        this.notifyUI();
    },

    /**
     * Role-Based Access Control (RBAC) logic
     */
    canPerform(role, action) {
        const permissions = {
            'Super Admin': ['*'],
            'Admin': ['manage_customers', 'view_ops', 'view_settings', 'publish_website', 'rollback_website'],
            'Operator': ['view_customers', 'view_ops', 'publish_website']
        };

        const allowed = permissions[role] || [];
        if (allowed.includes('*')) return true;
        return allowed.includes(action);
    },

    getCurrentUser() {
        // Mock current user - in a real app this would come from auth session
        return this.users[0]; // Admin User
    },

    /**
     * Activity Logging (Audit Trail)
     */
    logActivity(user, action, target) {
        const entry = {
            id: 'log-' + Date.now(),
            timestamp: new Date().toISOString(),
            user,
            action,
            target
        };
        if (window.HAMIX_DAL) {
            window.HAMIX_DAL.addAuditLog(entry);
        }
        this.notifyUI();
    },

    getAuditLogs() {
        return window.HAMIX_DAL ? window.HAMIX_DAL.getAuditLogs() : [];
    },

    /**
     * Global Search
     * Searches across Leads, Customers, Users, and Operations.
     */
    globalSearch(query) {
        if (!query) return null;
        query = query.toLowerCase();

        const leads = window.HAMIX_DAL ? window.HAMIX_DAL.getLeads() : [];
        const customers = window.HAMIX_DAL ? window.HAMIX_DAL.getCustomers() : [];
        const queue = window.HAMIX_Operations ? window.HAMIX_Operations.deploymentQueue : [];

        const logs = this.getAuditLogs();

        const results = {
            leads: leads.filter(l => l.businessName.toLowerCase().includes(query) || l.email.toLowerCase().includes(query)),
            customers: customers.filter(c => c.businessName.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)),
            users: this.users.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)),
            operations: queue.filter(j => j.businessName.toLowerCase().includes(query)),
            logs: logs.filter(l => l.action.toLowerCase().includes(query) || l.target.toLowerCase().includes(query)).slice(0, 5)
        };

        return results;
    },

    notifyUI() {
        window.dispatchEvent(new CustomEvent('hamix:admin-update'));
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
} else {
    window.HAMIX_Admin = AdminManager;
}

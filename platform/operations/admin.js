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
            autoPublish: false
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
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');

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
        localStorage.setItem('hamix_admin_config', JSON.stringify(this.config));
        console.log('Admin: Settings updated', this.config);
    },

    /**
     * Load Settings from Storage
     */
    loadSettings() {
        const saved = localStorage.getItem('hamix_admin_config');
        if (saved) this.config = JSON.parse(saved);
        return this.config;
    },

    /**
     * User CRUD Operations
     */
    addUser(user) {
        user.id = 'u' + Date.now();
        this.users.push(user);
        this.notifyUI();
    },

    deleteUser(id) {
        this.users = this.users.filter(u => u.id !== id);
        this.notifyUI();
    },

    /**
     * Global Search
     * Searches across Leads, Customers, Users, and Operations.
     */
    globalSearch(query) {
        if (!query) return null;
        query = query.toLowerCase();

        const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        const queue = window.HAMIX_Operations ? window.HAMIX_Operations.deploymentQueue : [];

        const results = {
            leads: leads.filter(l => l.businessName.toLowerCase().includes(query) || l.email.toLowerCase().includes(query)),
            customers: customers.filter(c => c.businessName.toLowerCase().includes(query) || c.email.toLowerCase().includes(query)),
            users: this.users.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)),
            operations: queue.filter(j => j.businessName.toLowerCase().includes(query))
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

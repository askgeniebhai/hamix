/**
 * HAMIX Utility Functions
 */

const Utils = {
    /**
     * Formats a date string.
     */
    formatDate: (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString();
    },

    /**
     * Formats a datetime string.
     */
    formatDateTime: (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleString();
    },

    /**
     * Generates a status badge class.
     */
    getStatusClass: (status) => {
        return (status || 'Draft').toLowerCase().replace(/\s+/g, '-');
    },

    /**
     * Safe JSON parsing with fallback.
     */
    safeParse: (str, fallback = []) => {
        try {
            return JSON.parse(str) || fallback;
        } catch (e) {
            return fallback;
        }
    },

    /**
     * Generates a unique ID.
     */
    generateId: (prefix = 'id') => {
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
} else {
    window.HAMIX_Utils = Utils;
}

/**
 * HAMIX Platform - Lead Collection Engine
 * Handles Lead Data Model, Validation, and State Management
 */

const LeadEngine = (() => {
    // Lead Status Constants
    const STATUS = {
        NEW: 'New',
        VALIDATED: 'Validated',
        SENT: 'Sent',
        DELIVERED: 'Delivered',
        READ: 'Read',
        REPLIED: 'Replied',
        INTERESTED: 'Interested',
        QUOTATION: 'Quotation',
        MEETING: 'Meeting',
        CUSTOMER: 'Customer',
        LOST: 'Lost'
    };

    /**
     * Create a new Lead object with default values
     */
    const createLead = (data = {}) => {
        const now = new Date().toISOString();
        return {
            id: data.id || 'lead_' + Math.random().toString(36).substr(2, 9),
            businessName: data.businessName || '',
            category: data.category || '',
            phone: data.phone || '',
            whatsapp: data.whatsapp || '',
            email: data.email || '',
            website: data.website || '',
            address: data.address || '',
            rating: data.rating || 0,
            reviews: data.reviews || 0,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            mapsUrl: data.mapsUrl || '',
            industry: data.industry || '',
            assignedTo: data.assignedTo || 'Unassigned',
            status: data.status || STATUS.NEW,
            homepageUrl: data.homepageUrl || '',
            notes: data.notes || '',
            createdAt: data.createdAt || now,
            updatedAt: now,
            validationErrors: []
        };
    };

    /**
     * Create a new Customer object from a Lead
     */
    const createCustomer = (lead) => {
        const now = new Date().toISOString();
        return {
            id: 'cust_' + lead.id.split('_')[1],
            leadId: lead.id,
            businessName: lead.businessName,
            category: lead.category,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            homepageUrl: lead.homepageUrl,
            status: 'Active',
            joinedAt: now,
            updatedAt: now
        };
    };

    /**
     * Validate a lead object
     */
    const validateLead = (lead, existingLeads = []) => {
        const errors = [];

        // Required fields
        if (!lead.businessName || lead.businessName.trim() === '') {
            errors.push('Business Name is required.');
        }

        // Duplicate detection (by name and phone/website)
        const isDuplicate = existingLeads.some(existing => {
            if (existing.id === lead.id) return false;

            const sameName = existing.businessName.toLowerCase() === lead.businessName.toLowerCase();
            const samePhone = lead.phone && existing.phone === lead.phone;
            const sameWebsite = lead.website && existing.website === lead.website;

            return sameName && (samePhone || sameWebsite || (!lead.phone && !lead.website));
        });

        if (isDuplicate) {
            errors.push('Possible duplicate lead detected.');
        }

        // Field presence check for "Validated" status
        const hasContact = lead.phone || lead.email || lead.whatsapp;
        if (!hasContact) {
            errors.push('Missing contact information (Phone, Email, or WhatsApp).');
        }

        lead.validationErrors = errors;

        // Auto-update status to Validated if it was New and now has no errors
        if (lead.status === STATUS.NEW && errors.length === 0) {
            lead.status = STATUS.VALIDATED;
        }

        return lead;
    };

    /**
     * Parse Google Maps raw data
     */
    const parseGMapsData = (rawData) => {
        const lines = rawData.split('\n').map(l => l.trim()).filter(l => l !== '');
        const leads = [];

        if (lines.length > 0) {
            const lead = createLead({
                businessName: lines[0],
                notes: 'Imported from Google Maps'
            });

            lines.forEach(line => {
                if (line.includes('stars')) lead.rating = parseFloat(line);
                if (/\d{3}-\d{3}-\d{4}/.test(line)) lead.phone = line;
                if (line.startsWith('http')) {
                    if (line.includes('google.com/maps')) lead.mapsUrl = line;
                    else lead.website = line;
                }
                if (line.includes(',') && /\d{5}/.test(line)) lead.address = line;
            });

            leads.push(lead);
        }

        return leads;
    };

    return {
        STATUS,
        createLead,
        createCustomer,
        validateLead,
        parseGMapsData
    };
})();

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadEngine;
}

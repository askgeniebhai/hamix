/**
 * HAMIX Platform - Lead Collection Engine
 * Handles Lead Data Model, Validation, and State Management
 */

const LeadEngine = (() => {
    // Lead Status Constants
    const STATUS = {
        NEW: 'New',
        VALIDATED: 'Validated',
        READY: 'Ready for AI'
    };

    /**
     * Create a new Lead object with default values
     */
    const createLead = (data = {}) => {
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
            notes: data.notes || '',
            status: data.status || STATUS.NEW,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            validationErrors: []
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

            return sameName && (samePhone || sameWebsite || !lead.phone && !lead.website);
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

        // Auto-update status based on validation
        if (errors.length === 0) {
            lead.status = STATUS.VALIDATED;

            // Check if "Ready for AI" (needs enough data)
            if (lead.businessName && (lead.website || lead.phone) && lead.category) {
                lead.status = STATUS.READY;
            }
        } else {
            lead.status = STATUS.NEW;
        }

        return lead;
    };

    /**
     * Parse Google Maps raw data
     * (Simulated parser for business info)
     */
    const parseGMapsData = (rawData) => {
        // This is a simple parser that looks for common patterns in G-Maps copy-paste
        // Real implementation would be more robust
        const lines = rawData.split('\n').map(l => l.trim()).filter(l => l !== '');
        const leads = [];

        // Very basic heuristic: if first line looks like a business name
        // In a real app, this would be a complex regex or NLP-based parser
        if (lines.length > 0) {
            const lead = createLead({
                businessName: lines[0],
                notes: 'Imported from Google Maps'
            });

            // Try to find phone numbers, ratings, etc.
            lines.forEach(line => {
                if (line.includes('stars')) lead.rating = parseFloat(line);
                if (/\d{3}-\d{3}-\d{4}/.test(line)) lead.phone = line;
                if (line.startsWith('http')) lead.website = line;
                if (line.includes(',') && /\d{5}/.test(line)) lead.address = line;
            });

            leads.push(lead);
        }

        return leads;
    };

    return {
        STATUS,
        createLead,
        validateLead,
        parseGMapsData
    };
})();

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadEngine;
}

/**
 * HAMIX Platform - Lead Collection Engine
 * Handles Lead Data Model, Validation, and State Management
 */

const LeadEngine = (() => {
    // Lead Status Constants
    const STATUS = {
        NEW: 'New',
        VALIDATED: 'Validated',
        CONTACTED: 'Contacted',
        FOLLOWUP: 'Follow-up',
        APPROVED: 'Approved',
        PUBLISHED: 'Published',
        COMPLETED: 'Completed'
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
        const lines = rawData.split('\n').map(l => l.trim());
        const leads = [];
        const stats = {
            imported: 0,
            skippedNoPhone: 0,
            skippedNoWhatsApp: 0
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line) continue;

            // Look for Rating(Reviews) pattern: e.g. "4.7(138)"
            const ratingMatch = line.match(/^(\d\.\d)\((\d+(?:,\d+)*)\)$/);
            if (ratingMatch) {
                let businessName = "";
                let backtrack = i - 1;

                // Backtrack to find business name
                while (backtrack >= 0) {
                    const prevLine = lines[backtrack];
                    if (prevLine &&
                        prevLine !== 'Sponsored' &&
                        prevLine !== '' &&
                        prevLine !== 'Results' &&
                        prevLine !== 'Share' &&
                        prevLine !== 'Saved' &&
                        prevLine !== 'Recents' &&
                        prevLine !== 'Get app' &&
                        prevLine !== 'On-site services' &&
                        !prevLine.match(/^\d\.\d\(\d+\)$/) &&
                        !/^(\+91|0)?\s?(\d{2,5}\s?\d{5,8}|\d{10,12})$/.test(prevLine.replace(/\s/g, ''))
                    ) {
                        businessName = prevLine;
                        break;
                    }
                    backtrack--;
                }

                if (!businessName) continue;

                const leadData = {
                    businessName: businessName,
                    rating: parseFloat(ratingMatch[1]),
                    reviews: parseInt(ratingMatch[2].replace(/,/g, '')),
                    notes: 'Imported from Google Maps'
                };

                let extractedPhone = "";
                // Forward scan for fields
                for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
                    const nextLine = lines[j];
                    if (!nextLine) continue;
                    if (nextLine.match(/^\d\.\d\(\d+\)$/)) break;

                    const parts = nextLine.split(/[·\u00B7]/).map(p => p.trim());

                    parts.forEach(part => {
                        // Phone check
                        if (/^(\+91|0)?\s?(\d{2,5}\s?\d{5,8}|\d{10,12})$/.test(part.replace(/\s/g, ''))) {
                            if (!extractedPhone) extractedPhone = part;
                        }
                        // Category keywords
                        else if (!leadData.category && (
                            part.toLowerCase().includes('service') ||
                            part.toLowerCase().includes('agency') ||
                            part.toLowerCase().includes('company') ||
                            part.toLowerCase().includes('guard') ||
                            part.toLowerCase().includes('supplier') ||
                            part.toLowerCase().includes('office') ||
                            part.toLowerCase().includes('management') ||
                            part.toLowerCase().includes('property')
                        )) {
                            leadData.category = part;
                        }
                        // Address check
                        else if (!leadData.address && (part.includes(',') || /\d/.test(part)) && part.length > 5 && !part.match(/\d+\s*(am|pm)/i) && !part.match(/Open|Closed/i)) {
                            leadData.address = part;
                        }
                    });

                    if (!extractedPhone && nextLine.match(/^(\+91|0)?\s?(\d{2,5}\s?\d{5,8}|\d{10,12})$/)) {
                        extractedPhone = nextLine;
                    } else if (nextLine === 'Website' || nextLine === 'Visit site') {
                        leadData.website = 'Available';
                    }
                }

                if (!extractedPhone) {
                    stats.skippedNoPhone++;
                    console.warn(`Skipped "${businessName}": No phone number found`);
                    continue;
                }

                // WhatsApp eligibility check (Indian Mobiles: 6-9 prefix, 10 digits excluding country code)
                const cleanPhone = extractedPhone.replace(/\s/g, '');
                const isLandline = cleanPhone.startsWith('080') && cleanPhone.length === 11 && /^[2346]/.test(cleanPhone[3]);
                const mobilePart = cleanPhone.replace(/^\+91/, '').replace(/^0/, '');
                const isMobile = mobilePart.length === 10 && /^[6-9]/.test(mobilePart);

                if (isMobile && !isLandline) {
                    leadData.phone = extractedPhone;
                    leads.push(createLead(leadData));
                    stats.imported++;
                } else {
                    stats.skippedNoWhatsApp++;
                    console.warn(`Skipped "${businessName}": WhatsApp number unavailable (${extractedPhone})`);
                }
            }
        }

        leads.importStats = stats;
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

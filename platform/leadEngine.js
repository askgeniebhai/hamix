/**
 * HAMIX Platform - Lead Collection Engine
 * Handles Lead Data Model, Validation, and State Management
 */

const LeadEngine = (() => {
    // Lead Status Constants (Enhanced for Phase 1)
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
     * Supports multiple entries by detecting "Rating(Reviews) · Category" pattern
     */
    const parseGMapsData = (rawData) => {
        const lines = rawData.split('\n').map(l => l.trim());
        const leads = [];
        let currentLead = null;

        const ratingRegex = /^(\d\.\d)\s*\(([\d,]+)\)\s*·\s*(.*)$/;
        const phoneRegex = /(\+?\d[\d\s-]{7,15}\d)/;
        const websiteRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
        const mapsUrlRegex = /google\.com\/maps/;

        lines.forEach((line, index) => {
            if (!line) return;

            // Check if this line is a Rating/Reviews/Category line
            // This is our primary anchor for a lead
            const ratingMatch = line.match(ratingRegex);

            if (ratingMatch) {
                // If we have a rating line, the PREVIOUS line was likely the Business Name
                // unless we already started this lead
                if (!currentLead && index > 0) {
                    const prevLine = lines[index - 1];
                    if (prevLine && !prevLine.match(ratingRegex) && !prevLine.match(phoneRegex) && !prevLine.startsWith('http')) {
                        currentLead = createLead({
                            businessName: prevLine,
                            notes: 'Imported from Google Maps'
                        });
                    }
                }

                if (currentLead) {
                    currentLead.rating = parseFloat(ratingMatch[1]);
                    currentLead.reviews = parseInt(ratingMatch[2].replace(/,/g, ''));
                    currentLead.category = ratingMatch[3];
                }
            } else if (phoneRegex.test(line) && !line.startsWith('http')) {
                if (currentLead) {
                    currentLead.phone = line;
                }
            } else if (websiteRegex.test(line)) {
                if (currentLead) {
                    if (mapsUrlRegex.test(line)) {
                        currentLead.mapsUrl = line;
                    } else {
                        currentLead.website = line;
                    }
                }
            } else if ((line.includes(',') && /\d/.test(line)) || (currentLead && !currentLead.address && !line.match(ratingRegex) && !line.match(phoneRegex) && !line.startsWith('http') && index > 0 && lines[index-1].match(ratingRegex))) {
                // Likely an address if it contains a comma and numbers,
                // OR if it's the line immediately following a rating line (common in G-Maps)
                if (currentLead && !currentLead.address) {
                    currentLead.address = line;
                }
            } else {
                // If it's none of the above and we don't have a current lead, it might be a business name
                // or if we have a current lead but all fields are filled, it might be the start of a NEW lead
                const isPossibleBusinessName = !line.match(ratingRegex) && !line.match(phoneRegex) && !line.startsWith('http');

                if (isPossibleBusinessName) {
                    // Check if next line is a rating line - if so, this IS a business name
                    const nextLine = lines[index + 1];
                    if (nextLine && nextLine.match(ratingRegex)) {
                        if (currentLead) leads.push(currentLead);
                        currentLead = createLead({
                            businessName: line,
                            notes: 'Imported from Google Maps'
                        });
                    }
                }
            }
        });

        if (currentLead) leads.push(currentLead);

        // Fallback for very simple formats (single entry, just lines)
        if (leads.length === 0 && lines.filter(l => l).length > 0) {
            const fallbackLead = createLead({
                businessName: lines.find(l => l && !l.match(ratingRegex) && !l.match(phoneRegex) && !l.startsWith('http')) || 'Unknown Business',
                notes: 'Imported from Google Maps'
            });
            lines.forEach(l => {
                if (l.match(ratingRegex)) {
                    const m = l.match(ratingRegex);
                    fallbackLead.rating = parseFloat(m[1]);
                    fallbackLead.reviews = parseInt(m[2].replace(/,/g, ''));
                    fallbackLead.category = m[3];
                } else if (phoneRegex.test(l) && !l.startsWith('http')) {
                    fallbackLead.phone = l;
                } else if (websiteRegex.test(l)) {
                    if (mapsUrlRegex.test(l)) fallbackLead.mapsUrl = l;
                    else fallbackLead.website = l;
                } else if (l.includes(',') && /\d/.test(l)) {
                    fallbackLead.address = l;
                }
            });
            leads.push(fallbackLead);
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

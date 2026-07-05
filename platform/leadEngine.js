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
            locality: data.locality || '',
            pincode: data.pincode || '',
            whatsappStatus: data.whatsappStatus || 'Unknown',
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
     * Clean category string by removing price ranges and numbers
     */
    const cleanCategory = (category) => {
        if (!category) return '';
        // Remove price ranges like $$, £££, ₹₹, etc. and numeric chars
        // Also remove specific phrases commonly found in maps like "Open 24 hours"
        return category
            .replace(/[£$€₹¥\d·]/g, '')
            .replace(/Open\s+\d+\s+hours/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    /**
     * Extract Locality and Pincode from address
     */
    const extractAddressParts = (address) => {
        const result = { locality: '', pincode: '' };
        if (!address) return result;

        // Try to find a 6-digit pincode (common in India) or 5-digit zip
        const pincodeMatch = address.match(/\b\d{5,6}\b/);
        if (pincodeMatch) {
            result.pincode = pincodeMatch[0];
        }

        // Locality is often the second to last or third to last part in a comma-separated address
        const parts = address.split(',').map(p => p.trim());
        if (parts.length > 2) {
            // Usually: [Shop No], [Building], [Locality/Area], [City], [State] [Pincode]
            // We take parts that aren't the last two (City/State)
            result.locality = parts[parts.length - 3] || parts[0];
        } else if (parts.length > 0) {
            result.locality = parts[0];
        }

        return result;
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
        const phoneRegex = /^(\+?\d[\d\s-]{5,20})$/;
        const websiteRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;
        const mapsUrlRegex = /google\.com\/maps/;

        lines.forEach((line, index) => {
            if (!line) return;

            // Check if this line is a Rating/Reviews/Category line
            const ratingMatch = line.match(ratingRegex);

            if (ratingMatch) {
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
                    currentLead.category = cleanCategory(ratingMatch[3]);
                }
            } else if (phoneRegex.test(line) && !line.startsWith('http')) {
                if (currentLead && !currentLead.phone) {
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
                if (currentLead && !currentLead.address) {
                    currentLead.address = line;
                    const parts = extractAddressParts(line);
                    currentLead.locality = parts.locality;
                    currentLead.pincode = parts.pincode;
                }
            } else {
                const isPossibleBusinessName = !line.match(ratingRegex) && !line.match(phoneRegex) && !line.startsWith('http');

                if (isPossibleBusinessName) {
                    const nextLine = lines[index + 1];
                    if (nextLine && nextLine.match(ratingRegex)) {
                        if (currentLead) {
                            finalizeLead(currentLead);
                            leads.push(currentLead);
                        }
                        currentLead = createLead({
                            businessName: line,
                            notes: 'Imported from Google Maps'
                        });
                    }
                }
            }
        });

        if (currentLead) {
            finalizeLead(currentLead);
            leads.push(currentLead);
        }

        // Fallback for very simple formats
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
                    fallbackLead.category = cleanCategory(m[3]);
                } else if (phoneRegex.test(l) && !l.startsWith('http')) {
                    if (!fallbackLead.phone) fallbackLead.phone = l;
                } else if (websiteRegex.test(l)) {
                    if (mapsUrlRegex.test(l)) fallbackLead.mapsUrl = l;
                    else fallbackLead.website = l;
                } else if (l.includes(',') && /\d/.test(l)) {
                    fallbackLead.address = l;
                    const parts = extractAddressParts(l);
                    fallbackLead.locality = parts.locality;
                    fallbackLead.pincode = parts.pincode;
                }
            });
            finalizeLead(fallbackLead);
            leads.push(fallbackLead);
        }

        return leads;
    };

    const finalizeLead = (lead) => {
        if (!lead.phone) lead.phone = 'Phone not available';
        return lead;
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

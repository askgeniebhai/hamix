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
        if (!lead.businessName || lead.businessName.trim() === '') {
            errors.push('Business Name is required.');
        }
        lead.validationErrors = errors;
        if (lead.status === STATUS.NEW && errors.length === 0) {
            lead.status = STATUS.VALIDATED;
        }
        return lead;
    };

    /**
     * Parse Google Maps raw data
     * Highly optimized for Search Results and Detailed Business Views.
     */
    const parseGMapsData = (rawData) => {
        if (!rawData || typeof rawData !== 'string') return [];

        const leads = [];
        // Split by blocks: Double newlines, Triple newlines, or custom separators
        const blocks = rawData.split(/\n\s*\n\s*\n|\n\s*\n|---\n/).map(b => b.trim()).filter(b => b.length > 5);

        blocks.forEach(block => {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l !== '');
            if (lines.length === 0) return;

            let leadData = {
                businessName: lines[0].replace(/^Ad\s*·\s*/i, ''), // Remove 'Ad' marker
                category: '',
                phone: '',
                website: '',
                address: '',
                rating: 0,
                reviews: 0,
                mapsUrl: '',
                industry: '',
                email: '',
                whatsapp: ''
            };

            lines.forEach((line, idx) => {
                if (idx === 0) return;

                // 1. Ratings & Reviews
                const ratingMatch = line.match(/^([\d\.]+)\s*(?:stars?|ratings?)?\s*(?:\(([\d,k\+\s]+)\)|([\d,k\+\s]+)\s*reviews)?/i);
                if (ratingMatch) {
                    if (!leadData.rating) leadData.rating = parseFloat(ratingMatch[1]);
                    const revStr = (ratingMatch[2] || ratingMatch[3] || '').replace(/[,\s\+\(\)]/g, '');
                    if (revStr && !leadData.reviews) {
                        if (revStr.toLowerCase().includes('k')) leadData.reviews = parseFloat(revStr) * 1000;
                        else leadData.reviews = parseInt(revStr) || 0;
                    }
                }

                // 2. Category & Industry Detection
                if (line.includes('·')) {
                    const parts = line.split('·');
                    const lastPart = parts[parts.length - 1].trim();
                    if (!lastPart.match(/\d/) && lastPart.length < 60 && !lastPart.match(/Open|Closed|Website|Directions/i)) {
                        leadData.category = lastPart;
                    }
                }

                const inMatch = line.match(/^([^,]+)\s+in\s+(?:Bangalore|Bengaluru|Mumbai|Delhi|India|Chennai|Hyderabad)/i);
                if (inMatch && !leadData.category) {
                    leadData.category = inMatch[1].trim();
                }

                if (idx <= 3 && !leadData.category && line.length > 3 && line.length < 60 && !line.match(/\d/) && !line.match(/Website|Address|Phone|Directions|Save|Share|Open|Closed|stars|reviews/i)) {
                    leadData.category = line;
                }

                // 3. Phone Number (Enhanced for Indian and International formats)
                const phoneRegex = /(?:\+?\d{1,3}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,6}/g;
                const phoneMatches = line.match(phoneRegex);
                if (phoneMatches) {
                    const cleanPhone = phoneMatches[0].trim();
                    if (cleanPhone.replace(/[^\d]/g, '').length >= 10 && !leadData.phone) {
                        leadData.phone = cleanPhone;
                        if (!leadData.whatsapp) leadData.whatsapp = cleanPhone.replace(/[^\d]/g, '');
                    }
                }

                // 4. Website, Email, and WhatsApp mention
                if (line.includes('google.com/maps')) {
                    leadData.mapsUrl = line;
                } else if (line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)) {
                    leadData.email = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)[0];
                } else if (line.toLowerCase().includes('whatsapp')) {
                    const waMatch = line.match(/\d{10,12}/);
                    if (waMatch) leadData.whatsapp = waMatch[0];
                } else {
                    const webRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.(?:com|in|org|net|co|io|biz|info|me|us)/i;
                    const webMatches = line.match(webRegex);
                    if (webMatches && !leadData.website && !line.includes('google.com')) {
                        leadData.website = webMatches[0];
                    } else if (line.toLowerCase() === 'website' || line.toLowerCase().includes('website')) {
                        for (let offset of [-1, 1, -2, 2]) {
                            const nl = lines[idx + offset] || '';
                            const nlm = nl.match(webRegex);
                            if (nlm && !leadData.website && !nl.includes('google.com')) {
                                leadData.website = nlm[0];
                                break;
                            }
                        }
                    }
                }

                // 5. Address (Improved extraction)
                const addressKeywords = /\b(?:Bangalore|Bengaluru|Karnataka|Mumbai|Delhi|India|Chennai|Hyderabad|Pune|Road|Street|Floor|Layout|Nagar|Opposite|Near|City|Complex|Building|Apartment|Cross|Main)\b/i;
                const hasZip = line.match(/\b\d{5,6}\b/);
                const isExplicit = line.match(/^Address:\s*/i);

                if ((isExplicit || hasZip || addressKeywords.test(line)) && !leadData.address) {
                    // Filter out non-address lines that might have matched keywords
                    const isLabel = line.match(/^(Phone|Website|Directions|Save|Share|Open|Closed|stars|reviews)/i);
                    const isRatingLine = line.match(/^([\d\.]+)\s*(?:stars?|ratings?|\()/i);
                    const isNameLine = (idx === 0);

                    if (!isLabel && !isRatingLine && !isNameLine && line.length > 5) {
                        leadData.address = line.replace(/^Address:\s*/i, '');
                    }
                }
            });

            if (leadData.category) leadData.industry = leadData.category;

            const isGarbage = leadData.businessName.match(/^(Phone|Address|Website|http|Closed|Open|Search)/i) || leadData.businessName.length < 3;
            if (leadData.businessName && !isGarbage) {
                leads.push(createLead(leadData));
            }
        });

        // Legacy Fallback
        if (leads.length === 0 && rawData.length > 20) {
             const lines = rawData.split('\n').map(l => l.trim()).filter(l => l !== '');
             const lead = createLead({ businessName: lines[0], notes: 'Imported from Google Maps' });
             lines.forEach(line => {
                const ratingM = line.match(/^([\d\.]+)\s*\(([\d,k\+]+)\)/);
                if (ratingM) { lead.rating = parseFloat(ratingM[1]); lead.reviews = parseInt(ratingM[2].replace(/[^\d]/g, '')) || 0; }
                const phoneM = line.match(/(?:\+?\d{1,4}[\s-])?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{3,5}/);
                if (phoneM) lead.phone = phoneM[0];
                if (line.match(/https?:\/\/[^\s]+/)) {
                    if (line.includes('google.com/maps')) lead.mapsUrl = line;
                    else lead.website = line;
                }
                if (line.includes(',') && line.match(/\d{5,6}/)) lead.address = line;
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeadEngine;
}

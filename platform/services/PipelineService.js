/**
 * HAMIX Platform - Pipeline Service
 * Handles normalization, duplicate detection, enrichment, and scoring
 */

const PipelineService = (() => {

    /**
     * AI Field Normalization
     */
    const normalize = (lead) => {
        return {
            ...lead,
            businessName: lead.businessName ? lead.businessName.trim() : '',
            phone: lead.phone ? lead.phone.replace(/[^\d+]/g, '') : '',
            email: lead.email ? lead.email.toLowerCase().trim() : '',
            website: lead.website ? lead.website.toLowerCase().trim().replace(/\/$/, '') : ''
        };
    };

    /**
     * AI Duplicate Detection & Merging
     */
    const detectDuplicate = (newLead, existingLeads) => {
        // Priority 1: Phone / WhatsApp
        if (newLead.phone) {
            const match = existingLeads.find(l => l.phone === newLead.phone || l.whatsapp === newLead.phone);
            if (match) return { type: 'PHONE', match };
        }

        // Priority 2: Website
        if (newLead.website && newLead.website !== 'http://' && newLead.website !== 'https://') {
            const match = existingLeads.find(l => l.website === newLead.website);
            if (match) return { type: 'WEBSITE', match };
        }

        // Priority 3: Name + Pincode
        if (newLead.businessName && newLead.pincode) {
            const name = newLead.businessName.toLowerCase();
            const pincode = newLead.pincode;
            const match = existingLeads.find(l =>
                l.businessName.toLowerCase() === name &&
                l.pincode === pincode
            );
            if (match) return { type: 'NAME_PINCODE', match };
        }

        // Priority 4: Name + City (Simulation using Address parts)
        if (newLead.businessName && newLead.address) {
            const name = newLead.businessName.toLowerCase();
            const addr = newLead.address.toLowerCase();
            const match = existingLeads.find(l =>
                l.businessName.toLowerCase() === name &&
                l.address.toLowerCase().substring(0, 10) === addr.substring(0, 10)
            );
            if (match) return { type: 'NAME_CITY', match };
        }

        return null;
    };

    const mergeLeads = (existing, incoming) => {
        // Merge information, preserve source history
        const merged = { ...existing };

        // Fill missing fields
        Object.keys(incoming).forEach(key => {
            if (!merged[key] || merged[key] === '' || merged[key] === 0) {
                merged[key] = incoming[key];
            }
        });

        // Track History
        if (!merged.sourceHistory) merged.sourceHistory = [existing.importSource || 'Unknown'];
        if (!merged.sourceHistory.includes(incoming.importSource)) {
            merged.sourceHistory.push(incoming.importSource);
        }

        merged.updatedAt = new Date().toISOString();
        return merged;
    };

    /**
     * AI Enrichment Engine
     */
    const enrich = async (lead) => {
        // Deterministic Enrichment logic
        // In a real app, this would call various providers
        // For stabilization, we base confidence on data completeness
        let completeness = 0;
        if (lead.businessName) completeness += 20;
        if (lead.phone && lead.phone !== 'Phone not available') completeness += 20;
        if (lead.website) completeness += 20;
        if (lead.address) completeness += 20;
        if (lead.category) completeness += 20;

        return {
            ...lead,
            isEnriched: true,
            enrichmentConfidence: completeness.toFixed(2),
            enrichedAt: new Date().toISOString()
        };
    };

    /**
     * AI Lead Scoring
     */
    const calculateScore = (lead) => {
        let score = 0;
        const hasPhone = lead.phone && lead.phone !== 'Phone not available';
        const hasWebsite = lead.website && lead.website !== '';

        if (hasPhone) score += 20;
        if (lead.email) score += 10;
        if (hasWebsite) score += 15;
        if (lead.address) score += 10;

        // Use actual rating and reviews for scoring
        if (lead.rating >= 4.5) score += 15;
        else if (lead.rating >= 4.0) score += 10;
        else if (lead.rating > 0) score += 5;

        if (lead.reviews >= 100) score += 10;
        else if (lead.reviews >= 50) score += 5;

        if (lead.isEnriched) score += 20;

        // Map score to stars (1-5)
        if (score >= 80) return 5;
        if (score >= 60) return 4;
        if (score >= 40) return 3;
        if (score >= 20) return 2;
        return 1;
    };

    /**
     * Master Pipeline Processing
     */
    const process = async (rawLead, existingLeads) => {
        let lead = normalize(rawLead);

        const duplicateMatch = detectDuplicate(lead, existingLeads);
        if (duplicateMatch) {
            return { action: 'MERGE', data: mergeLeads(duplicateMatch.match, lead) };
        }

        lead = await enrich(lead);
        lead.score = calculateScore(lead);
        lead.id = lead.id || 'lead_' + Math.random().toString(36).substr(2, 9);
        lead.createdAt = lead.createdAt || new Date().toISOString();
        lead.status = lead.status || 'New';

        return { action: 'CREATE', data: lead };
    };

    return {
        process,
        calculateScore,
        detectDuplicate,
        mergeLeads
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PipelineService;
}

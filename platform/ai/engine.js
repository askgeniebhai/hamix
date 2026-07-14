/**
 * HAMIX AI Engine
 * Modular processing for business classification, content generation, and SEO.
 */

const AIEngine = {
    /**
     * Processes a customer record through all AI modules.
     * @param {Object} customer - The customer record.
     */
    async processCustomer(customer) {
        console.log(`AI: Processing ${customer.businessName}...`);

        // 1. Business Understanding & Profile Generation
        customer.businessProfile = this.modules.generateBusinessProfile(customer);

        // 2. Clean and Normalize Data
        customer.cleanedData = this.modules.normalize(customer);

        // 3. Enrich Information & Scoring
        customer.enrichedData = this.modules.enrich(customer);
        customer.aiConfidenceScore = this.calculateConfidenceScore(customer);
        customer.opportunityScore = this.calculateOpportunityScore(customer);

        // 4. Identify Missing Info & Generate Recommendations
        customer.missingInfo = this.modules.identifyMissingInfo(customer);
        customer.aiRecommendations = this.modules.generateRecommendations(customer);

        // Ensure aiContent object exists
        if (!customer.aiContent) customer.aiContent = {};

        // 5. Content Generation Modules (Business-specific)
        customer.aiContent.classification = this.modules.classify(customer);
        customer.aiContent.summary = this.modules.summarize(customer);
        customer.aiContent.seo = this.modules.generateSEO(customer);
        customer.aiContent.copy = this.modules.generateCopy(customer);
        customer.aiContent.outreach = this.modules.generateOutreach(customer);
        customer.aiContent.faq = this.modules.generateFAQ(customer);

        // 6. Generate Homepage JSON (Dynamic Structure for the engine)
        customer.homepageJson = this.modules.generateHomepageJson(customer);

        return customer;
    },

    modules: {
        generateBusinessProfile: (data) => {
            // Foundation module to understand the business
            return {
                coreIdentity: data.businessName,
                sector: data.category || 'Unclassified',
                locationContext: data.address || 'Local Market',
                marketStrength: data.rating > 4 ? 'High' : 'Medium',
                digitalPresence: data.website ? 'Partial' : 'None',
                targetAudience: `Customers seeking ${data.category || 'professional'} solutions in ${data.address || 'their local area'}.`
            };
        },

        normalize: (data) => {
            return {
                businessName: data.businessName.trim(),
                phone: data.phone ? data.phone.replace(/[^\d+]/g, '') : '',
                website: data.website ? data.website.toLowerCase().trim() : '',
                category: data.category ? data.category.split(',')[0].trim() : 'Local Business'
            };
        },

        enrich: (data) => {
            return {
                priceRange: data.rating > 4.5 ? 'Premium' : 'Standard',
                sentiment: 'Positive',
                marketPosition: data.reviews > 100 ? 'Market Leader' : 'Established',
                growthPotential: data.reviews < 20 ? 'High Growth' : 'Stable'
            };
        },

        identifyMissingInfo: (data) => {
            const missing = [];
            if (!data.phone) missing.push('Phone Number');
            if (!data.email) missing.push('Email Address');
            if (!data.website) missing.push('Existing Website');
            if (!data.logo) missing.push('Business Logo');
            return missing;
        },

        generateRecommendations: (data) => {
            const recs = [`Claim Google Business Profile for ${data.businessName}`];
            if (!data.website) recs.push('Launch professional landing page to capture leads');
            if (data.rating < 4) recs.push('Implement review generation campaign');
            return recs;
        },

        generateHomepageJson: (data) => {
            return {
                branding: {
                    logo: data.logo || '',
                    primaryColor: '#4f46e5'
                },
                sections: ['hero', 'about', 'services', 'gallery', 'faq', 'contact'],
                meta: {
                    title: data.aiContent?.seo?.title || `${data.businessName}`,
                    description: data.aiContent?.seo?.description || ''
                }
            };
        },

        classify: (data) => {
            const profile = data.businessProfile;
            return `${profile.marketStrength} Strength ${profile.sector} Business`;
        },

        summarize: (data) => {
            const p = data.businessProfile;
            return `${data.businessName} is a ${p.marketStrength.toLowerCase()}-rated ${p.sector} specialist based in ${p.locationContext}. They focus on ${p.targetAudience.toLowerCase()}`;
        },

        generateSEO: (data) => {
            const p = data.businessProfile;
            return {
                title: `${data.businessName} | Best ${p.sector} in ${p.locationContext}`,
                description: `Discover why ${data.businessName} is the preferred choice for ${p.sector} solutions in ${p.locationContext}. Highly rated with ${data.reviews || 0} reviews.`,
                keywords: `${data.businessName}, ${p.sector}, ${p.locationContext}, best ${p.sector}, ${p.sector} services`
            };
        },

        generateCopy: (data) => {
            const p = data.businessProfile;
            const sector = p.sector.toLowerCase();
            return {
                heroHeading: `The Most Trusted ${p.sector} in ${p.locationContext}`,
                heroSubheading: `Providing world-class ${sector} services with a ${data.rating}-star reputation.`,
                aboutHeading: `About ${data.businessName}`,
                aboutText: `With over ${data.reviews || 5} satisfied clients, ${data.businessName} has established itself as a cornerstone of the ${p.locationContext} community. We pride ourselves on delivering ${sector} excellence every single day.`,
                ctaText: `Book ${p.sector} Now`
            };
        },

        generateFAQ: (data) => {
            const p = data.businessProfile;
            return [
                { q: `Why choose ${data.businessName} for ${p.sector}?`, a: `We are the top-rated provider in ${p.locationContext} with a focus on quality and reliability.` },
                { q: `Where is ${data.businessName} located?`, a: `We proudly serve the ${p.locationContext} area. Contact us for our exact office location.` }
            ];
        },

        generateOutreach: (data) => {
            const p = data.businessProfile;
            const score = data.opportunityScore || 70;
            return {
                whatsapp: `Hi ${data.businessName}! I saw you're highly rated in ${p.locationContext} for ${p.sector} (${data.rating} stars). We've built a custom homepage for you to help grow your ${score}% opportunity score even further: ${data.liveWebsiteUrl || '[Link]'}`,
                email: `Subject: Growth Opportunity for ${data.businessName}\n\nDear Team, we've analyzed your ${p.sector} business and prepared a custom digital strategy...`
            };
        }
    },

    calculateConfidenceScore: (data) => {
        let score = 50;
        if (data.businessName) score += 10;
        if (data.category) score += 15;
        if (data.rating && data.reviews) score += 15;
        if (data.address) score += 10;
        return Math.min(score, 100);
    },

    calculateOpportunityScore: (data) => {
        // Mock scoring logic
        let score = 70;
        if (data.phone) score += 10;
        if (data.email) score += 10;
        if (data.category) score += 10;
        return Math.min(score, 100);
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIEngine;
} else {
    window.HAMIX_AI = AIEngine;
}

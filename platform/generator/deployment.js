/**
 * HAMIX Deployment Foundation
 * Prepares the website for publishing.
 */

const Deployment = {
    /**
     * Creates a deployment package (manifest) for the website.
     */
    prepareDeployment: function(customerData, html, themeId) {
        const deploymentId = `deploy_${Date.now()}`;
        const timestamp = new Date().toISOString();

        const manifest = {
            id: deploymentId,
            customer: customerData.businessName,
            customerId: customerData.id || customerData.businessName.toLowerCase().replace(/\s+/g, '-'),
            timestamp: timestamp,
            theme: themeId,
            structure: {
                root: [
                    'index.html',
                    'manifest.json',
                    'config.json',
                    'customer.json'
                ],
                assets: [
                    'assets/css/theme.css',
                    'assets/js/main.js'
                ],
                images: customerData.images || []
            },
            metadata: {
                generator: 'HAMIX Website Engine v0.4',
                environment: 'Production',
                seo: {
                    title: customerData.seoTitle || `${customerData.businessName} - ${customerData.category || ''}`,
                    description: customerData.seoDescription || customerData.businessDescription || '',
                    keywords: customerData.keywords || [customerData.category, customerData.businessName],
                    openGraph: {
                        title: customerData.ogTitle || customerData.businessName,
                        description: customerData.ogDescription || customerData.businessDescription,
                        image: customerData.ogImage || customerData.logo || '',
                        url: customerData.websiteUrl || ''
                    },
                    sitemap: `/sitemap.xml`
                },
                social: customerData.socialLinks || [],
                analytics: {
                    visitors: customerData.stats?.visitors || 0,
                    leads: customerData.stats?.leads || 0,
                    conversions: customerData.stats?.conversions || 0,
                    lastPublished: customerData.lastPublished || null
                }
            }
        };

        const config = {
            businessId: manifest.customerId,
            theme: themeId,
            features: {
                whatsapp: !!customerData.whatsapp,
                contactForm: true,
                gallery: true
            },
            deploymentInfo: {
                id: deploymentId,
                date: timestamp
            }
        };

        return {
            manifest: manifest,
            indexHtml: html,
            customerJson: JSON.stringify(customerData, null, 2),
            configJson: JSON.stringify(config, null, 2),
            deploymentReady: true
        };
    },

    /**
     * Simulates downloading the deployment package as a ZIP (in a real browser environment).
     */
    downloadPackage: function(pkg) {
        console.log('Preparing download for:', pkg.manifest.customer);
        // In a real browser, this would use a library like JSZip
        // to bundle indexHtml, customerJson, and manifest.json
        alert('Deployment package for ' + pkg.manifest.customer + ' is ready for download.');
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Deployment;
} else {
    window.HAMIX_Deployment = Deployment;
}

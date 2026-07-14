/**
 * HAMIX Platform - Website Generation Engine
 * Binds customer data to templates and components
 */

const WebsiteGenerator = (() => {
    /**
     * Generate complete HTML for a customer website
     */
    const generate = (customerData, themeKey = 'indigo') => {
        const components = [
            GeneratorComponents.Navbar(customerData),
            GeneratorComponents.Hero(customerData),
            GeneratorComponents.About(customerData),
            GeneratorComponents.Services(customerData),
            GeneratorComponents.Contact(customerData),
            GeneratorComponents.Footer(customerData)
        ];

        const htmlBody = components.join('');
        const styles = GeneratorComponents.CommonStyles();
        const themeCSS = ThemeSystem.getThemeCSS(themeKey);

        const fullHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${customerData.businessName} - Professional ${customerData.category} Services</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                <script src="https://unpkg.com/lucide@latest"></script>
                ${styles}
                <style>${themeCSS}</style>
            </head>
            <body>
                ${htmlBody}
                <script>
                    lucide.createIcons();
                    // Basic mobile nav toggle logic
                    document.getElementById('navToggle')?.addEventListener('click', () => {
                        console.log('Mobile nav toggle clicked');
                    });
                </script>
            </body>
            </html>
        `;

        return bindData(fullHTML, customerData);
    };

    /**
     * Replace placeholders with actual data
     */
    const bindData = (template, data) => {
        let output = template;
        const placeholders = {
            businessName: data.businessName || 'Business Name',
            category: data.category || 'Professional Services',
            phone: data.phone || '',
            whatsapp: data.whatsapp || data.phone || '',
            email: data.email || '',
            address: data.address || '',
            rating: data.rating || '5.0',
            reviews: data.reviews || '10',
            website: data.website || ''
        };

        for (const [key, value] of Object.entries(placeholders)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            output = output.replace(regex, value);
        }

        return output;
    };

    return {
        generate
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebsiteGenerator;
}

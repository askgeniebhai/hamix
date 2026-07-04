/**
 * HAMIX Website Generation Engine
 * Core logic to bind data, apply themes, and generate HTML.
 */

const Engine = {
    /**
     * Generates the complete HTML for a customer website.
     * @param {Object} customerData - The customer JSON data.
     * @param {String} templateId - The ID of the template to use.
     * @param {String} themeId - The ID of the theme to apply.
     * @returns {String} - The generated HTML string.
     */
    generateWebsite: function(customerData, templateId = 'Default', themeId = 'Indigo', options = {}) {
        const components = window.HAMIX_Components;
        const templates = window.HAMIX_Templates;
        const themes = window.HAMIX_Themes;

        if (!components || !templates || !themes) {
            console.error('HAMIX Engine: Required modules not found.');
            return '';
        }

        const templateFunc = templates[templateId] || templates.Default;
        let html = templateFunc(customerData, components);

        // Inject Base Tag if provided (useful for CRM preview)
        if (options.baseHref) {
            html = html.replace('<head>', `<head>\n    <base href="${options.baseHref}">`);
        }

        // Inject Theme CSS
        const themeCSS = themes.generateThemeCSS(themeId);
        html = html.replace('<style id="theme-styles"></style>', `<style id="theme-styles">\n${themeCSS}\n</style>`);

        return html;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Engine;
} else {
    window.HAMIX_Engine = Engine;
}

/**
 * HAMIX Platform - Theme System
 * Defines interchangeable color schemes and typography
 */

const ThemeSystem = (() => {
    const themes = {
        indigo: {
            name: 'Classic Indigo',
            primary: '#4f46e5',
            primaryHover: '#4338ca',
            secondary: '#f5f3ff',
            accent: '#818cf8',
            font: "'Inter', sans-serif"
        },
        emerald: {
            name: 'Nature Emerald',
            primary: '#059669',
            primaryHover: '#047857',
            secondary: '#ecfdf5',
            accent: '#34d399',
            font: "'Inter', sans-serif"
        },
        slate: {
            name: 'Modern Slate',
            primary: '#334155',
            primaryHover: '#1e293b',
            secondary: '#f8fafc',
            accent: '#64748b',
            font: "'Inter', sans-serif"
        },
        rose: {
            name: 'Elegant Rose',
            primary: '#e11d48',
            primaryHover: '#be123c',
            secondary: '#fff1f2',
            accent: '#fb7185',
            font: "'Inter', sans-serif"
        }
    };

    const getThemeCSS = (themeKey) => {
        const theme = themes[themeKey] || themes.indigo;
        return `
            :root {
                --p-color: ${theme.primary};
                --p-hover: ${theme.primaryHover};
                --s-color: ${theme.secondary};
                --a-color: ${theme.accent};
                --f-main: ${theme.font};
            }
        `;
    };

    return {
        themes,
        getThemeCSS
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSystem;
}

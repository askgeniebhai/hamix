/**
 * HAMIX Website Themes
 * Definitive themes for generated websites using CSS variables.
 */

const Themes = {
    Indigo: {
        id: 'indigo',
        name: 'Modern Indigo',
        variables: {
            '--primary-color': '#4f46e5',
            '--primary-hover': '#4338ca',
            '--secondary-color': '#818cf8',
            '--text-dark': '#111827',
            '--text-light': '#6b7280',
            '--bg-white': '#ffffff',
            '--bg-light': '#f9fafb',
            '--accent-color': '#e0e7ff',
            '--font-family': "'Inter', sans-serif",
            '--btn-radius': '8px',
            '--card-radius': '12px'
        }
    },
    Emerald: {
        id: 'emerald',
        name: 'Professional Emerald',
        variables: {
            '--primary-color': '#059669',
            '--primary-hover': '#047857',
            '--secondary-color': '#34d399',
            '--text-dark': '#064e3b',
            '--text-light': '#374151',
            '--bg-white': '#ffffff',
            '--bg-light': '#ecfdf5',
            '--accent-color': '#d1fae5',
            '--font-family': "'Inter', sans-serif",
            '--btn-radius': '6px',
            '--card-radius': '10px'
        }
    },
    Slate: {
        id: 'slate',
        name: 'Corporate Slate',
        variables: {
            '--primary-color': '#334155',
            '--primary-hover': '#1e293b',
            '--secondary-color': '#64748b',
            '--text-dark': '#0f172a',
            '--text-light': '#475569',
            '--bg-white': '#ffffff',
            '--bg-light': '#f8fafc',
            '--accent-color': '#f1f5f9',
            '--font-family': "'Inter', sans-serif",
            '--btn-radius': '4px',
            '--card-radius': '8px'
        }
    }
};

/**
 * Generates the CSS block for a theme.
 */
function generateThemeCSS(themeId) {
    const theme = Themes[themeId] || Themes.Indigo;
    let css = ':root {\n';
    for (const [key, value] of Object.entries(theme.variables)) {
        css += `    ${key}: ${value};\n`;
    }
    css += '}\n';

    // Base styles common to all themes
    css += `
body {
    font-family: var(--font-family);
    color: var(--text-dark);
    background-color: var(--bg-white);
    line-height: 1.6;
    overflow-x: hidden;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 24px;
}

section {
    padding: 80px 0;
}

.section-header {
    text-align: center;
    margin-bottom: 50px;
}

h1, h2, h3 {
    color: var(--text-dark);
    font-weight: 700;
}

h2 {
    font-size: 36px;
    margin-bottom: 16px;
}

p {
    color: var(--text-light);
}

.btn {
    display: inline-block;
    padding: 12px 28px;
    border-radius: var(--btn-radius);
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
}

.btn-primary {
    background-color: var(--primary-color);
    color: var(--bg-white);
}

.btn-primary:hover {
    background-color: var(--primary-hover);
    transform: translateY(-2px);
}

.btn-outline {
    background-color: transparent;
    color: var(--primary-color);
    border: 2px solid var(--primary-color);
}

.btn-outline:hover {
    background-color: var(--primary-color);
    color: var(--bg-white);
}

/* Navbar */
.navbar {
    height: 80px;
    display: flex;
    align-items: center;
    background: var(--bg-white);
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    position: sticky;
    top: 0;
    z-index: 1000;
}

.navbar .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.navbar-logo img {
    height: 40px;
}

.nav-links {
    display: flex;
    list-style: none;
    gap: 32px;
}

.nav-links a {
    text-decoration: none;
    color: var(--text-dark);
    font-weight: 500;
}

.nav-toggle {
    display: none;
}

/* Hero */
.hero {
    padding: 100px 0;
    background-color: var(--bg-light);
}

.hero .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    align-items: center;
}

.hero h1 {
    font-size: 48px;
    line-height: 1.2;
    margin-bottom: 24px;
}

.hero p {
    font-size: 18px;
    margin-bottom: 32px;
}

.hero-btns {
    display: flex;
    gap: 16px;
}

.hero-image img {
    width: 100%;
    border-radius: var(--card-radius);
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}

/* Services */
.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
}

.service-card {
    padding: 40px;
    background: var(--bg-white);
    border-radius: var(--card-radius);
    border: 1px solid #eee;
    transition: all 0.3s ease;
}

.service-card:hover {
    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    transform: translateY(-5px);
}

.service-icon {
    width: 60px;
    height: 60px;
    background: var(--accent-color);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    margin-bottom: 24px;
}

/* Footer */
.footer {
    background: var(--text-dark);
    color: #fff;
    padding: 60px 0 30px;
}

.footer h4 {
    color: #fff;
    margin-bottom: 24px;
}

.footer-grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 60px;
    margin-bottom: 40px;
}

.footer p {
    color: #cbd5e1;
}

.footer-links ul {
    list-style: none;
}

.footer-links a {
    color: #cbd5e1;
    text-decoration: none;
    display: block;
    margin-bottom: 12px;
}

.footer-bottom {
    border-top: 1px solid #334155;
    padding-top: 30px;
    text-align: center;
}

/* Responsive */
@media (max-width: 991px) {
    .hero .container {
        grid-template-columns: 1fr;
        text-align: center;
    }
    .hero-btns {
        justify-content: center;
    }
    .nav-links, .nav-cta {
        display: none;
    }
    .nav-toggle {
        display: block;
        background: none;
        border: none;
        cursor: pointer;
    }
}
`;
    return css;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Themes, generateThemeCSS };
} else {
    window.HAMIX_Themes = { Themes, generateThemeCSS };
}

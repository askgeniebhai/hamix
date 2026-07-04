/**
 * HAMIX Website Themes
 * Manages interchangeable visual identities using CSS variables.
 */

const Themes = {
    Indigo: {
        id: 'Indigo',
        name: 'Indigo SaaS',
        colors: {
            primary: '#4f46e5',
            primaryHover: '#4338ca',
            accent: '#f5f3ff',
            textDark: '#111827',
            textLight: '#6b7280',
            bgWhite: '#ffffff',
            bgLight: '#f9fafb',
            border: '#e5e7eb'
        },
        typography: {
            fontFamily: "'Inter', sans-serif",
            headingWeight: '700',
            bodyWeight: '400'
        },
        styles: {
            cardRadius: '12px',
            buttonRadius: '8px',
            shadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
        }
    },
    Emerald: {
        id: 'Emerald',
        name: 'Emerald Growth',
        colors: {
            primary: '#10b981',
            primaryHover: '#059669',
            accent: '#ecfdf5',
            textDark: '#064e3b',
            textLight: '#374151',
            bgWhite: '#ffffff',
            bgLight: '#f0fdf4',
            border: '#d1fae5'
        },
        typography: {
            fontFamily: "'Inter', sans-serif",
            headingWeight: '700',
            bodyWeight: '400'
        },
        styles: {
            cardRadius: '16px',
            buttonRadius: '9999px',
            shadow: '0 10px 15px -3px rgba(16, 185, 129, 0.1)'
        }
    },
    Slate: {
        id: 'Slate',
        name: 'Slate Corporate',
        colors: {
            primary: '#334155',
            primaryHover: '#1e293b',
            accent: '#f1f5f9',
            textDark: '#0f172a',
            textLight: '#475569',
            bgWhite: '#ffffff',
            bgLight: '#f8fafc',
            border: '#e2e8f0'
        },
        typography: {
            fontFamily: "'Inter', sans-serif",
            headingWeight: '600',
            bodyWeight: '400'
        },
        styles: {
            cardRadius: '4px',
            buttonRadius: '4px',
            shadow: 'none'
        }
    },
    Rose: {
        id: 'Rose',
        name: 'Rose Modern',
        colors: {
            primary: '#e11d48',
            primaryHover: '#be123c',
            accent: '#fff1f2',
            textDark: '#4c0519',
            textLight: '#881337',
            bgWhite: '#ffffff',
            bgLight: '#fff5f5',
            border: '#ffe4e6'
        },
        typography: {
            fontFamily: "'Inter', sans-serif",
            headingWeight: '800',
            bodyWeight: '400'
        },
        styles: {
            cardRadius: '24px',
            buttonRadius: '12px',
            shadow: '0 20px 25px -5px rgba(225, 29, 72, 0.1)'
        }
    },

    /**
     * Generates CSS variables for the specified theme.
     */
    generateThemeCSS: function(themeId) {
        const theme = this[themeId] || this.Indigo;
        const c = theme.colors;
        const t = theme.typography;
        const s = theme.styles;

        return `
            :root {
                --primary-color: ${c.primary};
                --primary-hover: ${c.primaryHover};
                --accent-color: ${c.accent};
                --text-dark: ${c.textDark};
                --text-light: ${c.textLight};
                --bg-white: ${c.bgWhite};
                --bg-light: ${c.bgLight};
                --border-color: ${c.border};

                --font-family: ${t.fontFamily};
                --heading-weight: ${t.headingWeight};
                --body-weight: ${t.bodyWeight};

                --card-radius: ${s.cardRadius};
                --button-radius: ${s.buttonRadius};
                --shadow: ${s.shadow};
            }

            body {
                font-family: var(--font-family);
                color: var(--text-dark);
                background-color: var(--bg-white);
                line-height: 1.6;
            }

            h1, h2, h3, h4, h5, h6 {
                font-weight: var(--heading-weight);
                color: var(--text-dark);
            }

            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                border-radius: var(--button-radius);
                font-weight: 600;
                transition: 0.3s;
                cursor: pointer;
                border: none;
                text-decoration: none;
            }

            .btn-primary {
                background-color: var(--primary-color);
                color: white;
            }

            .btn-primary:hover {
                background-color: var(--primary-hover);
            }

            .btn-outline {
                background-color: transparent;
                border: 2px solid var(--primary-color);
                color: var(--primary-color);
            }

            .btn-outline:hover {
                background-color: var(--primary-color);
                color: white;
            }

            section {
                padding: 80px 0;
            }

            .section-header {
                text-align: center;
                margin-bottom: 50px;
            }

            .section-header h2 {
                font-size: 2.5rem;
                margin-top: 10px;
            }

            .bg-light {
                background-color: var(--bg-light);
            }

            .card {
                background: var(--bg-white);
                padding: 30px;
                border-radius: var(--card-radius);
                box-shadow: var(--shadow);
                border: 1px solid var(--border-color);
            }
        `;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Themes;
} else {
    window.HAMIX_Themes = Themes;
}

/**
 * HAMIX Website Templates
 * Assembles components into complete page templates.
 */

const Templates = {
    Default: (data, components, themeStyles) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.businessName} - ${data.category || ''}</title>
    <meta name="description" content="${data.seoDescription || data.businessDescription || ''}">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Styles -->
    <style>
        ${themeStyles}

        /* Layout & Typography */
        :root {
            --container-max: 1200px;
            --section-padding: 100px 0;
            --section-padding-mobile: 60px 0;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: var(--color-text);
            background-color: var(--color-bg);
        }

        .container {
            max-width: var(--container-max);
            margin: 0 auto;
            padding: 0 20px;
        }

        img { max-width: 100%; height: auto; display: block; }
        a { text-decoration: none; color: inherit; transition: 0.3s; }
        ul { list-style: none; }

        /* Buttons */
        .btn {
            display: inline-block;
            padding: 12px 28px;
            border-radius: var(--radius-btn);
            font-weight: 600;
            cursor: pointer;
            border: none;
            font-size: 1rem;
        }
        .btn-primary { background: var(--color-primary); color: white; }
        .btn-primary:hover { opacity: 0.9; transform: translateY(-2px); }
        .btn-outline { border: 2px solid var(--color-primary); color: var(--color-primary); background: transparent; }
        .btn-outline:hover { background: var(--color-primary); color: white; }

        /* Navbar */
        .navbar {
            padding: 20px 0;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .navbar .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .navbar-logo img { height: 40px; }
        .navbar-logo span { font-size: 1.5rem; font-weight: 700; color: var(--color-primary); }
        .nav-links { display: flex; gap: 30px; }
        .nav-links a:hover { color: var(--color-primary); }
        .nav-toggle { display: none; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-dark); }

        /* Sections */
        section { padding: var(--section-padding); }
        .section-header { text-align: center; margin-bottom: 50px; }
        .section-badge {
            display: inline-block;
            padding: 5px 15px;
            background: rgba(79, 70, 229, 0.1);
            color: var(--color-primary);
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        h2 { font-size: 2.5rem; margin-bottom: 20px; }

        /* Hero */
        .hero {
            background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
            padding: 120px 0;
        }
        .hero .container { display: flex; align-items: center; gap: 50px; }
        .hero-content { flex: 1; }
        .hero-image { flex: 1; }
        .hero-image img { border-radius: var(--radius-card); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        .hero h1 { font-size: 3.5rem; line-height: 1.2; margin-bottom: 25px; color: var(--color-text-dark); }
        .hero p { font-size: 1.2rem; margin-bottom: 35px; color: var(--color-text-light); }
        .hero-btns { display: flex; gap: 15px; }

        /* About */
        .about-grid { display: flex; align-items: center; gap: 60px; }
        .about-image { flex: 1; }
        .about-image img { border-radius: var(--radius-card); }
        .about-content { flex: 1; }

        /* Services */
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
        }
        .service-card {
            padding: 40px;
            background: white;
            border-radius: var(--radius-card);
            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            transition: 0.3s;
            text-align: center;
        }
        .service-card:hover { transform: translateY(-10px); }
        .service-icon {
            width: 70px; height: 70px;
            background: rgba(79, 70, 229, 0.1);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 25px;
            color: var(--color-primary);
        }

        /* Gallery */
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .gallery-item img {
            width: 100%; height: 250px; object-fit: cover;
            border-radius: var(--radius-card);
        }

        /* FAQ */
        .faq-list { max-width: 800px; margin: 0 auto; }
        .faq-item { border-bottom: 1px solid #eee; padding: 20px 0; }
        .faq-question {
            display: flex; justify-content: space-between; align-items: center;
            cursor: pointer;
        }
        .faq-answer { display: none; padding-top: 15px; }

        /* Contact */
        .contact-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 60px; }
        .contact-details { margin-top: 30px; }
        .contact-item { display: flex; gap: 20px; margin-bottom: 25px; }
        .contact-item i { color: var(--color-primary); }
        .contact-form {
            background: white; padding: 40px;
            border-radius: var(--radius-card); box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .form-group { margin-bottom: 20px; }
        .form-group input, .form-group textarea {
            width: 100%; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-family: inherit;
        }

        /* Map */
        .map-placeholder {
            height: 400px; background: #f1f5f9;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #64748b;
        }

        /* Footer */
        .footer { background: #1e293b; color: #f8fafc; padding: 80px 0 30px; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 50px; margin-bottom: 50px; }
        .footer h4 { font-size: 1.2rem; margin-bottom: 25px; color: white; }
        .footer-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px; text-align: center; font-size: 0.9rem; }
        .social-links { display: flex; gap: 15px; margin-top: 20px; }
        .social-links a {
            width: 40px; height: 40px; background: rgba(255,255,255,0.1);
            display: flex; align-items: center; justify-content: center; border-radius: 50%;
        }

        /* Floating Actions */
        .floating-actions { position: fixed; bottom: 30px; right: 30px; display: flex; flex-direction: column; gap: 15px; z-index: 1000; }
        .floating-actions a {
            width: 60px; height: 60px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        .whatsapp-btn { background: #25d366; }
        .call-btn { background: var(--color-primary); }

        /* Responsive */
        @media (max-width: 991px) {
            section { padding: var(--section-padding-mobile); }
            .hero .container, .about-grid, .contact-grid { flex-direction: column; text-align: center; }
            .hero-btns { justify-content: center; }
            .hero h1 { font-size: 2.5rem; }
            .nav-links {
                display: none;
                position: absolute; top: 100%; left: 0; width: 100%; background: white;
                flex-direction: column; gap: 0; box-shadow: 0 10px 10px rgba(0,0,0,0.05);
            }
            .nav-links.active { display: flex; }
            .nav-links li { border-top: 1px solid #f1f5f9; }
            .nav-links a { display: block; padding: 15px 20px; }
            .nav-toggle { display: block; }
            .nav-cta { display: none; }
            .footer-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    ${components.Navbar(data)}
    ${components.Hero(data)}
    ${components.About(data)}
    ${components.Services(data)}
    ${components.Gallery(data)}
    ${components.Testimonials(data)}
    ${components.FAQ(data)}
    ${components.Contact(data)}
    ${components.GoogleMap(data)}
    ${components.Footer(data)}
    ${components.FloatingActions(data)}

    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
        lucide.createIcons();

        // Mobile Navigation Toggle
        const navToggle = document.getElementById('navToggle');
        const navLinks = document.querySelector('.nav-links');

        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        // Close menu on link click
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });

        // FAQ Accordion
        document.querySelectorAll('.faq-question').forEach(q => {
            q.addEventListener('click', () => {
                const item = q.parentElement;
                const answer = item.querySelector('.faq-answer');
                const isOpen = answer.style.display === 'block';

                // Close all others
                document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');

                if (!isOpen) {
                    answer.style.display = 'block';
                }
            });
        });
    </script>
</body>
</html>
`
};

// Export for browser usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Templates;
} else {
    window.HAMIX_Templates = Templates;
}

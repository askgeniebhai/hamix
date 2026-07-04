/**
 * HAMIX Website Components
 * Reusable HTML components for generated websites.
 * Enhanced to support AI-generated content.
 */

const Components = {
    Navbar: (data) => `
        <nav class="navbar">
            <div class="container">
                <a href="#" class="navbar-logo">
                    ${data.logo ? `<img src="${data.logo}" alt="${data.businessName}">` : `<span>${data.businessName}</span>`}
                </a>
                <ul class="nav-links">
                    <li><a href="#home">Home</a></li>
                    <li><a href="#about">About</a></li>
                    <li><a href="#services">Services</a></li>
                    <li><a href="#gallery">Gallery</a></li>
                    <li><a href="#faq">FAQ</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ul>
                <div class="nav-cta">
                    <a href="tel:${data.phone}" class="btn btn-primary">Call Now</a>
                </div>
                <button id="navToggle" class="nav-toggle">
                    <i data-lucide="menu"></i>
                </button>
            </div>
        </nav>
    `,

    Hero: (data) => {
        const title = data.aiContent?.copy?.heroHeading || data.heroTitle || data.businessName;
        const subtitle = data.aiContent?.copy?.heroSubheading || data.heroSubtitle || data.tagline || '';
        const cta = data.aiContent?.copy?.ctaText || 'Get Started';

        return `
        <section id="home" class="hero">
            <div class="container">
                <div class="hero-content">
                    <h1>${title}</h1>
                    <p>${subtitle}</p>
                    <div class="hero-btns">
                        <a href="#contact" class="btn btn-primary">${cta}</a>
                        <a href="#services" class="btn btn-outline">Our Services</a>
                    </div>
                </div>
                ${data.heroImage ? `<div class="hero-image"><img src="${data.heroImage}" alt="Hero Image"></div>` : ''}
            </div>
        </section>
    `},

    About: (data) => {
        const title = data.aiContent?.copy?.aboutHeading || data.aboutTitle || 'Professional Services for Your Business';
        const text = data.aiContent?.copy?.aboutText || data.aboutText || data.businessDescription || 'We are committed to delivering the best quality services to our clients.';

        return `
        <section id="about" class="about">
            <div class="container">
                <div class="about-grid">
                    <div class="about-image">
                        <img src="${data.aboutImage || 'assets/images/placeholder-about.jpg'}" alt="About Us">
                    </div>
                    <div class="about-content">
                        <span class="section-badge">About Us</span>
                        <h2>${title}</h2>
                        <p>${text}</p>
                        ${data.mission ? `
                            <div class="mission-vision">
                                <h3>Our Mission</h3>
                                <p>${data.mission}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </section>
    `},

    Services: (data) => `
        <section id="services" class="services">
            <div class="container">
                <div class="section-header">
                    <span class="section-badge">Services</span>
                    <h2>What We Offer</h2>
                </div>
                <div class="services-grid">
                    ${(data.services || [
                        { title: "Standard Service", description: "High-quality implementation of core industry standards.", icon: "check-circle" },
                        { title: "Premium Support", description: "24/7 priority assistance for all your business needs.", icon: "zap" },
                        { title: "Guaranteed Quality", description: "We stand behind our work with full satisfaction guarantee.", icon: "shield" }
                    ]).map(service => `
                        <div class="service-card">
                            <div class="service-icon">
                                <i data-lucide="${service.icon || 'check-circle'}"></i>
                            </div>
                            <h3>${service.title}</h3>
                            <p>${service.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    `,

    Gallery: (data) => {
        const images = data.images || data.aboutSecondaryImages || [];
        if (images.length === 0) return '';

        return `
        <section id="gallery" class="gallery">
            <div class="container">
                <div class="section-header">
                    <span class="section-badge">Gallery</span>
                    <h2>Our Work</h2>
                </div>
                <div class="gallery-grid">
                    ${images.map(img => `
                        <div class="gallery-item">
                            <img src="${img}" alt="Gallery Image" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    `},

    Testimonials: (data) => `
        <section id="testimonials" class="testimonials">
            <div class="container">
                <div class="section-header">
                    <span class="section-badge">Testimonials</span>
                    <h2>What Our Clients Say</h2>
                </div>
                <div class="testimonials-grid">
                    ${(data.testimonials || [
                        { name: "John Doe", text: "Excellent service and professional staff.", role: "CEO, Tech Corp" },
                        { name: "Jane Smith", text: "Highly recommended for their attention to detail.", role: "Business Owner" }
                    ]).map(t => `
                        <div class="testimonial-card">
                            <div class="rating">
                                <i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i>
                            </div>
                            <p>"${t.text}"</p>
                            <div class="testimonial-author">
                                <strong>${t.name}</strong>
                                <span>${t.role}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    `,

    FAQ: (data) => {
        const faqs = data.aiContent?.faq || data.faq || [
            { q: "What services do you offer?", a: "We offer a wide range of professional services tailored to your needs." },
            { q: "How can I contact you?", a: "You can reach us via the contact form, email, or phone number provided on this website." }
        ];

        return `
        <section id="faq" class="faq">
            <div class="container">
                <div class="section-header">
                    <span class="section-badge">FAQ</span>
                    <h2>Frequently Asked Questions</h2>
                </div>
                <div class="faq-list">
                    ${faqs.map(item => `
                        <div class="faq-item">
                            <div class="faq-question">
                                <h3>${item.q}</h3>
                                <i data-lucide="chevron-down"></i>
                            </div>
                            <div class="faq-answer">
                                <p>${item.a}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>
    `},

    Contact: (data) => `
        <section id="contact" class="contact">
            <div class="container">
                <div class="contact-grid">
                    <div class="contact-info">
                        <span class="section-badge">Contact Us</span>
                        <h2>Get In Touch</h2>
                        <p>Have questions? We're here to help.</p>
                        <div class="contact-details">
                            <div class="contact-item">
                                <i data-lucide="phone"></i>
                                <div>
                                    <h4>Phone</h4>
                                    <p><a href="tel:${data.phone}">${data.phone}</a></p>
                                </div>
                            </div>
                            <div class="contact-item">
                                <i data-lucide="mail"></i>
                                <div>
                                    <h4>Email</h4>
                                    <p><a href="mailto:${data.email}">${data.email}</a></p>
                                </div>
                            </div>
                            <div class="contact-item">
                                <i data-lucide="map-pin"></i>
                                <div>
                                    <h4>Address</h4>
                                    <p>${data.location || data.address}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="contact-form">
                        <form id="websiteContactForm">
                            <div class="form-group">
                                <input type="text" placeholder="Your Name" required>
                            </div>
                            <div class="form-group">
                                <input type="email" placeholder="Your Email" required>
                            </div>
                            <div class="form-group">
                                <textarea placeholder="Your Message" rows="5" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary">Send Message</button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    `,

    GoogleMap: (data) => {
        const address = data.location || data.address || '';
        const encodedAddress = encodeURIComponent(address);
        return `
        <section class="map-section">
            <div class="container">
                <div class="section-header">
                    <span class="section-badge">Location</span>
                    <h2>Visit Our Office</h2>
                </div>
                <div class="map-container">
                    ${address ? `
                        <iframe
                            width="100%"
                            height="450"
                            style="border:0; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);"
                            loading="lazy"
                            allowfullscreen
                            src="https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_API_KEY&q=${encodedAddress}">
                        </iframe>
                    ` : '<div class="map-placeholder"><i data-lucide="map"></i><p>Map not provided</p></div>'}
                </div>
            </div>
        </section>
    `},

    Footer: (data) => `
        <footer class="footer">
            <div class="container">
                <div class="footer-grid">
                    <div class="footer-brand">
                        <div class="logo">
                            ${data.logo ? `<img src="${data.logo}" alt="${data.businessName}">` : `<span>${data.businessName}</span>`}
                        </div>
                        <p>${data.tagline || ''}</p>
                    </div>
                    <div class="footer-links">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><a href="#home">Home</a></li>
                            <li><a href="#about">About</a></li>
                            <li><a href="#services">Services</a></li>
                            <li><a href="#contact">Contact</a></li>
                        </ul>
                    </div>
                    <div class="footer-hours">
                        <h4>Business Hours</h4>
                        <p>${data.businessHours || 'Mon - Fri: 9:00 AM - 6:00 PM'}</p>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p>&copy; ${new Date().getFullYear()} ${data.businessName}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    `,

    FloatingActions: (data) => `
        <div class="floating-actions">
            ${data.whatsapp ? `
                <a href="https://wa.me/${data.whatsapp}" class="whatsapp-btn" target="_blank">
                    <i data-lucide="message-circle"></i>
                </a>
            ` : ''}
            <a href="tel:${data.phone}" class="call-btn">
                <i data-lucide="phone"></i>
            </a>
        </div>
    `
};

// Export for browser usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Components;
} else {
    window.HAMIX_Components = Components;
}

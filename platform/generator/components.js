/**
 * HAMIX Platform - Reusable Website Components
 */

const GeneratorComponents = (() => {
    const Navbar = (data) => `
        <nav class="nav">
            <div class="container nav-container">
                <div class="logo">{{businessName}}</div>
                <div class="nav-links">
                    <a href="#home">Home</a>
                    <a href="#about">About</a>
                    <a href="#services">Services</a>
                    <a href="#contact">Contact</a>
                </div>
                <div class="nav-mobile-toggle" id="navToggle">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </nav>
    `;

    const Hero = (data) => `
        <section id="home" class="hero">
            <div class="container hero-container">
                <div class="hero-content">
                    <span class="badge">{{category}}</span>
                    <h1>Expert {{category}} Services in {{address}}</h1>
                    <p>Professional, reliable, and affordable solutions tailored for your business needs.</p>
                    <div class="hero-actions">
                        <a href="https://wa.me/{{whatsapp}}" class="btn btn-primary"><i data-lucide="message-circle"></i> WhatsApp Us</a>
                        <a href="tel:{{phone}}" class="btn btn-secondary"><i data-lucide="phone"></i> Call Now</a>
                    </div>
                </div>
            </div>
        </section>
    `;

    const About = (data) => `
        <section id="about" class="section about">
            <div class="container grid-2">
                <div class="about-image">
                    <div class="img-placeholder"></div>
                </div>
                <div class="about-content">
                    <h2 class="section-title">About {{businessName}}</h2>
                    <p>We are a leading provider of {{category}} services, dedicated to delivering excellence and quality to our customers.</p>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <h3>{{rating}} ★</h3>
                            <p>Google Rating</p>
                        </div>
                        <div class="stat-item">
                            <h3>{{reviews}}+</h3>
                            <p>Happy Clients</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

    const Services = (data) => `
        <section id="services" class="section services bg-light">
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">Our Services</h2>
                    <p>Comprehensive solutions designed for you.</p>
                </div>
                <div class="grid-3">
                    <div class="card service-card">
                        <i data-lucide="check-circle" class="icon-p"></i>
                        <h3>Standard Service</h3>
                        <p>High-quality implementation of core industry standards.</p>
                    </div>
                    <div class="card service-card">
                        <i data-lucide="zap" class="icon-p"></i>
                        <h3>Premium Support</h3>
                        <p>24/7 priority assistance for all your business needs.</p>
                    </div>
                    <div class="card service-card">
                        <i data-lucide="shield" class="icon-p"></i>
                        <h3>Guaranteed Quality</h3>
                        <p>We stand behind our work with full satisfaction guarantee.</p>
                    </div>
                </div>
            </div>
        </section>
    `;

    const Contact = (data) => `
        <section id="contact" class="section contact">
            <div class="container">
                <div class="section-header">
                    <h2 class="section-title">Contact Us</h2>
                    <p>Get in touch with our expert team today.</p>
                </div>
                <div class="grid-2">
                    <div class="contact-info">
                        <div class="contact-item">
                            <i data-lucide="map-pin"></i>
                            <div>
                                <h4>Our Address</h4>
                                <p>{{address}}</p>
                            </div>
                        </div>
                        <div class="contact-item">
                            <i data-lucide="phone"></i>
                            <div>
                                <h4>Call Us</h4>
                                <p>{{phone}}</p>
                            </div>
                        </div>
                        <div class="contact-item">
                            <i data-lucide="mail"></i>
                            <div>
                                <h4>Email Us</h4>
                                <p>{{email}}</p>
                            </div>
                        </div>
                        <div class="contact-item">
                            <i data-lucide="clock"></i>
                            <div>
                                <h4>Working Hours</h4>
                                <p>Mon - Fri: 9:00 AM - 6:00 PM</p>
                            </div>
                        </div>
                    </div>
                    <div class="contact-form-container">
                        <form class="contact-form">
                            <div class="form-group">
                                <input type="text" placeholder="Your Name" required>
                            </div>
                            <div class="form-group">
                                <input type="email" placeholder="Your Email" required>
                            </div>
                            <div class="form-group">
                                <textarea placeholder="Your Message" rows="5" required></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary full-width">Send Message</button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    `;

    const Footer = (data) => `
        <footer class="footer">
            <div class="container footer-container">
                <div class="footer-info">
                    <div class="logo">{{businessName}}</div>
                    <p>Your trusted partner for {{category}} services.</p>
                </div>
                <div class="footer-links">
                    <h4>Quick Links</h4>
                    <a href="#home">Home</a>
                    <a href="#about">About</a>
                    <a href="#services">Services</a>
                    <a href="#contact">Contact</a>
                </div>
                <div class="footer-social">
                    <h4>Connect</h4>
                    <div class="social-icons">
                        <i data-lucide="facebook"></i>
                        <i data-lucide="instagram"></i>
                        <i data-lucide="twitter"></i>
                    </div>
                </div>
            </div>
            <div class="footer-bottom">
                <div class="container">
                    <p>&copy; 2024 {{businessName}}. All rights reserved.</p>
                </div>
            </div>
        </footer>
    `;

    const CommonStyles = () => `
        <style>
            :root {
                --p-color: #4f46e5;
                --p-hover: #4338ca;
                --s-color: #f5f3ff;
                --bg-white: #ffffff;
                --bg-light: #f9fafb;
                --text-main: #111827;
                --text-muted: #6b7280;
                --border: #e5e7eb;
                --radius: 8px;
                --container: 1200px;
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; line-height: 1.6; color: var(--text-main); scroll-behavior: smooth; }
            .container { max-width: var(--container); margin: 0 auto; padding: 0 24px; }
            section { padding: 80px 0; }
            .bg-light { background: var(--bg-light); }
            h1, h2, h3 { line-height: 1.2; margin-bottom: 16px; font-weight: 700; }
            h1 { font-size: clamp(2.5rem, 5vw, 4rem); }
            h2 { font-size: clamp(2rem, 4vw, 2.5rem); }
            p { margin-bottom: 16px; color: var(--text-muted); }
            .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: var(--radius); text-decoration: none; font-weight: 600; cursor: pointer; transition: 0.3s; border: none; }
            .btn-primary { background: var(--p-color); color: white; }
            .btn-primary:hover { background: var(--p-hover); }
            .btn-secondary { background: var(--s-color); color: var(--p-color); }
            .full-width { width: 100%; justify-content: center; }
            .badge { display: inline-block; padding: 4px 12px; background: var(--s-color); color: var(--p-color); border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
            .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)); gap: 48px; align-items: center; }
            .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 24px; }
            .card { background: white; padding: 32px; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

            /* Navbar */
            .nav { height: 80px; display: flex; align-items: center; position: fixed; top: 0; width: 100%; background: white; z-index: 1000; border-bottom: 1px solid var(--border); }
            .nav-container { display: flex; justify-content: space-between; align-items: center; width: 100%; }
            .nav-links { display: flex; gap: 32px; }
            .nav-links a { text-decoration: none; color: var(--text-main); font-weight: 500; }
            .nav-mobile-toggle { display: none; flex-direction: column; gap: 6px; cursor: pointer; }
            .nav-mobile-toggle span { width: 24px; height: 2px; background: var(--text-main); }

            /* Hero */
            .hero { padding: 160px 0 100px; background: radial-gradient(circle at top right, var(--s-color) 0%, white 100%); }
            .hero-content { max-width: 800px; }

            /* About */
            .img-placeholder { background: var(--s-color); border-radius: var(--radius); aspect-ratio: 1; position: relative; overflow: hidden; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }

            /* Contact */
            .contact-item { display: flex; gap: 16px; margin-bottom: 24px; }
            .contact-item i { color: var(--p-color); }
            .form-group { margin-bottom: 16px; }
            .form-group input, .form-group textarea { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); outline: none; }

            /* Footer */
            .footer { background: #111827; color: white; padding: 64px 0 0; }
            .footer p { color: #9ca3af; }
            .footer-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 48px; padding-bottom: 48px; }
            .footer-bottom { border-top: 1px solid #374151; padding: 24px 0; text-align: center; }
            .footer-social .social-icons { display: flex; gap: 16px; margin-top: 16px; }

            @media (max-width: 991px) {
                .nav-links { display: none; }
                .nav-mobile-toggle { display: flex; }
            }
        </style>
    `;

    return {
        Navbar, Hero, About, Services, Contact, Footer, CommonStyles
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeneratorComponents;
}

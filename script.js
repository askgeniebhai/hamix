/* ==========================================================
   HAMIX V2
   Dynamic Website Engine - Premium Edition
========================================================== */

"use strict";

/* ==========================================================
   GLOBAL VARIABLES
========================================================== */

let customer = {};

/* ==========================================================
   URL PARAMETERS
========================================================== */

const params = new URLSearchParams(window.location.search);
const customerId = params.get("id") || "neela-security-force";

/* ==========================================================
   LOAD CUSTOMER JSON
========================================================== */

async function loadCustomer() {
    try {
        const response = await fetch(`customers/${customerId}.json`);
        if (!response.ok) {
            throw new Error("Customer JSON not found.");
        }
        customer = await response.json();
        initializeWebsite();
    } catch (error) {
        console.error(error);
        document.body.innerHTML = `
            <div style="padding:100px; text-align:center; font-family:sans-serif; background:#0F172A; color:white; height:100vh;">
                <h1>HAMIX PLATFORM</h1>
                <h2>Customer Profile Not Found</h2>
                <p>Profile ID: ${customerId}</p>
            </div>
        `;
    }
}

/* ==========================================================
   START APPLICATION
========================================================== */

window.addEventListener("DOMContentLoaded", loadCustomer);

/* ==========================================================
   HELPER FUNCTIONS
========================================================== */

function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
        el.textContent = value;
    }
}

function setImage(id, src, alt = "") {
    const img = document.getElementById(id);
    if (img && src) {
        img.src = src;
        img.alt = alt;
    }
}

function setLink(id, href) {
    const el = document.getElementById(id);
    if (el && href) {
        el.href = href;
    }
}

/* ==========================================================
   INITIALIZE WEBSITE
========================================================== */

function initializeWebsite() {
    /* ---------- Browser ---------- */
    document.title = (customer.businessName || "HAMIX") + " | Professional Security Services";

    /* ---------- Image Fallbacks ---------- */
    addImageFallback("logo", "assets/images/security/logo.png");
    addImageFallback("heroImage", "assets/images/security/banner.jpg");
    addImageFallback("aboutImage", "assets/images/security/about.jpg");
    addImageFallback("officerImage", "assets/images/security/officer.jpg");
    addImageFallback("chiefImage", "assets/images/security/chief.jpg");

    /* ---------- Header ---------- */
    setText("businessName", customer.businessName);
    setText("tagline", customer.tagline);
    setImage("logo", customer.logo, customer.businessName);

    /* ---------- Hero ---------- */
    setText("heroTitle", customer.heroTitle);
    setText("heroSubtitle", customer.heroSubtitle);
    setText("heroTagline", customer.tagline);
    setImage("heroImage", customer.heroImage, customer.businessName);

    if (customer.heroImage) {
        document.documentElement.style.setProperty('--hero-bg', `url('${customer.heroImage}')`);
    }

    /* ---------- About ---------- */
    setText("aboutTitle", customer.aboutTitle);
    setText("aboutText", customer.aboutText);
    setImage("aboutImage", customer.aboutImage, "About " + customer.businessName);

    /* ---------- Mission & Vision ---------- */
    setText("missionText", customer.mission);
    setText("visionText", customer.vision);

    /* ---------- Stats ---------- */
    if (customer.stats && Array.isArray(customer.stats)) {
        renderStats(customer.stats);
    }

    /* ---------- Why Choose Us ---------- */
    if (customer.whyChooseUs && Array.isArray(customer.whyChooseUs)) {
        renderFeatures(customer.whyChooseUs);
    }

    /* ---------- Services ---------- */
    if (customer.services && Array.isArray(customer.services)) {
        renderServices(customer.services);
    }

    /* ---------- Industries ---------- */
    if (customer.industries && Array.isArray(customer.industries)) {
        renderIndustries(customer.industries);
    }

    /* ---------- Leadership ---------- */
    if (customer.leadership && Array.isArray(customer.leadership)) {
        renderLeadership(customer.leadership);
    }

    /* ---------- Clients ---------- */
    if (customer.clients && Array.isArray(customer.clients)) {
        renderClients(customer.clients);
    }

    /* ---------- Contact ---------- */
    setText("phone", customer.phone);
    setText("location", customer.location);
    setText("contactPhone", customer.phone);
    setText("contactLocation", customer.location);
    setText("footerBusiness", customer.businessName);

    setImage("officerImage", customer.officerImage || "assets/images/security/officer.jpg");
    setImage("chiefImage", customer.chiefImage || "assets/images/security/chief.jpg");

    if (customer.email) {
        setText("email", customer.email);
        setLink("emailLink", "mailto:" + customer.email);
    } else {
        const emailEl = document.getElementById("emailContainer");
        if (emailEl) emailEl.style.display = "none";
    }
    
    /* ---------- WhatsApp ---------- */
    if (customer.whatsapp) {
        const whatsappURL = "https://wa.me/" + customer.whatsapp;
        setLink("heroWhatsapp", whatsappURL);
        setLink("ctaWhatsapp", whatsappURL);
        setLink("topWhatsapp", whatsappURL);
        setLink("contactWhatsapp", whatsappURL);
    }

    initAnimations();
}

/* ==========================================================
   ANIMATIONS
========================================================== */

function initAnimations() {
    const reveals = document.querySelectorAll(".reveal");

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                // Once it has revealed, we don't need to observe it anymore
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    });

    reveals.forEach(reveal => revealObserver.observe(reveal));
}

/* ==========================================================
   IMAGE FALLBACK
========================================================== */

function addImageFallback(id, fallback = "") {
    const img = document.getElementById(id);
    if (!img) return;
    img.onerror = function () {
        console.warn(id + " image not found. Using fallback.");
        if (fallback) {
            this.src = fallback;
        }
    };
}

/* ==========================================================
   DYNAMIC RENDER HELPERS
========================================================== */

function renderStats(stats) {
    const container = document.querySelector(".stats-grid");
    if (!container) return;
    container.innerHTML = stats.map(stat => `
        <div class="stat-card reveal">
            <h3>${stat.value}</h3>
            <p>${stat.label}</p>
        </div>
    `).join("");
}

function renderFeatures(features) {
    const container = document.querySelector(".features-grid");
    if (!container) return;
    container.innerHTML = features.map(feature => `
        <div class="feature-card reveal">
            <div class="feature-icon">${feature.icon || "🛡️"}</div>
            <h3>${feature.title}</h3>
            <p>${feature.description}</p>
        </div>
    `).join("");
}

function renderServices(services) {
    const container = document.getElementById("servicesContainer");
    if (!container) return;
    container.innerHTML = services.map(service => `
        <div class="service-card reveal">
            ${service.image ? `<img src="${service.image}" alt="${service.title}" class="service-image">` : ""}
            <div class="service-content">
                <h3>${service.title || ""}</h3>
                <p>${service.description || ""}</p>
            </div>
        </div>
    `).join("");
}

function renderIndustries(industries) {
    const container = document.querySelector(".industries-grid");
    if (!container) return;
    container.innerHTML = industries.map(industry => `
        <div class="industry-card reveal">
            <img src="${industry.image || "assets/images/security/street.jpg"}" alt="${industry.name}">
            <div class="industry-overlay">
                <h3>${industry.icon || ""} ${industry.name}</h3>
            </div>
        </div>
    `).join("");
}

function renderLeadership(leadership) {
    const container = document.getElementById("leadershipContainer");
    if (!container) return;
    container.innerHTML = leadership.map(member => `
        <div class="leader-card reveal">
            <img src="${member.image}" alt="${member.name}">
            <h3>${member.name}</h3>
            <p>${member.role}</p>
        </div>
    `).join("");
}

function renderClients(clients) {
    const container = document.getElementById("clientsContainer");
    if (!container) return;
    container.innerHTML = clients.map(client => `
        <div class="client-logo reveal">
            <img src="${client.logo}" alt="${client.name}" title="${client.name}">
        </div>
    `).join("");
}

/* ==========================================================
   SMOOTH SCROLL
========================================================== */

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", function (e) {
        const hrefAttr = this.getAttribute("href");
        if (hrefAttr === "#") return;
        const target = document.querySelector(hrefAttr);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({
            behavior: "smooth"
        });
    });
});

/* ==========================================================
   STICKY HEADER
========================================================== */

const siteHeader = document.querySelector("header");
if (siteHeader) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > 60) {
            siteHeader.classList.add("sticky");
        } else {
            siteHeader.classList.remove("sticky");
        }
    });
}


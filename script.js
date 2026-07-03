/* ==========================================================
   HAMIX V2 - FLAGSHIP ENGINE
   Dynamic Website Engine - Premium Security Edition
========================================================== */

"use strict";

let customer = {};

const params = new URLSearchParams(window.location.search);
const customerId = params.get("id") || "neela-security-force";

async function loadCustomer() {
    try {
        const response = await fetch(`customers/${customerId}.json`);
        if (!response.ok) throw new Error("Customer JSON not found.");
        customer = await response.json();
        initializeWebsite();
    } catch (error) {
        console.error(error);
        document.body.innerHTML = `
            <div style="padding:100px; text-align:center; font-family:sans-serif; background:#0B1F3A; color:white; height:100vh; display: flex; flex-direction: column; justify-content: center;">
                <h1>HAMIX PLATFORM</h1>
                <h2>Customer Profile Not Found</h2>
                <p>Profile ID: ${customerId}</p>
            </div>
        `;
    }
}

window.addEventListener("DOMContentLoaded", loadCustomer);

/* ---------- HELPERS ---------- */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
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
    if (el && href) el.href = href;
}

/* ---------- INITIALIZE ---------- */
function initializeWebsite() {
    document.title = (customer.businessName || "HAMIX") + " | Elite Security Services";
    document.getElementById('year').textContent = new Date().getFullYear();

    // Basic Info
    setText("businessName", customer.businessName);
    setText("footerBusiness", customer.businessName);
    setText("footerBusinessName", customer.businessName);
    setText("tagline", customer.tagline);
    setImage("logo", customer.logo, customer.businessName);

    // Hero
    setText("heroTitle", customer.heroTitle);
    setText("heroSubtitle", customer.heroSubtitle);
    if (customer.heroImage) {
        document.documentElement.style.setProperty('--hero-bg', `url('${customer.heroImage}')`);
    }

    // About
    setText("aboutTitle", customer.aboutTitle);
    setText("aboutText", customer.aboutText);
    setImage("aboutImage", customer.aboutImage);
    setText("missionText", customer.mission);
    setText("visionText", customer.vision);

    // Contact
    setText("contactPhone", customer.phone);
    setText("contactEmail", customer.email);
    setText("contactLocation", customer.location);

    // WhatsApp
    if (customer.whatsapp) {
        const wa = "https://wa.me/" + customer.whatsapp;
        setLink("heroWhatsapp", wa);
        setLink("contactWhatsapp", wa);
        setLink("parallaxWhatsapp", wa);
    }

    // Dynamic Renderings
    renderStats(customer.stats || []);
    renderServices(customer.services || []);
    renderIndustries(customer.industries || []);
    renderFeatures(customer.whyChooseUs || []);
    renderLeadership(customer.leadership || []);
    renderTestimonials(customer.testimonials || []);
    renderClients(customer.clients || []);

    initScrollEffects();
}

/* ---------- RENDERING ENGINE ---------- */

function renderStats(stats) {
    const container = document.querySelector(".stats-banner-grid");
    if (!container) return;
    container.innerHTML = stats.map(s => `
        <div class="stat-item">
            <h3>${s.value}</h3>
            <p>${s.label}</p>
        </div>
    `).join("");
}

function renderServices(services) {
    const container = document.getElementById("servicesContainer");
    if (!container) return;
    container.innerHTML = services.map((s, index) => `
        <div class="service-card reveal reveal-delay-${(index % 3) + 1}">
            <div class="service-card-icon">${s.icon || '🛡️'}</div>
            <div class="service-card-img">
                <img src="${s.image}" alt="${s.title}">
            </div>
            <div class="service-card-content">
                <h3>${s.title}</h3>
                <p>${s.description}</p>
            </div>
        </div>
    `).join("");
}

function renderIndustries(industries) {
    const container = document.getElementById("industriesContainer");
    if (!container) return;
    container.innerHTML = industries.map((i, index) => `
        <div class="industry-card reveal reveal-delay-${(index % 4) + 1}">
            <img src="${i.image}" alt="${i.name}">
            <div class="industry-card-overlay">
                <p>${i.category || 'Sector'}</p>
                <h3>${i.name}</h3>
            </div>
        </div>
    `).join("");
}

function renderFeatures(features) {
    const container = document.getElementById("featuresContainer");
    if (!container) return;
    container.innerHTML = features.map((f, index) => `
        <div class="feature-card reveal reveal-delay-${(index % 4) + 1}">
            <div class="feature-icon">${f.icon || '✓'}</div>
            <h3>${f.title}</h3>
            <p>${f.description}</p>
        </div>
    `).join("");
}

function renderLeadership(leadership) {
    const container = document.getElementById("leadershipContainer");
    if (!container) return;
    container.innerHTML = leadership.map((l, index) => `
        <div class="leader-card-premium reveal reveal-delay-${(index % 3) + 1}">
            <img src="${l.image}" alt="${l.name}">
            <div class="leader-info">
                <p>${l.role}</p>
                <h3>${l.name}</h3>
            </div>
        </div>
    `).join("");
}

function renderTestimonials(testimonials) {
    const container = document.getElementById("testimonialsContainer");
    if (!container) return;
    container.innerHTML = testimonials.map(t => `
        <div class="testimonial-card reveal">
            <div class="testimonial-content">${t.content}</div>
            <div class="testimonial-author">
                <img src="${t.image || 'assets/images/security/guard.png'}" alt="${t.name}">
                <div>
                    <h4>${t.name}</h4>
                    <p>${t.company}</p>
                </div>
            </div>
        </div>
    `).join("");
}

function renderClients(clients) {
    const container = document.getElementById("clientsTrack");
    if (!container) return;
    const items = clients.map(c => `<img src="${c.logo}" alt="${c.name}">`).join("");
    // Double items for seamless loop
    container.innerHTML = items + items;
}

/* ---------- SCROLL EFFECTS ---------- */
function initScrollEffects() {
    const header = document.querySelector("header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 100) header.classList.add("sticky");
        else header.classList.remove("sticky");
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
}

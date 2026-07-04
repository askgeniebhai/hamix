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

function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.innerHTML = value;
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
    setImage("logoFooter", customer.logo, customer.businessName);

    // Top Bar & Contact
    setText("topEmail", customer.email);
    setText("topPhone", customer.phone);
    setText("topLocation", customer.location.split(',')[0]); // Short location
    setText("contactPhone", customer.phone);
    setText("contactEmail", customer.email);
    setText("contactLocation", customer.location);

    // Hero
    setHTML("heroTitle", customer.heroTitle);
    setText("heroSubtitle", customer.heroSubtitle);
    if (customer.heroImage) {
        document.documentElement.style.setProperty('--hero-bg', `url('${customer.heroImage}')`);
    }

    // About
    setText("aboutBadge", "About " + customer.businessName);
    setText("aboutTitle", customer.aboutTitle);
    setText("aboutText", customer.aboutText);
    renderAboutImages();

    // Mission & Vision
    setText("missionText", customer.mission);
    setText("visionText", customer.vision);

    // WhatsApp
    if (customer.whatsapp) {
        const wa = "https://wa.me/" + customer.whatsapp;
        setLink("heroWhatsapp", wa);
    }

    // Dynamic Renderings
    renderHeroStats(customer.stats || []);
    renderServices(customer.services || []);
    renderIndustries(customer.industries || []);
    renderFeatures(customer.whyChooseUs || []);
    renderAttendance(customer.attendance);
    renderLeadership(customer.leadership || []);
    renderClients(customer.clients || []);

    initScrollEffects();
    initMobileNav();

    // Re-initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

/* ---------- RENDERING ENGINE ---------- */

function renderAboutImages() {
    const container = document.getElementById("aboutImagesContainer");
    if (!container) return;

    let html = `
        <div class="img-large">
            <img src="${customer.aboutImage}" alt="Security Team">
        </div>
    `;

    if (customer.aboutSecondaryImages && customer.aboutSecondaryImages.length > 0) {
        html += `<div class="img-small-wrap">`;
        customer.aboutSecondaryImages.forEach(img => {
            html += `<div class="img-small"><img src="${img}" alt="Secondary"></div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

function renderHeroStats(stats) {
    const container = document.getElementById("heroStatsContainer");
    if (!container) return;
    container.innerHTML = stats.slice(0, 4).map(s => `
        <div class="hero-stat-item">
            <i data-lucide="${s.icon || 'star'}"></i>
            <h3>${s.value}</h3>
            <p>${s.label}</p>
        </div>
    `).join("");
}

function renderServices(services) {
    const container = document.getElementById("servicesContainer");
    if (!container) return;
    container.innerHTML = services.map((s, index) => `
        <div class="service-card-v2 reveal reveal-delay-${(index % 3) + 1}">
            <div class="serv-icon"><i data-lucide="${s.icon || 'shield'}"></i></div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
        </div>
    `).join("");
}

function renderIndustries(industries) {
    const container = document.getElementById("industriesContainer");
    if (!container) return;
    container.innerHTML = industries.map((i, index) => `
        <div class="industry-card-v2 reveal reveal-delay-${(index % 4) + 1}">
            <div class="ind-icon"><i data-lucide="${i.icon || 'building'}"></i></div>
            <h3>${i.name}</h3>
        </div>
    `).join("");
}

function renderFeatures(features) {
    const container = document.getElementById("featuresContainer");
    if (!container) return;
    container.innerHTML = features.map((f, index) => `
        <div class="why-feat-item reveal reveal-delay-${(index % 2) + 1}">
            <div class="why-feat-icon"><i data-lucide="${f.icon || 'check'}"></i></div>
            <div class="why-feat-text">
                <h4>${f.title}</h4>
                <p>${f.description}</p>
            </div>
        </div>
    `).join("");
}

function renderAttendance(attendance) {
    const container = document.getElementById("attendanceContainer");
    if (!container || !attendance) return;

    container.innerHTML = `
        <div class="attendance-content reveal">
            <span class="badge">${attendance.badge}</span>
            <h2>${attendance.title}</h2>
            <p>${attendance.description}</p>
            <div class="attendance-features">
                ${attendance.features.map((f, idx) => `
                    <div class="att-feat reveal reveal-delay-${(idx % 3) + 1}">
                        <div class="att-icon"><i data-lucide="${f.icon}"></i></div>
                        <div class="att-feat-text">
                            <h5>${f.text}</h5>
                            <p>${f.desc || ''}</p>
                        </div>
                    </div>
                `).join("")}
            </div>
            <a href="#contact" class="btn btn-gold">Learn More <i data-lucide="arrow-right"></i></a>
        </div>
        <div class="attendance-visual reveal reveal-delay-1">
            <div class="mockup-container">
                <div class="tech-glow"></div>
                <img src="${attendance.images.main}" class="laptop-mockup" alt="Dashboard">
                <img src="${attendance.images.secondary}" class="mobile-mockup" alt="Mobile App">
            </div>
        </div>
    `;
}

function renderLeadership(leadership) {
    const container = document.getElementById("leadershipContainer");
    if (!container) return;
    container.innerHTML = leadership.map((l, index) => `
        <div class="leader-card-v2 reveal reveal-delay-${(index % 3) + 1}">
            <img src="${l.image}" alt="${l.name}">
            <div class="leader-overlay">
                <p>${l.role}</p>
                <h3>${l.name}</h3>
            </div>
        </div>
    `).join("");
}

function renderClients(clients) {
    const container = document.getElementById("clientsTrack");
    if (!container) return;
    const items = clients.map(c => `<img src="${c.logo}" alt="${c.name}">`).join("");
    // Triple items for smoother seamless loop
    container.innerHTML = items + items + items;
}

/* ---------- MOBILE NAV ---------- */
function initMobileNav() {
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");
    const links = nav.querySelectorAll("a");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        nav.classList.toggle("active");
        toggle.classList.toggle("active");
    });

    links.forEach(link => {
        link.addEventListener("click", () => {
            nav.classList.remove("active");
            toggle.classList.remove("active");
        });
    });
}

/* ---------- SCROLL EFFECTS ---------- */
function initScrollEffects() {
    const header = document.querySelector("header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 100) {
            header.style.padding = "10px 0";
            header.style.background = "rgba(11, 31, 58, 0.98)";
        } else {
            header.style.padding = "20px 0";
            header.style.background = "var(--primary)";
        }
    });

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("active");
                // Re-init lucide if icons are inside reveal
                if (window.lucide) window.lucide.createIcons();
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
}

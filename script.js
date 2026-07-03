/* ==========================================================
   HAMIX V2
   Dynamic Website Engine
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

const customerId =
    params.get("id") || "neela-security-force";

/* ==========================================================
   LOAD CUSTOMER JSON
========================================================== */

async function loadCustomer() {

    try {

        const response = await fetch(
            `customers/${customerId}.json`
        );

        if (!response.ok) {

            throw new Error(
                "Customer JSON not found."
            );

        }

        customer = await response.json();

        console.log("Customer Loaded");

        console.log(customer);

        initializeWebsite();

    }

    catch (error) {

        console.error(error);

        document.body.innerHTML = `
            <div style="
                padding:100px;
                text-align:center;
                font-family:Arial;
            ">
                <h1>HAMIX</h1>
                <h2>Customer Not Found</h2>
                <p>${customerId}</p>
            </div>
        `;

    }

}

/* ==========================================================
   START APPLICATION
========================================================== */

window.addEventListener(
    "DOMContentLoaded",
    loadCustomer
);

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

    document.title =
        (customer.businessName || "HAMIX") +
        " | HAMIX";

    /* ---------- Image Fallbacks ---------- */
    
    // Set fallbacks BEFORE sources are assigned to guarantee trigger safety
    addImageFallback("logo", "https://placeholder.com");
    addImageFallback("heroImage", "https://placeholder.com");

    /* ---------- Header ---------- */

    setText(
        "businessName",
        customer.businessName
    );

    setText(
        "tagline",
        customer.tagline
    );

    /* ---------- Hero ---------- */

    setText(
        "heroTitle",
        customer.heroTitle
    );

    setText(
        "heroSubtitle",
        customer.heroSubtitle
    );

    setImage(
        "logo",
        customer.logo,
        customer.businessName
    );

    setImage(
        "heroImage",
        customer.heroImage,
        customer.businessName
    );

    /* ---------- Contact ---------- */

    setText(
        "phone",
        customer.phone
    );

    setText(
        "location",
        customer.location
    );

    setText(
        "contactPhone",
        customer.phone
    );

    setText(
        "contactLocation",
        customer.location
    );

    setText(
        "footerBusiness",
        customer.businessName
    );

    // Securely fall back or hide email DOM components if not configured
    if (customer.email) {

        setText("email", customer.email);
        setText("contactEmail", customer.email);
        setLink("emailLink", "mailto:" + customer.email);

    } else {

        const emailEl = document.getElementById("email");
        if (emailEl) emailEl.parentElement.style.display = "none";

    }
    
    /* ---------- WhatsApp ---------- */

    if (customer.whatsapp) {

        const whatsappURL =
            "https://wa.me" + customer.whatsapp;

        setLink("heroWhatsapp", whatsappURL);
        setLink("ctaWhatsapp", whatsappURL);
        setLink("topWhatsapp", whatsappURL);
        setLink("contactWhatsapp", whatsappURL);

    }

    /* ---------- Dynamic Services ---------- */
    
    if (customer.services && Array.isArray(customer.services)) {

        renderServices(customer.services);

    }

    /* ---------- Validation ---------- */

    validateCustomer();

    console.log("HAMIX Website Loaded Successfully");

}

/* ==========================================================
   IMAGE FALLBACK
========================================================== */

function addImageFallback(id, fallback = "") {

    const img = document.getElementById(id);

    if (!img) return;

    img.onerror = function () {

        console.warn(id + " image not found.");

        if (fallback) {

            this.src = fallback;

        }

    };

}

/* ==========================================================
   DYNAMIC RENDER HELPERS
========================================================== */

function renderServices(services) {

    const container = document.getElementById("servicesContainer");

    if (!container) return;

    container.innerHTML = services.map(service => `
        <div class="service-card">
            <h3>${service.title || ""}</h3>
            <p>${service.description || ""}</p>
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

// FIXED: Variable name changed to 'siteHeader' to fix the SyntaxError.
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

/* ==========================================================
   VALIDATION
========================================================== */

function validateCustomer() {

    console.log("Customer:", customer);

    const required = [
        "businessName",
        "phone",
        "logo",
        "heroImage"
    ];

    required.forEach(field => {

        if (!customer[field]) {

            console.warn(
                "Missing JSON field:",
                field
            );

        }

    });

}

/* ==========================================================
   APPLICATION READY
========================================================== */

console.log("Navigation Initialized");
console.log("HAMIX Engine Ready");

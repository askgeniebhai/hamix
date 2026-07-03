/* ==========================================================
   HAMIX V2
   SCRIPT PART 1 - FOUNDATION
========================================================== */

"use strict";

/* ---------- URL ---------- */

const params = new URLSearchParams(window.location.search);

const customerId = params.get("id") || "neela-security-force";

/* ---------- CUSTOMER DATA ---------- */

let customer = {};

/* ---------- LOAD JSON ---------- */

async function loadCustomer() {

    try {

        const response = await fetch(`customers/${customerId}.json`);

        if (!response.ok) {

            throw new Error("Customer JSON not found.");

        }

        customer = await response.json();

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

/* ---------- INITIALIZER ---------- */

function initializeWebsite(){

    console.log("Customer Loaded");

}

/* ---------- START ---------- */

window.addEventListener(

    "DOMContentLoaded",

    loadCustomer

);
/* ==========================================================
   SCRIPT PART 2
   POPULATE WEBSITE
========================================================== */

function setText(id, value) {

    const el = document.getElementById(id);

    if (el && value) {

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

function initializeWebsite() {

    /* Browser Title */

    document.title = customer.businessName + " | HAMIX";

    /* Logo */

    setImage(

        "logo",

        customer.logo,

        customer.businessName

    );

    /* Hero Banner */

    setImage(

        "heroImage",

        customer.heroImage,

        customer.businessName

    );

    /* Company Name */

    setText(

        "businessName",

        customer.businessName

    );

    /* Hero Title */

    setText(

        "heroTitle",

        customer.heroTitle

    );

    /* Hero Text */

    setText(

        "heroText",

        customer.heroText

    );

    console.log("Website Populated");

}
/* ==========================================================
   SCRIPT PART 3
   CONTACT & WHATSAPP
========================================================== */

const whatsappUrl = () =>
    customer.whatsapp
        ? `https://wa.me/91${customer.whatsapp}`
        : "#";

/* ---------- CONTACT ---------- */

setText(
    "contactPhone",
    customer.phone
);

setText(
    "contactLocation",
    customer.location || customer.address
);

setText(
    "footerBusiness",
    customer.businessName
);

/* ---------- TOP BAR ---------- */

setText(
    "phone",
    customer.phone
);

setText(
    "location",
    customer.location || customer.address
);

/* ---------- WHATSAPP LINKS ---------- */

setLink(
    "contactWhatsapp",
    whatsappUrl()
);

setLink(
    "ctaWhatsapp",
    whatsappUrl()
);

setLink(
    "topWhatsapp",
    whatsappUrl()
);

/* ---------- OPTIONAL EMAIL ---------- */

setText(
    "email",
    customer.email || ""
);

console.log("Contact information loaded.");
/* ==========================================================
   SCRIPT PART 4
   NAVIGATION & IMAGE FALLBACK
========================================================== */

/* ---------- IMAGE FALLBACK ---------- */

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

addImageFallback("logo");
addImageFallback("heroImage");

/* ---------- SMOOTH SCROLL ---------- */

document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", function (e) {

        const target = document.querySelector(this.getAttribute("href"));

        if (!target) return;

        e.preventDefault();

        target.scrollIntoView({

            behavior: "smooth"

        });

    });

});

/* ---------- STICKY HEADER ---------- */

const header = document.querySelector("header");

window.addEventListener("scroll", () => {

    if (!header) return;

    if (window.scrollY > 60) {

        header.classList.add("sticky");

    } else {

        header.classList.remove("sticky");

    }

});

console.log("Navigation initialized.");
/* ==========================================================
   SCRIPT PART 5
   FINAL INITIALIZATION
========================================================== */

function validateCustomer() {

    const required = [
        "businessName",
        "phone",
        "logo",
        "heroImage"
    ];

    required.forEach(field => {

        if (!customer[field]) {

            console.warn("Missing JSON field:", field);

        }

    });

}

function initializeWebsite() {

    /* ---------- Browser ---------- */

    document.title = customer.businessName
        ? customer.businessName + " | HAMIX"
        : "HAMIX";

    /* ---------- Header ---------- */

    setText("businessName", customer.businessName);
    setText("tagline", customer.tagline);

    /* ---------- Hero ---------- */

    setText("heroTitle", customer.heroTitle);
    setText("heroDescription", customer.heroDescription);

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

    setText("phone", customer.phone);
    setText("location", customer.location);

    setText("contactPhone", customer.phone);
    setText("contactLocation", customer.location);

    setText("footerBusiness", customer.businessName);

    /* ---------- WhatsApp ---------- */

    if (customer.whatsapp) {

        const url =
            "https://wa.me/91" + customer.whatsapp;

        setLink("heroWhatsapp", url);
        setLink("ctaWhatsapp", url);
        setLink("topWhatsapp", url);
        setLink("contactWhatsapp", url);

    }

    validateCustomer();

    console.log("HAMIX Website Loaded Successfully");

}

console.log("HAMIX Engine Ready");
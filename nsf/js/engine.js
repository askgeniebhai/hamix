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
        const response = await fetch(`data/config.json`);
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
                ${attendance.features.map(f => `
                    <div class="att-feat">
                        <div class="att-icon"><i data-lucide="${f.icon}"></i></div>
                        <p>${f.text}</p>
                    </div>
                `).join("")}
            </div>
            <a href="#contact" class="btn btn-gold">Learn More <i data-lucide="arrow-right"></i></a>
        </div>
        <div class="attendance-visual reveal reveal-delay-1">
            <div class="mockup-container">
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
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));
}

/* ==========================================================
   GUARD PORTAL ENGINE
========================================================== */

const PortalEngine = (() => {
    // Initial Employee Data
    const employees = [
        { id: 'NFS-001', name: 'Rajesh Kumar', rank: 'Head Guard', shift: 'Day' },
        { id: 'NFS-002', name: 'Suresh Raina', rank: 'Security Guard', shift: 'Day' },
        { id: 'NFS-003', name: 'Amit Singh', rank: 'Security Guard', shift: 'Night' },
        { id: 'NFS-004', name: 'Vikram Rathore', rank: 'Supervisor', shift: 'Day' },
        { id: 'NFS-005', name: 'Sunil Gavaskar', rank: 'Security Guard', shift: 'Day' },
        { id: 'NFS-006', name: 'Kushal Tandon', rank: 'Security Guard', shift: 'Night' }
    ];

    let attendance = JSON.parse(localStorage.getItem('nfs_attendance')) || [];

    const init = () => {
        const openBtn = document.getElementById('openGuardPortal');
        const closeBtn = document.getElementById('closePortal');
        const portal = document.getElementById('guardPortal');

        if (openBtn) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                portal.classList.add('active');
                renderDashboard();
                if (window.lucide) window.lucide.createIcons();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => portal.classList.remove('active'));
        }

        // Tab Switching
        document.querySelectorAll('.p-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.p-nav-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));

                btn.classList.add('active');
                const tabId = 'p-tab-' + btn.dataset.tab;
                document.getElementById(tabId).classList.add('active');

                if (btn.dataset.tab === 'dashboard') renderDashboard();
                if (btn.dataset.tab === 'attendance') renderAttendanceTab();
                if (btn.dataset.tab === 'history') renderHistory();

                if (window.lucide) window.lucide.createIcons();
            });
        });

        // Search logic
        document.getElementById('p-guard-search')?.addEventListener('input', (e) => {
            renderAttendanceTab(e.target.value);
        });

        // Report Generation
        document.getElementById('btn-gen-report')?.addEventListener('click', generateReport);
        document.getElementById('btn-export-csv')?.addEventListener('click', exportCSV);
    };

    const renderDashboard = () => {
        const today = new Date().toLocaleDateString();
        const todaysLog = attendance.filter(a => a.date === today);

        const presentCount = todaysLog.filter(a => a.status === 'Present').length;
        const absentCount = employees.length - presentCount; // Simplified
        const lateCount = todaysLog.filter(a => a.isLate).length;

        setText('p-stat-total', employees.length);
        setText('p-stat-present', presentCount);
        setText('p-stat-absent', absentCount);
        setText('p-stat-late', lateCount);

        const recentList = document.getElementById('p-recent-list');
        if (recentList) {
            recentList.innerHTML = todaysLog.slice(-5).reverse().map(log => `
                <tr>
                    <td><strong>${log.name}</strong></td>
                    <td>${log.checkIn || '--'}</td>
                    <td>${log.location || 'Main Gate'}</td>
                    <td><span class="p-badge present">Check In</span></td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center; padding: 40px; opacity:0.5;">No activity recorded today.</td></tr>';
        }
    };

    const renderAttendanceTab = (query = '') => {
        const today = new Date().toLocaleDateString();
        document.getElementById('p-current-date').textContent = new Date().toDateString();

        const container = document.getElementById('p-guard-list');
        if (!container) return;

        const filtered = employees.filter(e =>
            e.name.toLowerCase().includes(query.toLowerCase()) ||
            e.id.toLowerCase().includes(query.toLowerCase())
        );

        container.innerHTML = filtered.map(emp => {
            const log = attendance.find(a => a.empId === emp.id && a.date === today);
            const status = log ? log.status : 'Pending';
            const badgeClass = status.toLowerCase();

            return `
                <tr>
                    <td>${emp.id}</td>
                    <td><strong>${emp.name}</strong></td>
                    <td>${emp.rank}</td>
                    <td>${emp.shift}</td>
                    <td><span class="p-badge ${badgeClass}">${status}</span></td>
                    <td>
                        ${!log ? `
                            <button class="p-btn-sm p-btn-in" onclick="PortalEngine.markAttendance('${emp.id}', 'Present')">Mark Present</button>
                            <button class="p-btn-sm" onclick="PortalEngine.markAttendance('${emp.id}', 'Absent')">Absent</button>
                        ` : `
                            ${log.status === 'Present' && !log.checkOut ? `
                                <button class="p-btn-sm p-btn-out" onclick="PortalEngine.markCheckOut('${emp.id}')">Check Out</button>
                            ` : `<span style="font-size:11px; opacity:0.5;">Completed</span>`}
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    };

    const markAttendance = (empId, status) => {
        const emp = employees.find(e => e.id === empId);
        const today = new Date().toLocaleDateString();
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const log = {
            empId,
            name: emp.name,
            date: today,
            status,
            checkIn: status === 'Present' ? now : null,
            checkOut: null,
            location: 'Main Gate',
            isLate: status === 'Present' && parseInt(now.split(':')[0]) > 9 // Assume 9 AM is late
        };

        attendance.push(log);
        save();
        renderAttendanceTab();
    };

    const markCheckOut = (empId) => {
        const today = new Date().toLocaleDateString();
        const log = attendance.find(a => a.empId === empId && a.date === today);
        if (log) {
            log.checkOut = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            save();
            renderAttendanceTab();
        }
    };

    const renderHistory = () => {
        const container = document.getElementById('p-history-list');
        if (!container) return;

        container.innerHTML = attendance.slice().reverse().map(log => `
            <tr>
                <td>${log.date}</td>
                <td><strong>${log.name}</strong></td>
                <td>${log.checkIn || '--'}</td>
                <td>${log.checkOut || '--'}</td>
                <td>${log.location || '--'}</td>
                <td><span class="p-badge ${log.status.toLowerCase()}">${log.status}</span></td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align:center; padding:40px; opacity:0.5;">No history found.</td></tr>';
    };

    const generateReport = () => {
        const monthInput = document.getElementById('p-report-month').value;
        const resultView = document.getElementById('p-report-result');
        if (!monthInput || !resultView) return;

        const [year, month] = monthInput.split('-');
        const reportData = employees.map(emp => {
            const logs = attendance.filter(a => {
                const [d, m, y] = a.date.split('/'); // Assuming DD/MM/YYYY or similar based on locale
                // Simple filter based on locale string - in real app, use Date objects
                return a.empId === emp.id && a.date.includes(`${month}/${year}`);
            });

            return {
                name: emp.name,
                present: logs.filter(l => l.status === 'Present').length,
                absent: logs.filter(l => l.status === 'Absent').length,
                leave: logs.filter(l => l.status === 'Leave').length
            };
        });

        resultView.innerHTML = `
            <h3>Report for ${monthInput}</h3>
            <table class="p-table">
                <thead>
                    <tr><th>Employee</th><th>Present</th><th>Absent</th><th>Leave</th><th>Score</th></tr>
                </thead>
                <tbody>
                    ${reportData.map(r => `
                        <tr>
                            <td><strong>${r.name}</strong></td>
                            <td>${r.present}</td>
                            <td>${r.absent}</td>
                            <td>${r.leave}</td>
                            <td>${Math.round((r.present / (r.present + r.absent || 1)) * 100)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    const exportCSV = () => {
        if (attendance.length === 0) return alert("No data to export");

        let csv = "Date,Employee ID,Name,Status,Check In,Check Out\n";
        attendance.forEach(log => {
            csv += `${log.date},${log.empId},${log.name},${log.status},${log.checkIn || ''},${log.checkOut || ''}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'NSF_Attendance_Report.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const save = () => localStorage.setItem('nfs_attendance', JSON.stringify(attendance));

    return { init, markAttendance, markCheckOut };
})();

window.addEventListener("DOMContentLoaded", () => {
    PortalEngine.init();
});

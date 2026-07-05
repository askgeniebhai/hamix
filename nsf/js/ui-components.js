"use strict";

const UI = (() => {
    const renderSidebar = (activeTab) => {
        const user = AuthService.getCurrentUser() || { role: 'admin' };
        const container = document.querySelector('.sidebar');
        if (!container) return;

        const menuItems = [
            { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard', link: 'dashboard.html' },
            { id: 'live', icon: 'navigation', label: 'Live Tracking', link: 'live.html' },
            { id: 'attendance', icon: 'calendar', label: 'Attendance Log', link: 'attendance.html' },
            { id: 'payroll', icon: 'banknote', label: 'Payroll', link: 'payroll.html' },
            { id: 'reports', icon: 'file-text', label: 'Reports', link: 'reports.html' },
            { id: 'settings', icon: 'settings', label: 'System Settings', link: 'settings.html' }
        ];

        container.innerHTML = `
            <div class="sidebar-header">
                <img src="../assets/images/logo.png" alt="Logo">
                <p style="font-size: 10px; color: #D4AF37; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Admin Console</p>
            </div>
            <div class="sidebar-menu">
                ${menuItems.map(item => `
                    <a href="${item.link}" class="menu-link ${activeTab === item.id ? 'active' : ''}">
                        <i data-lucide="${item.icon}"></i> ${item.label}
                    </a>
                `).join('')}
            </div>
            <div style="padding: 20px;">
                <button onclick="AuthService.logout()" class="menu-link" style="background: none; border: none; width: 100%; text-align: left; cursor: pointer; color: rgba(255,255,255,0.7);">
                    <i data-lucide="log-out"></i> Logout
                </button>
            </div>
        `;
        lucide.createIcons();
    };

    const renderTopNav = (title) => {
        const user = AuthService.getCurrentUser();
        const container = document.querySelector('.top-nav');
        if (!container) return;

        container.innerHTML = `
            <h2 style="font-size: 18px; color: #0B1F3A;">${title}</h2>
            <div style="display: flex; align-items: center; gap: 20px;">
                <div id="admin-notifs" style="position: relative; cursor: pointer;">
                    <i data-lucide="bell" style="color: #64748b;"></i>
                    <span id="notif-count" style="display:none; position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; font-size: 9px; padding: 2px 5px; border-radius: 10px; font-weight: 700;">0</span>
                </div>
                <div style="text-align: right;">
                    <p style="font-weight: 600; font-size: 14px; margin: 0;">${user ? user.name : 'Administrator'}</p>
                    <p style="font-size: 11px; color: #64748b; margin: 0; text-transform: capitalize;">${user ? user.role : 'System Admin'}</p>
                </div>
            </div>
        `;

        // Load notification count
        const alerts = JSON.parse(localStorage.getItem('nsf_admin_alerts')) || [];
        if (alerts.length > 0) {
            const countEl = document.getElementById('notif-count');
            countEl.textContent = alerts.length;
            countEl.style.display = 'block';
        }

        lucide.createIcons();
    };

    return { renderSidebar, renderTopNav };
})();

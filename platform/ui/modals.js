/**
 * HAMIX CRM UI - Modal Components
 */

const Modals = {
    closeAll: () => {
        const modals = document.querySelectorAll('.preview-modal, .history-modal, .ops-modal, .review-modal');
        modals.forEach(m => m.remove());
    },

    openPreview: (id, html, index) => {
        const customer = window.HAMIX_Operations.getCustomer(id);
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-modal-header">
                <h3>Website Preview: ${customer.businessName}</h3>
                <div class="header-actions">
                    <div class="theme-selector">
                        <select onchange="window.updatePreviewTheme(this.value, ${index})">
                            <option value="Indigo">Indigo Theme</option>
                            <option value="Emerald">Emerald Theme</option>
                            <option value="Slate">Slate Theme</option>
                            <option value="Rose">Rose Theme</option>
                        </select>
                    </div>
                    <button onclick="window.HAMIX_Modals.closeAll()" class="btn-close"><i data-lucide="x"></i></button>
                </div>
            </div>
            <div class="preview-iframe-container">
                <iframe id="previewIframe"></iframe>
            </div>
        `;
        document.body.appendChild(modal);

        const iframe = document.getElementById('previewIframe');
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(html);
        iframe.contentWindow.document.close();
        if (window.lucide) lucide.createIcons();
    },

    openReview: (id) => {
        const customer = window.HAMIX_Operations.getCustomer(id);
        if (!customer) return;

        const modal = document.createElement('div');
        modal.className = 'review-modal';
        modal.innerHTML = `
            <div class="preview-modal-header">
                <h3>Final Review & Approval: ${customer.businessName}</h3>
                <button onclick="window.HAMIX_Modals.closeAll()" class="btn-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body" style="padding: 24px; max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 350px 1fr 350px; gap: 24px;">
                <div class="review-sidebar">
                    <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 24px;">
                        <h4>Business Summary</h4>
                        <p style="font-size: 13px; color: var(--text-muted); margin-top: 8px;">${customer.aiContent?.summary || 'Generating summary...'}</p>
                        <div style="margin-top: 16px; display: flex; gap: 12px;">
                            <div style="flex: 1; text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px;">
                                <strong style="display: block; font-size: 18px; color: var(--primary-color)">${customer.opportunityScore}%</strong>
                                <span style="font-size: 9px; text-transform: uppercase; color: var(--text-muted)">Opp Score</span>
                            </div>
                            <div style="flex: 1; text-align: center; background: #f8fafc; padding: 10px; border-radius: 8px;">
                                <strong style="display: block; font-size: 18px; color: #10b981">${customer.aiConfidenceScore}%</strong>
                                <span style="font-size: 9px; text-transform: uppercase; color: var(--text-muted)">AI Conf</span>
                            </div>
                        </div>
                    </div>
                    <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 24px;">
                        <h4>AI Recommendations</h4>
                        <ul style="font-size: 12px; margin-top: 12px; padding-left: 16px; color: var(--text-muted)">
                            ${(customer.aiRecommendations || []).map(r => `<li>${r}</li>`).join('') || '<li>No specific recommendations.</li>'}
                        </ul>
                    </div>
                </div>
                <div class="review-main">
                    <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; height: 100%; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h4>Generated Homepage</h4>
                            <a href="${customer.liveWebsiteUrl}" target="_blank" class="btn btn-outline btn-sm"><i data-lucide="external-link"></i> View Live</a>
                        </div>
                        <div style="flex: 1; background: #f1f5f9; border-radius: 8px; position: relative; overflow: hidden; border: 1px solid #e2e8f0;">
                             <iframe srcdoc="${customer.generatedHtml?.replace(/"/g, '&quot;')}" style="width: 200%; height: 200%; transform: scale(0.5); transform-origin: top left; border: none;"></iframe>
                             <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: pointer;" onclick="window.previewWebsiteById('${customer.id}')"></div>
                        </div>
                    </div>
                </div>
                <div class="review-sidebar">
                    <div class="card" style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 12px; height: 100%;">
                        <h4>Personalized Outreach</h4>
                        <div class="form-group">
                            <label>Target Phone</label>
                            <input type="text" value="${customer.phone || ''}" id="reviewPhone">
                        </div>
                        <div class="form-group">
                            <label>WhatsApp Message</label>
                            <textarea id="reviewMessage" rows="12" style="font-family: inherit; resize: none; line-height: 1.5; font-size: 13px;">${customer.aiContent?.outreach?.whatsapp || ''}</textarea>
                        </div>
                        <button class="btn btn-primary" style="justify-content: center; width: 100%;" onclick="window.approveAndSend('${customer.id}')">Approve & Send</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    openOperations: (id) => {
        const customer = window.HAMIX_Operations.getCustomer(id);
        if (!customer) return;

        const modal = document.createElement('div');
        modal.className = 'ops-modal';
        modal.innerHTML = `
            <div class="preview-modal-header">
                <h3>Website Operations: ${customer.businessName}</h3>
                <button onclick="window.HAMIX_Modals.closeAll()" class="btn-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body" style="padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div class="ops-section">
                    <h4>Management</h4>
                    <div class="ops-btn-group">
                        <button class="btn btn-outline" onclick="window.cloneCust('${customer.id}')"><i data-lucide="copy"></i> Clone Website</button>
                        <button class="btn btn-outline" onclick="window.exportCust('${customer.id}')"><i data-lucide="download"></i> Export Package</button>
                        <button class="btn btn-outline" onclick="window.createBackup('${customer.id}')"><i data-lucide="database"></i> Create Backup</button>
                        <button class="btn btn-outline" onclick="window.archiveWebsite('${customer.id}')"><i data-lucide="archive"></i> Archive Website</button>
                    </div>
                    <h4 style="margin-top: 24px;">SEO & Metadata</h4>
                    <div class="form-group">
                        <label>SEO Title</label>
                        <input type="text" value="${customer.seoTitle || ''}" placeholder="Meta Title">
                    </div>
                    <div class="form-group">
                        <label>SEO Description</label>
                        <textarea placeholder="Meta Description">${customer.seoDescription || ''}</textarea>
                    </div>
                </div>
                <div class="ops-section">
                    <h4>Domain & SSL</h4>
                    <div class="status-list">
                        <div class="status-item"><span>Custom Domain</span><span class="badge badge-muted">Not Connected</span></div>
                        <div class="status-item"><span>SSL Certificate</span><span class="badge badge-muted">Inactive</span></div>
                    </div>
                    <h4 style="margin-top: 24px;">Analytics Overview</h4>
                    <div class="mini-stats">
                        <div class="mini-stat"><strong>${customer.stats?.visitors || 0}</strong><span>Visitors</span></div>
                        <div class="mini-stat"><strong>${customer.stats?.leads || 0}</strong><span>Leads</span></div>
                        <div class="mini-stat"><strong>${customer.stats?.conversions || 0}</strong><span>Conversions</span></div>
                    </div>
                    <h4 style="margin-top: 24px;">Deployment History</h4>
                    <div class="mini-history">
                        ${(customer.history || []).slice(0, 3).map(h => `
                            <div class="history-item"><span>${h.stage}</span><span>${new Date(h.timestamp).toLocaleDateString()}</span></div>
                        `).join('') || 'No history yet.'}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    openHistory: (id) => {
        const customer = window.HAMIX_Operations.getCustomer(id);
        if (!customer) return;

        const modal = document.createElement('div');
        modal.className = 'history-modal';
        modal.innerHTML = `
            <div class="preview-modal-header">
                <h3>Version History: ${customer.businessName}</h3>
                <button onclick="window.HAMIX_Modals.closeAll()" class="btn-close"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body" style="padding: 24px;">
                <div class="data-table-container">
                    <table class="data-table">
                        <thead><tr><th>Ver</th><th>Date</th><th>Status</th><th>Theme</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${(customer.versions || []).map(v => `
                                <tr>
                                    <td><strong>v${v.version}</strong></td>
                                    <td><span style="font-size: 11px;">${new Date(v.timestamp).toLocaleString()}</span></td>
                                    <td><span class="badge badge-${v.status.toLowerCase()}">${v.status}</span></td>
                                    <td>${v.theme}</td>
                                    <td><button class="btn btn-primary btn-sm" onclick="window.rollback('${customer.id}', ${v.version})">Rollback</button></td>
                                </tr>
                            `).join('') || '<tr><td colspan="5" style="text-align:center">No version history found.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Modals;
} else {
    window.HAMIX_Modals = Modals;
}

/**
 * HAMIX Operations Layer
 * Manages publishing, versions, deployments, and website lifecycle.
 */

const OperationsManager = {
    // Simulated deployment queue
    deploymentQueue: [],
    isProcessingQueue: false,

    /**
     * Publishes or updates a customer website.
     * @param {Object} customer - The customer object.
     * @returns {Promise}
     */
    async publishWebsite(customer) {
        console.log(`Operations: Publishing ${customer.businessName}`);

        // 1. Create a version before publishing
        this.createVersion(customer);

        // 2. Add to deployment queue
        return this.queueDeployment(customer, 'Publish');
    },

    /**
     * Unpublishes (takes offline) a website.
     */
    async unpublishWebsite(customer) {
        customer.status = 'Offline';
        customer.isPublished = false;
        this.saveCustomer(customer);
        if (window.HAMIX_Admin) window.HAMIX_Admin.logActivity('Admin User', 'Took website offline', customer.businessName);
        this.notifyUI(customer);
    },

    /**
     * Archives a website and its customer record.
     */
    async archiveWebsite(customer) {
        customer.status = 'Archived';
        customer.isArchived = true;
        this.saveCustomer(customer);
        if (window.HAMIX_Admin) window.HAMIX_Admin.logActivity('Admin User', 'Archived customer', customer.businessName);
        this.notifyUI(customer);
    },

    /**
     * Deletes a customer and their website data.
     */
    async deleteCustomer(customerId) {
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        const customer = customers.find(c => c.id === customerId);
        const filtered = customers.filter(c => c.id !== customerId);
        localStorage.setItem('hamix_customers', JSON.stringify(filtered));

        if (customer && window.HAMIX_Admin) {
            window.HAMIX_Admin.logActivity('Admin User', 'Deleted customer record', customer.businessName);
        }

        // Notify UI to re-render
        window.dispatchEvent(new CustomEvent('hamix:workflow-update', { detail: { type: 'delete' } }));
    },

    /**
     * Creates a new version entry for the customer website.
     */
    createVersion(customer) {
        if (!customer.versions) customer.versions = [];

        const versionNumber = customer.versions.length + 1;
        const version = {
            version: versionNumber,
            timestamp: new Date().toISOString(),
            status: 'Draft',
            theme: customer.themeId || 'Indigo',
            template: customer.templateId || 'Default',
            // In a real system, we'd store the actual HTML/Assets or a pointer to them
            metadata: {
                publishedBy: 'Admin',
                changeLog: versionNumber === 1 ? 'Initial Release' : 'Content Update'
            }
        };

        customer.versions.unshift(version); // Latest first
        customer.currentVersion = versionNumber;
        this.saveCustomer(customer);
    },

    /**
     * Rolls back to a specific version.
     */
    async rollbackToVersion(customer, versionNumber) {
        const version = customer.versions.find(v => v.version === versionNumber);
        if (!version) return;

        console.log(`Operations: Rolling back ${customer.businessName} to version ${versionNumber}`);

        // In a real system, we would restore the customer.json/data state from the version backup
        // For this prototype, we'll log the restore and re-publish.
        if (window.HAMIX_Admin) window.HAMIX_Admin.logActivity('Admin User', `Restored website from v${versionNumber}`, customer.businessName);

        customer.status = 'Updated';
        await this.publishWebsite(customer);
    },

    /**
     * Clones/Duplicates a website and customer record.
     */
    async cloneWebsite(customer) {
        console.log(`Operations: Cloning ${customer.businessName}`);

        const newCustomer = JSON.parse(JSON.stringify(customer));
        newCustomer.id = `cust_${Date.now()}`;
        newCustomer.businessName = `${customer.businessName} (Copy)`;
        newCustomer.status = 'Ready for Publishing';
        newCustomer.isPublished = false;
        newCustomer.lastPublished = null;
        newCustomer.versions = [];
        newCustomer.history = [{
            stage: 'Cloned',
            timestamp: new Date().toISOString(),
            from: customer.id
        }];

        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        customers.push(newCustomer);
        localStorage.setItem('hamix_customers', JSON.stringify(customers));

        if (window.HAMIX_Admin) window.HAMIX_Admin.logActivity('Admin User', 'Cloned website/customer', newCustomer.businessName);

        this.notifyUI();
        return newCustomer;
    },

    /**
     * Prepares an export package (JSON based for this layer).
     */
    async exportWebsite(customer) {
        const data = {
            exportDate: new Date().toISOString(),
            version: customer.currentVersion,
            customerData: customer,
            platform: 'HAMIX v0.4'
        };

        if (window.HAMIX_Admin) window.HAMIX_Admin.logActivity('Admin User', 'Exported website data package', customer.businessName);
        return data;
    },

    /**
     * Imports businesses from Google Maps data.
     * @param {Array} businessList - Array of raw business records.
     */
    async importFromGoogleMaps(businessList) {
        console.log(`Operations: Importing ${businessList.length} businesses from Google Maps...`);
        const leads = JSON.parse(localStorage.getItem('hamix_leads') || '[]');
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');

        let importedCount = 0;
        let duplicateCount = 0;

        for (const raw of businessList) {
            // 1. Validate & De-duplicate (Robust check)
            if (!raw.businessName) continue;

            const isDuplicate = leads.some(l => l.businessName.toLowerCase() === raw.businessName.toLowerCase()) ||
                               customers.some(c => c.businessName.toLowerCase() === raw.businessName.toLowerCase());

            if (isDuplicate) {
                duplicateCount++;
                continue;
            }

            // 2. Create Lead Record with full original context
            const lead = {
                id: `lead_gmaps_${Date.now()}_${importedCount}`,
                businessName: raw.businessName,
                category: raw.category || 'Local Business',
                phone: raw.phone || '',
                website: raw.website || '',
                address: raw.address || '',
                rating: raw.rating || 0,
                reviews: raw.reviews || 0,
                status: 'Lead',
                source: 'Google Maps Import',
                originalData: { ...raw }, // Ensure immutable copy
                metadata: {
                    importTimestamp: new Date().toISOString(),
                    engineVersion: '1.0'
                },
                createdAt: new Date().toISOString()
            };

            leads.push(lead);
            importedCount++;

            // 3. Immediate AI Processing Pipeline (Automatic)
            // We'll process them in the background so the UI doesn't lock
            setTimeout(() => {
                const leadIndex = leads.findIndex(l => l.id === lead.id);
                if (window.HAMIX_Workflow && leadIndex !== -1) {
                    // Start conversion automatically
                    window.convertLead(leadIndex);
                }
            }, 500);
        }

        localStorage.setItem('hamix_leads', JSON.stringify(leads));

        if (window.HAMIX_Admin) {
            window.HAMIX_Admin.logActivity('System', `Imported ${importedCount} leads from Google Maps (${duplicateCount} duplicates skipped)`, 'Google Maps Engine');
        }

        this.notifyUI();
        return { imported: importedCount, duplicates: duplicateCount };
    },

    /**
     * Imports a website from a data package.
     */
    async importWebsite(dataPackage) {
        const customer = dataPackage.customerData;
        customer.id = `cust_import_${Date.now()}`;
        customer.status = 'Ready for Publishing';

        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        customers.push(customer);
        localStorage.setItem('hamix_customers', JSON.stringify(customers));

        if (window.HAMIX_Admin) window.HAMIX_Admin.logActivity('Admin User', 'Imported website data package', customer.businessName);
        this.notifyUI();
    },

    /**
     * Adds a job to the deployment queue.
     */
    queueDeployment(customer, type) {
        const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const job = {
            id: jobId,
            customerId: customer.id,
            businessName: customer.businessName,
            type: type, // 'Publish', 'Update', 'Republish'
            status: 'Pending',
            progress: 0,
            startTime: new Date().toISOString(),
            logs: []
        };

        this.deploymentQueue.push(job);
        this.addLog(job, `Deployment job ${type} created.`);

        this.processQueue();
        return job;
    },

    /**
     * Processes the deployment queue sequentially.
     */
    async processQueue() {
        if (this.isProcessingQueue || this.deploymentQueue.length === 0) return;
        this.isProcessingQueue = true;

        while (this.deploymentQueue.length > 0) {
            const job = this.deploymentQueue.find(j => j.status === 'Pending' || j.status === 'Retrying');
            if (!job) break;

            await this.executeDeployment(job);
        }

        this.isProcessingQueue = false;
    },

    /**
     * Executes a single deployment job.
     */
    async executeDeployment(job) {
        job.status = 'Processing';
        this.addLog(job, 'Starting deployment process...');
        this.notifyUI();

        try {
            const customer = this.getCustomer(job.customerId);
            if (!customer) throw new Error('Customer not found');

            // Simulate steps
            const steps = [
                { p: 20, m: 'Generating website assets...' },
                { p: 40, m: 'Optimizing images...' },
                { p: 60, m: 'Uploading to edge servers...' },
                { p: 80, m: 'Configuring DNS and SSL...' },
                { p: 100, m: 'Clearing CDN cache...' }
            ];

            for (const step of steps) {
                await new Promise(r => setTimeout(r, 600)); // Simulate work
                job.progress = step.p;
                this.addLog(job, step.m);
                this.notifyUI();
            }

            job.status = 'Completed';
            job.endTime = new Date().toISOString();
            this.addLog(job, 'Deployment successful.');

            if (window.HAMIX_Admin) {
                window.HAMIX_Admin.logActivity('System', `Successfully ${job.type === 'Publish' ? 'published' : 'updated'} website`, job.businessName);
            }

            // Update customer record
            customer.status = job.type === 'Publish' ? 'Published' : 'Updated';
            customer.isPublished = true;
            customer.lastPublished = job.endTime;
            if (customer.versions && customer.versions.length > 0) {
                customer.versions[0].status = 'Published';
            }

            this.saveCustomer(customer);
            this.notifyUI(customer);

        } catch (error) {
            job.status = 'Error';
            job.error = error.message;
            this.addLog(job, `Error: ${error.message}`);
            this.notifyUI();
        }
    },

    /**
     * Retries a failed deployment.
     */
    retryDeployment(jobId) {
        const job = this.deploymentQueue.find(j => j.id === jobId);
        if (job && job.status === 'Error') {
            job.status = 'Retrying';
            job.progress = 0;
            this.addLog(job, 'Restarting failed deployment...');
            this.processQueue();
        }
    },

    // Helper: Get customer by ID
    getCustomer(id) {
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        return customers.find(c => c.id === id);
    },

    // Helper: Save customer
    saveCustomer(customer) {
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        const index = customers.findIndex(c => c.id === customer.id);
        if (index !== -1) {
            customers[index] = customer;
            localStorage.setItem('hamix_customers', JSON.stringify(customers));
        }
    },

    // Helper: Add log to job
    addLog(job, message) {
        job.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
    },

    // Helper: Notify UI
    notifyUI(customer = null) {
        window.dispatchEvent(new CustomEvent('hamix:operations-update', {
            detail: { jobQueue: this.deploymentQueue, customer }
        }));
        // Also trigger workflow update for general refreshes
        window.dispatchEvent(new CustomEvent('hamix:workflow-update', { detail: { customer } }));
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OperationsManager;
} else {
    window.HAMIX_Operations = OperationsManager;
}

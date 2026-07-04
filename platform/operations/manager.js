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
        this.notifyUI(customer);
    },

    /**
     * Archives a website and its customer record.
     */
    async archiveWebsite(customer) {
        customer.status = 'Archived';
        customer.isArchived = true;
        this.saveCustomer(customer);
        this.notifyUI(customer);
    },

    /**
     * Deletes a customer and their website data.
     */
    async deleteCustomer(customerId) {
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        const filtered = customers.filter(c => c.id !== customerId);
        localStorage.setItem('hamix_customers', JSON.stringify(filtered));

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

        // Update customer data based on version metadata if applicable
        // For now, we'll just trigger a republish of that state
        customer.status = 'Updated';
        await this.publishWebsite(customer);
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

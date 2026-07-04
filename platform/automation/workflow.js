/**
 * HAMIX Automation Engine
 * Coordinates the movement of a customer through the platform stages.
 */

const WorkflowEngine = {
    STAGES: {
        LEAD: 'Lead',
        CUSTOMER: 'Customer',
        AI_PROCESSING: 'AI Processing',
        GENERATION: 'Website Generation',
        DEPLOYMENT: 'Deployment Package',
        PUBLISHING: 'Ready for Publishing'
    },

    /**
     * Moves a customer to the next stage and triggers associated tasks.
     * @param {Object} customer - The customer object.
     * @param {String} targetStage - The stage to move to.
     * @returns {Promise<Object>} - Updated customer object.
     */
    async transitionTo(customer, targetStage) {
        console.log(`Workflow: Transitioning ${customer.businessName} to ${targetStage}`);

        customer.status = targetStage;
        customer.updatedAt = new Date().toISOString();

        // Add to history
        if (!customer.history) customer.history = [];
        customer.history.push({
            stage: targetStage,
            timestamp: customer.updatedAt
        });

        // Trigger background processing based on stage
        this.processStage(customer, targetStage);

        return customer;
    },

    /**
     * Processes tasks for a specific stage.
     * @param {Object} customer - The customer object.
     * @param {String} stage - The current stage.
     */
    async processStage(customer, stage) {
        switch (stage) {
            case this.STAGES.CUSTOMER:
                // When becoming a customer, automatically start AI processing
                await this.transitionTo(customer, this.STAGES.AI_PROCESSING);
                break;

            case this.STAGES.AI_PROCESSING:
                // Trigger AI content generation
                if (window.HAMIX_AI) {
                    await window.HAMIX_AI.processCustomer(customer);
                    await this.transitionTo(customer, this.STAGES.GENERATION);
                }
                break;

            case this.STAGES.GENERATION:
                // Trigger Website generation
                if (window.HAMIX_Engine) {
                    const html = window.HAMIX_Engine.generateWebsite(customer);
                    customer.generatedHtml = html; // Store or cache
                    await this.transitionTo(customer, this.STAGES.DEPLOYMENT);
                }
                break;

            case this.STAGES.DEPLOYMENT:
                // Trigger Deployment package preparation
                if (window.HAMIX_Deployment) {
                    const pkg = window.HAMIX_Deployment.prepareDeployment(customer, customer.generatedHtml);
                    customer.deploymentPackage = pkg;
                    await this.transitionTo(customer, this.STAGES.PUBLISHING);
                }
                break;
        }

        // Save updated customer to storage
        this.saveCustomer(customer);

        // Notify UI if possible (via custom event)
        const event = new CustomEvent('hamix:workflow-update', { detail: { customer } });
        window.dispatchEvent(event);
    },

    /**
     * Saves the customer back to localStorage.
     */
    saveCustomer(customer) {
        const customers = JSON.parse(localStorage.getItem('hamix_customers') || '[]');
        const index = customers.findIndex(c => c.id === customer.id || c.businessName === customer.businessName);

        if (index !== -1) {
            customers[index] = customer;
        } else {
            customers.push(customer);
        }

        localStorage.setItem('hamix_customers', JSON.stringify(customers));
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkflowEngine;
} else {
    window.HAMIX_Workflow = WorkflowEngine;
}

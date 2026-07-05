/**
 * HAMIX Platform - Acquisition Service
 * Modular lead import engine supporting multiple connectors
 */

const AcquisitionService = (() => {
    const connectors = {};

    /**
     * Register a new lead source connector
     */
    const registerConnector = (id, handler) => {
        connectors[id] = handler;
        console.log(`Connector registered: ${id}`);
    };

    /**
     * Process an import from a specific source
     */
    const importFromSource = async (sourceId, rawData, options = {}) => {
        if (!connectors[sourceId]) {
            throw new Error(`Unsupported lead source: ${sourceId}`);
        }

        const rawLeads = await connectors[sourceId](rawData, options);

        // Add metadata to every raw lead
        const batchId = 'batch_' + Date.now();
        return rawLeads.map(lead => ({
            ...lead,
            importSource: sourceId,
            importBatch: batchId,
            importDate: new Date().toISOString(),
            importedBy: 'Admin',
            originalRawData: JSON.stringify(lead)
        }));
    };

    // --- Default Connectors ---

    // Manual Entry Connector
    registerConnector('manual', (data) => [data]);

    // CSV Connector
    registerConnector('csv', (data, options) => {
        const { mapping } = options;
        return data.map(row => {
            const lead = {};
            for (const [leadField, csvField] of Object.entries(mapping)) {
                lead[leadField] = row[csvField];
            }
            return lead;
        });
    });

    // Clipboard / Plain Text Connector
    registerConnector('clipboard', (text) => {
        // Logic for phone number lists or search copy/paste
        const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
        const phones = text.match(phoneRegex) || [];

        return phones.map(p => ({
            businessName: 'Prospect (' + p + ')',
            phone: p,
            notes: 'Extracted from Clipboard'
        }));
    });

    // Google Maps Connector (Refactored from old leadEngine)
    registerConnector('gmaps', (rawData) => {
        const lines = rawData.split('\n').map(l => l.trim()).filter(l => l !== '');
        if (lines.length === 0) return [];

        const lead = { businessName: lines[0] };
        lines.forEach(line => {
            if (line.includes('stars')) lead.rating = parseFloat(line);
            if (/\d{3}-\d{3}-\d{4}/.test(line)) lead.phone = line;
            if (line.startsWith('http')) lead.website = line;
            if (line.includes(',') && /\d{5}/.test(line)) lead.address = line;
        });
        return [lead];
    });

    // OCR Connector Simulation
    registerConnector('ocr', (imageData) => {
        // In a real app, this would call an AI OCR API
        // For now, we simulate extraction
        return [{
            businessName: 'OCR Extracted Business',
            phone: '555-OCR-123',
            notes: 'AI OCR Extraction'
        }];
    });

    return {
        registerConnector,
        importFromSource,
        getAvailableConnectors: () => Object.keys(connectors)
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AcquisitionService;
}

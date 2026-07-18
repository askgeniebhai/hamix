/**
 * HAMIX Platform - API Service
 * Shared fetch wrapper for the server-backed HAMIX API.
 */

const ApiService = (() => {
    const request = async (path, options = {}) => {
        const response = await fetch(path, {
            credentials: 'include',
            headers: {
                'content-type': 'application/json',
                ...(options.headers || {})
            },
            ...options,
            body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'HAMIX API request failed.');
        return payload;
    };

    return {
        request,
        get: (path) => request(path),
        post: (path, body) => request(path, { method: 'POST', body }),
        delete: (path) => request(path, { method: 'DELETE' })
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
} else {
    window.ApiService = ApiService;
}

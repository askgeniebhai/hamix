/**
 * HAMIX Platform - API Service
 * Shared fetch wrapper for the server-backed HAMIX API.
 */

const ApiService = (() => {
    const configuredBase = () => (
        window.HAMIX_API_BASE_URL ||
        document.querySelector('meta[name=\"hamix-api-base\"]')?.content ||
        localStorage.getItem('hamix_api_base_url') ||
        ''
    ).replace(/\/$/, '');

    const urlFor = (path) => {
        if (/^https?:\/\//i.test(path)) return path;
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${configuredBase()}${cleanPath}`;
    };

    const request = async (path, options = {}) => {
        const response = await fetch(urlFor(path), {
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
        urlFor,
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

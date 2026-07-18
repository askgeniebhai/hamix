/**
 * HAMIX Platform - Client Auth Service
 * Provides a local authenticated workspace boundary for the static platform.
 * Production deployments should replace this adapter with a server-backed provider
 * while keeping the same session and tenant contract.
 */

const AuthService = (() => {
    const useBackend = () => window.ApiService && window.location.protocol !== 'file:';
    let currentSession = null;

    const normalizeBackendUser = (user) => ({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        backend: true
    });

    const KEYS = {
        USERS: 'hamix_auth_users',
        SESSION: 'hamix_auth_session'
    };

    const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

    const slugifyTenant = (name, email) => {
        const source = name || email || 'workspace';
        const slug = String(source).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return slug || `workspace-${Date.now()}`;
    };

    const readUsers = () => {
        const data = localStorage.getItem(KEYS.USERS);
        return data ? JSON.parse(data) : [];
    };

    const writeUsers = (users) => {
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    };

    const hashPassword = async (password, salt) => {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(`${salt}:${password}`);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const createSession = (user) => {
        const session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId,
            tenantName: user.tenantName,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
        return session;
    };

    const getSession = () => {
        if (currentSession) return currentSession;
        const data = localStorage.getItem(KEYS.SESSION);
        if (!data) return null;
        const session = JSON.parse(data);
        return session && session.userId && session.tenantId ? session : null;
    };

    const refreshSession = async () => {
        if (!useBackend()) return getSession();
        try {
            const response = await ApiService.get('/api/session');
            currentSession = normalizeBackendUser(response.user);
            localStorage.setItem(KEYS.SESSION, JSON.stringify(currentSession));
            return currentSession;
        } catch {
            currentSession = null;
            localStorage.removeItem(KEYS.SESSION);
            return null;
        }
    };

    const register = async ({ name, email, password, tenantName }) => {
        if (useBackend()) {
            const response = await ApiService.post('/api/auth/register', { name, email, password, tenantName });
            currentSession = normalizeBackendUser(response.user);
            localStorage.setItem(KEYS.SESSION, JSON.stringify(currentSession));
            return currentSession;
        }

        const cleanEmail = normalizeEmail(email);
        if (!name || !cleanEmail || !password || password.length < 8) {
            throw new Error('Name, valid email, and an 8+ character password are required.');
        }

        const users = readUsers();
        if (users.some(user => user.email === cleanEmail)) {
            throw new Error('An account already exists for this email.');
        }

        const tenantId = `tenant_${slugifyTenant(tenantName || name, cleanEmail)}`;
        const salt = crypto.randomUUID();
        const user = {
            id: `user_${Date.now()}`,
            email: cleanEmail,
            name: String(name).trim(),
            role: 'Owner',
            tenantId,
            tenantName: String(tenantName || `${name}'s Workspace`).trim(),
            passwordSalt: salt,
            passwordHash: await hashPassword(password, salt),
            createdAt: new Date().toISOString()
        };

        users.push(user);
        writeUsers(users);
        return createSession(user);
    };

    const login = async ({ email, password }) => {
        if (useBackend()) {
            const response = await ApiService.post('/api/auth/login', { email, password });
            currentSession = normalizeBackendUser(response.user);
            localStorage.setItem(KEYS.SESSION, JSON.stringify(currentSession));
            return currentSession;
        }

        const cleanEmail = normalizeEmail(email);
        const users = readUsers();
        const user = users.find(candidate => candidate.email === cleanEmail);
        if (!user) throw new Error('No HAMIX account was found for this email.');

        const passwordHash = await hashPassword(password, user.passwordSalt);
        if (passwordHash !== user.passwordHash) throw new Error('Incorrect password.');

        return createSession(user);
    };

    const logout = async () => {
        if (useBackend()) {
            await ApiService.post('/api/auth/logout', {});
        }
        currentSession = null;
        localStorage.removeItem(KEYS.SESSION);
    };

    const requireSession = () => {
        const session = getSession();
        if (!session) throw new Error('Authentication required.');
        return session;
    };

    return {
        getSession,
        register,
        login,
        logout,
        refreshSession,
        requireSession,
        isAuthenticated: () => Boolean(getSession())
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthService;
} else {
    window.AuthService = AuthService;
}

"use strict";

const AuthService = (() => {
    const login = (role, username, password) => {
        // Mock authentication logic
        console.log(`Attempting login for role: ${role}, user: ${username}`);

        const user = {
            id: username,
            role: role,
            name: username === 'NFS-9921' ? 'John Smith' : 'Authorized User',
            loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('nsf_user', JSON.stringify(user));

        // Redirection based on role
        switch(role) {
            case 'guard':
                window.location.href = 'guard/dashboard.html';
                break;
            case 'supervisor':
                window.location.href = 'supervisor/dashboard.html';
                break;
            case 'admin':
                window.location.href = 'admin/dashboard.html';
                break;
            case 'client':
                window.location.href = 'client/dashboard.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    };

    const logout = () => {
        localStorage.removeItem('nsf_user');
        window.location.href = '../login.html';
    };

    const getCurrentUser = () => {
        return JSON.parse(localStorage.getItem('nsf_user'));
    };

    const checkAuth = (requiredRole) => {
        const user = getCurrentUser();
        if (!user) {
            window.location.href = '../login.html';
            return null;
        }
        if (requiredRole && user.role !== requiredRole) {
            window.location.href = '../login.html';
            return null;
        }
        return user;
    };

    return { login, logout, getCurrentUser, checkAuth };
})();

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const role = document.getElementById('role').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        AuthService.login(role, username, password);
    });
}

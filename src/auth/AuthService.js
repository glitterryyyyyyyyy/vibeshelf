// src/auth/AuthService.js
import API_BASE_URL from '../config';

const TOKEN_KEY = 'userToken';
const USER_DATA_KEY = 'userData';

const AuthService = {
    async signup(username, email, password) {
        let response;
        let data = '';

        try {
            response = await fetch(`${API_BASE_URL}/api/users/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            data = await response.text();
            if (!response.ok) { throw new Error(data || `Signup failed with status ${response.status}`); }
            // Persist the username locally so the UI can show the display name
            // immediately after signup/verification even if the auth token
            // returned later does not contain the display name.
            try {
                localStorage.setItem(USER_DATA_KEY, JSON.stringify({ email, name: username }));
            } catch (e) {
                // ignore storage errors
            }
            return { success: true, message: data };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, message: error.message || 'Network error during signup.' };
        }
    },

    async verifyOtp(email, otp) {
        let response;
        let data = '';

        try {
            response = await fetch(`${API_BASE_URL}/api/users/verify-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`, {
                method: 'POST',
            });
            data = await response.text();
            if (!response.ok) { throw new Error(data || `OTP verification failed with status ${response.status}`); }
            return { success: true, message: data };
        } catch (error) {
            console.error('OTP verification error:', error);
            return { success: false, message: error.message || 'Network error during OTP verification.' };
        }
    },

    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            // On failure, parse and return structured error (avoid throwing raw JSON)
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errObj = JSON.parse(errorText);
                    const message = errObj?.message || errObj?.error || JSON.stringify(errObj) || errorText;
                    const errorCode = errObj?.errorCode || errObj?.code || null;
                    console.warn('AuthService: Login failed', { errorCode, message });
                    return { success: false, errorCode, message };
                } catch (e) {
                    // Non-JSON response
                    const message = errorText || 'Login failed';
                    console.warn('AuthService: Login failed (non-JSON)', message);
                    return { success: false, errorCode: null, message };
                }
            }

            // Try to parse as JSON first
            let data;
            const responseText = await response.text();
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                // If JSON parsing fails, treat as text and look for token pattern
                const tokenMatch = responseText.match(/Your token: (.+)/);
                if (!tokenMatch || !tokenMatch[1]) {
                    console.error('AuthService: Login response missing token');
                    return { success: false, errorCode: null, message: 'Login succeeded but token missing from server response.' };
                }
                data = { token: tokenMatch[1] };
            }

            // Extract token from response
            let token;
            if (data.token) token = data.token;
            else if (data.accessToken) token = data.accessToken;
            else if (data.jwt) token = data.jwt;
            else {
                console.error('AuthService: Token not found in response data', data);
                return { success: false, errorCode: null, message: 'Login succeeded but token not found in response.' };
            }

            // Decode token payload safely
            let decodedTokenPayload = {};
            try {
                decodedTokenPayload = JSON.parse(atob(token.split('.')[1]));
            } catch (e) {
                console.warn('AuthService: Failed to decode token payload', e);
            }

            // Prefer a display name included in the token. If absent, fall back
            // to any username saved earlier during signup.
            let storedUser = null;
            try { storedUser = JSON.parse(localStorage.getItem(USER_DATA_KEY)); } catch (e) { /* ignore */ }

            const user = {
                email: decodedTokenPayload.sub || email,
                id: decodedTokenPayload.userId || decodedTokenPayload.id || null,
                name: decodedTokenPayload.name || decodedTokenPayload.username || storedUser?.name || null
            };

            localStorage.setItem(TOKEN_KEY, token);
            // Persist the resolved user object (including display name) for UI usage
            try { localStorage.setItem(USER_DATA_KEY, JSON.stringify(user)); } catch (e) { /* ignore */ }

            return { success: true, token, user, message: 'Login successful!' };
        } catch (error) {
            console.error('AuthService: Login error:', error);
            return { success: false, errorCode: null, message: error.message || 'Network error during login.' };
        }
    },

    logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_DATA_KEY);
    },

    getStoredToken() { return localStorage.getItem(TOKEN_KEY); },
    getStoredUser() {
        const userData = localStorage.getItem(USER_DATA_KEY);
        return userData ? JSON.parse(userData) : null;
    }
};

export default AuthService;
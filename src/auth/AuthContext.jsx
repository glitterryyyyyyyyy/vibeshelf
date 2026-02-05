// src/auth/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthService from './AuthService';
import { jwtDecode } from 'jwt-decode';
import { setAuthToken } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(AuthService.getStoredToken());
  const [user, setUser] = useState(AuthService.getStoredUser());
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const publicPaths = useMemo(() => ['/login', '/signup', '/verify-otp'], []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    AuthService.logout();
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        if (!publicPaths.includes(location.pathname)) { setTimeout(() => navigate('/login', { replace: true }), 0); }
        return;
      }
      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp > currentTime) {
          // Merge any stored display name (from signup) if token doesn't include it
          const storedUser = AuthService.getStoredUser();
          const decodedUser = {
            email: decodedToken.sub,
            id: decodedToken.userId || decodedToken.id,
            name: decodedToken.name || decodedToken.username || storedUser?.name || null
          };
          if (!user || user.email !== decodedUser.email || user.id !== decodedUser.id || user.name !== decodedUser.name) {
             setUser(decodedUser);
             localStorage.setItem('userData', JSON.stringify(decodedUser));
          }
          if (publicPaths.includes(location.pathname)) { navigate('/', { replace: true }); }
        } else {
          console.warn("Token expired. Logging out."); logout();
        }
      } catch (e) {
        console.error("Failed to decode token or token is invalid:", e); logout();
      } finally { setLoading(false); }
    };
    checkAuthStatus();
  }, [token, navigate, location.pathname, publicPaths, user, logout]);

  // Ensure the API client has the latest token set so requests (e.g. posting reviews)
  // include the Authorization header automatically. When token becomes null, clear it.
  useEffect(() => {
    try {
      setAuthToken(token);
    } catch (e) {
      // don't block UI if header setup fails
      // eslint-disable-next-line no-console
      console.warn('Failed to set auth token on API client', e);
    }
  }, [token]);

  const isAuthenticated = useMemo(() => {
    if (!token) return false;
    try {
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decodedToken.exp > currentTime;
    } catch (e) { return false; }
  }, [token]);

  const login = async (email, password) => {
    const result = await AuthService.login(email, password);
    if (result.success) { setToken(result.token); setUser(result.user); navigate('/', { replace: true }); }
    return result;
  };

  const signup = async (username, email, password) => {
    const result = await AuthService.signup(username, email, password);
    if (result.success) { navigate('/verify-otp', { state: { email }, replace: true }); }
    return result;
  };

  const verifyOtp = async (email, otp) => {
    const result = await AuthService.verifyOtp(email, otp);
    if (result.success) { navigate('/login', { replace: true }); }
    return result;
  };

  const authContextValue = { token, user, isAuthenticated, loading, login, logout, signup, verifyOtp };
  return (<AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};
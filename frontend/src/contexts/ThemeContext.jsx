// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Prefer an explicit saved user preference in localStorage.
    // If none is saved, default to light mode so the app stays pink
    // until the user intentionally toggles dark mode.
    try {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) return stored === 'true';
    } catch (e) {
      // localStorage may be unavailable in some environments — fall back to light
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', isDarkMode.toString());
    
    // Apply dark class to html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const value = {
    isDarkMode,
    toggleDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
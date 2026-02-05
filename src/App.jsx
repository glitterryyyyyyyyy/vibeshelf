// src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import ConfirmDialog from './components/ConfirmDialog';

import PersonalizedRecsComponent from './components/PersonalizedRecsComponent';
import Explore from './pages/Explore';
import BooksPage from './pages/BooksPage';
import BookDetail from './pages/BookDetail';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import TBRPage from './pages/TBRPage';

const PrivateRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

const AppNavbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navRef = useRef(null);
  const [navHeight, setNavHeight] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const measure = () => {
      if (navRef.current) setNavHeight(navRef.current.offsetHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <>
      <header
        ref={navRef}
        className="app-navbar p-4 text-white dark:text-gray-100 transition-colors fixed top-0 left-0 right-0 z-[9999]"
      >
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold hover:text-rose-100 dark:hover:text-rose-300 transition-colors no-underline">VibeShelf</Link>
          <nav className="flex items-center">
            {/* Unified Glass Control Center */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white/25 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/10 rounded-full shadow-sm transition-all duration-300">
              
              {/* Theme Toggle - Anchored Left */}
              <button
                onClick={toggleDarkMode}
                className="relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 focus:outline-none shadow-sm ring-1 ring-white/10"
                style={{
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' // Deep indigo space
                    : 'linear-gradient(135deg, #fecaca 0%, #fde047 100%)' // Soft rose to yellow
                }}
                aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <span className="sr-only">Toggle theme</span>
                
                {/* Decorative background icons for the empty space */}
                <div className={`absolute left-2 text-[10px] text-indigo-200 font-bold transition-opacity duration-300 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
                   ✨
                </div>
                <div className={`absolute right-2 text-[10px] text-rose-500 font-bold transition-opacity duration-300 ${isDarkMode ? 'opacity-0' : 'opacity-100'}`}>
                   ☁️
                </div>

                {/* The Sliding Thumb */}
                <span
                  className={`${
                    isDarkMode ? 'translate-x-[36px]' : 'translate-x-1'
                  } inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out flex items-center justify-center relative z-10`}
                >
                    {isDarkMode ? (
                      // Cute Moon Icon
                      <svg className="w-4 h-4 text-indigo-600 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                      </svg>
                    ) : (
                      // Cute Sun Icon
                      <svg className="w-4 h-4 text-amber-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                      </svg>
                    )}
                </span>
              </button>
            
            {isAuthenticated && (
              <>
                {/* Subtle Divider */}
                <div className="h-5 w-px bg-white/40 dark:bg-white/10 mx-1"></div>

                {/* Nav Links - Transformed to "Ghost Pills" */}
                <div className="flex items-center gap-1">
                  <Link 
                    to="/explore" 
                    className="px-4 py-1.5 text-sm font-bold text-white tracking-wide hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-all duration-200"
                  >
                    Explore
                  </Link>
                  <Link 
                    to="/mytbr" 
                    className="px-4 py-1.5 text-sm font-bold text-white tracking-wide hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-all duration-200"
                  >
                    My TBR
                  </Link>
                </div>

                {/* Logout Button - Rounded Pill matching the Toggle */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="ml-1 px-5 py-1.5 text-sm font-bold rounded-full bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 text-white shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg border border-rose-400/30"
                >
                  Logout
                </button>
              </>
            )}
           </div>
          </nav>
          {/* Confirm logout modal */}
          <ConfirmDialog
            open={showLogoutConfirm}
            title="Are you sure you want to log out?"
            description="We'll save your session data locally — you can log back in anytime."
            confirmLabel="Logout"
            cancelLabel="Stay"
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={() => {
              setShowLogoutConfirm(false);
              logout();
            }}
          />
        </div>
      </header>
      {/* spacer to prevent content from sliding under the fixed header */}
      <div aria-hidden="true" style={{ height: navHeight }} />
    </>
  );
};

function AppLayout() {
  return (
    <>
      <AppNavbar />
      <main className="flex-grow overflow-y-auto p-8 transition-colors">

        <Outlet />
      </main>
      {/* footer removed per design request */}
    </>
  );
}

function App() {
  const location = useLocation();
  const isBookDetail = location.pathname.startsWith("/book/");

  return (
    <ThemeProvider>
      <AuthProvider>  
  <div className={`h-screen ${isBookDetail ? 'overflow-auto' : 'overflow-hidden'} flex flex-col transition-colors`}>
    
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route element={<PrivateRoute />}>
            {/* Use full layout */}
            <Route element={!isBookDetail ? <AppLayout /> : <Outlet />}>
              <Route path="/" element={<PersonalizedRecsComponent />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/books" element={<BooksPage />} />
              <Route path="/mytbr" element={<TBRPage />} />
            </Route>

            {/* Book detail uses minimal layout */}
            <Route path="/book/:id" element={<BookDetail />} />
          </Route>

          {/* 404 page */}
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
                <h1 className="text-4xl font-extrabold text-rose-800">404 - Page Not Found</h1>
              </div>
            }
          />
        </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

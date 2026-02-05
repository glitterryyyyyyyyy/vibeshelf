import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx'; // Adjust path

function SignupPage() {
  const { signup } = useAuth();
  const [username, setUsername] = useState(''); // Added username
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signup(username, email, password); // Pass username
    if (!result.success) {
      setError(result.message || 'Signup failed.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#faf9f9] dark:bg-gray-950">
      {/* "Better" Premium Light Ombre Background - Ethereal Mesh Gradient */}
      <div className="absolute inset-0 w-full h-full">
        {/* Soft Pink Top Light */}
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-pink-100/80 to-rose-200/60 blur-[120px] mix-blend-multiply dark:mix-blend-normal dark:bg-rose-950/30 animate-blob"></div>
        
        {/* Warm Peach Center-Right */}
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-l from-orange-50/80 to-rose-100/60 blur-[100px] mix-blend-multiply dark:mix-blend-normal dark:bg-purple-950/30 animate-blob animation-delay-2000"></div>
        
        {/* Lavender Bottom Glow */}
        <div className="absolute -bottom-[30%] left-[20%] w-[80%] h-[60%] rounded-full bg-gradient-to-t from-violet-100/60 to-pink-100/60 blur-[130px] mix-blend-multiply dark:mix-blend-normal dark:bg-indigo-950/30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative z-10 perspective-1000">
        
        {/* Floating Brand */}
        <div className="text-center mb-8 transform transition-all duration-500 hover:scale-105">
           <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-500 drop-shadow-sm tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
             VibeShelf
           </h2>
           <p className="text-rose-800/60 dark:text-rose-200/60 text-sm font-medium tracking-wide mt-2 mix-blend-multiply dark:mix-blend-normal uppercase letter-spacing-2">
             Start your reading journey.
           </p>
        </div>

        {/* Glass Card */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/60 p-8 rounded-[2rem] shadow-[0_8px_32px_0_rgba(244,63,94,0.15)] border border-white/60 dark:border-white/10 ring-1 ring-white/40 dark:ring-white/5 relative overflow-hidden group">
          
          {/* Shine effect on card hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none z-0"></div>

          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-8 font-serif">Create Account</h1>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="group/input">
                <label className="block text-xs font-bold text-rose-900/50 dark:text-rose-200/50 uppercase tracking-wider mb-2 ml-1 group-focus-within/input:text-rose-600 transition-colors">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-4 pr-4 py-3.5 bg-white/50 dark:bg-gray-900/50 border border-rose-100 dark:border-rose-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-rose-400 transition-all duration-200 placeholder:text-gray-400 text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-sm"
                    placeholder="Choose a username"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="group/input">
                <label className="block text-xs font-bold text-rose-900/50 dark:text-rose-200/50 uppercase tracking-wider mb-2 ml-1 group-focus-within/input:text-rose-600 transition-colors">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-4 pr-4 py-3.5 bg-white/50 dark:bg-gray-900/50 border border-rose-100 dark:border-rose-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-rose-400 transition-all duration-200 placeholder:text-gray-400 text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-sm"
                    placeholder="name@example.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="group/input">
                 <label className="block text-xs font-bold text-rose-900/50 dark:text-rose-200/50 uppercase tracking-wider mb-2 ml-1 group-focus-within/input:text-rose-600 transition-colors">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-12 py-3.5 bg-white/50 dark:bg-gray-900/50 border border-rose-100 dark:border-rose-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/50 focus:border-rose-400 transition-all duration-200 placeholder:text-gray-400 text-gray-700 dark:text-gray-200 shadow-sm backdrop-blur-sm"
                    placeholder="Create a password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-rose-400 hover:text-rose-600 dark:text-rose-500/70 transition-colors focus:outline-none"
                    disabled={loading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50/80 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl flex items-center">
                   <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> 
                   {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_-10px_rgba(225,29,72,0.5)] shadow-rose-500/30 hover:shadow-[0_20px_30px_-10px_rgba(225,29,72,0.6)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={loading}
              >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Creating account...
                    </span>
                ) : 'Sign Up'}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-rose-600 dark:text-rose-400 font-bold hover:text-rose-700 dark:hover:text-rose-300 hover:underline transition-colors decoration-2 underline-offset-4">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer info/decoration */}
        <div className="mt-8 text-center">
            <div className="inline-flex gap-4">
               <span className="h-1.5 w-1.5 rounded-full bg-rose-300/60"></span>
               <span className="h-1.5 w-1.5 rounded-full bg-rose-300/60"></span>
               <span className="h-1.5 w-1.5 rounded-full bg-rose-300/60"></span>
            </div>
        </div>

      </div>
    </div>
  );
}
export default SignupPage;
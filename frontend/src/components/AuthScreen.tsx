/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Heart, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
}

const parseMessage = (message: string, code: string = ''): string => {
  const normalizedMessage = message.toUpperCase();
  const normalizedCode = code.toLowerCase();

  if (normalizedCode === 'auth/email-already-in-use' || normalizedMessage.includes('EMAIL_EXISTS') || normalizedMessage.includes('EMAIL-ALREADY-IN-USE')) {
    return 'This email address is already in use by another account.';
  }
  if (normalizedCode === 'auth/invalid-email' || normalizedMessage.includes('INVALID_EMAIL')) {
    return 'Please enter a valid email address.';
  }
  if (normalizedCode === 'auth/weak-password' || normalizedMessage.includes('WEAK_PASSWORD')) {
    return 'The password is too weak. It must be at least 6 characters.';
  }
  if (normalizedCode === 'auth/user-disabled' || normalizedMessage.includes('USER_DISABLED')) {
    return 'This user account has been disabled.';
  }
  if (normalizedCode === 'auth/user-not-found' || normalizedMessage.includes('USER_NOT_FOUND') || normalizedMessage.includes('EMAIL_NOT_FOUND')) {
    return 'No account found with this email.';
  }
  if (normalizedCode === 'auth/wrong-password' || normalizedMessage.includes('WRONG_PASSWORD') || normalizedMessage.includes('INVALID_PASSWORD')) {
    return 'Incorrect password. Please try again.';
  }
  if (normalizedCode === 'auth/invalid-credential' || normalizedMessage.includes('INVALID_CREDENTIAL')) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (normalizedCode === 'auth/too-many-requests' || normalizedMessage.includes('TOO_MANY_REQUESTS')) {
    return 'Too many failed login attempts. Please try again later.';
  }
  if (normalizedCode === 'auth/popup-closed-by-user' || normalizedMessage.includes('POPUP_CLOSED_BY_USER')) {
    return 'The sign-in popup was closed before completion.';
  }

  let cleanMessage = message;
  if (cleanMessage.startsWith('Firebase:')) {
    cleanMessage = cleanMessage.replace(/^Firebase:\s*/, '');
  }
  cleanMessage = cleanMessage.replace(/\s*\(auth\/[^)]+\)\.?/g, '');

  return cleanMessage || 'Authentication failed. Please verify credentials.';
};

const getFriendlyErrorMessage = (err: any): string => {
  if (!err) return 'An unexpected error occurred.';
  
  if (typeof err === 'string') {
    return parseMessage(err);
  }
  
  let code = err.code || '';
  let message = err.message || '';
  
  // Handle nested Firebase REST API response format (e.g. { error: { message: "EMAIL_EXISTS", ... } })
  if (err.error && typeof err.error === 'object') {
    if (err.error.message) message = err.error.message;
    if (err.error.code) code = String(err.error.code);
  }
  
  return parseMessage(message, code);
};

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validateField = (name: string, value: string) => {
    if (name === 'displayName') {
      if (!isLogin) {
        if (!value.trim()) {
          return 'Your Name / Handle is required.';
        }
        if (value.trim().length < 3) {
          return 'Name/Handle must be at least 3 characters.';
        }
      }
    } else if (name === 'email') {
      if (!value.trim()) {
        return 'Email address is required.';
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        return 'Please enter a valid email address.';
      }
    } else if (name === 'password') {
      if (!value) {
        return 'Password is required.';
      }
      if (value.length < 6) {
        return 'Password must be at least 6 characters.';
      }
    }
    return '';
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    if (displayNameError) {
      setDisplayNameError(validateField('displayName', val));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) {
      setEmailError(validateField('email', val));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordError) {
      setPasswordError(validateField('password', val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDisplayNameError('');
    setEmailError('');
    setPasswordError('');
    setLoading(true);

    let isValid = true;
    
    if (!isLogin) {
      const nameErr = validateField('displayName', displayName);
      if (nameErr) {
        setDisplayNameError(nameErr);
        isValid = false;
      }
    }
    
    const emailErr = validateField('email', email);
    if (emailErr) {
      setEmailError(emailErr);
      isValid = false;
    }
    
    const passwordErr = validateField('password', password);
    if (passwordErr) {
      setPasswordError(passwordErr);
      isValid = false;
    }

    if (!isValid) {
      setError('Please correct the validation errors below.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        const token = await user.getIdToken();
        const profileObj = {
          userId: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Crafter',
          email: user.email || '',
          avatarUrl: user.photoURL || '',
          createdAt: user.metadata.creationTime || new Date().toISOString()
        };
        onAuthSuccess(token, profileObj);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        await updateProfile(user, {
          displayName: displayName.trim() || 'Crafter'
        });
        // Force refresh the token so that the displayName propagates to the minted ID token
        const token = await user.getIdToken(true);
        const profileObj = {
          userId: user.uid,
          displayName: displayName.trim() || 'Crafter',
          email: user.email || '',
          avatarUrl: user.photoURL || '',
          createdAt: user.metadata.creationTime || new Date().toISOString()
        };
        onAuthSuccess(token, profileObj);
      }
    } catch (err: any) {
      console.error('Firebase Email authentication failure:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      const token = await user.getIdToken();
      
      const profileObj = {
        userId: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'Google Crafter',
        email: user.email || '',
        avatarUrl: user.photoURL || '',
        createdAt: user.metadata.creationTime || new Date().toISOString()
      };
      onAuthSuccess(token, profileObj);
    } catch (err: any) {
      console.error('Firebase Google authentication failure:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 selection:bg-vibrant-peach/20 relative overflow-hidden">


      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#E8E2D9] warm-shadow-lg relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F28482]/10 flex items-center justify-center text-4xl mb-4 border border-[#F28482]/20 shadow-inner">
            🧶
          </div>
          <h1 className="font-serif text-4xl font-extrabold text-[#2D231B] tracking-tight text-center">
            crochet<span className="text-[#F28482]">.ai</span>
          </h1>
          <p className="font-sans text-sm text-[#7C7167] mt-2 text-center font-semibold max-w-[280px]">
            Your AI-enabled companion and journal ecosystem for modern crocheting
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#F9F6F2] p-1 rounded-xl mb-6 border border-[#E8E2D9]">
          <button 
            type="button"
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${isLogin ? 'bg-[#F28482] text-white shadow-sm' : 'text-[#7C7167] hover:text-[#F28482]'}`}
            onClick={() => { setIsLogin(true); setError(''); setDisplayNameError(''); setEmailError(''); setPasswordError(''); }}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${!isLogin ? 'bg-[#F28482] text-white shadow-sm' : 'text-[#7C7167] hover:text-[#F28482]'}`}
            onClick={() => { setIsLogin(false); setError(''); setDisplayNameError(''); setEmailError(''); setPasswordError(''); }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-55 border border-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-[#7C7167] uppercase tracking-wider block">Your Name / Handle</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A89F94]">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  placeholder="e.g. GrandmaStitches"
                  className={`w-full pl-10 pr-4 py-3 bg-[#FDFCFB] border rounded-xl text-sm focus:outline-none transition-all text-[#2D231B] placeholder-[#A89F94] font-semibold ${
                    displayNameError 
                      ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                      : 'border-[#E8E2D9] focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482]'
                  }`}
                />
              </div>
              {displayNameError && (
                <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{displayNameError}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#7C7167] uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A89F94]">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={handleEmailChange}
                placeholder="crafter@example.com"
                className={`w-full pl-10 pr-4 py-3 bg-[#FDFCFB] border rounded-xl text-sm focus:outline-none transition-all text-[#2D231B] placeholder-[#A89F94] font-semibold ${
                  emailError 
                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                    : 'border-[#E8E2D9] focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482]'
                }`}
              />
            </div>
            {emailError && (
              <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-[#7C7167] uppercase tracking-wider block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A89F94]">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-3 bg-[#FDFCFB] border rounded-xl text-sm focus:outline-none transition-all text-[#2D231B] placeholder-[#A89F94] font-semibold ${
                  passwordError 
                    ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                    : 'border-[#E8E2D9] focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#A89F94] hover:text-[#F28482] cursor-pointer focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#F28482] hover:bg-[#F28482]/85 text-white font-bold rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-[#E8E2D9]"></div>
          <span className="flex-shrink mx-4 text-xs text-[#A89F94] font-bold uppercase tracking-widest bg-white">OR</span>
          <div className="flex-grow border-t border-[#E8E2D9]"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSSO}
          disabled={loading}
          className="w-full py-3 bg-white border border-[#E8E2D9] text-[#7C7167] font-bold rounded-xl text-sm flex items-center justify-center gap-2.5 hover:bg-[#F9F6F2] transition-all cursor-pointer hover:border-[#84A59D]"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-stone-500 border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
          )}
          <span>Signin with Google</span>
        </button>


      </motion.div>
    </div>
  );
}

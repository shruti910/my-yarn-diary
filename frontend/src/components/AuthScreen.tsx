/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Heart, Sparkles, AlertCircle, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { YarnSpinner } from './YarnSpinner';
import { motion } from 'motion/react';
import { auth, googleProvider } from '../lib/firebase';
import {
 signInWithPopup,
 signInWithRedirect,
 signInWithEmailAndPassword,
 createUserWithEmailAndPassword,
 updateProfile,
 sendPasswordResetEmail
} from 'firebase/auth';

/**
 * True when launched from a home-screen icon rather than a browser tab.
 * Popups behave badly there — on iOS the OS hands window.open() to Safari as a
 * separate context, so the sign-in result never makes it back to the app.
 */
const isRunningStandalone = (): boolean =>
 window.matchMedia('(display-mode: standalone)').matches ||
 (window.navigator as any).standalone === true;

interface AuthScreenProps {
 onAuthSuccess: (token: string, user: any) => void;
 /** When false, the form opens in "create account" mode (from the landing page's Sign up). */
 initialIsLogin?: boolean;
 /** Optional: render a back link that returns to the landing page. */
 onBack?: () => void;
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

export function AuthScreen({ onAuthSuccess, initialIsLogin = true, onBack }: AuthScreenProps) {
 const [isLogin, setIsLogin] = useState(initialIsLogin);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [displayName, setDisplayName] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const [showPassword, setShowPassword] = useState(false);
 const [displayNameError, setDisplayNameError] = useState('');
 const [emailError, setEmailError] = useState('');
 const [passwordError, setPasswordError] = useState('');
 const [isForgotPassword, setIsForgotPassword] = useState(false);
 const [resetSent, setResetSent] = useState(false);

 const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError('');
 setEmailError('');
 setLoading(true);

 const emailErr = validateField('email', email);
 if (emailErr) {
 setEmailError(emailErr);
 setLoading(false);
 return;
 }

 try {
 await sendPasswordResetEmail(auth, email.trim());
 setResetSent(true);
 } catch (err: any) {
 console.warn("Auth reset request completed code:", err.code);
 // Account enumeration protection: display success uniformly
 setResetSent(true);
 } finally {
 setLoading(false);
 }
 };

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
 profilePicture: user.photoURL || '',
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
 profilePicture: user.photoURL || '',
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
 if (isRunningStandalone()) {
 // Navigates away and comes back signed in. No getRedirectResult() call is
 // needed: App.tsx's onAuthStateChanged listener picks the user up on
 // return and runs the same backend sync that onAuthSuccess would.
 await signInWithRedirect(auth, googleProvider);
 return;
 }

 const userCredential = await signInWithPopup(auth, googleProvider);
 const user = userCredential.user;
 const token = await user.getIdToken();

 const profileObj = {
 userId: user.uid,
 displayName: user.displayName || user.email?.split('@')[0] || 'Google Crafter',
 email: user.email || '',
 profilePicture: user.photoURL || '',
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
 <div id="auth-screen-container" className="min-h-screen bg-page texture-overlay flex flex-col items-center justify-center p-4 selection:bg-brand-light/20 relative overflow-hidden">


 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.5 }}
 className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-subtle warm-shadow-lg relative z-10"
 >
 {onBack && (
 <button
 type="button"
 onClick={onBack}
 className="absolute top-5 left-5 inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-brand transition-colors cursor-pointer tap-safe"
 aria-label="Back to home"
 >
 <ChevronLeft className="w-4 h-4" /> Home
 </button>
 )}
 <div className={`flex flex-col items-center mb-8 ${onBack ? 'mt-6 sm:mt-0' : ''}`}>
 <h1 className="grand-hotel-regular text-5xl tracking-tight text-center">
 My Yarn Diary
 </h1>
 <p className="font-sans text-sm text-muted mt-2 text-center font-semibold max-w-[280px]">
 Your AI-enabled companion and journal ecosystem for modern crocheting.
 </p>
 </div>

 {isForgotPassword ? (
 resetSent ? (
 <div className="space-y-6 text-center">
 <div className="mx-auto w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center text-2xl text-accent">
 <Sparkles className="w-6 h-6 animate-pulse" />
 </div>
 <div className="space-y-2">
 <h3 className="font-serif text-xl font-extrabold text-heading">Reset Link Dispatched</h3>
 <p className="font-sans text-xs text-muted font-semibold leading-relaxed">
 If an account is associated with this email address, a secure password reset link has been dispatched to your inbox.
 </p>
 </div>
 <button
 type="button"
 onClick={() => {
 setIsForgotPassword(false);
 setResetSent(false);
 setEmail('');
 setError('');
 }}
 className="w-full py-3 sewing-button mt-4"
 >
 Back to Sign In
 </button>
 </div>
 ) : (
 <div className="space-y-5">
 <div className="text-center space-y-2 mb-2">
 <h2 className="font-serif text-2xl font-extrabold text-heading">Reset Password</h2>
 <p className="font-sans text-xs text-muted font-semibold">
 Enter your email address and we'll send you a link to reset your password.
 </p>
 </div>

 {error && (
 <div className="p-3 bg-red-55 border border-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
 <span>{error}</span>
 </div>
 )}

 <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" noValidate>
 <div className="space-y-1">
 <label className="text-xs font-extrabold text-muted uppercase tracking-wider block">Email Address</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
 <Mail className="w-4 h-4" />
 </span>
 <input
 type="email"
 value={email}
 onChange={handleEmailChange}
 placeholder="crafter@example.com"
 className={`w-full pl-10 pr-4 py-3 bg-surface border rounded-xl text-sm focus:outline-none transition-all text-heading placeholder-muted font-semibold ${emailError
 ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
 : 'border-subtle focus:border-brand focus:ring-1 focus:ring-brand'
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
 <button
 type="submit"
 disabled={loading}
 className="w-full py-3 sewing-button flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
 >
 {loading ? <YarnSpinner className="w-4 h-4" onBrand /> : 'Send Reset Link'}
 </button>
 </form>
 <div className="text-center pt-2">
 <button
 type="button"
 onClick={() => {
 setIsForgotPassword(false);
 setError('');
 setEmailError('');
 }}
 className="text-xs font-bold text-muted hover:text-brand hover:underline cursor-pointer focus:outline-none bg-transparent border-0"
 >
 Back to Sign In
 </button>
 </div>
 </div>
 )
 ) : (
 <>
 {/* Tab Controls */}
 <div className="flex bg-page p-1 rounded-xl mb-6 border border-subtle">
 <button
 type="button"
 className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${isLogin ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-brand'}`}
 onClick={() => { setIsLogin(true); setError(''); setDisplayNameError(''); setEmailError(''); setPasswordError(''); }}
 >
 Sign In
 </button>
 <button
 type="button"
 className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${!isLogin ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-brand'}`}
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
 <label className="text-xs font-extrabold text-muted uppercase tracking-wider block">Your Name / Handle</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
 <UserIcon className="w-4 h-4" />
 </span>
 <input
 type="text"
 value={displayName}
 onChange={handleDisplayNameChange}
 placeholder="e.g. GrandmaStitches"
 className={`w-full pl-10 pr-4 py-3 bg-surface border rounded-xl text-sm focus:outline-none transition-all text-heading placeholder-muted font-semibold ${displayNameError
 ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
 : 'border-subtle focus:border-brand focus:ring-1 focus:ring-brand'
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
 <label className="text-xs font-extrabold text-muted uppercase tracking-wider block">Email Address</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
 <Mail className="w-4 h-4" />
 </span>
 <input
 type="email"
 value={email}
 onChange={handleEmailChange}
 placeholder="crafter@example.com"
 className={`w-full pl-10 pr-4 py-3 bg-surface border rounded-xl text-sm focus:outline-none transition-all text-heading placeholder-muted font-semibold ${emailError
 ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
 : 'border-subtle focus:border-brand focus:ring-1 focus:ring-brand'
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
 <label className="text-xs font-extrabold text-muted uppercase tracking-wider block">Password</label>
 <div className="relative">
 <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
 <Lock className="w-4 h-4" />
 </span>
 <input
 type={showPassword ? 'text' : 'password'}
 value={password}
 onChange={handlePasswordChange}
 placeholder="••••••••"
 className={`w-full pl-10 pr-10 py-3 bg-surface border rounded-xl text-sm focus:outline-none transition-all text-heading placeholder-muted font-semibold ${passwordError
 ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
 : 'border-subtle focus:border-brand focus:ring-1 focus:ring-brand'
 }`}
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-brand cursor-pointer focus:outline-none"
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

 {isLogin && (
 <div className="flex justify-end">
 <button
 type="button"
 onClick={() => {
 setIsForgotPassword(true);
 setError('');
 setEmailError('');
 setPasswordError('');
 }}
 className="text-xs font-bold text-brand hover:underline cursor-pointer focus:outline-none bg-transparent border-0"
 >
 Forgot Password?
 </button>
 </div>
 )}

 <button
 type="submit"
 disabled={loading}
 className="w-full py-3 sewing-button flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
 >
 {loading ? <YarnSpinner className="w-4 h-4" onBrand /> : (isLogin ? 'Sign In' : 'Create Account')}
 </button>
 </form>

 <div className="relative flex py-4 items-center">
 <div className="flex-grow border-t border-subtle"></div>
 <span className="flex-shrink mx-4 text-xs text-muted font-bold uppercase tracking-widest bg-white">OR</span>
 <div className="flex-grow border-t border-subtle"></div>
 </div>

 <button
 type="button"
 onClick={handleGoogleSSO}
 disabled={loading}
 className="w-full py-3 bg-white border border-subtle text-muted font-bold rounded-xl text-sm flex items-center justify-center gap-2.5 hover:bg-page transition-all cursor-pointer hover:border-accent"
 >
 {loading ? (
 <YarnSpinner className="w-4 h-4 text-stone-500" />
 ) : (
 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
 </svg>
 )}
 <span>Sign in with Google</span>
 </button>
 </>
 )}


 </motion.div>
 </div>
 );
}

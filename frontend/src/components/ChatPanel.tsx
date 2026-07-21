import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Image, Plus, Trash2, ArrowRight, MessagesSquare, Compass, AlertCircle, Camera, X, Edit2, Check, Pin, PinOff, Copy, Download, Maximize2, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ChatSession, ChatMessage, ChatCategory } from '../types';
import { useDialog } from './DialogProvider';

const detectTerminology = (text: string | null | undefined): 'US' | 'UK' | null => {
 if (!text) return null;
 const clean = text.toLowerCase();
 if (/terminology:\s*uk/i.test(clean) || /uk standard/i.test(clean) || /uk terminology/i.test(clean)) {
 return 'UK';
 }
 if (/terminology:\s*us/i.test(clean) || /us standard/i.test(clean) || /us terminology/i.test(clean)) {
 return 'US';
 }
 if (/\bsc\b|\bsingle\s+crochet\b/i.test(clean)) {
 return 'US';
 }
 if (/\bhtr\b|\bdtr\b|\bhalf\s+treble\b|\bdouble\s+treble\b/i.test(clean)) {
 return 'UK';
 }
 return null;
};

interface ChatPanelProps {
 token: string;
 category: ChatCategory;
 user?: any;
 onUpdateCrochetTerminology?: (pref: 'US' | 'UK') => Promise<void>;
}

export function ChatPanel({ token, category, user, onUpdateCrochetTerminology }: ChatPanelProps) {
 const [sessions, setSessions] = useState<ChatSession[]>([]);
 const [sessionsPage, setSessionsPage] = useState(0);
 const [sessionsPageSize, setSessionsPageSize] = useState(10);
 const [sessionsTotalPages, setSessionsTotalPages] = useState(0);
 const [sessionsTotalElements, setSessionsTotalElements] = useState(0);
 const [activeChatId, setActiveChatId] = useState<string | null>(null);
 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
 const { showConfirm, showAlert } = useDialog();
 const [error, setError] = useState<string | null>(null);
 const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
 const [lightboxImage, setLightboxImage] = useState<string | null>(null);

 const handleCopyMessage = (msgId: string, text: string | null | undefined) => {
 if (!text) return;
 navigator.clipboard.writeText(text);
 setCopiedMsgId(msgId);
 setTimeout(() => {
 setCopiedMsgId(null);
 }, 2000);
 };

 const handleDownloadImage = (imageData: string, msgId: string) => {
 if (!imageData) return;
 const link = document.createElement('a');
 link.href = imageData;
 link.download = `yarn-diary-concept-${msgId}.jpg`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 // In-chat image attachments (multiple, up to 3)
 interface ImageAttachment {
 preview: string;
 base64: string;
 mime: string;
 }
 const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
 const [cameraActive, setCameraActive] = useState(false);
 const videoRef = useRef<HTMLVideoElement | null>(null);
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const streamRef = useRef<MediaStream | null>(null);

 // Custom creation modal to bypass iframe prompt sandbox restrictions
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [newChatTitle, setNewChatTitle] = useState('Pattern Customizer');
 const [editingChatId, setEditingChatId] = useState<string | null>(null);
 const [editChatTitle, setEditChatTitle] = useState('');
 const [isHeaderEditing, setIsHeaderEditing] = useState(false);
 const [headerEditTitle, setHeaderEditTitle] = useState('');
 const [isHistoryOpen, setIsHistoryOpen] = useState(false);

 const messagesEndRef = useRef<HTMLDivElement | null>(null);
 const fileInputRef = useRef<HTMLInputElement | null>(null);

 const fetchWithToken = async (url: string, options: RequestInit = {}) => {
 if (!token) return null;
 const headers = {
 'Authorization': `Bearer ${token}`,
 'Content-Type': 'application/json',
 'X-User-Terminology': user?.crochetTerminology || 'US',
 ...(options.headers || {})
 };
 try {
 const response = await fetch(url, { ...options, headers });
 if (!response.ok) {
 if (response.status === 401) {
 window.dispatchEvent(new Event('unauthorized'));
 }
 let rawMsg = '';
 try {
 const errData = await response.json();
 if (errData && errData.message) {
 rawMsg = errData.message;
 }
 } catch (_) { }

 let errMsg = '';
 if (response.status >= 500) {
 errMsg = 'An unexpected server error occurred. Please try again later.';
 } else if (response.status === 400) {
 if (rawMsg && (rawMsg.toLowerCase().includes('must be') || rawMsg.toLowerCase().includes('required') || rawMsg.toLowerCase().includes('already exists') || rawMsg.toLowerCase().includes('invalid name') || rawMsg.toLowerCase().includes('either the size'))) {
 errMsg = rawMsg;
 } else {
 errMsg = 'Invalid request. Please check your inputs and try again.';
 }
 } else if (response.status === 403) {
 errMsg = 'You do not have permission to perform this action.';
 } else if (response.status === 404) {
 errMsg = 'The requested item could not be found.';
 } else if (response.status === 409) {
 errMsg = 'This item already exists.';
 } else {
 errMsg = 'Something went wrong. Please check your connection and try again.';
 }

 console.group('%c[Network API Error Interceptor]', 'color: var(--error-default); font-weight: bold;');
 console.error(`[URI]: ${url}`);
 console.error(`[Status Code]: ${response.status} (${response.statusText || 'Status Unknown'})`);
 console.error(`[Method]: ${options.method || 'GET'}`);
 console.groupEnd();
 throw new Error(errMsg);
 }
 return await response.json();
 } catch (err) {
 console.error(`%c[Pipeline Fetch Failure] unable to resolve: ${url}`, 'color: var(--warning-default); font-weight: bold;', err);
 return null;
 }
 };

 const loadSessions = async (targetPage = sessionsPage, targetSize = sessionsPageSize) => {
 try {
 const url = `/api/v1/chats?category=${category}&page=${targetPage}&size=${targetSize}`;
 const data = await fetchWithToken(url);
 if (data && data.content) {
 setSessions(data.content);
 setSessionsTotalPages(data.totalPages);
 setSessionsTotalElements(data.totalElements);
 }
 } catch (err) {
 console.error('Failed loading chat sessions:', err);
 }
 };

 useEffect(() => {
 setSessionsPage(0);
 }, [category]);

 useEffect(() => {
 if (!token) return;
 loadSessions(sessionsPage, sessionsPageSize);
 }, [token, category, sessionsPage, sessionsPageSize]);

 const filteredSessions = sessions;

 useEffect(() => {
 setActiveChatId(null);
 }, [category]);

 const getIntroDetails = () => {
 switch (category) {
 case 'pattern-decoder':
 return {
 emoji: '🔍',
 title: 'Welcome to Pattern Decoder!',
 desc: 'Upload an image of a pattern chart, diagram, or written shorthand to decode it into full instructions.',
 placeholder: "Ask pattern decoder... 'Translate this shorthand pattern row...'",
 suggestions: [
 { text: 'Decode shorthand pattern', input: 'Can you explain how to work this row?' },
 { text: 'Analyze stitch chart symbol', input: 'What does the stitch symbol in row 3 mean?' }
 ]
 };
 case 'reverse-engineer':
 return {
 emoji: '📐',
 title: 'Welcome to Visual Reverse-Engineer!',
 desc: 'Upload a clear photo of any finished item or swatch to estimate stitches, hook size, and recreate it.',
 placeholder: "Ask reverse-engineer... 'What stitch is used in this granny square?'",
 suggestions: [
 { text: 'Reverse engineer texture', input: 'What stitches are used to achieve this texture?' },
 { text: 'Estimate hook size', input: 'What hook size and yarn weight does this look like?' }
 ]
 };
 case 'image-generator':
 return {
 emoji: '🎨',
 title: 'Welcome to Image Generator!',
 desc: 'Describe any crochet design or project you want to visualize, and AI will generate it for you.',
 placeholder: "Describe the image you want... 'A pastel rainbow zig-zag baby blanket...'",
 suggestions: [
 { text: 'Visualize pastel baby blanket', input: 'Generate a concept photo for a pastel color zig-zag baby blanket' },
 { text: 'Design amigurumi frog concept', input: 'Generate a concept photo for a cute amigurumi frog sitting on a lilypad' }
 ]
 };
 case 'crochet-tutor':
 return {
 emoji: '🎓',
 title: 'Welcome to AI Crochet Tutor!',
 desc: 'Learn crochet stitches, terminology (US/UK differences), and troubleshoot structural mistakes.',
 placeholder: "Ask crochet tutor... 'How do I hold the crochet hook for best tension?'",
 suggestions: [
 { text: 'Explain double crochet', input: 'How do I do a double crochet (US terms)?' },
 { text: 'UK vs US terminology chart', input: 'Can you show me a comparison chart of UK and US crochet terms?' }
 ]
 };
 default:
 return {
 emoji: '🧶',
 title: 'Welcome to AI Crochet Buddy!',
 desc: 'Ask me anything: customized row instructions, yarn color matchers, calculations, or stitch directions. Attach images to ask visual pattern queries!',
 placeholder: "Ask your crochet buddy... 'Write a beginner pattern for a mushroom bag...'",
 suggestions: [
 { text: '🪄 Craft Magic Ring', input: 'How do I crochet a simple magic ring?' },
 { text: '🌎 Terminology Conversion', input: 'Convert a UK Triple Crochet loop pattern to US stitch terminology' },
 { text: '🧸 Amigurumi Increases', input: 'Explain how to increase rows in Amigurumi rounds' }
 ]
 };
 }
 };

 const intro = getIntroDetails();

 // Scroll to bottom
 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 const activeChat = sessions.find(s => s.chatId === activeChatId);

 useEffect(() => {
 scrollToBottom();
 }, [activeChat?.messages]);

 const handleCreateChat = () => {
 let defaultTitle = 'Pattern Customizer';
 if (category === 'crochet-buddy') defaultTitle = 'Crochet Buddy Thread';
 else if (category === 'pattern-decoder') defaultTitle = 'Pattern Decoder Thread';
 else if (category === 'reverse-engineer') defaultTitle = 'Reverse Engineer Thread';
 else if (category === 'image-generator') defaultTitle = 'Image Generator Thread';
 else if (category === 'crochet-tutor') defaultTitle = 'Crochet Tutor Thread';

 setNewChatTitle(defaultTitle);
 setIsCreateModalOpen(true);
 };

 const capitalizeWords = (str: string): string => {
 if (!str) return '';
 return str
 .trim()
 .split(/\s+/)
 .map(word => {
 const match = word.match(/\p{L}/u);
 if (match && match.index !== undefined) {
 const index = match.index;
 return word.slice(0, index) + word[index].toUpperCase() + word.slice(index + 1);
 }
 return word.charAt(0).toUpperCase() + word.slice(1);
 })
 .join(' ');
 };

 const isValidName = (str: string): boolean => {
 return /^[ \p{L}\p{N}\-_()#.\p{Emoji}\p{Extended_Pictographic}\p{M}\p{Cf}]+$/u.test(str) && /[\p{L}\p{N}\p{Emoji}\p{Extended_Pictographic}]/u.test(str);
 };

 const submitCreateChat = async () => {
 const trimmed = newChatTitle.trim();
 if (!trimmed) {
 await showAlert('Session title cannot be empty.');
 return;
 }

 const capitalized = capitalizeWords(trimmed);
 if (!isValidName(capitalized)) {
 await showAlert('Session title can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis.');
 return;
 }

 try {
 const res = await fetchWithToken('/api/v1/chats', {
 method: 'POST',
 body: JSON.stringify({
 title: capitalized,
 category: category
 })
 });

 if (res) {
 setSessions(prev => [res as ChatSession, ...prev]);
 setActiveChatId(res.chatId);
 loadSessions(0);
 }
 setIsCreateModalOpen(false);
 } catch (err) {
 console.error('Failed to create chat session:', err);
 }
 };

 const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 const confirmed = await showConfirm('Are you sure you want to discard this conversation thread?');
 if (!confirmed) return;

 try {
 await fetchWithToken(`/api/v1/chats/${chatId}`, { method: 'DELETE' });
 const nextSessions = sessions.filter(s => s.chatId !== chatId);
 setSessions(nextSessions);
 if (activeChatId === chatId) {
 const nextFilteredSessions = nextSessions;
 setActiveChatId(nextFilteredSessions.length > 0 ? nextFilteredSessions[0].chatId : null);
 }
 loadSessions(0);
 } catch (err) {
 console.error('Failed to delete chat:', err);
 }
 };

 const startEditingChat = (sess: ChatSession, e: React.MouseEvent) => {
 e.stopPropagation();
 setEditingChatId(sess.chatId);
 setEditChatTitle(sess.title);
 };

 const saveChatRename = async (sess: ChatSession, e: React.MouseEvent | React.FormEvent) => {
 e.stopPropagation();
 e.preventDefault();
 const trimmed = editChatTitle.trim();
 if (!trimmed) {
 await showAlert('Session title cannot be empty.');
 return;
 }

 const capitalized = capitalizeWords(trimmed);
 if (!isValidName(capitalized)) {
 await showAlert('Session title can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis.');
 return;
 }

 try {
 const res = await fetch(`/api/v1/chats/${sess.chatId}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ title: capitalized })
 });
 if (res.ok) {
 const updated = await res.json();
 setSessions(prev => prev.map(s => s.chatId === sess.chatId ? { ...s, title: updated.title } : s));
 setEditingChatId(null);
 }
 } catch (err) {
 console.error('Failed to rename chat session:', err);
 }
 };

 const cancelChatRename = (e: React.MouseEvent | React.KeyboardEvent) => {
 e.stopPropagation();
 setEditingChatId(null);
 };

 const togglePinChat = async (sess: ChatSession, e: React.MouseEvent) => {
 e.stopPropagation();
 const currentlyPinned = filteredSessions.filter(s => s.pinned).length;
 if (!sess.pinned && currentlyPinned >= 3) {
 await showAlert('You can pin at most 3 chats to the top.');
 return;
 }

 try {
 const nextPinned = !sess.pinned;
 const res = await fetch(`/api/v1/chats/${sess.chatId}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ pinned: nextPinned })
 });
 if (res.ok) {
 const updated = await res.json();
 setSessions(prev => prev.map(s => s.chatId === sess.chatId ? { ...s, pinned: updated.pinned } : s));
 }
 } catch (err) {
 console.error('Failed to toggle pin state:', err);
 }
 };

 const saveHeaderRename = async (e?: React.FormEvent) => {
 if (e) {
 e.preventDefault();
 }
 if (!activeChat) return;
 const trimmed = headerEditTitle.trim();
 if (!trimmed) {
 await showAlert('Session title cannot be empty.');
 return;
 }

 const capitalized = capitalizeWords(trimmed);
 if (!isValidName(capitalized)) {
 await showAlert('Session title can only contain letters, numbers, spaces, hyphens, underscores, hashes, periods, parentheses, and emojis.');
 return;
 }

 try {
 const res = await fetch(`/api/v1/chats/${activeChat.chatId}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ title: capitalized })
 });
 if (res.ok) {
 const updated = await res.json();
 setSessions(prev => prev.map(s => s.chatId === activeChat.chatId ? { ...s, title: updated.title } : s));
 setIsHeaderEditing(false);
 }
 } catch (err) {
 console.error('Failed to rename chat session from header:', err);
 }
 };


 const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files) {
 const files = Array.from(e.target.files);
 const maxBytes = 2 * 1024 * 1024;
 const oversizedFile = files.find(f => f.size > maxBytes);
 if (oversizedFile) {
 setError(`Photo "${oversizedFile.name}" exceeds the maximum allowed limit of 2MB.`);
 return;
 }
 if (attachments.length + files.length > 3) {
 setError('You can attach up to 3 photos per message.');
 return;
 }
 files.forEach(file => {
 const reader = new FileReader();
 reader.onload = () => {
 const preview = reader.result as string;
 const base64 = preview.split(',')[1];
 setAttachments(prev => [...prev, { preview, base64, mime: file.type }]);
 };
 reader.readAsDataURL(file);
 });
 }
 };

 const removeAttachment = (index: number) => {
 setAttachments(prev => prev.filter((_, i) => i !== index));
 };

 const clearAttachments = () => {
 setAttachments([]);
 };

 const startCamera = async () => {
 setError(null);
 try {
 setCameraActive(true);
 const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
 streamRef.current = stream;
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 videoRef.current.play();
 }
 } catch (err) {
 console.error(err);
 setError('Camera access failed. Please check browser permissions.');
 setCameraActive(false);
 }
 };

 const stopCamera = () => {
 if (streamRef.current) {
 streamRef.current.getTracks().forEach(track => track.stop());
 streamRef.current = null;
 }
 setCameraActive(false);
 };

 const capturePhoto = () => {
 if (videoRef.current && canvasRef.current) {
 const video = videoRef.current;
 const canvas = canvasRef.current;
 const ctx = canvas.getContext('2d');
 if (ctx) {
 canvas.width = video.videoWidth;
 canvas.height = video.videoHeight;
 ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

 const dataUrl = canvas.toDataURL('image/jpeg');
 const preview = dataUrl;
 const base64 = dataUrl.split(',')[1];

 if (attachments.length >= 3) {
 setError('You can attach up to 3 photos per message.');
 stopCamera();
 return;
 }

 setAttachments(prev => [...prev, { preview, base64, mime: 'image/jpeg' }]);
 stopCamera();
 }
 }
 };

 const handleSendMessage = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!input.trim() && attachments.length === 0) return;

 let targetChatId = activeChatId;
 const userText = input;
 const payloadImages = attachments.map(a => a.preview).join('|||');

 setInput('');
 setLoading(true);
 setError(null);
 const isNewSession = !targetChatId;

 if (!targetChatId) {
 // Auto-create a new chat thread
 let defaultTitle = 'New Thread';
 if (category === 'crochet-buddy') defaultTitle = 'Crochet Buddy Thread';
 else if (category === 'pattern-decoder') defaultTitle = 'Pattern Decoder Thread';
 else if (category === 'reverse-engineer') defaultTitle = 'Reverse Engineer Thread';
 else if (category === 'image-generator') defaultTitle = 'Image Generator Thread';
 else if (category === 'crochet-tutor') defaultTitle = 'Crochet Tutor Thread';

 const textForTitle = userText.trim();
 if (textForTitle) {
 const rawTitle = textForTitle.length > 30 ? textForTitle.substring(0, 30) + '...' : textForTitle;
 const cleaned = rawTitle.replace(/[^\p{L}\p{N}\s\-_()#.\p{Emoji}\p{Extended_Pictographic}]/gu, '').trim();
 if (cleaned) {
 defaultTitle = cleaned;
 }
 }

 try {
 const res = await fetchWithToken('/api/v1/chats', {
 method: 'POST',
 body: JSON.stringify({
 title: defaultTitle,
 category: category
 })
 });

 if (res && res.chatId) {
 // Add this new session to local sessions state
 setSessions(prev => [res as ChatSession, ...prev]);
 targetChatId = res.chatId;
 setActiveChatId(res.chatId);
 } else {
 setError('Failed to initialize new conversation thread.');
 setLoading(false);
 return;
 }
 } catch (err) {
 console.error('Failed to create chat session on-the-fly:', err);
 setError('Failed to initialize new conversation thread.');
 setLoading(false);
 return;
 }
 }

 // Join multiple image previews with |||
 const joinedPreviews = attachments.map(a => a.preview).join('|||');

 const randomId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(4);
 const userMsg: ChatMessage = {
 id: randomId,
 role: 'user',
 text: userText || '(Attached Image)',
 imageData: joinedPreviews || undefined,
 createdAt: new Date().toISOString()
 };

 // Instantly append locally
 setSessions(prev => prev.map(s => {
 if (s.chatId === targetChatId) {
 return {
 ...s,
 messages: [...(s.messages || []), userMsg]
 };
 }
 return s;
 }));

 clearAttachments();

 let hasError = false;
 try {
 const res = await fetch(`/api/v1/chats/${targetChatId}/messages`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`,
 'X-User-Terminology': user?.crochetTerminology || 'US'
 },
 body: JSON.stringify({
 text: userText.trim() || 'Analyze this image',
 imageData: payloadImages || ''
 })
 });

 const data = await res.json();
 if (!res.ok) {
 if (res.status === 401) {
 window.dispatchEvent(new Event('unauthorized'));
 }
 throw new Error(data.error || 'Interaction error with Gemini API.');
 }

 if (data.errorMessage) {
 hasError = true;
 }

 // Append model response returned from backend
 const responseMsg: ChatMessage = {
 id: data.id || 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(4),
 role: 'model',
 text: data.text || '',
 imageData: data.imageData || undefined,
 errorMessage: data.errorMessage || undefined,
 createdAt: data.createdAt || new Date().toISOString()
 };

 setSessions(prev => prev.map(s => {
 if (s.chatId === targetChatId) {
 // Prevent double append in case background refetch already populated the message
 const hasMessage = s.messages.some(m =>
 m.id === responseMsg.id ||
 (m.role === 'model' && responseMsg.text && responseMsg.text.trim() !== '' && m.text === responseMsg.text)
 );
 if (hasMessage) return s;
 return {
 ...s,
 messages: [...(s.messages || []), responseMsg]
 };
 }
 return s;
 }));
 } catch (err: any) {
 console.error(err);
 setError(err.message || 'Connection lost to AI engine.');
 hasError = true;
 } finally {
 setLoading(false);
 if (isNewSession && !hasError) {
 loadSessions(0);
 }
 }
 };

 const sendAutoMessage = async (text: string) => {
 if (loading) return;
 let targetChatId = activeChatId;
 if (!targetChatId) return;

 setLoading(true);
 setError(null);

 const randomId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(4);
 const userMsg: ChatMessage = {
 id: randomId,
 role: 'user',
 text: text,
 createdAt: new Date().toISOString()
 };

 // Instantly append locally
 setSessions(prev => prev.map(s => {
 if (s.chatId === targetChatId) {
 return {
 ...s,
 messages: [...(s.messages || []), userMsg]
 };
 }
 return s;
 }));

 try {
 const res = await fetch(`/api/v1/chats/${targetChatId}/messages`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`,
 'X-User-Terminology': user?.crochetTerminology || 'US'
 },
 body: JSON.stringify({
 text: text,
 imageData: ''
 })
 });

 const data = await res.json();
 if (!res.ok) {
 if (res.status === 401) {
 window.dispatchEvent(new Event('unauthorized'));
 }
 throw new Error(data.error || 'Interaction error with Gemini API.');
 }

 const responseMsg: ChatMessage = {
 id: data.id || 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(4),
 role: 'model',
 text: data.text || '',
 imageData: data.imageData || undefined,
 errorMessage: data.errorMessage || undefined,
 createdAt: data.createdAt || new Date().toISOString()
 };

 setSessions(prev => prev.map(s => {
 if (s.chatId === targetChatId) {
 const hasMessage = s.messages.some(m =>
 m.id === responseMsg.id ||
 (m.role === 'model' && responseMsg.text && responseMsg.text.trim() !== '' && m.text === responseMsg.text)
 );
 if (hasMessage) return s;
 return {
 ...s,
 messages: [...(s.messages || []), responseMsg]
 };
 }
 return s;
 }));
 } catch (err: any) {
 console.error(err);
 setError(err.message || 'Connection lost to AI engine.');
 } finally {
 setLoading(false);
 }
 };

 const handleTranslateMessage = (fromTerm: 'US' | 'UK', toTerm: 'US' | 'UK') => {
 const prompt = `Please translate the pattern above from ${fromTerm === 'US' ? 'US Standard' : 'UK Standard'} terminology to ${toTerm === 'US' ? 'US Standard' : 'UK Standard'} terminology. Keep all instructions and formatting intact.`;
 sendAutoMessage(prompt);
 };

 // Helper trigger
 const triggerAttachment = () => {
 fileInputRef.current?.click();
 };

 return (
 <div id="full-chat-split-view" className="h-full flex max-w-7xl mx-auto items-stretch overflow-hidden">

 {/* Session selector left frame */}
 {/* Backdrop for mobile */}
 {isHistoryOpen && (
 <div 
 className="lg:hidden fixed inset-0 bg-black/40 z-20 backdrop-blur-sm"
 onClick={() => setIsHistoryOpen(false)}
 />
 )}
 <div className={`${isHistoryOpen ? 'flex absolute md:relative inset-y-0 left-0 z-30 shadow-2xl md:shadow-none' : 'hidden'} w-72 max-w-[85vw] border-r border-subtle bg-white flex-col h-full shrink-0 transition-all`}>
 <div className="p-3 border-b border-subtle flex justify-between items-center bg-white">
 <span className="text-[11px] uppercase font-bold tracking-wider text-muted">Chat History</span>
 <button
 onClick={() => setActiveChatId(null)}
 className="p-1.5 rounded bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
 >
 <Plus className="w-3.5 h-3.5" />
 New Thread
 </button>
 </div>

 {/* Scroll list */}
 <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
 {filteredSessions.length === 0 ? (
 <div className="text-center py-12 px-4 text-muted">
 <MessagesSquare className="w-8 h-8 mx-auto mb-2 opacity-50 text-brand-light" />
 <p className="text-xs font-bold uppercase tracking-wider">No Conversational Threads</p>
 <button
 onClick={() => setActiveChatId(null)}
 className="text-xs text-brand font-extrabold underline mt-1 cursor-pointer"
 >
 Create one now
 </button>
 </div>
 ) : (
 <>
 {filteredSessions.map((sess) => {
 const isActive = sess.chatId === activeChatId;
 const isEditing = sess.chatId === editingChatId;
 return (
 <div
 key={sess.chatId}
 onClick={() => { if (!isEditing) setActiveChatId(sess.chatId); }}
 className={`group px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
 ? 'bg-brand-light/15 border-brand-light/30 text-heading font-bold shadow-xs'
 : 'bg-transparent border-transparent hover:bg-page text-muted'
 }`}
 >
 <div className="flex items-center gap-2.5 truncate w-full mr-2">
 <MessagesSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-brand' : 'text-muted'}`} />
 {isEditing ? (
 <input
 type="text"
 value={editChatTitle}
 onChange={(e) => setEditChatTitle(e.target.value)}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => {
 if (e.key === 'Enter') saveChatRename(sess, e);
 if (e.key === 'Escape') cancelChatRename(e);
 }}
 autoFocus
 className="bg-white border border-subtle rounded-lg text-xs p-1 focus:outline-none text-heading font-semibold w-full"
 />
 ) : (
 <span className="text-xs truncate font-semibold">{sess.title}</span>
 )}
 </div>

 {/* Action buttons */}
 <div className="flex items-center gap-1 shrink-0">
 {sess.pinned && !isEditing && (
 <button
 onClick={(e) => togglePinChat(sess, e)}
 className="p-1 rounded text-brand bg-brand/5 group-hover:hidden"
 title="Pinned (Click to Unpin)"
 >
 <Pin className="w-3.5 h-3.5 fill-current" />
 </button>
 )}
 {isEditing ? (
 <>
 <button
 onClick={(e) => saveChatRename(sess, e)}
 className="p-1 rounded text-green-600 hover:bg-green-50"
 >
 <Check className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={cancelChatRename}
 className="p-1 rounded text-muted hover:bg-stone-100"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </>
 ) : (
 <div className="hidden group-hover:flex transition-opacity gap-0.5">
 <button
 onClick={(e) => togglePinChat(sess, e)}
 className={`p-1 rounded ${sess.pinned ? 'text-brand bg-brand/5' : 'text-muted hover:text-brand hover:bg-brand/5'}`}
 title={sess.pinned ? "Unpin Thread" : "Pin Thread"}
 >
 <Pin className={`w-3.5 h-3.5 ${sess.pinned ? 'fill-current' : ''}`} />
 </button>
 <button
 onClick={(e) => startEditingChat(sess, e)}
 className="p-1 rounded text-muted hover:text-brand hover:bg-brand/5"
 title="Rename Thread"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={(e) => handleDeleteChat(sess.chatId, e)}
 className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-50"
 title="Delete Thread"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 )}
 </div>
 </div>
 );
 })}

 {/* AI Chats Pagination Controls */}
 {sessionsTotalPages > 1 && (
 <div className="mt-3 pt-3 border-t border-subtle flex items-center justify-between gap-2">
 <span className="text-[11px] text-muted font-semibold">
 Page {sessionsPage + 1} of {sessionsTotalPages}
 </span>

 <div className="flex items-center gap-1">
 <button
 disabled={sessionsPage === 0}
 onClick={() => setSessionsPage(sessionsPage - 1)}
 className="p-1 px-2 border border-subtle rounded-lg text-muted hover:text-heading hover:bg-page disabled:opacity-40 disabled:hover:bg-transparent transition-all text-[11px] font-bold cursor-pointer"
 >
 Prev
 </button>
 <button
 disabled={sessionsPage === sessionsTotalPages - 1}
 onClick={() => setSessionsPage(sessionsPage + 1)}
 className="p-1 px-2 border border-subtle rounded-lg text-muted hover:text-heading hover:bg-page disabled:opacity-40 disabled:hover:bg-transparent transition-all text-[11px] font-bold cursor-pointer"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </>
 )}
 </div>
 </div>

 {/* Main chat history section */}
 <div className="flex-1 min-h-0 min-w-0 bg-page texture-overlay flex flex-col h-full relative shadow-inner">
 <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-subtle bg-white flex justify-between items-center shadow-xs z-10 shrink-0">
 <div className="flex items-center gap-2 w-full min-w-0">
 <button
 onClick={() => setIsHistoryOpen(!isHistoryOpen)}
 className="p-1.5 -ml-2 rounded text-muted hover:text-brand hover:bg-brand/10 transition-colors cursor-pointer shrink-0"
 title="Toggle Chat History"
 >
 <Menu className="w-5 h-5" />
 </button>
 {activeChat ? (
 isHeaderEditing ? (
 <form onSubmit={(e) => { e.preventDefault(); saveHeaderRename(); }} className="flex items-center gap-2 flex-1 min-w-0">
 <input
 type="text"
 value={headerEditTitle}
 onChange={(e) => setHeaderEditTitle(e.target.value)}
 className="bg-white border border-subtle rounded-lg text-xs p-1.5 focus:outline-none text-heading font-semibold w-full max-w-xs"
 autoFocus
 />
 <button
 type="submit"
 className="p-1 rounded text-green-600 hover:bg-green-50 shrink-0"
 title="Save Title"
 >
 <Check className="w-4 h-4" />
 </button>
 <button
 type="button"
 onClick={() => setIsHeaderEditing(false)}
 className="p-1 rounded text-muted hover:bg-stone-100 shrink-0"
 title="Cancel"
 >
 <X className="w-4 h-4" />
 </button>
 </form>
 ) : (
 <div className="flex items-center gap-2 min-w-0 flex-1">
 <h3 className="font-serif font-extrabold text-heading text-xs sm:text-sm truncate max-w-md">
 {activeChat.title}
 </h3>
 <button
 onClick={(e) => {
 e.stopPropagation();
 setIsHeaderEditing(true);
 setHeaderEditTitle(activeChat.title);
 }}
 className="p-1 rounded text-muted hover:text-brand hover:bg-brand/5 shrink-0"
 title="Rename Thread"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={(e) => handleDeleteChat(activeChat.chatId, e)}
 className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-50 shrink-0"
 title="Delete Thread"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 )
 ) : (
 <h3 className="font-serif font-extrabold text-heading text-xs sm:text-sm truncate">
 {category === 'crochet-buddy' ? 'New Crochet Buddy Thread' :
 category === 'pattern-decoder' ? 'New Pattern Decoder Thread' :
 category === 'reverse-engineer' ? 'New Reverse Engineer Thread' :
 category === 'image-generator' ? 'New Image Generator Thread' :
 'New Crochet Tutor Thread'}
 </h3>
 )}
 </div>
 </div>

 {/* Scroll Bubbles Area */}
 <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4 scrollbar-thin">
 {!activeChat || activeChat.messages.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center p-8 max-w-sm mx-auto text-center space-y-4">
 <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center text-3xl border border-brand/20 shadow-inner">
 {intro.emoji}
 </div>
 <div>
 <h4 className="font-serif font-extrabold text-heading text-base">{intro.title}</h4>
 <p className="text-xs text-muted font-semibold mt-1">{intro.desc}</p>
 </div>
 <div className="flex flex-wrap gap-2 justify-center pt-2">
 {intro.suggestions.map((sug, i) => (
 <button
 key={i}
 type="button"
 onClick={() => setInput(sug.input)}
 className="px-3 py-1.5 bg-white border border-subtle text-[11px] font-bold text-muted rounded-full hover:border-brand hover:text-brand transition-all cursor-pointer"
 >
 {sug.text}
 </button>
 ))}
 </div>
 </div>
 ) : (
 activeChat.messages.map((msg, index) => {
 if (msg.errorMessage) {
 return (
 <div key={msg.id} className="p-3 bg-red-55 border border-red-100 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2 w-full my-2 animate-fade-in">
 <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
 <span>{msg.errorMessage}</span>
 </div>
 );
 }
 const isUser = msg.role === 'user';
 return (
 <div
 key={msg.id}
 className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'} animate-fade-in`}
 >
 {/* Avatar Bubble */}
 {!isUser && (
 <div className="w-8 h-8 rounded-xl bg-brand-light/20 flex items-center justify-center text-sm border border-brand-light/45 shadow-xs shrink-0 self-start">
 🧶
 </div>
 )}

 <div className="space-y-1">
 {/* Message payload cards */}
 {msg.imageData && (
 <div className="flex flex-col gap-3">
 {msg.imageData.split('|||').map((imgUrl, i) => (
 <div key={i} className="flex flex-col max-w-sm rounded-2xl overflow-hidden shadow-md border border-subtle bg-white">

 {/* Visual Asset Container Frame */}
 <div className="relative overflow-hidden bg-page aspect-square flex items-center justify-center">
 <img
 src={imgUrl}
 alt={`AI Generated Concept Image ${i + 1}`}
 className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
 onClick={() => setLightboxImage(imgUrl)}
 />
 </div>

 {/* 🎯 Always-Visible Utility Control Strip */}
 <div className="flex items-center justify-between p-3 bg-page/80 border-t border-surface font-sans">
 <span className="text-xs font-medium text-muted">
 {msg.role === 'user' ? 'Uploaded Image' : 'AI Generated Concept Image'}
 </span>

 <div className="flex items-center gap-2">
 {/* Always Visible Expand Button */}
 <button
 type="button"
 onClick={() => setLightboxImage(imgUrl)}
 className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-surface border border-subtle rounded-lg shadow-sm transition-colors cursor-pointer"
 title="Make Image Big"
 >
 <Maximize2 size={14} />
 <span>Expand</span>
 </button>

 {/* Always Visible Download Button */}
 <button
 type="button"
 onClick={() => handleDownloadImage(imgUrl, `${msg.id}-${i}`)}
 className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-red-400 hover:bg-red-500 rounded-lg shadow-sm transition-colors cursor-pointer"
 title="Download Image File"
 >
 <Download size={14} />
 <span>Download</span>
 </button>
 </div>
 </div>

 </div>
 ))}
 </div>
 )}
 
 {msg.text && (
 <div className={`p-4 rounded-3xl md:p-5 shadow-sm ${isUser
 ? 'bg-brand-light/20 text-heading rounded-tr-none border border-brand/30 shadow-sm'
 : 'bg-white text-heading rounded-tl-none border border-subtle shadow-sm'
 }`}>
 {isUser ? (
 <p className="text-xs font-semibold whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
 ) : (
 <>
 <div className="markdown-body text-xs">
 <Markdown>{msg.text || ''}</Markdown>
 </div>

 {(() => {
 const prevMsg = index > 0 ? activeChat.messages[index - 1] : null;
 const isResponseToImage = prevMsg?.imageData || category === 'pattern-decoder';

 if (isResponseToImage) {
 const detectedTerm = detectTerminology(msg.text);
 const preferredTerm = user?.crochetTerminology || 'US';

 if (detectedTerm && detectedTerm !== preferredTerm && !msg.text?.toLowerCase().includes('translated')) {
 return (
 <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-warning-dark animate-fade-in shadow-xs">
 <div className="flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
 <span>
 Detected <strong>{detectedTerm === 'US' ? 'US' : 'UK'} Standard</strong> terminology standard in pattern.
 Your preference is <strong>{preferredTerm} Standard</strong>.
 </span>
 </div>
 <button
 type="button"
 onClick={() => handleTranslateMessage(detectedTerm, preferredTerm)}
 className="px-2.5 py-1.5 bg-brand text-white font-extrabold rounded-lg hover:bg-error hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shadow-xs"
 >
 Translate to {preferredTerm}
 </button>
 </div>
 );
 }
 }
 return null;
 })()}
 </>
 )}
 </div>
 )}
 {/* Timestamp & Copy Actions */}
 <div className={`flex items-center gap-2.5 mt-1.5 px-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
 <span className="text-[11px] font-bold text-muted">
 {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {msg.text && (
 <button
 type="button"
 onClick={() => handleCopyMessage(msg.id, msg.text)}
 className="text-[11px] font-bold text-muted hover:text-brand flex items-center gap-1 cursor-pointer transition-colors"
 title="Copy message to clipboard"
 >
 {copiedMsgId === msg.id ? (
 <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
 <Check className="w-2.5 h-2.5 shrink-0" /> Copied!
 </span>
 ) : (
 <span className="flex items-center gap-0.5"><Copy className="w-2.5 h-2.5" /> Copy</span>
 )}
 </button>
 )}
 </div>
 </div>
 </div>
 );
 })
 )}

 {loading && (
 <div className="flex gap-2 sm:gap-3 mr-auto max-w-[90%] sm:max-w-[80%] animate-fade-in">
 <div className="w-8 h-8 rounded-xl bg-brand-light/20 flex items-center justify-center text-sm border border-brand-light/45 shadow-xs shrink-0 self-start">
 🧶
 </div>
 <div className="bg-white px-5 py-4 rounded-3xl rounded-tl-none border border-subtle warm-shadow flex items-center gap-1.5 self-start">
 <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:-0.3s]"></span>
 <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:-0.15s]"></span>
 <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"></span>
 </div>
 </div>
 )}

 <div ref={messagesEndRef} />
 </div>

 {/* Error notifications */}
 {error && (
 <div className="px-6 py-2 bg-red-55 border-t border-b border-red-100 text-xs text-red-700 font-semibold flex items-center gap-2">
 <AlertCircle className="w-4 h-4 text-red-500" />
 <span>{error}</span>
 </div>
 )}

 {/* Input form area */}
 <form onSubmit={handleSendMessage} className="p-4 border-t border-subtle bg-white bg-opacity-85 backdrop-blur-md z-10 shrink-0">

 {/* Attachment Previews */}
 {/* Image attachment preview drawer */}
 {attachments.length > 0 && (
 <div className="mb-3 p-2.5 bg-surface border border-subtle rounded-xl flex items-center justify-between w-full gap-4 animate-scale-up">
 <div className="flex flex-wrap gap-2.5 items-center">
 {attachments.map((att, index) => (
 <div key={index} className="relative group w-12 h-12">
 <img src={att.preview} className="w-12 h-12 rounded-lg object-cover border border-subtle" alt={`attachment-${index}`} />
 <button
 type="button"
 onClick={() => removeAttachment(index)}
 className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer border border-white"
 >
 <X className="w-2.5 h-2.5" />
 </button>
 </div>
 ))}
 <span className="text-[11px] text-muted font-bold ml-2">
 {attachments.length} photo{attachments.length > 1 ? 's' : ''} attached
 </span>
 </div>
 <button
 type="button"
 onClick={clearAttachments}
 className="p-1 hover:bg-border/40 text-muted hover:text-heading rounded font-bold text-xs cursor-pointer"
 >
 Discard All
 </button>
 </div>
 )}

 {/* Camera capture screen */}
 {cameraActive && (
 <div className="mb-3 p-3 bg-page border border-subtle rounded-xl flex flex-col items-center gap-3 shrink-0 animate-fadeIn">
 <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-subtle bg-black aspect-video shadow-inner">
 <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
 <canvas ref={canvasRef} className="hidden" />
 </div>
 <div className="flex gap-2.5">
 <button
 type="button"
 onClick={capturePhoto}
 className="px-4 py-2 bg-brand hover:bg-brand/95 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
 >
 <Camera className="w-3.5 h-3.5" />
 Capture Photo
 </button>
 <button
 type="button"
 onClick={stopCamera}
 className="px-4 py-2 bg-white border border-subtle text-muted hover:bg-stone-50 font-bold text-xs rounded-xl cursor-pointer"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 <div className="flex items-center gap-2.5 bg-surface px-4 py-3 border border-subtle focus-within:ring-1 focus-within:ring-brand focus-within:border-brand transition-all warm-shadow rounded-2xl">

 {/* Image upload trigger button */}
 <input
 type="file"
 id="inchat-file"
 ref={fileInputRef}
 accept="image/*"
 multiple
 onChange={handleAttachment}
 className="hidden"
 />
 <button
 type="button"
 onClick={triggerAttachment}
 className="p-2 rounded-xl text-muted hover:text-brand hover:bg-brand/5 transition-colors cursor-pointer"
 title="Attach image"
 >
 <Image className="w-4 h-4" />
 </button>

 <button
 type="button"
 onClick={cameraActive ? stopCamera : startCamera}
 className="p-2 rounded-xl text-muted hover:text-brand hover:bg-brand/5 transition-colors cursor-pointer"
 title="Take photo"
 >
 <Camera className="w-4 h-4" />
 </button>

 <input
 type="text"
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder={intro.placeholder}
 disabled={loading}
 className="flex-1 bg-transparent border-none text-xs text-heading focus:outline-none placeholder-muted font-semibold"
 />

 <button
 type="submit"
 disabled={loading || (!input.trim() && attachments.length === 0)}
 className="p-2.5 bg-brand hover:bg-brand/85 text-white rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0 text-xs shrink-0 cursor-pointer"
 >
 <Send className="w-4 h-4" />
 </button>
 </div>
 </form>
 </div>

 {/* Visual in-app creation Modal window to circumvent standard sandboxed prompt block rules */}
 <AnimatePresence>
 {isCreateModalOpen && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs animate-fade-in"
 onClick={() => setIsCreateModalOpen(false)}
 >
 <motion.div
 initial={{ scale: 0.95, y: 10 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.95, y: 10 }}
 className="bg-white rounded-3xl p-5 sm:p-6 border border-subtle max-w-sm w-full space-y-4 shadow-2xl relative max-h-[90dvh] overflow-y-auto"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Modal header */}
 <div className="flex items-center gap-2 pb-2 border-b border-subtle">
 <span className="text-xl">🌸</span>
 <h4 className="font-serif font-extrabold text-heading text-base">New consultation topic</h4>
 </div>

 {/* Input */}
 <div className="space-y-1.5">
 <label className="text-[11px] font-extrabold text-muted uppercase tracking-wider block">Topic / Pattern Name</label>
 <input
 type="text"
 value={newChatTitle}
 onChange={(e) => setNewChatTitle(e.target.value)}
 placeholder="e.g. Pattern Customizer"
 autoFocus
 className="w-full bg-surface border border-subtle text-xs p-3 rounded-xl text-heading focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-semibold"
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 submitCreateChat();
 }
 }}
 />
 </div>

 {/* Quick Suggestion Chips */}
 <div className="space-y-1.5">
 <p className="text-[11px] text-muted uppercase tracking-wider font-extrabold">Quick Suggestions</p>
 <div className="flex flex-wrap gap-1.5">
 {['Pattern Customizer', 'Yarn Color Matcher', 'Amigurumi Expert', 'US/UK Convert'].map((suggest) => (
 <button
 key={suggest}
 type="button"
 onClick={() => setNewChatTitle(suggest)}
 className="px-2.5 py-1.5 bg-surface hover:bg-brand/10 border border-subtle hover:border-brand/20 text-[11px] text-muted rounded-lg transition-all cursor-pointer font-bold"
 >
 {suggest}
 </button>
 ))}
 </div>
 </div>

 {/* Action buttons */}
 <div className="flex justify-end gap-2 pt-2">
 <button
 type="button"
 onClick={() => setIsCreateModalOpen(false)}
 className="px-4 py-2 text-muted bg-surface hover:bg-page border border-subtle rounded-xl cursor-pointer text-xs font-bold"
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={submitCreateChat}
 className="px-4 py-2 text-white bg-brand hover:bg-brand/90 rounded-xl shadow-xs cursor-pointer text-xs font-bold"
 >
 Create Topic
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Lightbox Modal */}
 <AnimatePresence>
 {lightboxImage && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs"
 onClick={() => setLightboxImage(null)}
 >
 <button
 type="button"
 onClick={() => setLightboxImage(null)}
 className="absolute top-4 right-4 text-white hover:text-neutral-300 transition-colors p-2 cursor-pointer bg-black/40 rounded-full"
 >
 <X size={24} />
 </button>
 <motion.img
 initial={{ scale: 0.95 }}
 animate={{ scale: 1 }}
 exit={{ scale: 0.95 }}
 src={lightboxImage}
 alt="Expanded view"
 className="max-w-full max-h-[90dvh] object-contain rounded-xl select-none"
 onClick={(e) => e.stopPropagation()}
 />
 </motion.div>
 )}
 </AnimatePresence>

 </div>
 );
}

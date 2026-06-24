import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Plus, Trash2, ArrowRight, MessageSquare, Compass, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ChatSession, ChatMessage } from '../types';
import { useDialog } from './DialogProvider';

interface ChatPanelProps {
  token: string;
}

export function ChatPanel({ token }: ChatPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { showConfirm } = useDialog();
  const [error, setError] = useState<string | null>(null);

  // In-chat image attachments
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentMime, setAttachmentMime] = useState<string>('');

  // Custom creation modal to bypass iframe prompt sandbox restrictions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('Pattern Customizer');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchWithToken = async (url: string, options: RequestInit = {}) => {
    if (!token) return null;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        console.group('%c[Network API Error Interceptor]', 'color: #ef4444; font-weight: bold;');
        console.error(`[URI]: ${url}`);
        console.error(`[Status Code]: ${response.status} (${response.statusText || 'Status Unknown'})`);
        console.error(`[Method]: ${options.method || 'GET'}`);
        console.groupEnd();
        throw new Error(`Network API HTTP error ${response.status}: ${response.statusText || 'Response Error'}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`%c[Pipeline Fetch Failure] unable to resolve: ${url}`, 'color: #f97316; font-weight: bold;', err);
      return null;
    }
  };

  const loadSessions = async () => {
    try {
      const data = await fetchWithToken('/api/v1/chats');
      if (data) {
        // Handle sorting
        const list = (data as ChatSession[]).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
        setSessions(list);
        if (list.length > 0 && !activeChatId) {
          setActiveChatId(list[0].chatId);
        }
      }
    } catch (err) {
      console.error('Failed loading chat sessions:', err);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadSessions();
  }, [token]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeChat = sessions.find(s => s.chatId === activeChatId);

  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages]);

  const handleCreateChat = () => {
    setNewChatTitle('Pattern Customizer');
    setIsCreateModalOpen(true);
  };

  const submitCreateChat = async () => {
    try {
      if (!newChatTitle.trim()) return;

      const res = await fetchWithToken('/api/v1/chats', {
        method: 'POST',
        body: JSON.stringify({ title: newChatTitle.trim() })
      });

      if (res) {
        setSessions(prev => [res as ChatSession, ...prev]);
        setActiveChatId(res.chatId);
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
        setActiveChatId(nextSessions.length > 0 ? nextSessions[0].chatId : null);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachmentMime(file.type);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentPreview(reader.result as string);
        setAttachmentBase64((reader.result as string).split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAttachment = () => {
    setAttachmentPreview(null);
    setAttachmentBase64(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachmentBase64) return;
    if (!activeChatId) return;

    const userText = input;
    setInput('');
    setLoading(true);
    setError(null);

    // Dynamic random ID matching chat specifications
    const randomId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(4);
    const userMsg: ChatMessage = {
      id: randomId,
      role: 'user',
      text: userText || '(Attached Image)',
      imageData: attachmentPreview || undefined,
      createdAt: new Date().toISOString()
    };

    // Keep temporary copies
    const attPreview = attachmentPreview;

    // Instantly append locally to make messaging layout snappy
    setSessions(prev => prev.map(s => {
      if (s.chatId === activeChatId) {
        return {
          ...s,
          messages: [...(s.messages || []), userMsg]
        };
      }
      return s;
    }));

    clearAttachment();

    try {
      // Send chat message and request reply through backend microservices
      const res = await fetch(`/api/v1/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: userText.trim() || 'Analyze this image',
          imageData: attPreview || ''
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Interaction error with Gemini API.');
      }

      // Append model response returned from backend
      const responseMsg: ChatMessage = {
        id: data.id || 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(4),
        role: 'model',
        text: data.text || 'Standard error interpreting feed.',
        createdAt: data.createdAt || new Date().toISOString()
      };

      setSessions(prev => prev.map(s => {
        if (s.chatId === activeChatId) {
          // Prevent double append in case background refetch already populated the message
          const hasMessage = s.messages.some(m => m.id === responseMsg.id || (m.role === 'model' && m.text === responseMsg.text));
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

  // Helper trigger
  const triggerAttachment = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="full-chat-split-view" className="h-full flex max-w-7xl mx-auto items-stretch overflow-hidden">

      {/* Session selector left frame */}
      <div className="w-72 border-r border-[#E8E2D9] bg-white flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#E8E2D9] flex justify-between items-center bg-white">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#A89F94]">Chat History</span>
          <button
            onClick={handleCreateChat}
            className="p-1.5 rounded bg-[#F28482]/10 hover:bg-[#F28482]/20 text-[#F28482] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Thread
          </button>
        </div>

        {/* Scroll list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4 text-[#A89F94]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#F5CAC3]" />
              <p className="text-xs font-bold uppercase tracking-wider">No Conversational Threads</p>
              <button
                onClick={handleCreateChat}
                className="text-xs text-[#F28482] font-extrabold underline mt-1 cursor-pointer"
              >
                Create one now
              </button>
            </div>
          ) : (
            sessions.map((sess) => {
              const isActive = sess.chatId === activeChatId;
              return (
                <div
                  key={sess.chatId}
                  onClick={() => setActiveChatId(sess.chatId)}
                  className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isActive
                    ? 'bg-[#F5CAC3]/15 border-[#F5CAC3]/30 text-[#2D231B] font-bold shadow-xs'
                    : 'bg-transparent border-transparent hover:bg-[#F9F6F2] text-[#7C7167]'
                    }`}
                >
                  <div className="flex items-center gap-2.5 truncate w-full">
                    <MessageSquare className={`w-3.5 h-3.5 ${isActive ? 'text-[#F28482]' : 'text-[#A89F94]'}`} />
                    <span className="text-xs truncate font-semibold">{sess.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(sess.chatId, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[#A89F94] hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat history section */}
      <div className="flex-1 bg-[#FDFBF7] flex flex-col h-full relative">
        {activeChat ? (
          <>
            {/* Thread top bar header */}
            <div className="px-6 py-4 border-b border-[#E8E2D9] bg-white flex justify-between items-center shadow-xs z-10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-[#84A59D] rounded-full animate-pulse" />
                <h3 className="font-serif font-extrabold text-[#2D231B] text-sm">{activeChat.title}</h3>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#84A59D] bg-[#84A59D]/10 border border-[#84A59D]/20 px-2 py-0.5 rounded-md">Crochet Buddy online</span>
            </div>

            {/* Scroll Bubbles Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {activeChat.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 max-w-sm mx-auto text-center space-y-4">
                  <div className="w-16 h-16 bg-[#F28482]/10 rounded-2xl flex items-center justify-center text-3xl border border-[#F28482]/20 shadow-inner">
                    🧶
                  </div>
                  <div>
                    <h4 className="font-serif font-extrabold text-[#2D231B] text-base">Welcome to Crochet.ai Tutor!</h4>
                    <p className="text-xs text-[#7C7167] font-semibold mt-1">Ask me anything: customized row instructions, yarn color matchers, calculations, or stitch directions. Attach images to ask visual pattern queries!</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    <button onClick={() => setInput('How do I crochet a simple magic ring?')} className="px-3 py-1.5 bg-white border border-[#E8E2D9] text-[10px] font-bold text-[#7C7167] rounded-full hover:border-[#F28482] hover:text-[#F28482] transition-all cursor-pointer">🪄 Craft Magic Ring</button>
                    <button onClick={() => setInput('Convert a UK Triple Crochet loop pattern to US stitch terminology')} className="px-3 py-1.5 bg-white border border-[#E8E2D9] text-[10px] font-bold text-[#7C7167] rounded-full hover:border-[#F28482] hover:text-[#F28482] transition-all cursor-pointer">🌎 Terminology Conversion</button>
                    <button onClick={() => setInput('Explain how to increase rows in Amigurumi rounds')} className="px-3 py-1.5 bg-white border border-[#E8E2D9] text-[10px] font-bold text-[#7C7167] rounded-full hover:border-[#F28482] hover:text-[#F28482] transition-all cursor-pointer">🧸 Amigurumi Increases</button>
                  </div>
                </div>
              ) : (
                activeChat.messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[80%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'} animate-fade-in`}
                    >
                      {/* Avatar Bubble */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-xl bg-[#F5CAC3]/20 flex items-center justify-center text-sm border border-[#F5CAC3]/45 shadow-xs shrink-0 self-start">
                          🧶
                        </div>
                      )}

                      <div className="space-y-1">
                        {/* Message payload cards */}
                        <div className={`p-4 rounded-3xl md:p-5 warm-shadow ${isUser
                          ? 'bg-[#F28482]/10 text-[#2D231B] rounded-tr-none border border-[#F28482]/20'
                          : 'bg-white text-[#2D231B] rounded-tl-none border border-[#E8E2D9]'
                          }`}>
                          {msg.imageData && (
                            <img
                              src={msg.imageData}
                              alt="Uploaded visual thread"
                              className="rounded-xl max-h-48 mb-3 object-contain border border-[#E8E2D9] mx-auto"
                            />
                          )}

                          {isUser ? (
                            <p className="text-xs font-semibold whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          ) : (
                            <div className="markdown-body text-xs">
                              <Markdown>{msg.text}</Markdown>
                            </div>
                          )}
                        </div>
                        {/* Timestamp helper */}
                        <span className={`text-[9px] font-mono font-bold text-[#A89F94] block px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="flex gap-3 mr-auto max-w-[80%] animate-fade-in">
                  <div className="w-8 h-8 rounded-xl bg-[#F5CAC3]/20 flex items-center justify-center text-sm border border-[#F5CAC3]/45 shadow-xs shrink-0 self-start">
                    🧶
                  </div>
                  <div className="bg-white px-5 py-4 rounded-3xl rounded-tl-none border border-[#E8E2D9] warm-shadow flex items-center gap-1.5 self-start">
                    <span className="w-1.5 h-1.5 bg-[#F28482] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#F28482] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#F28482] rounded-full animate-bounce"></span>
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
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#E8E2D9] bg-white bg-opacity-85 backdrop-blur-md z-10 shrink-0">

              {/* Attachment Previews */}
              {attachmentPreview && (
                <div className="mb-3 p-2 bg-[#FDFCFB] border border-[#E8E2D9] rounded-xl flex items-center justify-between w-max gap-4 animate-scale-up">
                  <div className="flex items-center gap-2">
                    <img src={attachmentPreview} className="w-12 h-12 rounded-lg object-cover border border-[#E8E2D9]" alt="attachment" />
                    <span className="text-[10px] text-[#7C7167] font-bold font-mono">Image attached</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="p-1 hover:bg-[#F9F6F2] text-[#A89F94] hover:text-[#2D231B] rounded font-bold text-xs"
                  >
                    Discard
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2.5 bg-[#FDFCFB] px-4 py-3 border border-[#E8E2D9] focus-within:ring-1 focus-within:ring-[#F28482] focus-within:border-[#F28482] transition-all warm-shadow rounded-2xl">

                {/* Image upload trigger button */}
                <input
                  type="file"
                  id="inchat-file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAttachment}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={triggerAttachment}
                  className="p-2 rounded-xl text-[#A89F94] hover:text-[#F28482] hover:bg-[#F28482]/5 transition-colors cursor-pointer"
                  title="Attach image"
                >
                  <Image className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your crochet buddy... 'Write a beginner pattern for a mushroom bag...'"
                  disabled={loading}
                  className="flex-1 bg-transparent border-none text-xs text-[#2D231B] focus:outline-none placeholder-[#A89F94] font-semibold"
                />

                <button
                  type="submit"
                  disabled={loading || (!input.trim() && !attachmentBase64)}
                  className="p-2.5 bg-[#F28482] hover:bg-[#F28482]/85 text-white rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0 text-xs shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-sm mx-auto space-y-4">
            <Compass className="w-12 h-12 text-[#F28482]/40 animate-spin" style={{ animationDuration: '20s' }} />
            <div>
              <h3 className="font-serif font-extrabold text-[#2D231B] text-lg">Consultation Board Open</h3>
              <p className="text-xs text-[#A89F94] mt-1 font-semibold">Please select an existing chat thread on the left pane or start a new customized thread to consult with your AI Companion tutor.</p>
            </div>
            <button
              onClick={handleCreateChat}
              className="px-5 py-2.5 bg-[#F28482] hover:bg-[#F28482]/85 text-white font-bold rounded-xl text-xs tracking-wide inline-flex items-center gap-1.5 cursor-pointer shadow-md transform hover:-translate-y-0.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Spawn Chat Session
            </button>
          </div>
        )}
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
              className="bg-white rounded-3xl p-6 border border-[#E8E2D9] max-w-sm w-full space-y-4 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center gap-2 pb-2 border-b border-[#FDFCFB]">
                <span className="text-xl">🌸</span>
                <h4 className="font-serif font-extrabold text-[#2D231B] text-base">New consultation topic</h4>
              </div>

              {/* Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-[#7C7167] uppercase tracking-wider block">Topic / Pattern Name</label>
                <input
                  type="text"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                  placeholder="e.g. Pattern Customizer"
                  autoFocus
                  className="w-full bg-[#FDFCFB] border border-[#E8E2D9] text-xs p-3 rounded-xl text-[#2D231B] focus:outline-none focus:border-[#F28482] focus:ring-1 focus:ring-[#F28482] font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitCreateChat();
                    }
                  }}
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <p className="text-[9px] text-[#A89F94] uppercase tracking-wider font-extrabold">Quick Suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Pattern Customizer', 'Yarn Color Matcher', 'Amigurumi Expert', 'US/UK Convert'].map((suggest) => (
                    <button
                      key={suggest}
                      type="button"
                      onClick={() => setNewChatTitle(suggest)}
                      className="px-2.5 py-1.5 bg-[#FDFCFB] hover:bg-[#F28482]/10 border border-[#E8E2D9] hover:border-[#F28482]/20 text-[10px] text-[#7C7167] rounded-lg transition-all cursor-pointer font-bold"
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
                  className="px-4 py-2 text-[#7C7167] bg-[#FDFCFB] hover:bg-[#F9F6F2] border border-[#E8E2D9] rounded-xl cursor-pointer text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreateChat}
                  className="px-4 py-2 text-white bg-[#F28482] hover:bg-[#F28482]/90 rounded-xl shadow-xs cursor-pointer text-xs font-bold"
                >
                  Create Topic
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

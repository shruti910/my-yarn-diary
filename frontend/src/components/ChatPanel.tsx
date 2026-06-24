import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Plus, Trash2, ArrowRight, MessageSquare, Compass, AlertCircle, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { ChatSession, ChatMessage, ChatCategory } from '../types';
import { useDialog } from './DialogProvider';

interface ChatPanelProps {
  token: string;
  category: ChatCategory;
}

export function ChatPanel({ token, category }: ChatPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { showConfirm } = useDialog();
  const [error, setError] = useState<string | null>(null);

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
        if (response.status === 401) {
          window.dispatchEvent(new Event('unauthorized'));
        }
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
      }
    } catch (err) {
      console.error('Failed loading chat sessions:', err);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadSessions();
  }, [token, category]);

  const filteredSessions = sessions.filter(s => (s.category || 'crochet-buddy') === category);

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

  const submitCreateChat = async () => {
    try {
      if (!newChatTitle.trim()) return;

      const res = await fetchWithToken('/api/v1/chats', {
        method: 'POST',
        body: JSON.stringify({
          title: newChatTitle.trim(),
          category: category
        })
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
    if (e.target.files) {
      const files = Array.from(e.target.files);
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
        defaultTitle = textForTitle.length > 30 ? textForTitle.substring(0, 30) + '...' : textForTitle;
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

    try {
      const res = await fetch(`/api/v1/chats/${targetChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

      // Append model response returned from backend
      const responseMsg: ChatMessage = {
        id: data.id || 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(4),
        role: 'model',
        text: data.text || 'Standard error interpreting feed.',
        createdAt: data.createdAt || new Date().toISOString()
      };

      setSessions(prev => prev.map(s => {
        if (s.chatId === targetChatId) {
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
            onClick={() => setActiveChatId(null)}
            className="p-1.5 rounded bg-[#F28482]/10 hover:bg-[#F28482]/20 text-[#F28482] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Thread
          </button>
        </div>

        {/* Scroll list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 px-4 text-[#A89F94]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#F5CAC3]" />
              <p className="text-xs font-bold uppercase tracking-wider">No Conversational Threads</p>
              <button
                onClick={() => setActiveChatId(null)}
                className="text-xs text-[#F28482] font-extrabold underline mt-1 cursor-pointer"
              >
                Create one now
              </button>
            </div>
          ) : (
            filteredSessions.map((sess) => {
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
        <div className="px-6 py-4 border-b border-[#E8E2D9] bg-white flex justify-between items-center shadow-xs z-10 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-extrabold text-[#2D231B] text-sm">
              {activeChat ? activeChat.title : (
                category === 'crochet-buddy' ? 'New Crochet Buddy Thread' :
                category === 'pattern-decoder' ? 'New Pattern Decoder Thread' :
                category === 'reverse-engineer' ? 'New Reverse Engineer Thread' :
                category === 'image-generator' ? 'New Image Generator Thread' :
                'New Crochet Tutor Thread'
              )}
            </h3>
          </div>
        </div>

        {/* Scroll Bubbles Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 max-w-sm mx-auto text-center space-y-4">
              <div className="w-16 h-16 bg-[#F28482]/10 rounded-2xl flex items-center justify-center text-3xl border border-[#F28482]/20 shadow-inner">
                {intro.emoji}
              </div>
              <div>
                <h4 className="font-serif font-extrabold text-[#2D231B] text-base">{intro.title}</h4>
                <p className="text-xs text-[#7C7167] font-semibold mt-1">{intro.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {intro.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInput(sug.input)}
                    className="px-3 py-1.5 bg-white border border-[#E8E2D9] text-[10px] font-bold text-[#7C7167] rounded-full hover:border-[#F28482] hover:text-[#F28482] transition-all cursor-pointer"
                  >
                    {sug.text}
                  </button>
                ))}
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
                        <div className="flex flex-wrap gap-2 mb-3 justify-center">
                          {msg.imageData.split('|||').map((imgUrl, i) => (
                            <img
                              key={i}
                              src={imgUrl}
                              alt={`Uploaded visual thread ${i + 1}`}
                              className="rounded-xl max-h-48 object-contain border border-[#E8E2D9]"
                            />
                          ))}
                        </div>
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
          {/* Image attachment preview drawer */}
          {attachments.length > 0 && (
            <div className="mb-3 p-2.5 bg-[#FDFCFB] border border-[#E8E2D9] rounded-xl flex items-center justify-between w-full gap-4 animate-scale-up">
              <div className="flex flex-wrap gap-2.5 items-center">
                {attachments.map((att, index) => (
                  <div key={index} className="relative group w-12 h-12">
                    <img src={att.preview} className="w-12 h-12 rounded-lg object-cover border border-[#E8E2D9]" alt={`attachment-${index}`} />
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md flex items-center justify-center cursor-pointer border border-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <span className="text-[10px] text-[#7C7167] font-bold font-mono ml-2">
                  {attachments.length} photo{attachments.length > 1 ? 's' : ''} attached
                </span>
              </div>
              <button
                type="button"
                onClick={clearAttachments}
                className="p-1 hover:bg-[#E8E2D9]/40 text-[#A89F94] hover:text-[#2D231B] rounded font-bold text-xs cursor-pointer"
              >
                Discard All
              </button>
            </div>
          )}

          {/* Camera capture screen */}
          {cameraActive && (
            <div className="mb-3 p-3 bg-[#F9F6F2] border border-[#E8E2D9] rounded-xl flex flex-col items-center gap-3 shrink-0 animate-fadeIn">
              <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-[#E8E2D9] bg-black aspect-video shadow-inner">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-2 bg-[#F28482] hover:bg-[#F28482]/95 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Capture Photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-2 bg-white border border-[#E8E2D9] text-[#7C7167] hover:bg-stone-50 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 bg-[#FDFCFB] px-4 py-3 border border-[#E8E2D9] focus-within:ring-1 focus-within:ring-[#F28482] focus-within:border-[#F28482] transition-all warm-shadow rounded-2xl">

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
              className="p-2 rounded-xl text-[#A89F94] hover:text-[#F28482] hover:bg-[#F28482]/5 transition-colors cursor-pointer"
              title="Attach image"
            >
              <Image className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={cameraActive ? stopCamera : startCamera}
              className="p-2 rounded-xl text-[#A89F94] hover:text-[#F28482] hover:bg-[#F28482]/5 transition-colors cursor-pointer"
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
              className="flex-1 bg-transparent border-none text-xs text-[#2D231B] focus:outline-none placeholder-[#A89F94] font-semibold"
            />

            <button
              type="submit"
              disabled={loading || (!input.trim() && attachments.length === 0)}
              className="p-2.5 bg-[#F28482] hover:bg-[#F28482]/85 text-white rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:hover:translate-y-0 text-xs shrink-0 cursor-pointer"
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

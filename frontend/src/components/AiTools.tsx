/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Camera, Image, Wand2, Sparkles, AlertCircle, RefreshCw, Layers, Palette, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';

interface AiToolsProps {
  token: string;
}

export function AiTools({ token }: AiToolsProps) {
  const [activeTab, setActiveTab] = useState<'decoder' | 'reverse' | 'color'>('decoder');
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // For camera feed capturing
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const tabs = [
    {
      id: 'decoder' as const,
      name: 'Pattern Decoder',
      description: 'Convert Crochet pattern screenshots or booklet snapshots into clean, step by step patterns.',
      icon: Layers,
      color: 'text-[#F28482]',
      endpoint: '/api/v1/pattern-decoder'
    },
    {
      id: 'reverse' as const,
      name: 'Visual Reverse-Engineer',
      description: 'Upload a photo of any finished item or swatch, and let AI figure out the stitches, hook sizes, and patterns needed to recreate it.',
      icon: Eye,
      color: 'text-[#84A59D]',
      endpoint: '/api/v1/reverse-engineer'
    },
    {
      id: 'color' as const,
      name: 'Yarn Color Matcher',
      description: 'Scan colors in any inspiration photograph to match real commercial yarn skeins.',
      icon: Palette,
      color: 'text-[#F5CAC3]',
      endpoint: '/api/v1/ai/color-matcher'
    }
  ];

  const activeTabDetails = tabs.find(t => t.id === activeTab)!;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an valid image file.');
      return;
    }
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      const rawBase64 = (reader.result as string).split(',')[1];
      setImageBase64(rawBase64);
      setError(null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Camera capture handlers
  const startCamera = async () => {
    setError(null);
    setResult(null);
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
      setError('Camera access failed. Please upload an image format or check browser specifications.');
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
        setImagePreview(dataUrl);
        setImageMime('image/jpeg');
        setImageBase64(dataUrl.split(',')[1]);

        stopCamera();
        setError(null);
        setResult(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setError('Please provide an image snapshot first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(activeTabDetails.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          imageBase64,
          imageMime
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI multimodal calculation failed.');
      }
      setResult(data.result);
    } catch (err: any) {
      setError(err.message || 'Error executing vision pipeline.');
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
  };

  return (
    <div id="ai-tools bg-layer" className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-3xl border border-[#E8E2D9] warm-shadow">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold font-serif text-[#2D231B] tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-vibrant-peach animate-pulse fill-[#F5CAC3] text-transparent" />
            AI Tools Studio
          </h2>
          <p className="text-xs text-[#7C7167] font-semibold">Empower your craft with the power of AI.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-[#F9F6F2] p-1 rounded-2xl border border-[#E8E2D9] w-full md:w-auto overflow-x-auto scrollbar-none shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); setError(null); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-[#F28482] text-white shadow-md'
                : 'text-[#7C7167] hover:bg-[#E8E2D9]/40'
                }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Multimodal ingestion canvas */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-[#E8E2D9] warm-shadow flex flex-col space-y-4">
            <div className="border-b border-[#F9F6F2] pb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#F28482] block">Input</span>
              <h3 className="text-sm font-extrabold text-[#2D231B] mt-1">{activeTabDetails.name}</h3>
              <p className="text-xs text-[#7C7167] font-semibold mt-1 leading-relaxed">{activeTabDetails.description}</p>
            </div>

            {/* Main Interactive Stage */}
            {!imagePreview && !cameraActive ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all min-h-[250px] cursor-pointer ${dragActive
                  ? 'border-[#F28482] bg-[#F28482]/5'
                  : 'border-[#E8E2D9] hover:border-[#F28482]/40 bg-[#FDFCFB]'
                  }`}
              >
                <div className="w-12 h-12 bg-[#F28482]/10 rounded-xl flex items-center justify-center text-[#F28482] mb-4 border border-[#F28482]/20 shadow-inner">
                  <Image className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-[#7C7167] text-center">Drag pattern snapshot here, or</p>
                <div className="flex gap-2.5 mt-3">
                  <input
                    type="file"
                    id="ai-tool-file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <label
                    htmlFor="ai-tool-file"
                    className="px-3.5 py-2 bg-white border border-[#E8E2D9] text-[#7C7167] font-bold rounded-xl text-xs hover:bg-[#F9F6F2] cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Image className="w-3.5 h-3.5" />
                    Upload File
                  </label>
                  <button
                    onClick={startCamera}
                    className="px-3.5 py-2 bg-[#84A59D] hover:bg-[#84A59D]/85 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transform hover:-translate-y-0.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Open Camera
                  </button>
                </div>
                <p className="text-[10px] text-[#A89F94] font-bold uppercase tracking-wider mt-5">JPEG, PNG formats accepted</p>
              </div>
            ) : cameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-black min-h-[250px] flex flex-col justify-between">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-[240px] object-cover"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                  <button
                    onClick={capturePhoto}
                    className="px-4 py-2 bg-[#84A59D] hover:bg-[#84A59D]/85 text-white rounded-full font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    Snap Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 bg-stone-850 hover:bg-stone-900 text-stone-300 rounded-full font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-[#E8E2D9] bg-[#F9F6F2] animate-scale-up">
                <img
                  src={imagePreview}
                  alt="Captured Preview"
                  className="w-full max-h-[300px] object-contain mx-auto block"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-2 bg-white/95 hover:bg-red-50 text-[#7C7167] hover:text-red-500 rounded-full border border-[#E8E2D9] shadow-md transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 cursor-pointer" />
                </button>
              </div>
            )}

            {/* Execute AI Action buttons */}
            {imageBase64 && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full py-3 bg-[#F28482] hover:bg-[#F28482]/85 text-white font-bold rounded-xl transition-all shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>AI is deciphering stitches...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Run AI {activeTabDetails.name}</span>
                  </>
                )}
              </button>
            )}

            {error && (
              <div className="p-3 bg-red-55 border border-red-100 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI parsed results board */}
        <div className="lg:col-span-7 flex flex-col h-full">
          <div className="bg-white rounded-3xl p-6 border border-[#E8E2D9] warm-shadow-lg flex flex-col min-h-[400px] h-full">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#A89F94]">Result</span>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-[#FDFBF7] border-t-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-4 border-[#F5CAC3]/20 border-b-transparent animate-spin" style={{ animationDirection: 'reverse' }}></div>
                  <span className="absolute inset-0 flex items-center justify-center text-xl">🧶</span>
                </div>
                <div className="text-center max-w-[280px]">
                  <p className="text-xs font-bold text-[#F28482] tracking-widest uppercase">Executing AI Engine</p>
                  <p className="text-xs text-[#7C7167] mt-1 italic font-semibold hover:none">"AI is analyzing picture pixels, tracking curves, and resolving skein matches..."</p>
                </div>
              </div>
            ) : result ? (
              <div className="mt-4 flex-1 prose overflow-y-auto max-h-[500px] scrollbar-thin bg-[#FDFBF7] p-5 border border-[#E8E2D9] rounded-2xl markdown-body warm-shadow animate-fade-in">
                <Markdown>{result}</Markdown>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#E8E2D9] rounded-2xl bg-[#FDFCFB] mt-4">
                <div className="w-12 h-12 bg-[#F28482]/10 text-[#F28482]/80 rounded-full flex items-center justify-center mb-3 border border-[#F28482]/20 shadow-inner">
                  <Wand2 className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-[#2D231B] uppercase tracking-wider">Decoded Results</h4>
                <p className="text-xs text-[#A89F94] mt-1 max-w-[320px] font-semibold">Upload or snap a photograph of your pattern diagram, row stitch notes, or real-life inspiration object to generate visual translations instantly.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

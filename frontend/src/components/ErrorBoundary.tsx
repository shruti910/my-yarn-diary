import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
 children?: ReactNode;
}

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
 public state: State = {
 hasError: false,
 error: null
 };

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error('[Error Boundary Intercepted Exception]:', error, errorInfo);
 }

 public render() {
 if (this.state.hasError) {
 return (
 <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-center self-center my-6 max-w-lg mx-auto">
 <div className="w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl mb-4 font-mono font-bold">
 ⚠️
 </div>
 <h2 className="text-xl font-bold font-sans text-zinc-100 tracking-tight">Something went unexpected</h2>
 <p className="text-sm text-zinc-400 mt-2 font-mono">
 {this.state.error?.message || 'An unhandled JavaScript component error occurred.'}
 </p>
 <button
 onClick={() => window.location.reload()}
 className="mt-6 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-650 transition text-sm font-sans font-medium text-zinc-200 border border-zinc-700/50 rounded-lg cursor-pointer"
 >
 Refresh Workbench
 </button>
 </div>
 );
 }

 return this.props.children;
 }
}

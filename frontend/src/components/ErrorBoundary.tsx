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
 <div className="min-h-[280px] sm:min-h-[360px] flex flex-col items-center justify-center p-6 sm:p-8 bg-white border border-subtle rounded-3xl warm-shadow-lg text-center self-center my-6 max-w-lg mx-auto">
 <div className="w-14 h-14 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-2xl mb-4">
 🧶
 </div>
 <h2 className="text-lg sm:text-xl font-extrabold font-serif text-heading tracking-tight">
 Oops — a dropped stitch!
 </h2>
 <p className="text-xs sm:text-sm text-muted mt-2 font-semibold max-w-[320px] leading-relaxed">
 Something went wrong on this screen. Your projects and journal entries are safe —
 reloading usually picks the stitch right back up.
 </p>
 {this.state.error?.message && (
 <p className="text-[11px] text-muted/80 mt-3 break-words max-w-full">
 {this.state.error.message}
 </p>
 )}
 <button
 onClick={() => window.location.reload()}
 className="sewing-button mt-6 px-7 py-2.5 text-xs sm:text-sm"
 >
 Reload the page
 </button>
 </div>
 );
 }

 return this.props.children;
 }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
 NotebookPen, Sparkles, ScanText, ScanSearch, Images, Globe,
 Heart, Plus, ArrowRight,
} from 'lucide-react';

interface LandingPageProps {
 /** Open the auth screen in sign-in mode. */
 onSignIn: () => void;
 /** Open the auth screen in create-account mode. */
 onGetStarted: () => void;
}

/* ------------------------------------------------------------------ content */

const FEATURES = [
 {
  Icon: NotebookPen,
  title: 'Project journal',
  desc: 'Track every make from cast-on to finish — photos, notes, progress, and the yarns and hooks you used on each one.',
 },
 {
  Icon: Sparkles,
  title: 'AI crochet buddy',
  desc: 'Ask anything — stitch counts, pattern help, yarn substitutions — from an always-on helper.',
 },
 {
  Icon: ScanText,
  title: 'Pattern decoder',
  desc: 'Upload or snap a photo of a pattern and turn dense abbreviations into clear, step-by-step instructions you can follow.',
 },
 {
  Icon: ScanSearch,
  title: 'Visual reverse engineer',
  desc: 'Analyze a finished piece or swatch and let the AI work backwards into a readable pattern.',
 },
 {
  Icon: Images,
  title: 'Photo gallery',
  desc: 'A beautiful gallery of everything you have made, gathered together in one place.',
 },
 {
  Icon: Globe,
  title: 'US / UK terms',
  desc: 'Switch between US and UK stitch terminology instantly — no more mental conversions.',
 },
];

const FAQS = [
 { q: 'Is My Yarn Diary free?', a: 'Yes — it is completely free while we are in development. Any future paid plans will always keep a generous free tier.' },
 { q: 'Do I need to be an expert to use it?', a: 'Not at all. Whether you just learned to chain or you sell your makes, the app adapts to how you craft.' },
 { q: 'Can the AI really help with patterns?', a: 'Yes. Decode written patterns into clear steps, reverse-engineer a finished piece, or just ask the AI buddy about stitches, sizing and yarn swaps.' },
 { q: 'Is my data private?', a: 'Your projects and photos are yours. We never sell your data — see our Privacy Policy for the full details.' },
 { q: 'What devices does it work on?', a: 'Everything. My Yarn Diary is fully responsive and works beautifully on phone, tablet and desktop.' },
 { q: 'Can I import my own patterns?', a: 'Absolutely — upload your pattern PDFs or images and read them right inside the app in a calm focus mode.' },
];

const FOOTER: Record<string, [string, string][]> = {
 Product: [['Features', '#features'], ['AI Buddy', '#features'], ['Pattern decoder', '#features'], ['Mobile', '#']],
 Company: [['About', '#'], ['Blog', '#'], ['Contact', 'mailto:myyarndiary@gmail.com'], ['Support', 'mailto:myyarndiary@gmail.com']],
 Legal: [['Terms of Service', '#'], ['Privacy Policy', '#'], ['Cookie Policy', '#'], ['Licenses', '#']],
};

/* ------------------------------------------------------------- little parts */

const PRIMARY_GRADIENT = 'linear-gradient(135deg, hsl(343.88deg 42.46% 54.16%) 0%, #803b4d 100%)';

function PrimaryBtn({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
 return (
  <button
   onClick={onClick}
   style={{ backgroundImage: PRIMARY_GRADIENT }}
   className={`inline-flex items-center justify-center gap-2 rounded-full font-serif font-bold text-white shadow-[0_8px_20px_rgba(128,59,77,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(128,59,77,0.36)] active:translate-y-0 cursor-pointer ${className}`}
  >
   {children}
  </button>
 );
}

function GhostBtn({ children, onClick, className = '' }: { children: ReactNode; onClick: () => void; className?: string }) {
 return (
  <button
   onClick={onClick}
   className={`inline-flex items-center justify-center gap-2 rounded-full font-serif font-bold text-accent border-[1.5px] border-brand transition-all duration-200 hover:bg-brand/10 cursor-pointer ${className}`}
  >
   {children}
  </button>
 );
}

/** Running-stitch dashed divider. */
function StitchDivider() {
 return (
  <hr
   className="max-w-[1180px] mx-auto"
   style={{ border: 'none', borderTop: '2.5px dashed var(--color-brand)', opacity: 0.5 }}
  />
 );
}

/* -------------------------------------------------------- crochet photo art */
/* Original vector illustrations in the brand palette. Swap for real project
   photos later — the polaroid frames are ready to hold <img> instead. */

function GrannySquareArt() {
 return (
  <svg viewBox="0 0 220 180" preserveAspectRatio="xMidYMid slice" aria-label="Crochet granny square">
   <rect width="220" height="180" fill="#f7e9ec" />
   <g transform="translate(110,90)">
    <rect x="-80" y="-80" width="160" height="160" rx="9" fill="none" stroke="#803b4d" strokeWidth="13" strokeDasharray="3 9.5" strokeLinecap="round" />
    <rect x="-60" y="-60" width="120" height="120" rx="8" fill="none" stroke="#c9698a" strokeWidth="13" strokeDasharray="3 9.5" strokeLinecap="round" />
    <rect x="-40" y="-40" width="80" height="80" rx="7" fill="none" stroke="#d6708a" strokeWidth="13" strokeDasharray="3 9.5" strokeLinecap="round" />
    <rect x="-20" y="-20" width="40" height="40" rx="6" fill="none" stroke="#eaa7ba" strokeWidth="13" strokeDasharray="3 9" strokeLinecap="round" />
    <circle r="10" fill="#f4d9df" />
    <circle r="10" fill="none" stroke="#d6708a" strokeWidth="3.5" />
   </g>
  </svg>
 );
}

function ScarfArt() {
 return (
  <svg viewBox="0 0 220 180" preserveAspectRatio="xMidYMid slice" aria-label="Crochet winter scarf">
   <rect width="220" height="180" fill="#f5e6ea" />
   <g transform="rotate(-9 110 90)">
    <rect x="84" y="-8" width="52" height="150" rx="11" fill="#c9698a" />
    <g stroke="#b0546f" strokeWidth="3.2" strokeLinecap="round">
     <line x1="94" y1="-4" x2="94" y2="138" /><line x1="102" y1="-4" x2="102" y2="138" />
     <line x1="110" y1="-4" x2="110" y2="138" /><line x1="118" y1="-4" x2="118" y2="138" />
     <line x1="126" y1="-4" x2="126" y2="138" />
    </g>
    <rect x="84" y="30" width="52" height="13" fill="#f4d9df" />
    <rect x="84" y="58" width="52" height="13" fill="#f4d9df" />
    <g stroke="#c9698a" strokeWidth="4.4" strokeLinecap="round">
     <line x1="92" y1="142" x2="89" y2="168" /><line x1="102" y1="142" x2="101" y2="171" />
     <line x1="110" y1="142" x2="110" y2="170" /><line x1="118" y1="142" x2="120" y2="171" />
     <line x1="128" y1="142" x2="131" y2="168" />
    </g>
   </g>
  </svg>
 );
}

function BearArt() {
 return (
  <svg viewBox="0 0 220 180" preserveAspectRatio="xMidYMid slice" aria-label="Amigurumi crochet bear">
   <rect width="220" height="180" fill="#f6e7ec" />
   <g transform="translate(110,92)">
    <circle cx="-34" cy="-50" r="18" fill="#c9698a" /><circle cx="34" cy="-50" r="18" fill="#c9698a" />
    <circle cx="-34" cy="-50" r="9" fill="#eaa7ba" /><circle cx="34" cy="-50" r="9" fill="#eaa7ba" />
    <ellipse cx="0" cy="52" rx="42" ry="37" fill="#d6708a" />
    <circle cx="-42" cy="40" r="14" fill="#c9698a" /><circle cx="42" cy="40" r="14" fill="#c9698a" />
    <circle cx="-20" cy="82" r="13" fill="#c9698a" /><circle cx="20" cy="82" r="13" fill="#c9698a" />
    <ellipse cx="0" cy="56" rx="24" ry="21" fill="#f4d9df" />
    <circle cx="0" cy="-28" r="44" fill="#d6708a" />
    <ellipse cx="0" cy="-15" rx="22" ry="17" fill="#f4d9df" />
    <ellipse cx="0" cy="-24" rx="5.2" ry="3.8" fill="#7a3346" />
    <path d="M0 -20 v6" stroke="#7a3346" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    <circle cx="-16" cy="-32" r="4.6" fill="#3a1a24" /><circle cx="16" cy="-32" r="4.6" fill="#3a1a24" />
    <circle cx="-14.4" cy="-33.6" r="1.5" fill="#fff" /><circle cx="17.6" cy="-33.6" r="1.5" fill="#fff" />
   </g>
  </svg>
 );
}

type ArtComp = () => ReactNode;

const POLAROIDS: { Art: ArtComp; cap: string; delay: string; desk: string; mob: string }[] = [
 { Art: GrannySquareArt, cap: 'granny square', delay: '0s', desk: 'top-2 left-4 -rotate-6 z-[2] w-[210px]', mob: '-rotate-3' },
 { Art: ScarfArt, cap: 'winter scarf', delay: '-2s', desk: 'top-16 right-1 rotate-[5deg] z-[3] w-[190px]', mob: 'rotate-2' },
 { Art: BearArt, cap: 'amigurumi bear', delay: '-4s', desk: 'bottom-0 left-16 rotate-[3deg] z-[1] w-[180px]', mob: '-rotate-1' },
];

/** A single taped polaroid. `className` supplies position/width/rotation. */
function Polaroid({ Art, cap, className, delay }: { Art: ArtComp; cap: string; className: string; delay: string }) {
 return (
  <div
   className={`bg-white p-2.5 pb-10 rounded-md shadow-[0_14px_34px_rgba(70,40,50,0.20)] animate-float ${className}`}
   style={{ animationDelay: delay }}
  >
   <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 -rotate-3 w-[66px] h-6 rounded-sm bg-brand/35" />
   <div className="h-[170px] rounded-sm overflow-hidden bg-[#f4dbe1] [&>svg]:block [&>svg]:w-full [&>svg]:h-full">
    <Art />
   </div>
   <div className="grand-hotel-regular text-center text-[22px] text-accent mt-2 leading-none">{cap}</div>
  </div>
 );
}

/* ------------------------------------------------------------------- screen */

export function LandingPage({ onSignIn, onGetStarted }: LandingPageProps) {
 return (
  <div
   className="min-h-screen font-sans text-body overflow-x-hidden"
   style={{ background: 'radial-gradient(1200px 600px at 15% -5%, rgba(214,112,138,0.10), transparent 60%), #f7f0ee' }}
  >
   {/* ---------------- Nav ---------------- */}
   <header className="max-w-[1180px] mx-auto flex items-center justify-between px-6 py-5">
    <span className="grand-hotel-regular text-[28px] sm:text-[34px] leading-none">My Yarn Diary</span>
    <nav className="flex items-center gap-3 sm:gap-7">
     <a href="#features" className="hidden md:inline font-serif font-semibold text-sm text-body hover:text-brand transition-colors">Features</a>
     <a href="#faq" className="hidden md:inline font-serif font-semibold text-sm text-body hover:text-brand transition-colors">FAQ</a>
     <GhostBtn onClick={onSignIn} className="hidden sm:inline-flex px-4 py-2 text-sm">Sign in</GhostBtn>
     <PrimaryBtn onClick={onGetStarted} className="px-4 sm:px-5 py-2.5 text-sm">Start your diary</PrimaryBtn>
    </nav>
   </header>

   {/* ---------------- Hero ---------------- */}
   <section className="max-w-[1180px] mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center px-6 pt-8 pb-16">
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
     <span className="font-mono uppercase tracking-[0.18em] text-[11px] font-medium text-accent">✿ Handmade&nbsp;&nbsp;·&nbsp;&nbsp;AI-assisted</span>
     <h1 className="font-serif font-bold text-heading text-balance leading-[1.08] text-[clamp(38px,6vw,66px)] mt-3.5 mb-2">
      Every stitch,<br />
      <span className="grand-hotel-regular">lovingly logged.</span>
     </h1>
     <p className="text-lg leading-relaxed text-muted max-w-[440px] mb-7">
      The cozy home for your crochet projects — track your makes, note the yarns and hooks behind each one, and keep a clever AI helper in your pocket.
     </p>
     <div className="flex flex-wrap items-center gap-3.5">
      <PrimaryBtn onClick={onGetStarted} className="px-6 py-3 text-base">Start your diary — it’s free</PrimaryBtn>
      <GhostBtn onClick={onSignIn} className="px-6 py-3 text-base">Sign in</GhostBtn>
     </div>
     <div className="mt-6 font-mono text-xs text-muted flex items-center gap-2">
      Stitched with love <Heart className="w-3.5 h-3.5 text-brand fill-current" /> &nbsp;·&nbsp; works on every device
     </div>
    </motion.div>

    {/* Polaroid collage — scattered on desktop, tidy flex-wrap on mobile */}
    <div className="hidden lg:block relative h-[440px]">
     {POLAROIDS.map(({ Art, cap, desk, delay }) => (
      <Polaroid key={cap} Art={Art} cap={cap} delay={delay} className={`absolute ${desk}`} />
     ))}
    </div>
    <div className="lg:hidden flex flex-wrap justify-center items-start gap-6 pt-4">
     {POLAROIDS.map(({ Art, cap, mob, delay }) => (
      <Polaroid key={cap} Art={Art} cap={cap} delay={delay} className={`relative w-[140px] ${mob}`} />
     ))}
    </div>
   </section>

   <StitchDivider />

   {/* ---------------- Features ---------------- */}
   <section id="features" className="max-w-[1180px] mx-auto px-6 py-[74px]">
    <div className="text-center max-w-[620px] mx-auto mb-12">
     <span className="font-mono uppercase tracking-[0.18em] text-[11px] font-medium text-brand">Everything in one basket</span>
     <h2 className="font-serif font-bold text-heading text-[clamp(30px,4vw,44px)] mt-2.5">Made for the way you craft</h2>
     <p className="text-muted mt-3 text-[16.5px] leading-relaxed">
      From the first chain to the final weave-in, My Yarn Diary keeps the whole journey in one warm little place.
     </p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-[22px]">
     {FEATURES.map(({ Icon, title, desc }, i) => (
      <motion.div
       key={title}
       initial={{ opacity: 0, y: 22 }}
       whileInView={{ opacity: 1, y: 0 }}
       viewport={{ once: true, margin: '-60px' }}
       transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
       className="relative bg-[#fffdfc] border border-[#efe3e0] rounded-2xl px-6 pt-[26px] pb-6 shadow-[0_10px_26px_rgba(120,70,80,0.06)] transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[0_18px_36px_rgba(120,70,80,0.12)]"
      >
       <span className="absolute left-6 right-6 top-3.5 border-t-2 border-dashed border-brand/30" />
       <div className="w-12 h-12 rounded-[14px] bg-brand/12 text-accent flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" strokeWidth={1.8} />
       </div>
       <h3 className="font-serif font-bold text-heading text-[19px] mb-2">{title}</h3>
       <p className="text-[14.5px] text-muted leading-relaxed">{desc}</p>
      </motion.div>
     ))}
    </div>
   </section>

   <StitchDivider />

   {/* ---------------- FAQ ---------------- */}
   <section id="faq" className="max-w-[1180px] mx-auto px-6 py-[74px]">
    <div className="text-center mb-11">
     <span className="font-mono uppercase tracking-[0.18em] text-[11px] font-medium text-brand">Good to know</span>
     <h2 className="font-serif font-bold text-heading text-[clamp(30px,4vw,44px)] mt-2.5">Questions &amp; answers</h2>
    </div>
    <div className="max-w-[760px] mx-auto">
     {FAQS.map(({ q, a }) => (
      <details key={q} className="group bg-[#fffdfc] border border-[#efe3e0] rounded-xl mb-3 overflow-hidden">
       <summary className="cursor-pointer list-none px-[22px] py-[18px] font-serif font-bold text-base text-heading flex justify-between items-center gap-4">
        {q}
        <Plus className="w-5 h-5 text-brand shrink-0 transition-transform duration-200 group-open:rotate-45" />
       </summary>
       <div className="px-[22px] pb-5 text-[14.5px] text-muted leading-relaxed">{a}</div>
      </details>
     ))}
    </div>
    <div className="text-center mt-12">
     <PrimaryBtn onClick={onGetStarted} className="px-7 py-3.5 text-base">
      Start your diary <ArrowRight className="w-[18px] h-[18px]" />
     </PrimaryBtn>
    </div>
   </section>

   {/* ---------------- Footer ---------------- */}
   <footer className="text-[#f3dfe6] pt-14 pb-8 px-6" style={{ background: '#5e2a39' }}>
    <div className="max-w-[1180px] mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
     <div>
      <div className="grand-hotel-regular text-3xl text-white mb-3">My Yarn Diary</div>
      <p className="text-white/60 text-sm leading-relaxed max-w-[260px]">
       Your AI companion &amp; journal for modern crochet. Made with love, one stitch at a time.
      </p>
     </div>
     {Object.entries(FOOTER).map(([heading, links]) => (
      <div key={heading}>
       <h5 className="font-serif text-white text-[13px] uppercase tracking-[0.1em] mb-3.5">{heading}</h5>
       <ul>
        {links.map(([label, href]) => (
         <li key={label} className="mb-2.5">
          <a href={href} className="text-white/70 text-sm hover:text-white transition-colors">{label}</a>
         </li>
        ))}
       </ul>
      </div>
     ))}
    </div>
    <div className="max-w-[1180px] mx-auto mt-9 pt-5 border-t border-white/12 flex flex-wrap justify-between gap-3 font-mono text-xs text-white/50">
     <span>© 2026 My Yarn Diary · In development</span>
     <span className="flex items-center gap-1.5">Stitched with <Heart className="w-3 h-3 fill-current" /></span>
    </div>
   </footer>
  </div>
 );
}

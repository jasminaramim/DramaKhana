import { Sparkles, Heart, Film, Globe, Code2, ShieldCheck, ArrowRight } from 'lucide-react';

interface AboutUsPageProps {
  onNavigate: (path: string) => void;
}

export function AboutUsPage({ onNavigate }: AboutUsPageProps) {
  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-12">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF6A]/15 border border-[#D4AF6A]/35 text-[#D4AF6A] text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Our Mission & Heritage
        </div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          About Drama<span className="text-[#D4AF6A]">Khana</span>
        </h1>
        <p className="text-sm sm:text-base text-white/70 leading-relaxed">
          DramaKhana (ڈراما خانہ) is a premier digital sanctuary dedicated to immortalizing, cataloging, and celebrating the golden era and modern masterpieces of Pakistani dramatic storytelling.
        </p>
      </div>

      {/* Narrative & Visual Grid */}
      <div className="space-y-12">
        {/* Story Section */}
        <section className="bg-[#1A211D] border border-white/10 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="max-w-3xl space-y-5 relative z-10 text-white/80 text-sm sm:text-base leading-relaxed">
            <span className="text-xs font-mono uppercase tracking-widest text-[#087F5B] font-bold">
              The Genesis
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Revitalizing the Soul of Urdu Television
            </h2>
            <p>
              Pakistani television dramas represent one of the subcontinent’s most nuanced, intellectually rich, and emotionally profound artistic traditions. From epochal literary adaptations such as <em>Parizaad</em> and <em>Humsafar</em> to contemporary blockbusters like <em>Dar-e-Nijaat</em> and <em>Kabhi Main Kabhi Tum</em>, these narratives explore faith, sacrifice, societal dynamics, and human endurance.
            </p>
            <p>
              DramaKhana was created to deliver an uncompromised, theater-grade streaming experience tailored for drama connoisseurs worldwide. We unite official broadcaster YouTube streams, synchronized episode chronologies, and exclusive high-bitrate media previews under a single aesthetic umbrella honoring Lahore and Mughal architectural elegance.
            </p>
          </div>
        </section>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#1A211D] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#087F5B]/30 border border-[#087F5B]/60 flex items-center justify-center text-[#48d597]">
              <Film className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">100% Verified Content</h3>
            <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
              We curate only official broadcasts and authorized releases from Pakistan’s top studios: ARY Digital, HUM TV, Har Pal Geo, and Green Entertainment.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A211D] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF6A]/20 border border-[#D4AF6A]/50 flex items-center justify-center text-[#D4AF6A]">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">Viewer-Centric Experience</h3>
            <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
              Smart next-episode suggestions, 1-click video and poster downloads, private watchlist synchronization, and zero disruptive popups.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#1A211D] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">Ethical & Compliant</h3>
            <p className="text-xs sm:text-sm text-white/65 leading-relaxed">
              Strict compliance with Google Publisher Policies, DMCA Safe Harbor, and official YouTube API Terms of Service.
            </p>
          </div>
        </div>

        {/* Creator & Engineering Spotlight */}
        <section className="bg-gradient-to-r from-[#17221C] to-[#121915] border border-[#D4AF6A]/30 rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#D4AF6A]">
              <Code2 className="w-4 h-4" />
              ENGINEERED & MAINTAINED BY
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Jasmin — Full-Stack Architect
            </h2>
            <p className="text-sm text-white/75 leading-relaxed">
              DramaKhana is built and maintained by Jasmin, a full-stack engineer passionate about performant web architectures, cultural digital preservation, and cinematic frontend experiences.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://jasmin-v01.vercel.app/"
                target="_blank"
                rel="noreferrer"
                className="h-10 px-5 rounded-xl bg-[#087F5B] hover:bg-[#099268] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-md"
              >
                <Globe className="w-4 h-4" />
                Visit Jasmin&apos;s Portfolio
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="h-10 px-4 rounded-xl bg-[#1A211D] border border-white/15 hover:border-[#D4AF6A] text-white text-xs font-medium cursor-pointer transition-colors"
              >
                Get in Touch
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#101512] border border-white/10 text-center w-full md:w-auto shrink-0 space-y-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#087F5B] to-[#D4AF6A] mx-auto flex items-center justify-center font-display text-2xl font-bold text-white shadow-xl">
              J
            </div>
            <h4 className="font-bold text-white text-sm">Jasmin</h4>
            <p className="text-xs text-[#D4AF6A]">Software Engineer</p>
            <p className="text-[11px] text-white/50 font-mono">contact@dramakhana.com</p>
          </div>
        </section>
      </div>
    </div>
  );
}


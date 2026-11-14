import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Play, Volume2, VolumeX } from 'lucide-react';
import type { Drama } from '../types';
import { MediaImage } from './MediaImage';

interface HeroBannerProps {
  dramas: Drama[];
  onWatchDrama: (drama: Drama) => void;
  onViewDetails: (slug: string) => void;
}

export function HeroBanner({ dramas, onWatchDrama, onViewDetails }: HeroBannerProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const safeDramas = dramas.length > 0 ? dramas : [];
  const active = safeDramas[index % Math.max(safeDramas.length, 1)];

  // Set hero1.mp4 for Hero Section 1 (index 0) and hero2.mp4 for Hero Section 2 (index 1)
  const activeHeroVideo =
    index === 0
      ? '/hero1.mp4'
      : index === 1
      ? '/hero2.mp4'
      : active?.heroVideo;

  useEffect(() => {
    setVideoLoaded(false);
    setVideoError(false);
  }, [index, activeHeroVideo]);

  useEffect(() => {
    if (safeDramas.length <= 1 || paused) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeDramas.length);
    }, 8500);
    return () => window.clearInterval(id);
  }, [safeDramas.length, paused]);

  if (!active) return null;

  const goPrev = () => setIndex((prev) => (prev - 1 + safeDramas.length) % safeDramas.length);
  const goNext = () => setIndex((prev) => (prev + 1) % safeDramas.length);

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-full min-h-[520px] lg:min-h-[620px] flex items-end overflow-hidden border-b border-white/10"
    >
      {/* Background Banner: Video & Poster Image */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Fallback & base poster image */}
        <MediaImage
          src={active.banner || active.poster}
          alt={active.title}
          fallbackTitle={active.title}
          className="w-full h-full object-cover object-center"
        />

        {/* Hero Background Video (hero1.mp4 for section 1, hero2.mp4 for section 2) */}
        {activeHeroVideo && !videoError && (
          <video
            ref={videoRef}
            key={activeHeroVideo}
            src={activeHeroVideo}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => setVideoError(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 pointer-events-none ${
              videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Measured contrast scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101512] via-[#101512]/60 to-[#101512]/25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#101512]/95 via-[#101512]/65 to-transparent pointer-events-none" />
      </div>

      {/* Subtle Pakistani Architectural Corner Hairline Motif */}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        className="hidden lg:block absolute top-8 right-10 w-24 h-24 text-[#D4AF6A]/25 pointer-events-none z-10"
        fill="none"
      >
        <path d="M10 110 V42 C10 22 26 10 46 10 H110" stroke="currentColor" strokeWidth="1" />
        <path d="M22 110 V48 C22 32 34 22 50 22 H110" stroke="currentColor" strokeWidth="0.75" />
      </svg>

      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-8 pb-12 pt-24 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#D4AF6A] mb-3">
            {activeHeroVideo && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#087F5B]/30 border border-[#087F5B]/60 text-[#48d597]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#48d597] animate-pulse" />
                {index === 0 ? 'Trending #1 · Dar-e-Nijaat' : index === 1 ? 'Trending #2 · Kabhi Main Kabhi Tum' : 'Featured Serial'}
              </span>
            )}
            <span>Featured Serial</span>
            <span aria-hidden="true">·</span>
            <span>{active.channel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{active.releaseYear}</span>
            {active.genres.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{active.genres.slice(0, 2).join(' / ')}</span>
              </>
            )}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.06] text-balance mb-4">
            {active.title}
          </h1>

          <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl mb-6 line-clamp-3">
            {active.description}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onWatchDrama(active)}
              className="h-11 px-6 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-[#087F5B]/30"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Now
            </button>
            <button
              type="button"
              onClick={() => onViewDetails(active.slug)}
              className="h-11 px-5 rounded-lg bg-[#1A211D]/90 hover:bg-[#232D27] border border-white/15 text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Info className="w-4 h-4 text-[#D4AF6A]" />
              More Details
            </button>
            {activeHeroVideo && (
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? 'Unmute hero video audio' : 'Mute hero video audio'}
                className="h-11 px-4 rounded-lg bg-[#1A211D]/90 hover:bg-[#232D27] border border-white/15 text-white/90 hover:text-white text-sm font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-white/60" />
                    <span className="text-xs">Unmute</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#D4AF6A]" />
                    <span className="text-xs text-[#D4AF6A]">Sound On</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Slider Controls */}
        {safeDramas.length > 1 && (
          <div className="flex items-center gap-4 self-start lg:self-end">
            <div className="flex items-center gap-2">
              {safeDramas.map((d, idx) => (
                <button
                  key={d._id}
                  type="button"
                  aria-label={`Select featured drama ${idx + 1}: ${d.title}`}
                  onClick={() => setIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === index ? 'w-8 bg-[#D4AF6A]' : 'w-2.5 bg-white/30 hover:bg-white/50'
                  }`}
                  title={`Hero ${idx + 1}: ${d.title}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous featured drama"
                onClick={goPrev}
                className="w-10 h-10 rounded-lg bg-[#1A211D]/90 border border-white/15 text-white hover:border-[#D4AF6A] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                aria-label="Next featured drama"
                onClick={goNext}
                className="w-10 h-10 rounded-lg bg-[#1A211D]/90 border border-white/15 text-white hover:border-[#D4AF6A] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

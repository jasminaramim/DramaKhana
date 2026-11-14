import { useEffect, useRef, useState } from 'react';
import { Film, Pause, Play, Sparkles, Volume2, VolumeX } from 'lucide-react';

interface ScrollVideoFeatureProps {
  videoSrc?: string;
  title?: string;
  subtitle?: string;
  tag?: string;
}

export function ScrollVideoFeature({
  videoSrc = '/3rd.mp4',
  title = 'Featured Masterpiece · Exclusive Drama Preview',
  subtitle = 'Experience peak Pakistani dramatic storytelling in uncompressed high-bitrate streaming. Captured under Lahore and Karachi twilight lanterns.',
  tag = 'Cinematic Showcase · 3rd.mp4',
}: ScrollVideoFeatureProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Trigger play ONLY when scrolling into view, pause when scrolled away
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          setInView(true);
          if (videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        } else {
          setInView(false);
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      },
      {
        threshold: [0.1, 0.35, 0.6],
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <section ref={containerRef} className="max-w-[1440px] mx-auto px-4 sm:px-8 my-10">
      <div className="relative rounded-3xl overflow-hidden border border-[#D4AF6A]/30 bg-gradient-to-b from-[#141C18] to-[#0D120F] shadow-2xl">
        {/* Top Header Bar */}
        <div className="relative z-10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#101512]/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#087F5B]/30 border border-[#087F5B]/60 flex items-center justify-center text-[#48d597]">
              <Film className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#D4AF6A] tracking-wider uppercase">
                  {tag}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#087F5B]/30 text-[#48d597] border border-[#087F5B]/50">
                  <span className={`w-1.5 h-1.5 rounded-full bg-[#48d597] ${inView ? 'animate-pulse' : ''}`} />
                  {inView ? 'Playing on Scroll' : 'Paused (Scroll to Play)'}
                </span>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-white mt-0.5">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="h-9 px-3 rounded-lg bg-[#1A211D] border border-white/15 hover:border-[#D4AF6A] text-xs font-medium text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              aria-label={isMuted ? 'Unmute video sound' : 'Mute video sound'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-white/60" />
                  <span className="hidden sm:inline">Unmute Sound</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#D4AF6A]" />
                  <span className="text-[#D4AF6A] font-semibold">Sound On</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="h-9 px-3.5 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video Player Frame */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full bg-black overflow-hidden group">
          <video
            ref={videoRef}
            src={videoSrc}
            loop
            muted={isMuted}
            playsInline
            preload="metadata"
            className="w-full h-full object-cover object-center"
            onClick={togglePlay}
          />

          {/* Measured Dark Scrims for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101512] via-transparent to-transparent pointer-events-none opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#101512]/90 via-[#101512]/40 to-transparent pointer-events-none" />

          {/* Overlay Details (Bottom Left) */}
          <div className="absolute bottom-5 left-5 right-5 sm:left-8 sm:bottom-8 max-w-xl z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#101512]/80 backdrop-blur-md border border-[#D4AF6A]/30 text-[#D4AF6A] text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DramaKhana Spotlight Edition</span>
            </div>
            <p className="text-xs sm:text-sm text-white/85 line-clamp-2 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Center Play Overlay when Paused */}
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#087F5B]/90 hover:bg-[#099268] text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer z-10"
              aria-label="Play spotlight video"
            >
              <Play className="w-7 h-7 fill-current ml-1" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}


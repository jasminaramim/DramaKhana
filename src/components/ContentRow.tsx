import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Drama, HomeSection, Video } from '../types';
import { DramaCard, VideoCard } from './MediaCards';

interface ContentRowProps {
  section: HomeSection;
  watchlistIds: string[];
  onSelectDrama: (slug: string) => void;
  onWatchVideo: (videoId: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
}

export function ContentRow({
  section,
  watchlistIds,
  onSelectDrama,
  onWatchVideo,
  onToggleWatchlist,
}: ContentRowProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollByAmount = (dir: -1 | 1) => {
    if (!scrollerRef.current) return;
    const amount = scrollerRef.current.clientWidth * 0.8;
    scrollerRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  if (!section.items.length) return null;

  return (
    <section className="py-6">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {section.title}
            </h2>
            {section.subtitle && (
              <p className="text-xs sm:text-sm text-white/60 mt-0.5">{section.subtitle}</p>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label={`Scroll ${section.title} left`}
              onClick={() => scrollByAmount(-1)}
              className="w-9 h-9 rounded-lg bg-[#1A211D] border border-white/10 text-white/80 hover:text-white hover:border-[#D4AF6A]/50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label={`Scroll ${section.title} right`}
              onClick={() => scrollByAmount(1)}
              className="w-9 h-9 rounded-lg bg-[#1A211D] border border-white/10 text-white/80 hover:text-white hover:border-[#D4AF6A]/50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2"
        >
          {section.kind === 'drama'
            ? (section.items as Drama[]).map((drama) => (
                <div key={drama._id} className="w-[180px] sm:w-[215px] shrink-0">
                  <DramaCard
                    drama={drama}
                    onSelect={onSelectDrama}
                    inWatchlist={watchlistIds.includes(drama._id)}
                    onToggleWatchlist={onToggleWatchlist}
                  />
                </div>
              ))
            : (section.items as Video[]).map((video) => (
                <div key={video._id} className="w-[260px] sm:w-[300px] shrink-0">
                  <VideoCard video={video} onWatch={onWatchVideo} />
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}

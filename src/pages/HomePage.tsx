import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Drama, HomePayload } from '../types';
import { api } from '../lib/api';
import { HeroBanner } from '../components/HeroBanner';
import { ContentRow } from '../components/ContentRow';
import { ScrollVideoFeature } from '../components/ScrollVideoFeature';

interface HomePageProps {
  watchlistIds: string[];
  onNavigate: (path: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
}

export function HomePage({ watchlistIds, onNavigate, onToggleWatchlist }: HomePageProps) {
  const [data, setData] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await api.get<HomePayload>('/api/home');
      setData(payload);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleWatchDrama = async (drama: Drama) => {
    try {
      const detail = await api.get<{ episodes: Array<{ _id: string }> }>(`/api/dramas/${drama.slug}`);
      if (detail.episodes.length > 0) {
        onNavigate(`/watch/${detail.episodes[0]._id}`);
        return;
      }
    } catch {
      // Fallback to drama detail page
    }
    onNavigate(`/drama/${drama.slug}`);
  };

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10">
        <div className="w-full h-[460px] rounded-2xl bg-[#1A211D] animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-[#1A211D] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="font-display text-3xl text-white mb-2">Unable to Load Streaming Library</h2>
        <p className="text-sm text-white/65 mb-6">{error || 'Please try again shortly.'}</p>
        <button
          type="button"
          onClick={load}
          className="px-5 py-2.5 rounded-lg bg-[#087F5B] text-white text-sm font-semibold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <HeroBanner
        dramas={data.featuredDramas}
        onWatchDrama={handleWatchDrama}
        onViewDetails={(slug) => onNavigate(`/drama/${slug}`)}
      />

      {/* Cultural Category Strip */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-8 pb-2">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-display text-2xl font-semibold text-white">Browse by Genre</h2>
          <button
            type="button"
            onClick={() => onNavigate('/categories')}
            className="text-xs font-medium text-[#D4AF6A] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            All Categories
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {data.categories.slice(0, 5).map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => onNavigate(`/categories/${cat.slug}`)}
              className="group p-4 rounded-xl bg-[#1A211D] border border-white/8 hover:border-[#D4AF6A]/45 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                  {cat.name}
                </span>
                <span className="text-xs font-mono tabular-nums text-white/50">
                  {cat.totalCount || 0}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/55 tabular-nums">
                <span className="text-[#087F5B] font-medium">Official YouTube HD</span>
                <span aria-hidden="true">·</span>
                <span>{cat.totalCount || 0} Serials</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="jali-divider max-w-[1440px] mx-auto my-6 opacity-60" />

      {/* Dynamic Netflix-style Horizontal Content Rows */}
      <div className="space-y-2">
        {data.sections.map((section) => (
          <div key={section.id}>
            {/* User requirement: Before Romantic Dramas add a video section nicely when scrolling only then just play the video 3rd.mp4 */}
            {(section.id === 'romantic' || section.id === 'romantic-dramas') && (
              <ScrollVideoFeature
                videoSrc="/3rd.mp4"
                title="Cinematic Spotlight · Pakistani Masterpiece Experience"
                subtitle="Exclusive high-definition drama stream. Plays seamlessly as you journey through DramaKhana."
                tag="Exclusive Reel · 3rd.mp4"
              />
            )}
            <ContentRow
              section={section}
              watchlistIds={watchlistIds}
              onSelectDrama={(slug) => onNavigate(`/drama/${slug}`)}
              onWatchVideo={(videoId) => onNavigate(`/watch/${videoId}`)}
              onToggleWatchlist={onToggleWatchlist}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

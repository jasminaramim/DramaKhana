import { useEffect, useState } from 'react';
import type { Drama, User, WatchHistoryItem } from '../types';
import { api } from '../lib/api';
import { DramaCard, VideoCard } from '../components/MediaCards';

interface WatchlistPageProps {
  user: User | null;
  watchlistIds: string[];
  onNavigate: (path: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
  onOpenAuth: () => void;
}

export function WatchlistPage({
  user,
  watchlistIds,
  onNavigate,
  onToggleWatchlist,
  onOpenAuth,
}: WatchlistPageProps) {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get<{ dramas: Drama[] }>('/api/watchlist'),
      api.get<{ history: WatchHistoryItem[] }>('/api/history'),
    ])
      .then(([wRes, hRes]) => {
        setDramas(wRes.dramas);
        setHistory(hRes.history);
      })
      .finally(() => setLoading(false));
  }, [user, watchlistIds]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-4xl font-bold text-white mb-3">Your Personal Watchlist</h1>
        <p className="text-sm text-white/65 mb-6">
          Sign in to save Pakistani drama serials and pick up right where you left off across devices.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-white text-sm font-semibold cursor-pointer"
        >
          Sign In to DramaKhana
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 space-y-12">
      <section>
        <h1 className="font-display text-4xl font-bold text-white mb-2">My Watchlist</h1>
        <p className="text-sm text-white/65 mb-6">Saved serials ready for your next evening viewing.</p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-[#1A211D] animate-pulse" />
            ))}
          </div>
        ) : dramas.length === 0 ? (
          <div className="py-14 text-center bg-[#1A211D] border border-white/8 rounded-2xl">
            <p className="font-display text-2xl text-white mb-2">Your watchlist is empty</p>
            <p className="text-sm text-white/60 mb-5">Bookmark any drama card to save it here.</p>
            <button
              type="button"
              onClick={() => onNavigate('/explore')}
              className="px-5 py-2.5 rounded-lg bg-[#087F5B] text-white text-xs font-semibold cursor-pointer"
            >
              Explore Dramas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {dramas.map((d) => (
              <DramaCard
                key={d._id}
                drama={d}
                onSelect={(slug) => onNavigate(`/drama/${slug}`)}
                inWatchlist={watchlistIds.includes(d._id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="font-display text-3xl font-semibold text-white mb-5">Continue Watching</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {history
              .filter((item) => item.video)
              .map((item) => (
                <VideoCard
                  key={item._id}
                  video={item.video!}
                  onWatch={(id) => onNavigate(`/watch/${id}`)}
                />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

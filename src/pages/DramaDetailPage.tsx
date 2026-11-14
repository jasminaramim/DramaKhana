import { useEffect, useState } from 'react';
import { Bookmark, Check, Play } from 'lucide-react';
import type { Drama, Video } from '../types';
import { api } from '../lib/api';
import { MediaImage } from '../components/MediaImage';
import { DramaCard, VideoCard } from '../components/MediaCards';
import { SourceFilterBar, type SourceFilterValue } from '../components/SourceFilterBar';

interface DramaDetailPageProps {
  slug: string;
  watchlistIds: string[];
  onNavigate: (path: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
}

export function DramaDetailPage({
  slug,
  watchlistIds,
  onNavigate,
  onToggleWatchlist,
}: DramaDetailPageProps) {
  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Video[]>([]);
  const [relatedDramas, setRelatedDramas] = useState<Drama[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ drama: Drama; episodes: Video[]; relatedDramas: Drama[] }>(
        `/api/dramas/${slug}?source_type=${sourceFilter}`
      )
      .then((res) => {
        setDrama(res.drama);
        setEpisodes(res.episodes);
        setRelatedDramas(res.relatedDramas);
      })
      .catch(() => setDrama(null))
      .finally(() => setLoading(false));
  }, [slug, sourceFilter]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 space-y-6">
        <div className="h-[360px] rounded-2xl bg-[#1A211D] animate-pulse" />
        <div className="h-40 rounded-2xl bg-[#1A211D] animate-pulse" />
      </div>
    );
  }

  if (!drama) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-white mb-2">Drama Not Found</h1>
        <p className="text-sm text-white/60 mb-6">This serial may have been moved or unpublished.</p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="px-5 py-2.5 rounded-lg bg-[#087F5B] text-white text-sm font-semibold cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const inWatchlist = watchlistIds.includes(drama._id);

  return (
    <div>
      {/* Cover Banner */}
      <section className="relative w-full min-h-[420px] border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0">
          <MediaImage
            src={drama.banner || drama.poster}
            alt={drama.title}
            fallbackTitle={drama.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101512] via-[#101512]/80 to-[#101512]/35" />
        </div>

        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 py-12 flex flex-col md:flex-row gap-8 items-start md:items-end">
          <div className="w-44 sm:w-52 shrink-0 aspect-[3/4] rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-[#1A211D]">
            <MediaImage
              src={drama.poster}
              alt={drama.title}
              fallbackTitle={drama.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#D4AF6A] mb-2">
              <span>{drama.channel}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{drama.releaseYear}</span>
              <span aria-hidden="true">·</span>
              <span>{drama.genres.join(' / ')}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{drama.totalEpisodes || episodes.length} Episodes</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white leading-tight mb-4">
              {drama.title}
            </h1>

            <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-5">
              {drama.description}
            </p>

            {drama.actors.length > 0 && (
              <div className="text-xs text-white/70 mb-6">
                <span className="text-white/45 mr-2">Starring:</span>
                <span className="text-white font-medium">{drama.actors.join(' · ')}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {episodes[0] && (
                <button
                  type="button"
                  onClick={() => onNavigate(`/watch/${episodes[0]._id}`)}
                  className="h-11 px-6 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play Episode 01
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleWatchlist(drama._id)}
                className={`h-11 px-5 rounded-lg border text-sm font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
                  inWatchlist
                    ? 'bg-[#791F35] border-[#791F35] text-white'
                    : 'bg-[#1A211D] border-white/15 text-white hover:border-[#D4AF6A]'
                }`}
              >
                {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {inWatchlist ? 'In My Watchlist' : 'Add to Watchlist'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Unified Episode List (YouTube + Own Uploads) */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-3xl font-semibold text-white">Episodes</h2>
            <p className="text-xs text-white/60 mt-1">
              Includes both official YouTube streams and DramaKhana uploaded masters for this serial.
            </p>
          </div>
          <SourceFilterBar value={sourceFilter} onChange={setSourceFilter} />
        </div>

        {episodes.length === 0 ? (
          <div className="py-12 text-center bg-[#1A211D] border border-white/8 rounded-xl">
            <p className="text-sm text-white/65">No episodes match the selected video source.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {episodes.map((ep) => (
              <VideoCard key={ep._id} video={ep} onWatch={(id) => onNavigate(`/watch/${id}`)} />
            ))}
          </div>
        )}
      </section>

      {relatedDramas.length > 0 && (
        <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pb-12">
          <h2 className="font-display text-3xl font-semibold text-white mb-5">Related Dramas</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {relatedDramas.map((d) => (
              <DramaCard
                key={d._id}
                drama={d}
                onSelect={(s) => onNavigate(`/drama/${s}`)}
                inWatchlist={watchlistIds.includes(d._id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

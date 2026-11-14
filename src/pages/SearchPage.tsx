import { useEffect, useState } from 'react';
import { Check, Play, Plus, Search, X } from 'lucide-react';
import type { Category, Drama, User, Video, YouTubeSearchResult } from '../types';
import { api } from '../lib/api';
import { DramaCard, VideoCard } from '../components/MediaCards';
import { MediaImage } from '../components/MediaImage';
import { SourceFilterBar, type SourceFilterValue } from '../components/SourceFilterBar';

interface SearchPageProps {
  user: User | null;
  watchlistIds: string[];
  onNavigate: (path: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
}

export function SearchPage({ user, watchlistIds, onNavigate, onToggleWatchlist }: SearchPageProps) {
  const [query, setQuery] = useState('');
  const [sourceType, setSourceType] = useState<SourceFilterValue>('all');
  const [categorySlug, setCategorySlug] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState<'latest' | 'popular'>('latest');

  const [categories, setCategories] = useState<Category[]>([]);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [youtubeResults, setYoutubeResults] = useState<YouTubeSearchResult[]>([]);
  const [importedIds, setImportedIds] = useState<Record<string, boolean>>({});
  const [importingId, setImportingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    api.get<{ categories: Category[] }>('/api/categories').then((r) => setCategories(r.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      const qs = new URLSearchParams({
        q: query,
        source_type: sourceType,
        sort,
      });
      if (categorySlug) qs.set('category', categorySlug);
      if (year) qs.set('year', year);

      api
        .get<{ dramas: Drama[]; videos: Video[]; youtubeResults?: YouTubeSearchResult[] }>(
          `/api/search?${qs.toString()}`
        )
        .then((res) => {
          setDramas(res.dramas);
          setVideos(res.videos);
          setYoutubeResults(res.youtubeResults || []);
        })
        .finally(() => setLoading(false));
    }, 260);

    return () => window.clearTimeout(timer);
  }, [query, sourceType, categorySlug, year, sort]);

  const handleImportYouTubeResult = async (item: YouTubeSearchResult) => {
    setImportingId(item.videoId);
    try {
      await api.post('/api/youtube/import-drama', {
        dramaTitle: item.title.split('|')[0].split('-')[0].trim() || item.title,
        description: item.description,
        channel: item.channel,
        categoryId: categories[0]?._id || 'cat_romantic',
        episodes: [
          {
            videoId: item.videoId,
            title: item.title,
            description: item.description,
            thumbnail: item.thumbnail,
            channel: item.channel,
            duration: item.duration || '40:00',
            episodeNumber: 1,
          },
        ],
      });
      setImportedIds((prev) => ({ ...prev, [item.videoId]: true }));
    } catch {
      // handled silently
    } finally {
      setImportingId('');
    }
  };

  const watchYouTubeResult = (item: YouTubeSearchResult) => {
    const qs = new URLSearchParams({
      title: item.title,
      channel: item.channel,
    });
    onNavigate(`/watch/yt:${item.videoId}?${qs.toString()}`);
  };

  const suggestions =
    query.trim().length > 0
      ? [
          ...dramas.slice(0, 3).map((d) => ({
            label: d.title,
            sub: `${d.channel} · ${d.releaseYear}`,
            path: `/drama/${d.slug}`,
          })),
          ...videos.slice(0, 2).map((v) => ({
            label: v.title,
            sub: v.source_type === 'youtube' ? 'YouTube Episode' : 'Own Upload',
            path: `/watch/${v._id}`,
          })),
          ...youtubeResults.slice(0, 3).map((yt) => ({
            label: yt.title,
            sub: `YouTube · ${yt.channel}`,
            path: `/watch/yt:${yt.videoId}?title=${encodeURIComponent(yt.title)}&channel=${encodeURIComponent(
              yt.channel
            )}`,
          })),
        ]
      : [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
      <div className="max-w-3xl mb-8">
        <h1 className="font-display text-4xl font-bold text-white mb-2">Search DramaKhana & YouTube</h1>
        <p className="text-sm text-white/65">
          Search across DramaKhana’s curated library and live YouTube Pakistani drama results simultaneously.
        </p>

        <div className="relative mt-5">
          <Search className="w-5 h-5 text-[#D4AF6A] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 180)}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder="Search any Pakistani drama (e.g. Humsafar, Parizaad, Tere Bin, Ishq Murshid)..."
            className="w-full h-12 pl-12 pr-11 rounded-xl bg-[#1A211D] border border-white/15 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#D4AF6A]"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search query"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-xl bg-[#1A211D] border border-white/15 shadow-2xl overflow-hidden z-30">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={() => onNavigate(s.path)}
                  className="w-full px-4 py-2.5 text-left hover:bg-white/5 flex items-center justify-between gap-4 border-b border-white/5 last:border-0 cursor-pointer"
                >
                  <span className="text-sm font-medium text-white truncate">{s.label}</span>
                  <span className="text-xs text-[#D4AF6A] shrink-0">{s.sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
        <SourceFilterBar value={sourceType} onChange={setSourceType} sortValue={sort} onSortChange={setSort} />

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            aria-label="Filter by category"
            className="h-10 px-3 rounded-lg bg-[#1A211D] border border-white/12 text-xs text-white focus:outline-none focus:border-[#D4AF6A]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Filter by year"
            className="h-10 px-3 rounded-lg bg-[#1A211D] border border-white/12 text-xs text-white focus:outline-none focus:border-[#D4AF6A]"
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-[#1A211D] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {dramas.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold text-white mb-4">
                Drama Serials ({dramas.length})
              </h2>
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
            </section>
          )}

          {videos.length > 0 && (
            <section>
              <h2 className="font-display text-2xl font-semibold text-white mb-4">
                DramaKhana Episodes ({videos.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {videos.map((v) => (
                  <VideoCard key={v._id} video={v} onWatch={(id) => onNavigate(`/watch/${id}`)} />
                ))}
              </div>
            </section>
          )}

          {query.trim() && sourceType !== 'own_upload' && (
            <section>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-white">
                    YouTube Search Results ({youtubeResults.length})
                  </h2>
                  <p className="text-xs text-white/60 mt-0.5">
                    Stream any matching Pakistani drama directly inside DramaKhana.
                  </p>
                </div>
              </div>

              {youtubeResults.length === 0 ? (
                <div className="py-12 text-center bg-[#1A211D] border border-white/8 rounded-2xl">
                  <p className="text-sm text-white/65">
                    No live YouTube results found for “{query}”. Try another drama title.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {youtubeResults.map((yt) => (
                    <article
                      key={yt.videoId}
                      className="group flex flex-col bg-[#1A211D] border border-white/8 rounded-xl overflow-hidden hover:border-[#D4AF6A]/45 transition-colors"
                    >
                      <div
                        onClick={() => watchYouTubeResult(yt)}
                        className="relative aspect-video w-full overflow-hidden bg-black cursor-pointer"
                      >
                        <MediaImage
                          src={yt.thumbnail}
                          alt={yt.title}
                          fallbackTitle={yt.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#101512]/90 via-transparent to-[#101512]/35" />
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-medium">
                          <span className="px-2 py-0.5 rounded bg-[#791F35]/90 text-white">YouTube</span>
                          <span className="px-2 py-0.5 rounded bg-[#101512]/85 font-mono tabular-nums text-white/90">
                            {yt.duration}
                          </span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="w-11 h-11 rounded-full bg-[#087F5B] text-white flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                        <div onClick={() => watchYouTubeResult(yt)} className="cursor-pointer">
                          <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-[#D4AF6A] transition-colors">
                            {yt.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-white/60 mt-1 truncate">
                            <span className="truncate">{yt.channel}</span>
                            {yt.viewsText && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="shrink-0">{yt.viewsText}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {user?.role === 'admin' && (
                          <button
                            type="button"
                            disabled={importingId === yt.videoId || importedIds[yt.videoId]}
                            onClick={() => handleImportYouTubeResult(yt)}
                            className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                              importedIds[yt.videoId]
                                ? 'bg-[#087F5B]/30 text-emerald-300'
                                : 'bg-[#101512] border border-white/15 hover:border-[#D4AF6A] text-[#D4AF6A]'
                            }`}
                          >
                            {importedIds[yt.videoId] ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Saved to Library
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                {importingId === yt.videoId ? 'Importing...' : 'Import to DramaKhana'}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {dramas.length === 0 && videos.length === 0 && youtubeResults.length === 0 && (
            <div className="py-16 text-center bg-[#1A211D] border border-white/8 rounded-2xl">
              <p className="font-display text-2xl text-white mb-1">No matching dramas found</p>
              <p className="text-sm text-white/60">Try searching a Pakistani drama title, actor, or channel.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

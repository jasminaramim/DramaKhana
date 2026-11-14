import { useEffect, useState } from 'react';
import type { Category, Channel, Drama, Video } from '../types';
import { api } from '../lib/api';
import { DramaCard, VideoCard } from '../components/MediaCards';
import { SourceFilterBar, type SourceFilterValue } from '../components/SourceFilterBar';

interface ExplorePageProps {
  watchlistIds: string[];
  onNavigate: (path: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
}

export function ExplorePage({ watchlistIds, onNavigate, onToggleWatchlist }: ExplorePageProps) {
  const [viewMode, setViewMode] = useState<'videos' | 'dramas'>('videos');
  const [sourceType, setSourceType] = useState<SourceFilterValue>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ categories: Category[] }>('/api/categories'),
      api.get<{ channels: Channel[] }>('/api/channels'),
    ])
      .then(([cRes, chRes]) => {
        setCategories(cRes.categories);
        setChannels(chRes.channels);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (viewMode === 'videos') {
      const qs = new URLSearchParams({
        source_type: sourceType,
        sort: sortOrder,
        limit: '48',
      });
      if (selectedCategory) qs.set('categorySlug', selectedCategory);
      if (selectedChannel) qs.set('channel', selectedChannel);
      api
        .get<{ videos: Video[] }>(`/api/videos?${qs.toString()}`)
        .then((res) => {
          if (active) setVideos(res.videos);
        })
        .finally(() => active && setLoading(false));
    } else {
      const qs = new URLSearchParams();
      if (selectedChannel) qs.set('channel', selectedChannel);
      if (selectedCategory) {
        const match = categories.find((c) => c.slug === selectedCategory);
        if (match) qs.set('genre', match.name);
      }
      api
        .get<{ dramas: Drama[] }>(`/api/dramas?${qs.toString()}`)
        .then((res) => {
          if (active) setDramas(res.dramas);
        })
        .finally(() => active && setLoading(false));
    }
    return () => {
      active = false;
    };
  }, [viewMode, sourceType, sortOrder, selectedCategory, selectedChannel, categories]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="font-display text-4xl font-bold text-white tracking-tight">Explore DramaKhana</h1>
          <p className="text-sm text-white/65 mt-1">
            Filter seamlessly across official YouTube broadcasts and DramaKhana uploaded episodes.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-[#1A211D] border border-white/10 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setViewMode('videos')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              viewMode === 'videos' ? 'bg-[#087F5B] text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            Episodes & Videos
          </button>
          <button
            type="button"
            onClick={() => setViewMode('dramas')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              viewMode === 'dramas' ? 'bg-[#087F5B] text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            Drama Serials
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/10">
        {viewMode === 'videos' ? (
          <SourceFilterBar
            value={sourceType}
            onChange={setSourceType}
            sortValue={sortOrder}
            onSortChange={setSortOrder}
          />
        ) : (
          <div className="text-xs text-white/60">Showing published Pakistani drama serials</div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="h-10 px-3 rounded-lg bg-[#1A211D] border border-white/12 text-xs text-white focus:outline-none focus:border-[#D4AF6A]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            aria-label="Filter by channel"
            className="h-10 px-3 rounded-lg bg-[#1A211D] border border-white/12 text-xs text-white focus:outline-none focus:border-[#D4AF6A]"
          >
            <option value="">All Channels</option>
            {channels.map((ch) => (
              <option key={ch._id} value={ch.name}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-[#1A211D] animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'videos' ? (
        videos.length === 0 ? (
          <div className="py-20 text-center bg-[#1A211D] border border-white/8 rounded-2xl">
            <p className="font-display text-2xl text-white mb-2">No episodes match these filters</p>
            <p className="text-sm text-white/60 mb-5">Try switching source type or clearing category filters.</p>
            <button
              type="button"
              onClick={() => {
                setSourceType('all');
                setSelectedCategory('');
                setSelectedChannel('');
              }}
              className="px-4 py-2 rounded-lg bg-[#087F5B] text-white text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {videos.map((v) => (
              <VideoCard key={v._id} video={v} onWatch={(id) => onNavigate(`/watch/${id}`)} />
            ))}
          </div>
        )
      ) : dramas.length === 0 ? (
        <div className="py-20 text-center bg-[#1A211D] border border-white/8 rounded-2xl">
          <p className="font-display text-2xl text-white mb-2">No dramas found</p>
          <p className="text-sm text-white/60">Try clearing the channel or genre filter.</p>
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
    </div>
  );
}

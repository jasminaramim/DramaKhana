import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Category, Video } from '../types';
import { api } from '../lib/api';
import { MediaImage } from '../components/MediaImage';
import { VideoCard } from '../components/MediaCards';
import { SourceFilterBar, type SourceFilterValue } from '../components/SourceFilterBar';

interface CategoriesPageProps {
  slug?: string;
  onNavigate: (path: string) => void;
}

export function CategoriesPage({ slug, onNavigate }: CategoriesPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterValue>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'popular'>('latest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!slug) {
      api
        .get<{ categories: Category[] }>('/api/categories')
        .then((res) => setCategories(res.categories))
        .finally(() => setLoading(false));
    } else {
      api
        .get<{ category: Category; videos: Video[] }>(
          `/api/categories/${slug}?source_type=${sourceFilter}&sort=${sortOrder}`
        )
        .then((res) => {
          setSelectedCategory(res.category);
          setVideos(res.videos);
        })
        .catch(() => setSelectedCategory(null))
        .finally(() => setLoading(false));
    }
  }, [slug, sourceFilter, sortOrder]);

  if (slug) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
        <button
          type="button"
          onClick={() => onNavigate('/categories')}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#D4AF6A] hover:underline mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          All Categories
        </button>

        {selectedCategory && (
          <div className="mb-8">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white">
              {selectedCategory.name} Dramas
            </h1>
            <p className="text-sm text-white/70 mt-2 max-w-2xl">{selectedCategory.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60 tabular-nums">
              <span>{selectedCategory.totalCount || 0} Total Episodes</span>
              <span aria-hidden="true">·</span>
              <span>{selectedCategory.youtubeCount || 0} YouTube</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#087F5B] font-medium">{selectedCategory.ownUploadCount || 0} Own Upload</span>
            </div>
          </div>
        )}

        <div className="pb-6 mb-8 border-b border-white/10">
          <SourceFilterBar
            value={sourceFilter}
            onChange={setSourceFilter}
            counts={
              selectedCategory
                ? {
                    all: selectedCategory.totalCount || 0,
                    youtube: selectedCategory.youtubeCount || 0,
                    own_upload: selectedCategory.ownUploadCount || 0,
                  }
                : undefined
            }
            sortValue={sortOrder}
            onSortChange={setSortOrder}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-[#1A211D] animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="py-16 text-center bg-[#1A211D] border border-white/8 rounded-2xl">
            <p className="font-display text-2xl text-white mb-2">
              No {sourceFilter === 'all' ? '' : sourceFilter === 'youtube' ? 'YouTube ' : 'Own Upload '}
              episodes in this category yet
            </p>
            <p className="text-sm text-white/60 mb-5">Switch to All Videos or add episodes from Admin Studio.</p>
            {sourceFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className="px-4 py-2 rounded-lg bg-[#087F5B] text-white text-xs font-semibold cursor-pointer"
              >
                Show All Videos
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {videos.map((v) => (
              <VideoCard key={v._id} video={v} onWatch={(id) => onNavigate(`/watch/${id}`)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-white">Drama Categories</h1>
        <p className="text-sm text-white/65 mt-1">
          Every genre dynamically tracks both YouTube episodes and DramaKhana original uploads.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-[#1A211D] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              onClick={() => {
                setSourceFilter('all');
                onNavigate(`/categories/${cat.slug}`);
              }}
              className="group relative h-56 rounded-2xl overflow-hidden border border-white/10 hover:border-[#D4AF6A]/50 text-left cursor-pointer transition-transform duration-200 hover:-translate-y-1"
            >
              <MediaImage
                src={cat.image}
                alt={cat.name}
                fallbackTitle={cat.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101512] via-[#101512]/65 to-[#101512]/20" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <h2 className="font-display text-3xl font-bold text-white group-hover:text-[#D4AF6A] transition-colors">
                  {cat.name}
                </h2>
                <p className="text-xs text-white/75 line-clamp-2 mt-1">{cat.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-white/80 tabular-nums">
                  <span>{cat.totalCount || 0} Videos</span>
                  <span aria-hidden="true">·</span>
                  <span>YouTube: {cat.youtubeCount || 0}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#D4AF6A]">Own Upload: {cat.ownUploadCount || 0}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

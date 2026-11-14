import { Bookmark, Check, Play } from 'lucide-react';
import type { Drama, Video } from '../types';
import { formatViews } from '../lib/api';
import { MediaImage } from './MediaImage';

interface DramaCardProps {
  drama: Drama;
  onSelect: (slug: string) => void;
  inWatchlist?: boolean;
  onToggleWatchlist?: (dramaId: string) => void;
}

export function DramaCard({ drama, onSelect, inWatchlist, onToggleWatchlist }: DramaCardProps) {
  return (
    <article
      onClick={() => onSelect(drama.slug)}
      className="group relative flex flex-col bg-[#1A211D] border border-white/8 rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:border-[#D4AF6A]/40"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#101512]">
        <MediaImage
          src={drama.poster}
          alt={drama.title}
          fallbackTitle={drama.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101512] via-[#101512]/25 to-transparent opacity-90" />

        {onToggleWatchlist && (
          <button
            type="button"
            aria-label={inWatchlist ? `Remove ${drama.title} from watchlist` : `Save ${drama.title} to watchlist`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWatchlist(drama._id);
            }}
            className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
              inWatchlist
                ? 'bg-[#087F5B] border-[#087F5B] text-white'
                : 'bg-[#101512]/80 border-white/15 text-white/80 hover:text-white hover:border-[#D4AF6A]'
            }`}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF6A]">
            <Play className="w-3.5 h-3.5 fill-current" />
            Watch Serial
          </span>
          {drama.totalEpisodes !== undefined && (
            <span className="text-xs font-mono tabular-nums text-white/75">
              {drama.totalEpisodes} {drama.totalEpisodes === 1 ? 'Ep' : 'Eps'}
            </span>
          )}
        </div>
      </div>

      <div className="p-3.5 flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold text-white truncate group-hover:text-[#D4AF6A] transition-colors">
          {drama.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-white/60 truncate">
          <span className="tabular-nums">{drama.releaseYear}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{drama.genres[0] || 'Drama'}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{drama.channel}</span>
        </div>
      </div>
    </article>
  );
}

interface VideoCardProps {
  video: Video;
  onWatch: (videoId: string) => void;
}

export function VideoCard({ video, onWatch }: VideoCardProps) {
  const isYouTube = video.source_type === 'youtube';

  return (
    <article
      onClick={() => onWatch(video._id)}
      className="group relative flex flex-col bg-[#1A211D] border border-white/8 rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 hover:-translate-y-1 hover:border-[#D4AF6A]/40"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[#101512]">
        <MediaImage
          src={video.thumbnail}
          alt={video.title}
          fallbackTitle={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101512]/90 via-transparent to-[#101512]/35" />

        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 text-[11px] font-medium">
          <span
            className={`px-2 py-0.5 rounded text-white ${
              isYouTube ? 'bg-[#791F35]/90' : 'bg-[#087F5B]/90'
            }`}
          >
            {isYouTube ? 'YouTube' : 'Own Upload'}
          </span>
          <span className="px-2 py-0.5 rounded bg-[#101512]/85 font-mono tabular-nums text-white/90">
            {video.duration}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="w-11 h-11 rounded-full bg-[#087F5B] text-white flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </span>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/80">
          <span className="font-mono tabular-nums text-[#D4AF6A]">
            Ep {String(video.episodeNumber).padStart(2, '0')}
          </span>
          <span className="truncate max-w-[60%] text-right">{video.dramaTitle || video.channel}</span>
        </div>
      </div>

      <div className="p-3.5 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-[#D4AF6A] transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-white/60 truncate">
          <span className="truncate">{video.channel}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{video.categoryName || 'Drama'}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums shrink-0">{formatViews(video.views)}</span>
        </div>
      </div>
    </article>
  );
}

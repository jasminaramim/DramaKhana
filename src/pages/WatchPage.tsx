import { useEffect, useState } from 'react';
import { Bookmark, Check, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { Drama, Video } from '../types';
import { api, formatViews } from '../lib/api';
import { MediaImage } from '../components/MediaImage';
import { DramaCard } from '../components/MediaCards';

interface WatchPageProps {
  videoId: string;
  watchlistIds: string[];
  onNavigate: (path: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
}

export function WatchPage({ videoId, watchlistIds, onNavigate, onToggleWatchlist }: WatchPageProps) {
  const [video, setVideo] = useState<Video | null>(null);
  const [drama, setDrama] = useState<Drama | null>(null);
  const [episodes, setEpisodes] = useState<Video[]>([]);
  const [relatedDramas, setRelatedDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const searchQs = window.location.search || '';
    api
      .get<{ video: Video; drama: Drama | null; episodes: Video[]; relatedDramas: Drama[] }>(
        `/api/videos/${encodeURIComponent(videoId)}${searchQs}`
      )
      .then((res) => {
        setVideo(res.video);
        setDrama(res.drama);
        setEpisodes(res.episodes);
        setRelatedDramas(res.relatedDramas);
        if (!res.video._id.startsWith('yt:')) {
          api
            .post('/api/history', {
              videoId: res.video._id,
              dramaId: res.video.dramaId,
              progressSeconds: 5,
            })
            .catch(() => {});
        }
      })
      .catch(() => setVideo(null))
      .finally(() => setLoading(false));
  }, [videoId]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8">
        <div className="aspect-video w-full rounded-2xl bg-[#1A211D] animate-pulse" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-white mb-2">Episode Unavailable</h1>
        <p className="text-sm text-white/60 mb-6">This video could not be located.</p>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="px-5 py-2.5 rounded-lg bg-[#087F5B] text-white text-sm font-semibold cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  const currentIdx = episodes.findIndex((e) => e._id === video._id);
  const prevEp = currentIdx > 0 ? episodes[currentIdx - 1] : null;
  const nextEp = currentIdx >= 0 && currentIdx < episodes.length - 1 ? episodes[currentIdx + 1] : null;

  const isYouTube = video.source_type === 'youtube';
  const ytEmbedUrl = video.youtubePlaylistId
    ? `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(video.youtubePlaylistId)}&rel=0`
    : `https://www.youtube.com/embed/${encodeURIComponent(video.youtubeVideoId || '')}?rel=0&modestbranding=1`;

  const inWatchlist = drama ? watchlistIds.includes(drama._id) : false;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Main Theater Player Column */}
        <div className="xl:col-span-8 space-y-5">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
            {isYouTube ? (
              <iframe
                src={ytEmbedUrl}
                title={video.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <video
                key={video.videoUrl}
                src={video.videoUrl}
                poster={video.thumbnail}
                controls
                playsInline
                className="w-full h-full object-contain bg-black"
                onTimeUpdate={(e) => {
                  const sec = Math.floor(e.currentTarget.currentTime);
                  if (sec > 0 && sec % 15 === 0) {
                    api
                      .post('/api/history', {
                        videoId: video._id,
                        dramaId: video.dramaId,
                        progressSeconds: sec,
                      })
                      .catch(() => {});
                  }
                }}
              />
            )}
          </div>

          {/* Episode Controls & Title */}
          <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`px-2.5 py-1 rounded font-semibold text-white ${
                    isYouTube ? 'bg-[#791F35]' : 'bg-[#087F5B]'
                  }`}
                >
                  {isYouTube ? 'YouTube Player' : 'DramaKhana Direct Stream'}
                </span>
                <span className="text-white/50" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-[#D4AF6A]">
                  Episode {String(video.episodeNumber).padStart(2, '0')}
                </span>
                <span className="text-white/50" aria-hidden="true">·</span>
                <span className="text-white/75">{video.channel}</span>
                <span className="text-white/50" aria-hidden="true">·</span>
                <span className="tabular-nums text-white/60">{formatViews(video.views)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!prevEp}
                  onClick={() => prevEp && onNavigate(`/watch/${prevEp._id}`)}
                  className="h-9 px-3 rounded-lg bg-[#101512] border border-white/12 text-xs font-medium text-white disabled:opacity-35 hover:border-[#D4AF6A] inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev Episode
                </button>
                <button
                  type="button"
                  disabled={!nextEp}
                  onClick={() => nextEp && onNavigate(`/watch/${nextEp._id}`)}
                  className="h-9 px-3 rounded-lg bg-[#087F5B] text-xs font-semibold text-white disabled:opacity-35 hover:bg-[#099268] inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next Episode
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
              {video.title}
            </h1>
            <p className="text-sm text-white/75 leading-relaxed mb-5">{video.description}</p>

            {drama && (
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/drama/${drama.slug}`)}
                    className="text-sm font-semibold text-[#D4AF6A] hover:underline cursor-pointer"
                  >
                    {drama.title}
                  </button>
                  <div className="text-xs text-white/60 mt-0.5">
                    {drama.actors.join(' · ')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleWatchlist(drama._id)}
                  className={`h-10 px-4 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer ${
                    inWatchlist
                      ? 'bg-[#791F35] border-[#791F35] text-white'
                      : 'bg-[#101512] border-white/15 text-white hover:border-[#D4AF6A]'
                  }`}
                >
                  {inWatchlist ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  {inWatchlist ? 'Saved in Watchlist' : 'Add to Watchlist'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Episode Queue Rail */}
        <aside className="xl:col-span-4 bg-[#1A211D] border border-white/10 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
            <h2 className="font-display text-xl font-semibold text-white">
              Episodes ({episodes.length})
            </h2>
            {drama && (
              <button
                type="button"
                onClick={() => onNavigate(`/drama/${drama.slug}`)}
                className="text-xs text-[#D4AF6A] hover:underline cursor-pointer"
              >
                Serial Page
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {episodes.map((ep) => {
              const active = ep._id === video._id;
              return (
                <button
                  key={ep._id}
                  type="button"
                  onClick={() => onNavigate(`/watch/${ep._id}`)}
                  className={`w-full p-2.5 rounded-xl border text-left flex gap-3 items-center transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#087F5B]/20 border-[#087F5B]'
                      : 'bg-[#101512]/60 border-white/8 hover:border-[#D4AF6A]/40'
                  }`}
                >
                  <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                    <MediaImage
                      src={ep.thumbnail}
                      alt={ep.title}
                      fallbackTitle={ep.title}
                      className="w-full h-full object-cover"
                    />
                    {active && (
                      <div className="absolute inset-0 bg-[#087F5B]/45 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-[#D4AF6A]">
                      <span>Ep {String(ep.episodeNumber).padStart(2, '0')}</span>
                      <span aria-hidden="true">·</span>
                      <span className={ep.source_type === 'youtube' ? 'text-rose-300' : 'text-emerald-300'}>
                        {ep.source_type === 'youtube' ? 'YouTube' : 'Own Upload'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white line-clamp-2 mt-0.5">{ep.title}</p>
                    <span className="text-[11px] font-mono tabular-nums text-white/50">{ep.duration}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {relatedDramas.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-3xl font-semibold text-white mb-5">More Pakistani Dramas</h2>
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

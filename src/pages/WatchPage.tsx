import { useEffect, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Play,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import type { Drama, Video } from '../types';
import { api, formatViews } from '../lib/api';
import { MediaImage } from '../components/MediaImage';
import { DramaCard } from '../components/MediaCards';
import { AdBanner } from '../components/AdBanner';

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
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadDirect = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Download initiated successfully!');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Episode link copied to clipboard!');
  };

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

            {/* Quick Action Toolbar: Download, Save Video, Share */}
            <div className="py-3 px-4 rounded-xl bg-[#101512] border border-white/10 flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (video.videoUrl && !video.videoUrl.startsWith('http')) {
                      handleDownloadDirect(video.videoUrl, `${drama?.slug || 'episode'}-ep${video.episodeNumber}.mp4`);
                    } else {
                      setShowDownloadModal(true);
                    }
                  }}
                  className="h-9 px-3.5 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-xs font-semibold text-white inline-flex items-center gap-2 cursor-pointer shadow-md transition-colors"
                  title="Download this episode easily"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (drama) {
                      onToggleWatchlist(drama._id);
                      showToast(inWatchlist ? 'Removed from Watchlist' : 'Saved to Watchlist!');
                    }
                  }}
                  className={`h-9 px-3.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                    inWatchlist
                      ? 'bg-[#791F35] border-[#791F35] text-white'
                      : 'bg-[#1A211D] border-white/15 text-white hover:border-[#D4AF6A]'
                  }`}
                  title="Save video to watchlist easily"
                >
                  {inWatchlist ? <Check className="w-4 h-4 text-white" /> : <Bookmark className="w-4 h-4 text-[#D4AF6A]" />}
                  <span>{inWatchlist ? 'Saved in Watchlist' : 'Save Video'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-9 px-3 rounded-lg bg-[#1A211D] border border-white/15 text-xs font-medium text-white hover:border-[#D4AF6A] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Share / copy episode link"
                >
                  <Share2 className="w-3.5 h-3.5 text-white/70" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>

              {drama && (
                <div className="text-xs text-white/60">
                  Part of <span className="text-[#D4AF6A] font-semibold">{drama.title}</span> ({drama.totalEpisodes} Episodes)
                </div>
              )}
            </div>

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
                  onClick={() => {
                    onToggleWatchlist(drama._id);
                    showToast(inWatchlist ? 'Removed from Watchlist' : 'Saved to Watchlist!');
                  }}
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

          {/* Google AdSense In-Feed / In-Article Slot */}
          <AdBanner className="!px-0 my-4" />
        </div>

        {/* Right Sidebar: Suggested Next Episode + Episode Queue */}
        <aside className="xl:col-span-4 space-y-4">
          {/* USER REQUIREMENT: IF a user select a video for watch then right side suggest the next episode should be show must be */}
          {nextEp ? (
            <div className="bg-gradient-to-b from-[#1C2820] to-[#121914] border-2 border-[#087F5B] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#087F5B] text-white text-xs font-bold tracking-wide uppercase shadow">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF6A]" />
                  Suggested Next Episode
                </div>
                <span className="text-xs font-mono tabular-nums text-[#D4AF6A] font-semibold">
                  Ep {String(nextEp.episodeNumber).padStart(2, '0')}
                </span>
              </div>

              <div
                onClick={() => onNavigate(`/watch/${nextEp._id}`)}
                className="group relative aspect-video w-full rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#D4AF6A] transition-all shadow-md"
              >
                <MediaImage
                  src={nextEp.thumbnail}
                  alt={nextEp.title}
                  fallbackTitle={nextEp.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#087F5B] group-hover:bg-[#099268] flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/85 font-mono text-[11px] text-white tabular-nums">
                  {nextEp.duration}
                </div>
              </div>

              <div className="mt-3">
                <h3
                  onClick={() => onNavigate(`/watch/${nextEp._id}`)}
                  className="text-sm font-bold text-white hover:text-[#D4AF6A] line-clamp-1 cursor-pointer transition-colors"
                >
                  {nextEp.title}
                </h3>
                <p className="text-xs text-white/60 line-clamp-1 mt-0.5">
                  {nextEp.channel} · {formatViews(nextEp.views)}
                </p>

                <button
                  type="button"
                  onClick={() => onNavigate(`/watch/${nextEp._id}`)}
                  className="mt-3.5 w-full py-2.5 rounded-xl bg-[#087F5B] hover:bg-[#099268] text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Play Next Episode (Ep {nextEp.episodeNumber})
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#1A211D] border border-[#D4AF6A]/30 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-[#D4AF6A] uppercase tracking-wider">
                Latest Episode
              </span>
              <p className="text-xs text-white/70 mt-1">
                You are currently watching the latest episode of this serial.
              </p>
              {episodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => onNavigate(`/watch/${episodes[0]._id}`)}
                  className="mt-2 text-xs text-[#087F5B] hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Restart Episode 01
                </button>
              )}
            </div>
          )}

          {/* Episode Queue Rail */}
          <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
              <h2 className="font-display text-xl font-semibold text-white">
                All Episodes ({episodes.length})
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

      {/* Floating Action Confirmation Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[#087F5B] text-white text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Easy Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A211D] border border-white/15 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowDownloadModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#087F5B]/30 border border-[#087F5B]/50 flex items-center justify-center text-[#48d597]">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Download Options</h3>
            </div>
            <p className="text-xs text-white/70 mb-4 line-clamp-1">{video.title}</p>

            <div className="space-y-2.5">
              {/* Option 1: Direct Video File */}
              {video.videoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadDirect(video.videoUrl, `${drama?.slug || 'dramakhana'}-ep${video.episodeNumber}.mp4`);
                    setShowDownloadModal(false);
                  }}
                  className="w-full p-3 rounded-xl bg-[#101512] border border-white/10 hover:border-[#087F5B] text-left flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Film className="w-4 h-4 text-[#087F5B]" />
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-[#48d597]">
                        Download Direct Video (MP4)
                      </div>
                      <div className="text-[11px] text-white/50">High speed direct file download</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-white/40 group-hover:text-white" />
                </button>
              )}

              {/* Option 2: High-Res Episode Poster / Thumbnail */}
              <button
                type="button"
                onClick={() => {
                  handleDownloadDirect(video.thumbnail, `${drama?.slug || 'dramakhana'}-ep${video.episodeNumber}-cover.jpg`);
                  setShowDownloadModal(false);
                }}
                className="w-full p-3 rounded-xl bg-[#101512] border border-white/10 hover:border-[#D4AF6A] text-left flex items-center justify-between group cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4 text-[#D4AF6A]" />
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-[#D4AF6A]">
                      Download HD Cover Artwork
                    </div>
                    <div className="text-[11px] text-white/50">Full resolution poster thumbnail</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-white/40 group-hover:text-white" />
              </button>

              {/* Option 3: Official Stream / YouTube Link */}
              {video.youtubeVideoId && (
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowDownloadModal(false)}
                  className="w-full p-3 rounded-xl bg-[#101512] border border-white/10 hover:border-rose-500 text-left flex items-center justify-between group cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-rose-400">
                        Open in YouTube 1080p
                      </div>
                      <div className="text-[11px] text-white/50">Official broadcast channel source</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white" />
                </a>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

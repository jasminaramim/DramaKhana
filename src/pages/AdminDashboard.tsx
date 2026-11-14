import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Check,
  Edit3,
  Eye,
  Film,
  FolderKanban,
  LayoutDashboard,
  ListVideo,
  Plus,
  Radio,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Video as VideoIcon,
  Youtube,
  UserCheck,
  X,
  Search,
  Database,
} from 'lucide-react';
import type {
  Actor,
  AdminStats,
  Category,
  Channel,
  Drama,
  User,
  Video,
  YouTubeSearchResult,
} from '../types';
import { api, setToken } from '../lib/api';
import { MediaImage } from '../components/MediaImage';

type AdminTab =
  | 'dashboard'
  | 'videos'
  | 'import-youtube'
  | 'add-youtube'
  | 'upload-own'
  | 'dramas'
  | 'episodes'
  | 'categories'
  | 'channels'
  | 'actors'
  | 'featured'
  | 'users'
  | 'settings';

interface AdminDashboardProps {
  user: User | null;
  onUserChange: (u: User | null) => void;
  onNavigate: (path: string) => void;
}

interface ExtendedStats extends AdminStats {
  mongoConnected?: boolean;
  mongoUriMasked?: string;
  storageMode?: string;
  youtubeApiConfigured?: boolean;
  cloudinaryConfigured?: boolean;
}

export function AdminDashboard({ user, onUserChange, onNavigate }: AdminDashboardProps) {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Admin gate login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Video table filters & edit modal
  const [videoFilter, setVideoFilter] = useState<'all' | 'youtube' | 'own_upload' | 'published' | 'draft'>('all');
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // Add YouTube Video state
  const [ytInput, setYtInput] = useState('');
  const [ytFetching, setYtFetching] = useState(false);
  const [ytForm, setYtForm] = useState({
    title: '',
    description: '',
    thumbnail: '',
    youtubeVideoId: '',
    youtubePlaylistId: '',
    dramaId: '',
    categoryId: '',
    episodeNumber: 1,
    channel: 'HUM TV',
    duration: '40:00',
    status: 'published' as 'published' | 'draft',
  });

  // Upload Own Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ownForm, setOwnForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnail: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
    dramaId: '',
    categoryId: '',
    episodeNumber: 1,
    channel: 'HUM TV',
    duration: '42:00',
    releaseDate: new Date().toISOString().slice(0, 10),
    status: 'published' as 'published' | 'draft',
  });

  // Drama modal/form state
  const [dramaForm, setDramaForm] = useState({
    title: '',
    description: '',
    channel: 'HUM TV',
    releaseYear: 2026,
    genres: 'Romantic, Family',
    actors: 'Mahira Khan, Fawad Khan',
    poster: '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
    banner: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
    featured: false,
  });

  // Category form state
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    displayOrder: 11,
    status: 'active' as 'active' | 'inactive',
  });

  // Channel & Actor forms
  const [chanForm, setChanForm] = useState({ name: '', logo: '', youtubeChannelId: '', description: '' });
  const [actorForm, setActorForm] = useState({ name: '', knownFor: '', bio: '' });

  // Episodes tab drama selector
  const [selectedEpisodeDramaId, setSelectedEpisodeDramaId] = useState('');

  // Import Drama from YouTube state
  const [ytSearchInput, setYtSearchInput] = useState('');
  const [ytImportMode, setYtImportMode] = useState<'search' | 'playlist'>('search');
  const [ytSearching, setYtSearching] = useState(false);
  const [ytResults, setYtResults] = useState<YouTubeSearchResult[]>([]);
  const [ytSelected, setYtSelected] = useState<Record<string, boolean>>({});
  const [importTargetDramaId, setImportTargetDramaId] = useState('__new__');
  const [importDramaTitle, setImportDramaTitle] = useState('');
  const [importDramaChannel, setImportDramaChannel] = useState('HUM TV');
  const [importDramaCategory, setImportDramaCategory] = useState('cat_romantic');
  const [importDramaYear, setImportDramaYear] = useState(2025);
  const [importDramaFeatured, setImportDramaFeatured] = useState(true);
  const [importingDrama, setImportingDrama] = useState(false);

  // MongoDB Settings state
  const [mongoUriInput, setMongoUriInput] = useState('');
  const [mongoConnecting, setMongoConnecting] = useState(false);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [sRes, vRes, dRes, cRes, chRes, aRes, uRes] = await Promise.all([
        api.get<ExtendedStats>('/api/admin/stats'),
        api.get<{ videos: Video[] }>('/api/videos?status=all&limit=100'),
        api.get<{ dramas: Drama[] }>('/api/dramas?includeDrafts=true'),
        api.get<{ categories: Category[] }>('/api/categories?includeInactive=true'),
        api.get<{ channels: Channel[] }>('/api/channels'),
        api.get<{ actors: Actor[] }>('/api/actors'),
        api.get<{ users: User[] }>('/api/admin/users'),
      ]);
      setStats(sRes);
      setVideos(vRes.videos);
      setDramas(dRes.dramas);
      setCategories(cRes.categories);
      setChannels(chRes.channels);
      setActors(aRes.actors);
      setUsersList(uRes.users);

      if (!ytForm.dramaId && dRes.dramas[0]) {
        setYtForm((p) => ({ ...p, dramaId: dRes.dramas[0]._id }));
        setOwnForm((p) => ({ ...p, dramaId: dRes.dramas[0]._id }));
        setSelectedEpisodeDramaId(dRes.dramas[0]._id);
      }
      if (!ytForm.categoryId && cRes.categories[0]) {
        setYtForm((p) => ({ ...p, categoryId: cRes.categories[0]._id }));
        setOwnForm((p) => ({ ...p, categoryId: cRes.categories[0]._id }));
      }
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      refreshAll();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.post<{ token: string; user: User }>('/api/auth/login', {
        identifier: loginEmail,
        password: loginPassword,
      });
      if (res.user.role !== 'admin') {
        setLoginError('This account does not have Administrator privileges.');
        return;
      }
      setToken(res.token);
      onUserChange(res.user);
    } catch (err) {
      setLoginError((err as Error).message);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#101512] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1A211D] border border-white/12 rounded-2xl p-8 shadow-2xl">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-xs text-[#D4AF6A] hover:underline mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to DramaKhana
          </button>
          <h1 className="font-display text-3xl font-bold text-white mb-1">Admin Studio Access</h1>
          <p className="text-xs text-white/60 mb-6">
            Sign in with your administrator username and password to manage dramas, YouTube imports, and uploads.
          </p>

          {loginError && (
            <div className="mb-4 p-3 rounded-lg bg-[#791F35]/60 border border-rose-400/30 text-xs text-rose-100">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/75 mb-1.5">Username or Email</label>
              <input
                type="text"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="jasmin"
                className="w-full h-11 px-3.5 rounded-lg bg-[#101512] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF6A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/75 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 rounded-lg bg-[#101512] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF6A]"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-white text-sm font-semibold cursor-pointer"
            >
              Sign In to Admin Panel
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setLoginEmail('jasmin');
              setLoginPassword('jasmin1142005');
            }}
            className="w-full mt-4 h-10 rounded-lg bg-[#101512] border border-white/12 hover:border-[#D4AF6A] text-xs font-medium text-[#D4AF6A] cursor-pointer"
          >
            Fill Admin Credentials (jasmin)
          </button>
        </div>
      </div>
    );
  }

  const sidebarItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'videos', label: 'Manage Videos', icon: VideoIcon },
    { id: 'import-youtube', label: 'Import from YouTube', icon: Search },
    { id: 'add-youtube', label: 'Add YouTube Video', icon: Youtube },
    { id: 'upload-own', label: 'Upload Own Video', icon: Upload },
    { id: 'dramas', label: 'Manage Dramas', icon: Film },
    { id: 'episodes', label: 'Manage Episodes', icon: ListVideo },
    { id: 'categories', label: 'Manage Categories', icon: FolderKanban },
    { id: 'channels', label: 'Manage Channels', icon: Radio },
    { id: 'actors', label: 'Manage Actors', icon: UserCheck },
    { id: 'featured', label: 'Featured Content', icon: Sparkles },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings & MongoDB', icon: Settings },
  ];

  const filteredVideos = videos.filter((v) => {
    if (videoFilter === 'youtube') return v.source_type === 'youtube';
    if (videoFilter === 'own_upload') return v.source_type === 'own_upload';
    if (videoFilter === 'published') return v.status === 'published';
    if (videoFilter === 'draft') return v.status === 'draft';
    return true;
  });

  const handleSearchYouTubeForImport = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!ytSearchInput.trim()) return;
    setYtSearching(true);
    try {
      let results: YouTubeSearchResult[] = [];
      if (ytImportMode === 'playlist') {
        const res = await api.post<{ results: YouTubeSearchResult[] }>('/api/youtube/playlist', {
          input: ytSearchInput,
        });
        results = res.results;
      } else {
        const res = await api.get<{ results: YouTubeSearchResult[] }>(
          `/api/youtube/search?q=${encodeURIComponent(ytSearchInput)}`
        );
        results = res.results;
      }
      setYtResults(results);
      const selectedMap: Record<string, boolean> = {};
      results.forEach((r) => {
        selectedMap[r.videoId] = true;
      });
      setYtSelected(selectedMap);
      if (!importDramaTitle && ytImportMode === 'search') {
        setImportDramaTitle(ytSearchInput.trim());
      }
      notify(`Found ${results.length} YouTube episodes ready to import.`);
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setYtSearching(false);
    }
  };

  const handleBulkImportDrama = async (e: FormEvent) => {
    e.preventDefault();
    const chosen = ytResults
      .filter((r) => ytSelected[r.videoId])
      .map((r, idx) => ({ ...r, episodeNumber: idx + 1 }));
    if (chosen.length === 0) {
      notify('Select at least one YouTube episode.');
      return;
    }
    setImportingDrama(true);
    try {
      const payload =
        importTargetDramaId === '__new__'
          ? {
              dramaTitle: importDramaTitle || chosen[0].title,
              channel: importDramaChannel,
              categoryId: importDramaCategory,
              releaseYear: importDramaYear,
              featured: importDramaFeatured,
              episodes: chosen,
            }
          : {
              dramaId: importTargetDramaId,
              categoryId: importDramaCategory,
              episodes: chosen,
            };
      const res = await api.post<{ drama: Drama; importedCount: number }>(
        '/api/youtube/import-drama',
        payload
      );
      notify(`Imported "${res.drama.title}" with ${res.importedCount} YouTube episodes!`);
      setYtResults([]);
      setYtSearchInput('');
      setImportDramaTitle('');
      await refreshAll();
      setTab('dramas');
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setImportingDrama(false);
    }
  };

  const handleConnectMongo = async (e: FormEvent) => {
    e.preventDefault();
    if (!mongoUriInput.trim()) return;
    setMongoConnecting(true);
    try {
      const res = await api.post<{ syncedCounts: Record<string, number> }>('/api/admin/mongodb/connect', {
        uri: mongoUriInput,
      });
      notify(
        `Connected to MongoDB & synced ${res.syncedCounts.dramas || 0} dramas and ${
          res.syncedCounts.videos || 0
        } videos!`
      );
      setMongoUriInput('');
      await refreshAll();
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setMongoConnecting(false);
    }
  };

  const handleFetchYouTube = async () => {
    if (!ytInput.trim()) return;
    setYtFetching(true);
    try {
      const info = await api.post<{
        videoId: string;
        playlistId: string;
        title: string;
        description: string;
        channel: string;
        thumbnail: string;
      }>('/api/youtube/fetch', { input: ytInput });
      setYtForm((prev) => ({
        ...prev,
        youtubeVideoId: info.videoId || '',
        youtubePlaylistId: info.playlistId || '',
        title: info.title || prev.title,
        description: info.description || prev.description,
        channel: info.channel || prev.channel,
        thumbnail: info.thumbnail || prev.thumbnail,
      }));
      notify('YouTube metadata fetched successfully.');
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setYtFetching(false);
    }
  };

  const handleSaveYouTube = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/videos', {
        ...ytForm,
        source_type: 'youtube',
      });
      notify('YouTube video published to catalog.');
      setYtInput('');
      setYtForm((p) => ({ ...p, title: '', description: '', youtubeVideoId: '', youtubePlaylistId: '' }));
      await refreshAll();
      setTab('videos');
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleUploadOwnVideo = async (e: FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let videoUrl = ownForm.videoUrl;
      let thumbnail = ownForm.thumbnail;
      if (videoFile || thumbFile) {
        const fd = new FormData();
        if (videoFile) fd.append('video', videoFile);
        if (thumbFile) fd.append('thumbnail', thumbFile);
        const uploaded = await api.uploadFiles<{ videoUrl?: string; thumbnailUrl?: string }>('/api/upload', fd);
        if (uploaded.videoUrl) videoUrl = uploaded.videoUrl;
        if (uploaded.thumbnailUrl) thumbnail = uploaded.thumbnailUrl;
      }
      if (!videoUrl) {
        notify('Please upload a video file or provide a media URL.');
        setUploading(false);
        return;
      }
      await api.post('/api/videos', {
        ...ownForm,
        videoUrl,
        thumbnail,
        source_type: 'own_upload',
      });
      notify('Own uploaded video saved to DramaKhana.');
      setVideoFile(null);
      setThumbFile(null);
      setOwnForm((p) => ({ ...p, title: '', description: '', videoUrl: '' }));
      await refreshAll();
      setTab('videos');
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const toggleVideoStatus = async (v: Video) => {
    const next = v.status === 'published' ? 'draft' : 'published';
    await api.patch(`/api/videos/${v._id}/status`, { status: next });
    notify(`Updated "${v.title}" to ${next}.`);
    await refreshAll();
  };

  const handleDeleteVideo = async (id: string) => {
    await api.delete(`/api/videos/${id}`);
    notify('Video removed.');
    await refreshAll();
  };

  const handleSaveEditVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    await api.put(`/api/videos/${editingVideo._id}`, editingVideo);
    setEditingVideo(null);
    notify('Video metadata updated.');
    await refreshAll();
  };

  const handleCreateDrama = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/api/dramas', {
      ...dramaForm,
      genres: dramaForm.genres.split(',').map((s) => s.trim()).filter(Boolean),
      actors: dramaForm.actors.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setDramaForm((p) => ({ ...p, title: '', description: '' }));
    notify('Drama serial created.');
    await refreshAll();
  };

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/api/categories', catForm);
    setCatForm({ name: '', description: '', displayOrder: categories.length + 1, status: 'active' });
    notify('Category added.');
    await refreshAll();
  };

  const handleCreateChannel = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/api/channels', chanForm);
    setChanForm({ name: '', logo: '', youtubeChannelId: '', description: '' });
    notify('Broadcast channel added.');
    await refreshAll();
  };

  const handleCreateActor = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/api/actors', actorForm);
    setActorForm({ name: '', knownFor: '', bio: '' });
    notify('Actor profile added.');
    await refreshAll();
  };

  return (
    <div className="min-h-screen bg-[#101512] text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-[260px] shrink-0 bg-[#0D120F] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col">
        <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
          <span className="font-display text-2xl font-bold text-white">
            Drama<span className="text-[#D4AF6A]">Khana</span>
          </span>
          <span className="text-[11px] font-mono text-[#087F5B] font-semibold">Admin</span>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#087F5B] text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-white/10 hidden lg:block">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full h-10 px-3 rounded-lg bg-[#1A211D] border border-white/12 hover:border-[#D4AF6A] text-xs font-medium text-white flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4AF6A]" />
            Back to Platform
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between gap-4 bg-[#101512]">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>Admin Studio</span>
            <span aria-hidden="true">/</span>
            <span className="text-white font-semibold">
              {sidebarItems.find((s) => s.id === tab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="lg:hidden px-3 py-1.5 rounded-lg bg-[#1A211D] border border-white/12 text-xs text-white cursor-pointer"
            >
              View Site
            </button>
            <button
              type="button"
              onClick={() => setTab('add-youtube')}
              className="h-9 px-3 rounded-lg bg-[#791F35] hover:bg-[#8E2640] text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Youtube className="w-3.5 h-3.5" />
              Add YouTube
            </button>
            <button
              type="button"
              onClick={() => setTab('upload-own')}
              className="h-9 px-3 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Video
            </button>
          </div>
        </header>

        {toast && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-lg bg-[#087F5B]/25 border border-[#087F5B] text-xs text-emerald-100 flex items-center justify-between">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast('')} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="p-6 space-y-8 flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-[#1A211D] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* 1. DASHBOARD */}
              {tab === 'dashboard' && stats && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
                    {[
                      { label: 'Total Videos', val: stats.totalVideos },
                      { label: 'YouTube Videos', val: stats.youtubeVideos },
                      { label: 'Own Uploaded', val: stats.ownUploadedVideos },
                      { label: 'Total Dramas', val: stats.totalDramas },
                      { label: 'Categories', val: stats.totalCategories },
                      { label: 'Episodes', val: stats.totalEpisodes },
                      { label: 'Total Users', val: stats.totalUsers },
                    ].map((kpi) => (
                      <div key={kpi.label} className="p-4 rounded-xl bg-[#1A211D] border border-white/10">
                        <div className="text-xs text-white/60">{kpi.label}</div>
                        <div className="text-2xl font-mono tabular-nums font-bold text-white mt-1.5">
                          {kpi.val}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Category Source Distribution Table (YouTube vs Own Upload) */}
                  <section className="bg-[#1A211D] border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                      <h2 className="font-display text-2xl font-semibold text-white">
                        Category Breakdown by Source Type
                      </h2>
                      <span className="text-xs text-white/55">Live Database Counts</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#101512]/70 text-white/60 border-b border-white/10">
                          <tr>
                            <th className="px-5 py-3 font-medium">Category</th>
                            <th className="px-5 py-3 font-medium text-right">YouTube</th>
                            <th className="px-5 py-3 font-medium text-right">Own Upload</th>
                            <th className="px-5 py-3 font-medium text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/8">
                          {stats.categoryBreakdown.map((row) => (
                            <tr key={row._id} className="hover:bg-white/[0.02]">
                              <td className="px-5 py-3 font-medium text-white">{row.name}</td>
                              <td className="px-5 py-3 text-right font-mono tabular-nums text-rose-300">
                                {row.youtubeCount}
                              </td>
                              <td className="px-5 py-3 text-right font-mono tabular-nums text-emerald-300">
                                {row.ownUploadCount}
                              </td>
                              <td className="px-5 py-3 text-right font-mono tabular-nums text-white font-semibold">
                                {row.totalCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Recent Uploads */}
                  <section className="bg-[#1A211D] border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                      <h2 className="font-display text-2xl font-semibold text-white">Recent Additions</h2>
                      <button
                        type="button"
                        onClick={() => setTab('videos')}
                        className="text-xs text-[#D4AF6A] hover:underline cursor-pointer"
                      >
                        Manage All Videos
                      </button>
                    </div>
                    <div className="divide-y divide-white/8">
                      {stats.recentUploads.map((v) => (
                        <div key={v._id} className="px-5 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <MediaImage
                              src={v.thumbnail}
                              alt={v.title}
                              fallbackTitle={v.title}
                              className="w-16 aspect-video rounded object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{v.title}</p>
                              <p className="text-xs text-white/55 truncate">
                                {v.dramaTitle} · {v.channel} · {v.source_type === 'youtube' ? 'YouTube' : 'Own Upload'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-white/60 shrink-0">
                            {v.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* 2. MANAGE VIDEOS */}
              {tab === 'videos' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="font-display text-3xl font-bold text-white">Unified Video Management</h1>
                    <div className="inline-flex items-center gap-1 p-1 bg-[#1A211D] border border-white/10 rounded-lg">
                      {(
                        [
                          { id: 'all', label: 'All Videos' },
                          { id: 'youtube', label: 'YouTube' },
                          { id: 'own_upload', label: 'Own Upload' },
                          { id: 'published', label: 'Published' },
                          { id: 'draft', label: 'Draft' },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setVideoFilter(f.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                            videoFilter === f.id ? 'bg-[#087F5B] text-white' : 'text-white/65 hover:text-white'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#1A211D] border border-white/10 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101512]/70 text-white/60 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 font-medium">Thumbnail</th>
                          <th className="px-4 py-3 font-medium">Video Title</th>
                          <th className="px-4 py-3 font-medium">Drama Name</th>
                          <th className="px-4 py-3 font-medium">Category</th>
                          <th className="px-4 py-3 font-medium">Source Type</th>
                          <th className="px-4 py-3 font-medium">Channel</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Created Date</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {filteredVideos.map((v) => (
                          <tr key={v._id} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5">
                              <MediaImage
                                src={v.thumbnail}
                                alt={v.title}
                                fallbackTitle={v.title}
                                className="w-20 aspect-video rounded object-cover"
                              />
                            </td>
                            <td className="px-4 py-2.5 font-medium text-white max-w-[220px] truncate">
                              {v.title}
                            </td>
                            <td className="px-4 py-2.5 text-white/75">{v.dramaTitle}</td>
                            <td className="px-4 py-2.5 text-white/75">{v.categoryName}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`font-medium ${
                                  v.source_type === 'youtube' ? 'text-rose-300' : 'text-emerald-300'
                                }`}
                              >
                                {v.source_type === 'youtube' ? 'YouTube' : 'Own Upload'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-white/75">{v.channel}</td>
                            <td className="px-4 py-2.5">
                              <span className={v.status === 'published' ? 'text-emerald-300' : 'text-amber-300'}>
                                {v.status === 'published' ? 'Published' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-mono tabular-nums text-white/55">
                              {v.createdAt.slice(0, 10)}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title="Preview Video"
                                  onClick={() => onNavigate(`/watch/${v._id}`)}
                                  className="p-1.5 rounded bg-[#101512] border border-white/10 text-white/80 hover:text-white cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Edit Video"
                                  onClick={() => setEditingVideo(v)}
                                  className="p-1.5 rounded bg-[#101512] border border-white/10 text-[#D4AF6A] hover:border-[#D4AF6A] cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleVideoStatus(v)}
                                  className="px-2 py-1 rounded bg-[#101512] border border-white/10 text-[11px] text-white/85 hover:border-[#087F5B] cursor-pointer"
                                >
                                  {v.status === 'published' ? 'Unpublish' : 'Publish'}
                                </button>
                                <button
                                  type="button"
                                  title="Delete Video"
                                  onClick={() => handleDeleteVideo(v._id)}
                                  className="p-1.5 rounded bg-[#101512] border border-white/10 text-rose-300 hover:border-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2B. IMPORT DRAMA / PLAYLIST FROM YOUTUBE */}
              {tab === 'import-youtube' && (
                <div className="space-y-6">
                  <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-6 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h1 className="font-display text-3xl font-bold text-white">
                          Import Drama & Episodes from YouTube
                        </h1>
                        <p className="text-xs text-white/60 mt-1">
                          Search YouTube by drama title or paste a YouTube Playlist URL to import all episodes at once.
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 p-1 bg-[#101512] border border-white/10 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setYtImportMode('search')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                            ytImportMode === 'search' ? 'bg-[#087F5B] text-white' : 'text-white/65'
                          }`}
                        >
                          YouTube Search
                        </button>
                        <button
                          type="button"
                          onClick={() => setYtImportMode('playlist')}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                            ytImportMode === 'playlist' ? 'bg-[#791F35] text-white' : 'text-white/65'
                          }`}
                        >
                          Playlist URL / ID
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleSearchYouTubeForImport} className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={ytSearchInput}
                        onChange={(e) => setYtSearchInput(e.target.value)}
                        placeholder={
                          ytImportMode === 'search'
                            ? 'Search Pakistani drama (e.g. Humsafar HUM TV, Tere Bin, Parizaad)...'
                            : 'Paste YouTube Playlist URL or ID (e.g. https://www.youtube.com/playlist?list=...)'
                        }
                        className="flex-1 h-11 px-4 rounded-lg bg-[#101512] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF6A]"
                      />
                      <button
                        type="submit"
                        disabled={ytSearching}
                        className="h-11 px-6 rounded-lg bg-[#791F35] hover:bg-[#8E2640] text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                      >
                        {ytSearching ? 'Searching YouTube...' : ytImportMode === 'search' ? 'Search YouTube' : 'Load Playlist'}
                      </button>
                    </form>
                  </div>

                  {ytResults.length > 0 && (
                    <form onSubmit={handleBulkImportDrama} className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                      <div className="xl:col-span-8 bg-[#1A211D] border border-white/10 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="font-display text-2xl font-semibold text-white">
                            Select Episodes ({Object.values(ytSelected).filter(Boolean).length} / {ytResults.length})
                          </h2>
                          <button
                            type="button"
                            onClick={() => {
                              const allChecked = ytResults.every((r) => ytSelected[r.videoId]);
                              const next: Record<string, boolean> = {};
                              ytResults.forEach((r) => (next[r.videoId] = !allChecked));
                              setYtSelected(next);
                            }}
                            className="text-xs text-[#D4AF6A] hover:underline cursor-pointer"
                          >
                            Toggle Select All
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                          {ytResults.map((item) => {
                            const checked = Boolean(ytSelected[item.videoId]);
                            return (
                              <label
                                key={item.videoId}
                                className={`p-3 rounded-xl border flex gap-3 items-start cursor-pointer transition-colors ${
                                  checked
                                    ? 'bg-[#087F5B]/15 border-[#087F5B]'
                                    : 'bg-[#101512]/60 border-white/10'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setYtSelected((prev) => ({ ...prev, [item.videoId]: e.target.checked }))
                                  }
                                  className="mt-1 accent-[#087F5B]"
                                />
                                <MediaImage
                                  src={item.thumbnail}
                                  alt={item.title}
                                  fallbackTitle={item.title}
                                  className="w-24 aspect-video rounded object-cover shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-white line-clamp-2">{item.title}</p>
                                  <p className="text-[11px] text-white/55 mt-1 truncate">
                                    {item.channel} · {item.duration}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="xl:col-span-4 bg-[#1A211D] border border-white/10 rounded-2xl p-5 space-y-4">
                        <h2 className="font-display text-2xl font-semibold text-white">Target Drama Serial</h2>

                        <div>
                          <label className="block text-xs text-white/70 mb-1">Destination Drama</label>
                          <select
                            value={importTargetDramaId}
                            onChange={(e) => setImportTargetDramaId(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                          >
                            <option value="__new__">+ Create New Drama Serial</option>
                            {dramas.map((d) => (
                              <option key={d._id} value={d._id}>
                                Add to: {d.title}
                              </option>
                            ))}
                          </select>
                        </div>

                        {importTargetDramaId === '__new__' && (
                          <>
                            <div>
                              <label className="block text-xs text-white/70 mb-1">New Drama Title</label>
                              <input
                                type="text"
                                required
                                value={importDramaTitle}
                                onChange={(e) => setImportDramaTitle(e.target.value)}
                                placeholder="e.g. Humsafar"
                                className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-white/70 mb-1">Channel</label>
                                <select
                                  value={importDramaChannel}
                                  onChange={(e) => setImportDramaChannel(e.target.value)}
                                  className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                                >
                                  {channels.map((c) => (
                                    <option key={c._id} value={c.name}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-white/70 mb-1">Year</label>
                                <input
                                  type="number"
                                  value={importDramaYear}
                                  onChange={(e) => setImportDramaYear(Number(e.target.value))}
                                  className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs font-mono text-white"
                                />
                              </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-white/80">
                              <input
                                type="checkbox"
                                checked={importDramaFeatured}
                                onChange={(e) => setImportDramaFeatured(e.target.checked)}
                              />
                              Feature on Homepage Hero Slider
                            </label>
                          </>
                        )}

                        <div>
                          <label className="block text-xs text-white/70 mb-1">Assign Category</label>
                          <select
                            value={importDramaCategory}
                            onChange={(e) => setImportDramaCategory(e.target.value)}
                            className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                          >
                            {categories.map((c) => (
                              <option key={c._id} value={c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={importingDrama}
                          className="w-full h-11 rounded-lg bg-[#087F5B] hover:bg-[#099268] disabled:opacity-60 text-xs font-semibold text-white cursor-pointer"
                        >
                          {importingDrama ? 'Importing to Database...' : 'Import Selected Episodes'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* 3. ADD YOUTUBE VIDEO */}
              {tab === 'add-youtube' && (
                <div className="max-w-3xl bg-[#1A211D] border border-white/10 rounded-2xl p-6 space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-white">Add YouTube Drama Video or Playlist</h1>
                    <p className="text-xs text-white/60 mt-1">
                      Paste a YouTube watch URL, Video ID, or Playlist URL to automatically pull metadata.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={ytInput}
                      onChange={(e) => setYtInput(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or Video ID (e.g. M7lc1UVf-VE)"
                      className="flex-1 h-11 px-3.5 rounded-lg bg-[#101512] border border-white/15 text-sm text-white focus:outline-none focus:border-[#D4AF6A]"
                    />
                    <button
                      type="button"
                      onClick={handleFetchYouTube}
                      disabled={ytFetching}
                      className="h-11 px-5 rounded-lg bg-[#791F35] hover:bg-[#8E2640] text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                    >
                      {ytFetching ? 'Fetching...' : 'Fetch YouTube Info'}
                    </button>
                  </div>

                  <form onSubmit={handleSaveYouTube} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-white/70 mb-1">Video Title</label>
                      <input
                        type="text"
                        required
                        value={ytForm.title}
                        onChange={(e) => setYtForm({ ...ytForm, title: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">YouTube Video ID</label>
                      <input
                        type="text"
                        value={ytForm.youtubeVideoId}
                        onChange={(e) => setYtForm({ ...ytForm, youtubeVideoId: e.target.value })}
                        placeholder="e.g. M7lc1UVf-VE"
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">YouTube Playlist ID (Optional)</label>
                      <input
                        type="text"
                        value={ytForm.youtubePlaylistId}
                        onChange={(e) => setYtForm({ ...ytForm, youtubePlaylistId: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">Assign Drama</label>
                      <select
                        value={ytForm.dramaId}
                        onChange={(e) => setYtForm({ ...ytForm, dramaId: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      >
                        {dramas.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">Category</label>
                      <select
                        value={ytForm.categoryId}
                        onChange={(e) => setYtForm({ ...ytForm, categoryId: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      >
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">Channel Name</label>
                      <input
                        type="text"
                        value={ytForm.channel}
                        onChange={(e) => setYtForm({ ...ytForm, channel: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/70 mb-1">Episode Number</label>
                      <input
                        type="number"
                        min={1}
                        value={ytForm.episodeNumber}
                        onChange={(e) => setYtForm({ ...ytForm, episodeNumber: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm font-mono text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-white/70 mb-1">Thumbnail URL</label>
                      <input
                        type="text"
                        value={ytForm.thumbnail}
                        onChange={(e) => setYtForm({ ...ytForm, thumbnail: e.target.value })}
                        placeholder="Auto-filled on Fetch or paste URL"
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-white/70 mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={ytForm.description}
                        onChange={(e) => setYtForm({ ...ytForm, description: e.target.value })}
                        className="w-full p-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between pt-2">
                      <select
                        value={ytForm.status}
                        onChange={(e) => setYtForm({ ...ytForm, status: e.target.value as 'published' | 'draft' })}
                        className="h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                      >
                        <option value="published">Publish Immediately</option>
                        <option value="draft">Save as Draft</option>
                      </select>
                      <button
                        type="submit"
                        className="h-10 px-6 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-xs font-semibold text-white cursor-pointer"
                      >
                        Save YouTube Video
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 4. UPLOAD OWN VIDEO */}
              {tab === 'upload-own' && (
                <div className="max-w-3xl bg-[#1A211D] border border-white/10 rounded-2xl p-6 space-y-6">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-white">Upload Own Drama Video</h1>
                    <p className="text-xs text-white/60 mt-1">
                      Video files are stored in media storage (/uploads) with metadata persisted in the database.
                    </p>
                  </div>

                  <form onSubmit={handleUploadOwnVideo} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-[#101512] border border-dashed border-white/20">
                      <label className="block text-xs font-semibold text-[#D4AF6A] mb-2">
                        Video File (MP4 / WebM)
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                        className="text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#087F5B] file:text-white file:text-xs file:cursor-pointer"
                      />
                      {videoFile && <p className="text-[11px] text-emerald-300 mt-2">{videoFile.name}</p>}
                    </div>

                    <div className="p-4 rounded-xl bg-[#101512] border border-dashed border-white/20">
                      <label className="block text-xs font-semibold text-[#D4AF6A] mb-2">
                        Custom Thumbnail Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbFile(e.target.files?.[0] || null)}
                        className="text-xs text-white/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#791F35] file:text-white file:text-xs file:cursor-pointer"
                      />
                      {thumbFile && <p className="text-[11px] text-emerald-300 mt-2">{thumbFile.name}</p>}
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs text-white/70 mb-1">Video Title</label>
                      <input
                        type="text"
                        required
                        value={ownForm.title}
                        onChange={(e) => setOwnForm({ ...ownForm, title: e.target.value })}
                        placeholder="e.g. Ishq-e-Haveli — Episode 04 (Studio Master)"
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs text-white/70 mb-1">Or Direct Video URL (S3 / Cloudinary)</label>
                      <input
                        type="text"
                        value={ownForm.videoUrl}
                        onChange={(e) => setOwnForm({ ...ownForm, videoUrl: e.target.value })}
                        placeholder="Leave blank when uploading a file above"
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/70 mb-1">Drama Serial</label>
                      <select
                        value={ownForm.dramaId}
                        onChange={(e) => setOwnForm({ ...ownForm, dramaId: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      >
                        {dramas.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-white/70 mb-1">Category</label>
                      <select
                        value={ownForm.categoryId}
                        onChange={(e) => setOwnForm({ ...ownForm, categoryId: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      >
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-white/70 mb-1">Episode Number</label>
                      <input
                        type="number"
                        min={1}
                        value={ownForm.episodeNumber}
                        onChange={(e) => setOwnForm({ ...ownForm, episodeNumber: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm font-mono text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-white/70 mb-1">Release Date</label>
                      <input
                        type="date"
                        value={ownForm.releaseDate}
                        onChange={(e) => setOwnForm({ ...ownForm, releaseDate: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm font-mono text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs text-white/70 mb-1">Description</label>
                      <textarea
                        rows={3}
                        value={ownForm.description}
                        onChange={(e) => setOwnForm({ ...ownForm, description: e.target.value })}
                        className="w-full p-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between pt-2">
                      <select
                        value={ownForm.status}
                        onChange={(e) => setOwnForm({ ...ownForm, status: e.target.value as 'published' | 'draft' })}
                        className="h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                      >
                        <option value="published">Publish Immediately</option>
                        <option value="draft">Save as Draft</option>
                      </select>

                      <button
                        type="submit"
                        disabled={uploading}
                        className="h-10 px-6 rounded-lg bg-[#087F5B] hover:bg-[#099268] disabled:opacity-60 text-xs font-semibold text-white cursor-pointer"
                      >
                        {uploading ? 'Uploading & Saving...' : 'Upload & Publish'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 5. MANAGE DRAMAS */}
              {tab === 'dramas' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <form
                    onSubmit={handleCreateDrama}
                    className="xl:col-span-4 bg-[#1A211D] border border-white/10 rounded-xl p-5 space-y-3"
                  >
                    <h2 className="font-display text-2xl font-semibold text-white">Create Drama Serial</h2>
                    <input
                      type="text"
                      required
                      placeholder="Drama Title"
                      value={dramaForm.title}
                      onChange={(e) => setDramaForm({ ...dramaForm, title: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={dramaForm.channel}
                        onChange={(e) => setDramaForm({ ...dramaForm, channel: e.target.value })}
                        className="h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                      >
                        {channels.map((ch) => (
                          <option key={ch._id} value={ch.name}>
                            {ch.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={dramaForm.releaseYear}
                        onChange={(e) => setDramaForm({ ...dramaForm, releaseYear: Number(e.target.value) })}
                        className="h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs font-mono text-white"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Genres (comma separated)"
                      value={dramaForm.genres}
                      onChange={(e) => setDramaForm({ ...dramaForm, genres: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Cast Actors (comma separated)"
                      value={dramaForm.actors}
                      onChange={(e) => setDramaForm({ ...dramaForm, actors: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                    />
                    <textarea
                      rows={3}
                      placeholder="Drama Synopsis"
                      value={dramaForm.description}
                      onChange={(e) => setDramaForm({ ...dramaForm, description: e.target.value })}
                      className="w-full p-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                    />
                    <label className="flex items-center gap-2 text-xs text-white/80">
                      <input
                        type="checkbox"
                        checked={dramaForm.featured}
                        onChange={(e) => setDramaForm({ ...dramaForm, featured: e.target.checked })}
                      />
                      Feature in Homepage Hero Slider
                    </label>
                    <button
                      type="submit"
                      className="w-full h-10 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Drama Serial
                    </button>
                  </form>

                  <div className="xl:col-span-8 bg-[#1A211D] border border-white/10 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101512]/70 text-white/60 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 font-medium">Drama</th>
                          <th className="px-4 py-3 font-medium">Channel</th>
                          <th className="px-4 py-3 font-medium">Year</th>
                          <th className="px-4 py-3 font-medium">Episodes</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {dramas.map((d) => (
                          <tr key={d._id}>
                            <td className="px-4 py-3 font-medium text-white">{d.title}</td>
                            <td className="px-4 py-3 text-white/75">{d.channel}</td>
                            <td className="px-4 py-3 font-mono tabular-nums text-white/65">{d.releaseYear}</td>
                            <td className="px-4 py-3 font-mono tabular-nums text-white/65">{d.totalEpisodes || 0}</td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/drama/${d.slug}`)}
                                className="text-[#D4AF6A] hover:underline cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.delete(`/api/dramas/${d._id}`);
                                  notify('Drama deleted.');
                                  await refreshAll();
                                }}
                                className="text-rose-300 hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. MANAGE EPISODES */}
              {tab === 'episodes' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="font-display text-3xl font-bold text-white">Episodes by Drama Serial</h1>
                    <select
                      value={selectedEpisodeDramaId}
                      onChange={(e) => setSelectedEpisodeDramaId(e.target.value)}
                      className="h-10 px-3 rounded-lg bg-[#1A211D] border border-white/15 text-xs text-white"
                    >
                      {dramas.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-[#1A211D] border border-white/10 rounded-xl divide-y divide-white/8">
                    {videos
                      .filter((v) => v.dramaId === selectedEpisodeDramaId)
                      .sort((a, b) => a.episodeNumber - b.episodeNumber)
                      .map((ep) => (
                        <div key={ep._id} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className="font-mono tabular-nums text-sm font-bold text-[#D4AF6A]">
                              Ep {String(ep.episodeNumber).padStart(2, '0')}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-white">{ep.title}</p>
                              <p className="text-xs text-white/55">
                                {ep.source_type === 'youtube' ? 'YouTube' : 'Own Upload'} · {ep.duration} · {ep.status}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate(`/watch/${ep._id}`)}
                            className="px-3 py-1.5 rounded-lg bg-[#087F5B] text-xs font-semibold text-white cursor-pointer"
                          >
                            Watch
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* 7. MANAGE CATEGORIES */}
              {tab === 'categories' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <form
                    onSubmit={handleCreateCategory}
                    className="xl:col-span-4 bg-[#1A211D] border border-white/10 rounded-xl p-5 space-y-3"
                  >
                    <h2 className="font-display text-2xl font-semibold text-white">Add Custom Category</h2>
                    <input
                      type="text"
                      required
                      placeholder="Category Name (e.g. Ramzan Specials)"
                      value={catForm.name}
                      onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                    />
                    <textarea
                      rows={3}
                      placeholder="Category Description"
                      value={catForm.description}
                      onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                      className="w-full p-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={catForm.displayOrder}
                        onChange={(e) => setCatForm({ ...catForm, displayOrder: Number(e.target.value) })}
                        className="h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs font-mono text-white"
                      />
                      <select
                        value={catForm.status}
                        onChange={(e) => setCatForm({ ...catForm, status: e.target.value as 'active' | 'inactive' })}
                        className="h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full h-10 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-xs font-semibold text-white cursor-pointer"
                    >
                      Create Category
                    </button>
                  </form>

                  <div className="xl:col-span-8 bg-[#1A211D] border border-white/10 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101512]/70 text-white/60 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 font-medium">Order</th>
                          <th className="px-4 py-3 font-medium">Category</th>
                          <th className="px-4 py-3 font-medium text-right">YouTube</th>
                          <th className="px-4 py-3 font-medium text-right">Own Upload</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/8">
                        {categories.map((cat) => (
                          <tr key={cat._id}>
                            <td className="px-4 py-3 font-mono tabular-nums text-white/60">{cat.displayOrder}</td>
                            <td className="px-4 py-3 font-medium text-white">{cat.name}</td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-rose-300">
                              {cat.youtubeCount || 0}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-300">
                              {cat.ownUploadCount || 0}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.put(`/api/categories/${cat._id}`, {
                                    status: cat.status === 'active' ? 'inactive' : 'active',
                                  });
                                  await refreshAll();
                                }}
                                className={`px-2 py-0.5 rounded text-[11px] cursor-pointer ${
                                  cat.status === 'active' ? 'bg-[#087F5B]/25 text-emerald-300' : 'bg-white/10 text-white/55'
                                }`}
                              >
                                {cat.status}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={async () => {
                                  await api.delete(`/api/categories/${cat._id}`);
                                  notify('Category deleted.');
                                  await refreshAll();
                                }}
                                className="text-rose-300 hover:underline cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 8. MANAGE CHANNELS */}
              {tab === 'channels' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <form
                    onSubmit={handleCreateChannel}
                    className="xl:col-span-4 bg-[#1A211D] border border-white/10 rounded-xl p-5 space-y-3"
                  >
                    <h2 className="font-display text-2xl font-semibold text-white">Add TV Channel</h2>
                    <input
                      type="text"
                      required
                      placeholder="Channel Name (e.g. Express Entertainment)"
                      value={chanForm.name}
                      onChange={(e) => setChanForm({ ...chanForm, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="Short Monogram (e.g. EXP)"
                      value={chanForm.logo}
                      onChange={(e) => setChanForm({ ...chanForm, logo: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="YouTube Channel ID"
                      value={chanForm.youtubeChannelId}
                      onChange={(e) => setChanForm({ ...chanForm, youtubeChannelId: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs font-mono text-white"
                    />
                    <textarea
                      rows={3}
                      placeholder="Channel Description"
                      value={chanForm.description}
                      onChange={(e) => setChanForm({ ...chanForm, description: e.target.value })}
                      className="w-full p-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="w-full h-10 rounded-lg bg-[#087F5B] text-xs font-semibold text-white cursor-pointer"
                    >
                      Save Channel
                    </button>
                  </form>

                  <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {channels.map((ch) => (
                      <div key={ch._id} className="p-5 rounded-xl bg-[#1A211D] border border-white/10 flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs font-bold text-[#D4AF6A]">{ch.logo}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                await api.delete(`/api/channels/${ch._id}`);
                                await refreshAll();
                              }}
                              className="text-xs text-rose-300 hover:underline cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                          <h3 className="text-base font-semibold text-white">{ch.name}</h3>
                          <p className="text-xs text-white/60 mt-1">{ch.description}</p>
                        </div>
                        <p className="text-[11px] font-mono text-white/45 truncate">
                          YouTube ID: {ch.youtubeChannelId || 'Not set'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 9. MANAGE ACTORS */}
              {tab === 'actors' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <form
                    onSubmit={handleCreateActor}
                    className="xl:col-span-4 bg-[#1A211D] border border-white/10 rounded-xl p-5 space-y-3"
                  >
                    <h2 className="font-display text-2xl font-semibold text-white">Add Actor / Actress</h2>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={actorForm.name}
                      onChange={(e) => setActorForm({ ...actorForm, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="Notable Dramas"
                      value={actorForm.knownFor}
                      onChange={(e) => setActorForm({ ...actorForm, knownFor: e.target.value })}
                      className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                    />
                    <textarea
                      rows={3}
                      placeholder="Biography"
                      value={actorForm.bio}
                      onChange={(e) => setActorForm({ ...actorForm, bio: e.target.value })}
                      className="w-full p-3 rounded-lg bg-[#101512] border border-white/15 text-xs text-white"
                    />
                    <button
                      type="submit"
                      className="w-full h-10 rounded-lg bg-[#087F5B] text-xs font-semibold text-white cursor-pointer"
                    >
                      Save Actor Profile
                    </button>
                  </form>

                  <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {actors.map((a) => (
                      <div key={a._id} className="p-4 rounded-xl bg-[#1A211D] border border-white/10 flex items-center gap-4">
                        <MediaImage
                          src={a.avatar}
                          alt={a.name}
                          fallbackTitle={a.name}
                          className="w-16 h-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-white truncate">{a.name}</h3>
                          <p className="text-xs text-[#D4AF6A] truncate">{a.knownFor}</p>
                          <p className="text-xs text-white/60 line-clamp-2 mt-1">{a.bio}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.delete(`/api/actors/${a._id}`);
                            await refreshAll();
                          }}
                          className="text-xs text-rose-300 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 10. FEATURED CONTENT */}
              {tab === 'featured' && (
                <div className="space-y-4">
                  <h1 className="font-display text-3xl font-bold text-white">Hero Banner Featured Dramas</h1>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {dramas.map((d) => (
                      <div key={d._id} className="p-4 rounded-xl bg-[#1A211D] border border-white/10 flex flex-col justify-between gap-4">
                        <div>
                          <MediaImage
                            src={d.banner || d.poster}
                            alt={d.title}
                            fallbackTitle={d.title}
                            className="w-full aspect-video rounded-lg object-cover mb-3"
                          />
                          <h3 className="text-base font-semibold text-white">{d.title}</h3>
                          <p className="text-xs text-white/60">{d.channel} · {d.releaseYear}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await api.put(`/api/dramas/${d._id}`, { featured: !d.featured });
                            notify(`Updated featured state for ${d.title}.`);
                            await refreshAll();
                          }}
                          className={`h-9 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                            d.featured
                              ? 'bg-[#087F5B] text-white'
                              : 'bg-[#101512] border border-white/15 text-white/80 hover:border-[#D4AF6A]'
                          }`}
                        >
                          {d.featured && <Check className="w-3.5 h-3.5" />}
                          {d.featured ? 'Featured on Hero' : 'Feature on Hero'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 11. USER MANAGEMENT */}
              {tab === 'users' && (
                <div className="bg-[#1A211D] border border-white/10 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#101512]/70 text-white/60 border-b border-white/10">
                      <tr>
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Email</th>
                        <th className="px-5 py-3 font-medium">Role</th>
                        <th className="px-5 py-3 font-medium">Watchlist Count</th>
                        <th className="px-5 py-3 font-medium text-right">Access Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8">
                      {usersList.map((u) => (
                        <tr key={u._id}>
                          <td className="px-5 py-3 font-medium text-white">{u.name}</td>
                          <td className="px-5 py-3 text-white/75">{u.email}</td>
                          <td className="px-5 py-3 font-mono text-[#D4AF6A]">{u.role}</td>
                          <td className="px-5 py-3 font-mono tabular-nums text-white/65">{u.watchlist.length}</td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextRole = u.role === 'admin' ? 'viewer' : 'admin';
                                await api.patch(`/api/admin/users/${u._id}/role`, { role: nextRole });
                                notify(`Changed ${u.name} role to ${nextRole}.`);
                                await refreshAll();
                              }}
                              className="px-3 py-1.5 rounded bg-[#101512] border border-white/15 hover:border-[#D4AF6A] text-white cursor-pointer"
                            >
                              Switch to {u.role === 'admin' ? 'Viewer' : 'Admin'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 12. SETTINGS & MONGODB */}
              {tab === 'settings' && stats && (
                <div className="max-w-3xl space-y-6">
                  <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h1 className="font-display text-3xl font-bold text-white">MongoDB & Storage Settings</h1>
                        <p className="text-xs text-white/60 mt-1">
                          Connect a MongoDB Atlas or server URI to persist all dramas, videos, categories, and users in MongoDB.
                        </p>
                      </div>
                      <Database className={`w-7 h-7 ${stats.mongoConnected ? 'text-emerald-400' : 'text-[#D4AF6A]'}`} />
                    </div>

                    <div className="p-4 rounded-xl bg-[#101512] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">Active Database Status</p>
                        <p className="text-xs text-white/55">
                          {stats.mongoUriMasked ? `URI: ${stats.mongoUriMasked}` : 'No MongoDB URI configured yet'}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono font-semibold ${
                          stats.mongoConnected ? 'text-emerald-300' : 'text-amber-300'
                        }`}
                      >
                        {stats.storageMode}
                      </span>
                    </div>

                    <form onSubmit={handleConnectMongo} className="space-y-3">
                      <label className="block text-xs font-medium text-white/75">
                        MongoDB Connection URI (Atlas or Self-Hosted)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          required
                          value={mongoUriInput}
                          onChange={(e) => setMongoUriInput(e.target.value)}
                          placeholder="mongodb+srv://username:password@cluster.mongodb.net/dramakhana"
                          className="flex-1 h-11 px-3.5 rounded-lg bg-[#101512] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF6A]"
                        />
                        <button
                          type="submit"
                          disabled={mongoConnecting}
                          className="h-11 px-5 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                        >
                          {mongoConnecting ? 'Connecting...' : 'Connect & Sync MongoDB'}
                        </button>
                      </div>
                    </form>

                    {stats.mongoConnected && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await api.post<{ syncedCounts: Record<string, number> }>(
                            '/api/admin/mongodb/sync'
                          );
                          notify(
                            `Synced ${res.syncedCounts.dramas || 0} dramas and ${
                              res.syncedCounts.videos || 0
                            } videos to MongoDB.`
                          );
                        }}
                        className="h-10 px-4 rounded-lg bg-[#101512] border border-white/15 hover:border-[#D4AF6A] text-xs font-medium text-[#D4AF6A] cursor-pointer"
                      >
                        Sync All Collections to MongoDB Now
                      </button>
                    )}
                  </div>

                  <div className="bg-[#1A211D] border border-white/10 rounded-2xl p-6 space-y-3 text-sm">
                    <div className="p-4 rounded-xl bg-[#101512] border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">YouTube Search & Importer</p>
                        <p className="text-xs text-white/55">
                          Live YouTube search, playlist XML feeds, and oEmbed metadata active
                        </p>
                      </div>
                      <span className="text-xs font-mono text-[#D4AF6A]">
                        {stats.youtubeApiConfigured ? 'YouTube Data API v3' : 'Live Search Ready'}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-[#101512] border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">Own Video Storage</p>
                        <p className="text-xs text-white/55">Local /uploads disk storage or optional Cloudinary CDN</p>
                      </div>
                      <span className="text-xs font-mono text-emerald-300">
                        {stats.cloudinaryConfigured ? 'Cloudinary Connected' : 'Local Media Storage'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditVideo}
            className="w-full max-w-lg bg-[#1A211D] border border-white/15 rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-white">Edit Video Metadata</h2>
              <button type="button" onClick={() => setEditingVideo(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">Title</label>
              <input
                type="text"
                required
                value={editingVideo.title}
                onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Episode #</label>
                <input
                  type="number"
                  value={editingVideo.episodeNumber}
                  onChange={(e) =>
                    setEditingVideo({ ...editingVideo, episodeNumber: Number(e.target.value) })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Status</label>
                <select
                  value={editingVideo.status}
                  onChange={(e) =>
                    setEditingVideo({ ...editingVideo, status: e.target.value as 'published' | 'draft' })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/70 mb-1">Category</label>
              <select
                value={editingVideo.categoryId}
                onChange={(e) => setEditingVideo({ ...editingVideo, categoryId: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-[#101512] border border-white/15 text-sm text-white"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 rounded-lg bg-[#101512] border border-white/15 text-xs text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#087F5B] text-xs font-semibold text-white cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

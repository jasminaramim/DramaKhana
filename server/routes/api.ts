import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import {
  connectAndSyncMongo,
  createActor,
  createCategory,
  createChannel,
  createDrama,
  createUser,
  createVideo,
  deleteActor,
  deleteCategory,
  deleteChannel,
  deleteDrama,
  deleteVideo,
  findUserByEmail,
  findUserById,
  findUserByIdentifier,
  getAdminStats,
  getCategoryBySlug,
  getDramaBySlug,
  getHomePayload,
  getSavedMongoUriMasked,
  getVideoById,
  globalSearch,
  incrementVideoViews,
  isMongoConnected,
  listActors,
  listCategories,
  listChannels,
  listDramas,
  listUsers,
  listVideos,
  listWatchHistory,
  syncAllToMongo,
  toggleWatchlist,
  updateCategory,
  updateChannel,
  updateDrama,
  updateUserRole,
  updateVideo,
  upsertWatchHistory,
} from '../db.js';
import {
  extractYouTubeIds,
  fetchYouTubePlaylist,
  fetchYouTubeSingleInfo,
  searchYouTube,
} from '../youtube.js';
import {
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  signToken,
  verifyPassword,
  type AuthedRequest,
} from '../auth.js';

const router = express.Router();

// Configure multer disk storage for Own Uploaded Videos & Thumbnails
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadsBase = isVercel ? path.join('/tmp', 'uploads') : path.resolve(process.cwd(), 'uploads');
const UPLOAD_VIDEOS_DIR = path.join(uploadsBase, 'videos');
const UPLOAD_THUMBS_DIR = path.join(uploadsBase, 'thumbnails');
try {
  fs.mkdirSync(UPLOAD_VIDEOS_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_THUMBS_DIR, { recursive: true });
} catch {
  // Read-only filesystem warning handled gracefully
}

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === 'thumbnail' || file.mimetype.startsWith('image/')) {
      cb(null, UPLOAD_THUMBS_DIR);
    } else {
      cb(null, UPLOAD_VIDEOS_DIR);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.startsWith('image/') ? '.jpg' : '.mp4');
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
});

// --- Auth Routes ---
router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || String(password).length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required.' });
  }
  if (findUserByEmail(String(email))) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }
  const user = createUser({
    name: String(name).trim(),
    email: String(email).trim(),
    passwordHash: hashPassword(String(password)),
    role: 'viewer',
  });
  const token = signToken({ userId: user._id, email: user.email, role: user.role, name: user.name });
  return res.status(201).json({ token, user });
});

router.post('/auth/login', (req, res) => {
  const { identifier, email, username, password } = req.body || {};
  const loginId = String(identifier || username || email || '').trim();
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Username or email and password are required.' });
  }
  const record = findUserByIdentifier(loginId);
  if (!record || !verifyPassword(String(password), record.password)) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }
  const { password: _pw, ...user } = record;
  const token = signToken({ userId: user._id, email: user.email, role: user.role, name: user.name });
  return res.json({ token, user });
});

router.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
  const user = findUserById(req.user!.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});

// --- Public Streaming Routes ---
router.get('/home', (_req, res) => {
  return res.json(getHomePayload());
});

router.get('/categories', (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  return res.json({ categories: listCategories(includeInactive) });
});

router.get('/categories/:slug', (req, res) => {
  const category = getCategoryBySlug(req.params.slug);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  const sourceType = (req.query.source_type as 'youtube' | 'own_upload' | 'all') || 'all';
  const sort = (req.query.sort as 'latest' | 'popular') || 'latest';
  const { videos, total } = listVideos({
    categoryId: category._id,
    source_type: sourceType,
    sort,
    limit: 60,
  });
  return res.json({ category, videos, total });
});

router.get('/channels', (_req, res) => {
  return res.json({ channels: listChannels() });
});

router.get('/actors', (_req, res) => {
  return res.json({ actors: listActors() });
});

router.get('/dramas', (req, res) => {
  const includeDrafts = req.query.includeDrafts === 'true';
  const channel = req.query.channel ? String(req.query.channel) : undefined;
  const genre = req.query.genre ? String(req.query.genre) : undefined;
  return res.json({ dramas: listDramas({ includeDrafts, channel, genre }) });
});

router.get('/dramas/:slug', (req, res) => {
  const drama = getDramaBySlug(req.params.slug);
  if (!drama) return res.status(404).json({ error: 'Drama not found' });
  const sourceType = (req.query.source_type as 'youtube' | 'own_upload' | 'all') || 'all';
  const { videos: episodes } = listVideos({
    dramaId: drama._id,
    source_type: sourceType,
    sort: 'episode',
    limit: 100,
  });
  const relatedDramas = listDramas()
    .filter((d) => d._id !== drama._id && (d.channel === drama.channel || d.genres.some((g) => drama.genres.includes(g))))
    .slice(0, 6);
  return res.json({ drama, episodes, relatedDramas });
});

router.get('/videos', (req, res) => {
  const sourceType = (req.query.source_type as 'youtube' | 'own_upload' | 'all') || 'all';
  const status = (req.query.status as 'published' | 'draft' | 'all') || 'published';
  const sort = (req.query.sort as 'latest' | 'popular' | 'episode') || 'latest';
  const result = listVideos({
    source_type: sourceType,
    categoryId: req.query.categoryId ? String(req.query.categoryId) : undefined,
    categorySlug: req.query.categorySlug ? String(req.query.categorySlug) : undefined,
    dramaId: req.query.dramaId ? String(req.query.dramaId) : undefined,
    channel: req.query.channel ? String(req.query.channel) : undefined,
    status,
    search: req.query.search ? String(req.query.search) : undefined,
    sort,
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 40),
  });
  return res.json(result);
});

router.get('/videos/:id', async (req, res) => {
  const rawId = req.params.id;
  if (rawId.startsWith('yt:')) {
    const ytId = rawId.slice(3);
    const titleParam = req.query.title ? String(req.query.title) : '';
    const channelParam = req.query.channel ? String(req.query.channel) : '';
    let info = { title: titleParam, channel: channelParam, description: '', thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` };
    if (!titleParam) {
      try {
        const fetched = await fetchYouTubeSingleInfo(ytId);
        info = {
          title: fetched.title,
          channel: fetched.channel,
          description: fetched.description,
          thumbnail: fetched.thumbnail,
        };
      } catch {
        // fallback
      }
    }
    const virtualVideo = {
      _id: rawId,
      title: info.title || `YouTube Stream (${ytId})`,
      description: info.description || `Streaming directly from YouTube (${info.channel || 'Official Channel'}).`,
      thumbnail: info.thumbnail,
      source_type: 'youtube' as const,
      youtubeVideoId: ytId,
      dramaId: '',
      categoryId: '',
      episodeNumber: 1,
      channel: info.channel || 'YouTube',
      duration: '40:00',
      status: 'published' as const,
      views: 1,
      createdAt: new Date().toISOString(),
    };
    return res.json({
      video: virtualVideo,
      drama: null,
      episodes: [virtualVideo],
      relatedDramas: listDramas().slice(0, 6),
    });
  }

  const video = getVideoById(rawId);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  incrementVideoViews(video._id);
  const drama = getDramaBySlug(video.dramaId);
  const { videos: episodes } = listVideos({ dramaId: video.dramaId, sort: 'episode', limit: 100 });
  const relatedDramas = listDramas()
    .filter((d) => d._id !== video.dramaId)
    .slice(0, 6);
  return res.json({
    video: { ...video, views: video.views + 1 },
    drama,
    episodes,
    relatedDramas,
  });
});

router.get('/search', async (req, res) => {
  const q = req.query.q ? String(req.query.q) : '';
  const source_type = (req.query.source_type as 'youtube' | 'own_upload' | 'all') || 'all';
  const categorySlug = req.query.category ? String(req.query.category) : undefined;
  const year = req.query.year ? Number(req.query.year) : undefined;
  const sort = (req.query.sort as 'latest' | 'popular') || 'latest';
  const local = globalSearch({ q, source_type, categorySlug, year, sort });

  const shouldSearchYouTube = q.trim().length > 0 && source_type !== 'own_upload';
  const youtubeResults = shouldSearchYouTube
    ? await searchYouTube(`${q.trim()} pakistani drama`, 12)
    : [];

  return res.json({
    ...local,
    youtubeResults,
  });
});

router.get('/youtube/search', async (req, res) => {
  const q = req.query.q ? String(req.query.q) : '';
  if (!q.trim()) return res.json({ results: [] });
  const results = await searchYouTube(q.trim(), 16);
  return res.json({ results });
});

// --- Watchlist & Watch History ---
router.get('/watchlist', requireAuth, (req: AuthedRequest, res) => {
  const user = findUserById(req.user!.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const dramas = listDramas().filter((d) => user.watchlist.includes(d._id));
  return res.json({ watchlist: user.watchlist, dramas });
});

router.post('/watchlist/:dramaId', requireAuth, (req: AuthedRequest, res) => {
  const watchlist = toggleWatchlist(req.user!.userId, req.params.dramaId, 'add');
  return res.json({ watchlist });
});

router.delete('/watchlist/:dramaId', requireAuth, (req: AuthedRequest, res) => {
  const watchlist = toggleWatchlist(req.user!.userId, req.params.dramaId, 'remove');
  return res.json({ watchlist });
});

router.get('/history', requireAuth, (req: AuthedRequest, res) => {
  return res.json({ history: listWatchHistory(req.user!.userId) });
});

router.post('/history', optionalAuth, (req: AuthedRequest, res) => {
  if (!req.user) return res.json({ saved: false });
  const { videoId, dramaId, progressSeconds } = req.body || {};
  if (!videoId || !dramaId) return res.status(400).json({ error: 'videoId and dramaId required' });
  upsertWatchHistory(req.user.userId, String(videoId), String(dramaId), Number(progressSeconds || 0));
  return res.json({ saved: true });
});

// --- Admin YouTube Metadata Fetch, Playlist & Drama Import ---
router.post('/youtube/fetch', requireAdmin, async (req, res) => {
  const { input } = req.body || {};
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'YouTube URL, video ID, or playlist URL is required.' });
  }
  try {
    const info = await fetchYouTubeSingleInfo(input);
    return res.json(info);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/youtube/playlist', requireAdmin, async (req, res) => {
  const { input } = req.body || {};
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Playlist URL or ID is required.' });
  }
  const { playlistId } = extractYouTubeIds(input);
  const pid = playlistId || input.trim();
  const results = await fetchYouTubePlaylist(pid);
  return res.json({ playlistId: pid, results });
});

router.post('/youtube/import-drama', requireAdmin, (req, res) => {
  const {
    dramaId,
    dramaTitle,
    description,
    channel,
    categoryId,
    releaseYear,
    actors,
    featured,
    episodes,
  } = req.body || {};

  if (!Array.isArray(episodes) || episodes.length === 0) {
    return res.status(400).json({ error: 'Select at least one YouTube episode to import.' });
  }

  let targetDrama = dramaId ? getDramaBySlug(String(dramaId)) : null;
  if (!targetDrama) {
    if (!dramaTitle) {
      return res.status(400).json({ error: 'Provide an existing drama or a new drama title.' });
    }
    const firstThumb = episodes[0]?.thumbnail || '/src/assets/images/poster_ishq_haveli_1794630974308.jpg';
    const cats = listCategories(true);
    const matchedCat = cats.find((c) => c._id === categoryId);
    targetDrama = createDrama({
      title: String(dramaTitle).trim(),
      description: String(description || `${dramaTitle} imported from YouTube.`),
      poster: firstThumb,
      banner: firstThumb,
      channel: String(channel || episodes[0]?.channel || 'HUM TV'),
      genres: matchedCat ? [matchedCat.name] : ['Romantic'],
      actors: Array.isArray(actors)
        ? actors
        : typeof actors === 'string'
        ? actors.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      releaseYear: Number(releaseYear || new Date().getFullYear()),
      featured: Boolean(featured),
      status: 'published',
    });
  }

  const importedVideos = episodes.map((ep: Record<string, unknown>, idx: number) =>
    createVideo({
      title: String(ep.title || `${targetDrama!.title} — Episode ${idx + 1}`),
      description: String(ep.description || targetDrama!.description),
      thumbnail: String(ep.thumbnail || targetDrama!.poster),
      source_type: 'youtube',
      youtubeVideoId: String(ep.videoId || ep.youtubeVideoId || ''),
      youtubePlaylistId: String(ep.playlistId || ''),
      dramaId: targetDrama!._id,
      categoryId: String(categoryId || 'cat_romantic'),
      episodeNumber: Number(ep.episodeNumber || idx + 1),
      channel: String(ep.channel || targetDrama!.channel),
      duration: String(ep.duration || '40:00'),
      status: 'published',
    })
  );

  return res.status(201).json({ drama: targetDrama, importedCount: importedVideos.length, videos: importedVideos });
});

router.post(
  '/upload',
  requireAdmin,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  (req, res) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const videoFile = files?.video?.[0];
    const thumbFile = files?.thumbnail?.[0];
    if (!videoFile && !thumbFile) {
      return res.status(400).json({ error: 'Please select a video file or thumbnail image to upload.' });
    }
    return res.json({
      videoUrl: videoFile ? `/uploads/videos/${videoFile.filename}` : undefined,
      thumbnailUrl: thumbFile ? `/uploads/thumbnails/${thumbFile.filename}` : undefined,
    });
  }
);

// --- Admin CRUD Endpoints ---
router.get('/admin/stats', requireAdmin, (_req, res) => {
  return res.json({
    ...getAdminStats(),
    mongoConnected: isMongoConnected(),
    mongoUriMasked: getSavedMongoUriMasked(),
    storageMode: isMongoConnected() ? 'MongoDB Connected (All Data Synced)' : 'Local Persistent Store (Add MongoDB URI in Settings)',
    youtubeApiConfigured: Boolean(process.env.YOUTUBE_API_KEY),
    cloudinaryConfigured: Boolean(process.env.CLOUDINARY_CLOUD_NAME),
  });
});

router.post('/admin/mongodb/connect', requireAdmin, async (req, res) => {
  const { uri } = req.body || {};
  try {
    const result = await connectAndSyncMongo(String(uri || ''));
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/admin/mongodb/sync', requireAdmin, async (_req, res) => {
  if (!isMongoConnected()) {
    return res.status(400).json({ error: 'MongoDB is not connected yet.' });
  }
  const syncedCounts = await syncAllToMongo();
  return res.json({ synced: true, syncedCounts });
});

router.get('/admin/users', requireAdmin, (_req, res) => {
  return res.json({ users: listUsers() });
});

router.patch('/admin/users/:id/role', requireAdmin, (req, res) => {
  const role = req.body?.role === 'admin' ? 'admin' : 'viewer';
  const user = updateUserRole(req.params.id, role);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});

router.post('/videos', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.title || !body.source_type || !body.dramaId || !body.categoryId) {
    return res.status(400).json({ error: 'title, source_type, dramaId, and categoryId are required.' });
  }
  const created = createVideo(body);
  return res.status(201).json({ video: created });
});

router.put('/videos/:id', requireAdmin, (req, res) => {
  const updated = updateVideo(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Video not found' });
  return res.json({ video: updated });
});

router.patch('/videos/:id/status', requireAdmin, (req, res) => {
  const status = req.body?.status === 'draft' ? 'draft' : 'published';
  const updated = updateVideo(req.params.id, { status });
  if (!updated) return res.status(404).json({ error: 'Video not found' });
  return res.json({ video: updated });
});

router.delete('/videos/:id', requireAdmin, (req, res) => {
  const ok = deleteVideo(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Video not found' });
  return res.json({ deleted: true });
});

router.post('/dramas', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.title) return res.status(400).json({ error: 'Drama title is required.' });
  return res.status(201).json({ drama: createDrama(body) });
});

router.put('/dramas/:id', requireAdmin, (req, res) => {
  const updated = updateDrama(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Drama not found' });
  return res.json({ drama: updated });
});

router.delete('/dramas/:id', requireAdmin, (req, res) => {
  const ok = deleteDrama(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Drama not found' });
  return res.json({ deleted: true });
});

router.post('/categories', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'Category name is required.' });
  return res.status(201).json({ category: createCategory(body) });
});

router.put('/categories/:id', requireAdmin, (req, res) => {
  const updated = updateCategory(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Category not found' });
  return res.json({ category: updated });
});

router.delete('/categories/:id', requireAdmin, (req, res) => {
  const ok = deleteCategory(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Category not found' });
  return res.json({ deleted: true });
});

router.post('/channels', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'Channel name is required.' });
  return res.status(201).json({ channel: createChannel(body) });
});

router.put('/channels/:id', requireAdmin, (req, res) => {
  const updated = updateChannel(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Channel not found' });
  return res.json({ channel: updated });
});

router.delete('/channels/:id', requireAdmin, (req, res) => {
  if (!deleteChannel(req.params.id)) return res.status(404).json({ error: 'Channel not found' });
  return res.json({ deleted: true });
});

router.post('/actors', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'Actor name is required.' });
  return res.status(201).json({ actor: createActor(body) });
});

router.delete('/actors/:id', requireAdmin, (req, res) => {
  if (!deleteActor(req.params.id)) return res.status(404).json({ error: 'Actor not found' });
  return res.json({ deleted: true });
});

export default router;

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import mongoose from 'mongoose';
import { hashPassword } from './auth.js';
import {
  ActorModel,
  CategoryModel,
  ChannelModel,
  DramaModel,
  UserModel,
  VideoModel,
} from './models/mongooseModels.js';
import type {
  Actor,
  AdminStats,
  Category,
  Channel,
  Drama,
  HomePayload,
  HomeSection,
  SourceType,
  User,
  Video,
  WatchHistoryItem,
} from '../src/types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dramakhana.db');

let db: Database.Database;
let mongoConnected = false;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function isMongoConnected(): boolean {
  return mongoConnected;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export async function initDatabase(): Promise<void> {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      _id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      watchlist TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      displayOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS channels (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      logo TEXT NOT NULL DEFAULT '',
      youtubeChannelId TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      accentColor TEXT NOT NULL DEFAULT '#087F5B'
    );

    CREATE TABLE IF NOT EXISTS actors (
      _id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      knownFor TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS dramas (
      _id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      poster TEXT NOT NULL DEFAULT '',
      banner TEXT NOT NULL DEFAULT '',
      heroVideo TEXT NOT NULL DEFAULT '',
      actors TEXT NOT NULL DEFAULT '[]',
      channel TEXT NOT NULL DEFAULT '',
      genres TEXT NOT NULL DEFAULT '[]',
      releaseYear INTEGER NOT NULL DEFAULT 2025,
      status TEXT NOT NULL DEFAULT 'published',
      featured INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS videos (
      _id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      thumbnail TEXT NOT NULL DEFAULT '',
      source_type TEXT NOT NULL CHECK(source_type IN ('youtube', 'own_upload')),
      youtubeVideoId TEXT NOT NULL DEFAULT '',
      youtubePlaylistId TEXT NOT NULL DEFAULT '',
      videoUrl TEXT NOT NULL DEFAULT '',
      dramaId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      episodeNumber INTEGER NOT NULL DEFAULT 1,
      channel TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL DEFAULT '42:00',
      releaseDate TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'published',
      views INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      _id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      videoId TEXT NOT NULL,
      dramaId TEXT NOT NULL,
      progressSeconds INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, videoId)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Safe schema migration for existing SQLite databases
  const userCols = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  if (!userCols.some((c) => c.name === 'username')) {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT`);
  }
  const dramaCols = db.prepare(`PRAGMA table_info(dramas)`).all() as Array<{ name: string }>;
  if (!dramaCols.some((c) => c.name === 'heroVideo')) {
    db.exec(`ALTER TABLE dramas ADD COLUMN heroVideo TEXT NOT NULL DEFAULT ''`);
  }

  const savedMongo = db.prepare(`SELECT value FROM settings WHERE key = 'mongodb_uri'`).get() as
    | { value: string }
    | undefined;
  const mongoUri = process.env.MONGODB_URI || savedMongo?.value || '';

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 4000 });
      mongoConnected = true;
      console.log('Connected to MongoDB');
    } catch (err) {
      console.warn('MongoDB connection failed, continuing with local persistent DB:', (err as Error).message);
    }
  }

  seedInitialData();

  if (mongoConnected) {
    syncAllToMongo().catch((err) => console.warn('Initial MongoDB sync warning:', err));
  }
}

export async function connectAndSyncMongo(uri: string): Promise<{ connected: boolean; syncedCounts: Record<string, number> }> {
  const trimmed = uri.trim();
  if (!trimmed) throw new Error('MongoDB connection URI is required.');
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(trimmed, { serverSelectionTimeoutMS: 6000 });
  mongoConnected = true;
  db.prepare(`INSERT INTO settings (key, value) VALUES ('mongodb_uri', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(
    trimmed
  );
  const syncedCounts = await syncAllToMongo();
  return { connected: true, syncedCounts };
}

export function getSavedMongoUriMasked(): string {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'mongodb_uri'`).get() as { value: string } | undefined;
  const raw = process.env.MONGODB_URI || row?.value || '';
  if (!raw) return '';
  return raw.replace(/\/\/([^:]+):([^@]+)@/, '//$1:••••••@');
}

function runMongoSync(fn: () => Promise<unknown>): void {
  if (!mongoConnected) return;
  fn().catch((err) => console.warn('MongoDB write-through warning:', (err as Error).message));
}

export async function syncAllToMongo(): Promise<Record<string, number>> {
  if (!mongoConnected) return {};
  const users = db.prepare('SELECT * FROM users').all() as Array<Record<string, unknown>>;
  for (const u of users) {
    await UserModel.findByIdAndUpdate(
      String(u._id),
      {
        _id: String(u._id),
        username: u.username ? String(u.username) : undefined,
        name: String(u.name),
        email: String(u.email),
        password: String(u.password),
        role: String(u.role),
        watchlist: JSON.parse(String(u.watchlist || '[]')),
      },
      { upsert: true }
    );
  }
  const cats = listCategories(true);
  for (const c of cats) {
    await CategoryModel.findByIdAndUpdate(c._id, { ...c }, { upsert: true });
  }
  const chs = listChannels();
  for (const ch of chs) {
    await ChannelModel.findByIdAndUpdate(ch._id, { ...ch }, { upsert: true });
  }
  const acts = listActors();
  for (const a of acts) {
    await ActorModel.findByIdAndUpdate(a._id, { ...a }, { upsert: true });
  }
  const drms = listDramas({ includeDrafts: true });
  for (const d of drms) {
    await DramaModel.findByIdAndUpdate(d._id, { ...d }, { upsert: true });
  }
  const { videos: vids } = listVideos({ status: 'all', limit: 500 });
  for (const v of vids) {
    await VideoModel.findByIdAndUpdate(v._id, { ...v }, { upsert: true });
  }
  return {
    users: users.length,
    categories: cats.length,
    channels: chs.length,
    actors: acts.length,
    dramas: drms.length,
    videos: vids.length,
  };
}

function seedInitialData(): void {
  const now = new Date().toISOString();

  // Always ensure admin user `jasmin` exists with the requested credentials
  const jasminExists = db
    .prepare(`SELECT _id FROM users WHERE LOWER(username) = 'jasmin' OR LOWER(email) = 'jasmin@dramakhana.pk'`)
    .get() as { _id: string } | undefined;

  if (!jasminExists) {
    db.prepare(
      'INSERT INTO users (_id, username, name, email, password, role, watchlist, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'usr_jasmin',
      'jasmin',
      'Jasmin Admin',
      'jasmin@dramakhana.pk',
      hashPassword('jasmin1142005'),
      'admin',
      JSON.stringify(['drm_ishq_haveli', 'drm_shab_e_wafa']),
      now
    );
  } else {
    db.prepare(`UPDATE users SET username = 'jasmin', password = ?, role = 'admin' WHERE _id = ?`).run(
      hashPassword('jasmin1142005'),
      jasminExists._id
    );
  }

  const viewerExists = db.prepare(`SELECT _id FROM users WHERE LOWER(email) = 'viewer@dramakhana.pk'`).get();
  if (!viewerExists) {
    db.prepare(
      'INSERT INTO users (_id, username, name, email, password, role, watchlist, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      'usr_viewer_01',
      'viewer',
      'Ayesha Siddiqui',
      'viewer@dramakhana.pk',
      hashPassword('Viewer2026!'),
      'viewer',
      JSON.stringify(['drm_ishq_haveli', 'drm_dastaan_dil']),
      now
    );
  }

  const existingCategories = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (existingCategories === 0) {
    const cats = [
      {
        _id: 'cat_romantic',
        name: 'Romantic',
        slug: 'romantic',
        description: 'Soulful stories of longing, poetry, and timeless Urdu romance.',
        image: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        status: 'active',
        displayOrder: 1,
      },
      {
        _id: 'cat_family',
        name: 'Family',
        slug: 'family',
        description: 'Multi-generational household bonds, values, and quiet resilience.',
        image: '/src/assets/images/poster_zindagi_safar_1794630974764.jpg',
        status: 'active',
        displayOrder: 2,
      },
      {
        _id: 'cat_historical',
        name: 'Historical',
        slug: 'historical',
        description: 'Period epics set amidst Lahore havelis and pre-partition heritage.',
        image: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        status: 'active',
        displayOrder: 3,
      },
      {
        _id: 'cat_thriller',
        name: 'Thriller',
        slug: 'thriller',
        description: 'High-stakes suspense, shadowed motives, and gripping courtroom turns.',
        image: '/src/assets/images/poster_shab_e_wafa_1794630973521.jpg',
        status: 'active',
        displayOrder: 4,
      },
      {
        _id: 'cat_emotional',
        name: 'Emotional',
        slug: 'emotional',
        description: 'Deeply moving character portraits crafted by master playwrights.',
        image: '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
        status: 'active',
        displayOrder: 5,
      },
      {
        _id: 'cat_social',
        name: 'Social Drama',
        slug: 'social-drama',
        description: 'Courageous narratives reflecting modern Pakistani society.',
        image: '/src/assets/images/poster_dastaan_e_dil_1794630974025.jpg',
        status: 'active',
        displayOrder: 6,
      },
      {
        _id: 'cat_comedy',
        name: 'Comedy',
        slug: 'comedy',
        description: 'Ramzan specials, witty ensemble banter, and lighthearted warmth.',
        image: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        status: 'active',
        displayOrder: 7,
      },
      {
        _id: 'cat_mystery',
        name: 'Mystery',
        slug: 'mystery',
        description: 'Unspoken secrets behind old ancestral doors and mist-bound valleys.',
        image: '/src/assets/images/poster_shab_e_wafa_1794630973521.jpg',
        status: 'active',
        displayOrder: 8,
      },
      {
        _id: 'cat_action',
        name: 'Action',
        slug: 'action',
        description: 'Tactical thrillers, frontier honour, and high-tension drama.',
        image: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        status: 'active',
        displayOrder: 9,
      },
      {
        _id: 'cat_movies',
        name: 'Pakistani Movies',
        slug: 'pakistani-movies',
        description: 'Feature-length telefilms and critically acclaimed Lollywood cinema.',
        image: '/src/assets/images/poster_dastaan_e_dil_1794630974025.jpg',
        status: 'active',
        displayOrder: 10,
      },
    ];
    const stmt = db.prepare(
      'INSERT INTO categories (_id, name, slug, description, image, status, displayOrder) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const c of cats) {
      stmt.run(c._id, c.name, c.slug, c.description, c.image, c.status, c.displayOrder);
    }
  }

  const existingChannels = (db.prepare('SELECT COUNT(*) as c FROM channels').get() as { c: number }).c;
  if (existingChannels === 0) {
    const channels = [
      {
        _id: 'chn_hum',
        name: 'HUM TV',
        logo: 'HTV',
        youtubeChannelId: 'UCU_x9-Y6xN2y5eR5N8p_qLw',
        description: 'Home to literary romantic classics, Ramzan specials, and prestige serials.',
        accentColor: '#087F5B',
      },
      {
        _id: 'chn_ary',
        name: 'ARY Digital',
        logo: 'ARY',
        youtubeChannelId: 'UC4JCksJF76g_MdzPVBJoC3Q',
        description: 'Pakistan’s premier family entertainment network and blockbuster prime-time dramas.',
        accentColor: '#D4AF6A',
      },
      {
        _id: 'chn_geo',
        name: 'Geo Entertainment',
        logo: 'GEO',
        youtubeChannelId: 'UCe9JSDmyqNgA_l2BzGHqAEg',
        description: 'Grand-scale storytelling, record-breaking romantic sagas, and ensemble productions.',
        accentColor: '#791F35',
      },
      {
        _id: 'chn_green',
        name: 'Green Entertainment',
        logo: 'GRN',
        youtubeChannelId: 'UCr4f4M38fK9g2_r3W2yB8Jw',
        description: 'Contemporary social narratives, cultural roots, and cinema-grade direction.',
        accentColor: '#1B6B4F',
      },
    ];
    const stmt = db.prepare(
      'INSERT INTO channels (_id, name, logo, youtubeChannelId, description, accentColor) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const ch of channels) {
      stmt.run(ch._id, ch.name, ch.logo, ch.youtubeChannelId, ch.description, ch.accentColor);
    }
  }

  const existingActors = (db.prepare('SELECT COUNT(*) as c FROM actors').get() as { c: number }).c;
  if (existingActors === 0) {
    const actors = [
      {
        _id: 'act_mahira',
        name: 'Mahira Khan',
        bio: 'Acclaimed screen icon celebrated for nuanced performances across classic Urdu television and cinema.',
        avatar: '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
        knownFor: 'Humsafar, Sadqay Tumhare',
      },
      {
        _id: 'act_fawad',
        name: 'Fawad Khan',
        bio: 'Renowned dramatic lead admired for restrained intensity in literary and historical serials.',
        avatar: '/src/assets/images/poster_shab_e_wafa_1794630973521.jpg',
        knownFor: 'Zindagi Gulzar Hai, Dastaan',
      },
      {
        _id: 'act_sajal',
        name: 'Sajal Aly',
        bio: 'Versatile performer known for commanding emotional range in period and social dramas.',
        avatar: '/src/assets/images/poster_dastaan_e_dil_1794630974025.jpg',
        knownFor: 'Yakeen Ka Safar, Alif',
      },
      {
        _id: 'act_bilal',
        name: 'Bilal Abbas Khan',
        bio: 'Critically praised actor celebrated for transformative character studies and modern romance.',
        avatar: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        knownFor: 'Ishq Murshid, Pyar Ke Sadqay',
      },
      {
        _id: 'act_yumna',
        name: 'Yumna Zaidi',
        bio: 'Award-winning actress recognized for deeply layered portrayals in romantic and thriller serials.',
        avatar: '/src/assets/images/poster_zindagi_safar_1794630974764.jpg',
        knownFor: 'Parizaad, Tere Bin',
      },
      {
        _id: 'act_wahaj',
        name: 'Wahaj Ali',
        bio: 'Charismatic leading actor headlining sweeping romantic and historical ensembles.',
        avatar: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        knownFor: 'Tere Bin, Jo Bichar Gaye',
      },
    ];
    const stmt = db.prepare(
      'INSERT INTO actors (_id, name, bio, avatar, knownFor) VALUES (?, ?, ?, ?, ?)'
    );
    for (const a of actors) {
      stmt.run(a._id, a.name, a.bio, a.avatar, a.knownFor);
    }
  }

  const existingDramas = (db.prepare('SELECT COUNT(*) as c FROM dramas').get() as { c: number }).c;
  if (existingDramas === 0) {
    const dramas = [
      {
        _id: 'drm_ishq_haveli',
        title: 'Ishq-e-Haveli',
        slug: 'ishq-e-haveli',
        description:
          'Inside the sandstone courtyards of Walled City Lahore, two estranged lineages confront an unspoken pledge guarded for three generations.',
        poster: '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
        banner: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        heroVideo: '/hero1.mp4',
        actors: ['Mahira Khan', 'Fawad Khan', 'Sajal Aly'],
        channel: 'HUM TV',
        genres: ['Historical', 'Romantic', 'Emotional'],
        releaseYear: 2025,
        status: 'published',
        featured: 1,
        createdAt: '2026-10-25T18:00:00.000Z',
      },
      {
        _id: 'drm_shab_e_wafa',
        title: 'Shab-e-Wafa',
        slug: 'shab-e-wafa',
        description:
          'On a rain-drenched Karachi evening, an architect and a classical vocalist rediscover lost letters that bind their families across decades.',
        poster: '/src/assets/images/poster_shab_e_wafa_1794630973521.jpg',
        banner: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        heroVideo: '/hero2.mp4',
        actors: ['Bilal Abbas Khan', 'Yumna Zaidi'],
        channel: 'ARY Digital',
        genres: ['Romantic', 'Thriller'],
        releaseYear: 2025,
        status: 'published',
        featured: 1,
        createdAt: '2026-10-20T18:00:00.000Z',
      },
      {
        _id: 'drm_dastaan_dil',
        title: 'Dastaan-e-Dil',
        slug: 'dastaan-e-dil',
        description:
          'Set against golden Mughal colonnades and quiet family salons, a poet’s daughter navigates ambition, loyalty, and enduring devotion.',
        poster: '/src/assets/images/poster_dastaan_e_dil_1794630974025.jpg',
        banner: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        heroVideo: '/hero1.mp4',
        actors: ['Sajal Aly', 'Wahaj Ali'],
        channel: 'Geo Entertainment',
        genres: ['Romantic', 'Social Drama'],
        releaseYear: 2024,
        status: 'published',
        featured: 1,
        createdAt: '2026-09-12T18:00:00.000Z',
      },
      {
        _id: 'drm_zindagi_safar',
        title: 'Zindagi Ka Safar',
        slug: 'zindagi-ka-safar',
        description:
          'An intimate Islamabad family chronicle exploring quiet sacrifices, generational pride, and reconciliation around the evening table.',
        poster: '/src/assets/images/poster_zindagi_safar_1794630974764.jpg',
        banner: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        actors: ['Fawad Khan', 'Mahira Khan'],
        channel: 'Green Entertainment',
        genres: ['Family', 'Emotional'],
        releaseYear: 2025,
        status: 'published',
        featured: 0,
        createdAt: '2026-10-05T18:00:00.000Z',
      },
      {
        _id: 'drm_kabli_chand',
        title: 'Chandni Chowk Lahore',
        slug: 'chandni-chowk-lahore',
        description:
          'A spirited Ramzan comedy-drama where two neighbouring sweet-shop households clash over a heritage culinary festival.',
        poster: '/src/assets/images/poster_dastaan_e_dil_1794630974025.jpg',
        banner: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        actors: ['Bilal Abbas Khan', 'Sajal Aly'],
        channel: 'HUM TV',
        genres: ['Comedy', 'Family'],
        releaseYear: 2024,
        status: 'published',
        featured: 0,
        createdAt: '2026-08-18T18:00:00.000Z',
      },
      {
        _id: 'drm_swat_mist',
        title: 'Koh-e-Swat',
        slug: 'koh-e-swat',
        description:
          'When an archivist returns to his ancestral valley in Swat, buried journals reveal a forty-year mystery.',
        poster: '/src/assets/images/poster_shab_e_wafa_1794630973521.jpg',
        banner: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        actors: ['Wahaj Ali', 'Yumna Zaidi'],
        channel: 'Green Entertainment',
        genres: ['Mystery', 'Thriller'],
        releaseYear: 2025,
        status: 'published',
        featured: 0,
        createdAt: '2026-11-01T18:00:00.000Z',
      },
      {
        _id: 'drm_mere_naseeb',
        title: 'Mere Naseeb Ki Barish',
        slug: 'mere-naseeb-ki-barish',
        description:
          'Two childhood friends divided by class and circumstance meet again during a fateful monsoon in Karachi.',
        poster: '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
        banner: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        actors: ['Yumna Zaidi', 'Wahaj Ali'],
        channel: 'Geo Entertainment',
        genres: ['Romantic', 'Emotional'],
        releaseYear: 2024,
        status: 'published',
        featured: 0,
        createdAt: '2026-09-25T18:00:00.000Z',
      },
      {
        _id: 'drm_aakhri_qadam',
        title: 'Aakhri Qadam',
        slug: 'aakhri-qadam',
        description:
          'A feature-length Pakistani telefilm following an honest civil servant standing firm against entrenched land barons.',
        poster: '/src/assets/images/poster_zindagi_safar_1794630974764.jpg',
        banner: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        actors: ['Fawad Khan', 'Bilal Abbas Khan'],
        channel: 'ARY Digital',
        genres: ['Pakistani Movies', 'Action', 'Social Drama'],
        releaseYear: 2025,
        status: 'published',
        featured: 0,
        createdAt: '2026-10-28T18:00:00.000Z',
      },
    ];

    const stmt = db.prepare(
      'INSERT INTO dramas (_id, title, slug, description, poster, banner, heroVideo, actors, channel, genres, releaseYear, status, featured, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const d of dramas) {
      stmt.run(
        d._id,
        d.title,
        d.slug,
        d.description,
        d.poster,
        d.banner,
        (d as { heroVideo?: string }).heroVideo || '',
        JSON.stringify(d.actors),
        d.channel,
        JSON.stringify(d.genres),
        d.releaseYear,
        d.status,
        d.featured,
        d.createdAt
      );
    }
  }

  const existingVideos = (db.prepare('SELECT COUNT(*) as c FROM videos').get() as { c: number }).c;
  if (existingVideos === 0) {
    const videos: Array<Omit<Video, 'dramaTitle' | 'dramaSlug' | 'categoryName' | 'categorySlug'>> = [
      {
        _id: 'vid_01',
        title: 'Ishq-e-Haveli — Episode 01 (Director’s Cut)',
        description: 'The grand courtyard gathers under twilight lanterns as the ancestral will is read aloud.',
        thumbnail: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        source_type: 'own_upload',
        videoUrl: '/uploads/samples/sample-ishq-haveli.mp4',
        dramaId: 'drm_ishq_haveli',
        categoryId: 'cat_historical',
        episodeNumber: 1,
        channel: 'HUM TV',
        duration: '42:18',
        releaseDate: '2026-10-15',
        status: 'published',
        views: 184200,
        createdAt: '2026-10-15T19:00:00.000Z',
      },
      {
        _id: 'vid_02',
        title: 'Ishq-e-Haveli — Episode 02 (Official Broadcast)',
        description: 'A quiet midnight conversation beneath the Mughal arches alters the fate of both households.',
        thumbnail: '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'M7lc1UVf-VE',
        dramaId: 'drm_ishq_haveli',
        categoryId: 'cat_romantic',
        episodeNumber: 2,
        channel: 'HUM TV',
        duration: '40:45',
        releaseDate: '2026-10-22',
        status: 'published',
        views: 249100,
        createdAt: '2026-10-22T19:00:00.000Z',
      },
      {
        _id: 'vid_03',
        title: 'Ishq-e-Haveli — Episode 03 (Extended Master)',
        description: 'The family elders summon a council in Lahore while unspoken truths surface.',
        thumbnail: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        source_type: 'own_upload',
        videoUrl: '/uploads/samples/sample-ishq-haveli.mp4',
        dramaId: 'drm_ishq_haveli',
        categoryId: 'cat_emotional',
        episodeNumber: 3,
        channel: 'HUM TV',
        duration: '44:10',
        releaseDate: '2026-10-29',
        status: 'published',
        views: 152800,
        createdAt: '2026-10-29T19:00:00.000Z',
      },
      {
        _id: 'vid_04',
        title: 'Shab-e-Wafa — Episode 01 (Director’s Cut)',
        description: 'Monsoon rain descends on Karachi as two strangers shelter beneath a carved teak balcony.',
        thumbnail: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        source_type: 'own_upload',
        videoUrl: '/uploads/samples/sample-shab-e-wafa.mp4',
        dramaId: 'drm_shab_e_wafa',
        categoryId: 'cat_romantic',
        episodeNumber: 1,
        channel: 'ARY Digital',
        duration: '39:50',
        releaseDate: '2026-10-20',
        status: 'published',
        views: 312000,
        createdAt: '2026-10-20T20:00:00.000Z',
      },
      {
        _id: 'vid_05',
        title: 'Shab-e-Wafa — Episode 02 (Exclusive Studio Master)',
        description: 'An anonymous parcel arrives at the conservatory containing an old cassette recording.',
        thumbnail: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        source_type: 'own_upload',
        videoUrl: '/uploads/samples/sample-shab-e-wafa.mp4',
        dramaId: 'drm_shab_e_wafa',
        categoryId: 'cat_thriller',
        episodeNumber: 2,
        channel: 'ARY Digital',
        duration: '41:22',
        releaseDate: '2026-10-27',
        status: 'published',
        views: 198400,
        createdAt: '2026-10-27T20:00:00.000Z',
      },
      {
        _id: 'vid_06',
        title: 'Dastaan-e-Dil — Episode 01',
        description: 'Golden hour at the Badshahi colonnades sets the stage for an unforgettable poetic encounter.',
        thumbnail: '/src/assets/images/poster_dastaan_e_dil_1794630974025.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'YE7VzlLtp-4',
        dramaId: 'drm_dastaan_dil',
        categoryId: 'cat_romantic',
        episodeNumber: 1,
        channel: 'Geo Entertainment',
        duration: '43:05',
        releaseDate: '2026-09-12',
        status: 'published',
        views: 421500,
        createdAt: '2026-09-12T20:00:00.000Z',
      },
      {
        _id: 'vid_07',
        title: 'Dastaan-e-Dil — Episode 02',
        description: 'A family announcement disrupts carefully laid plans for the autumn mushaira.',
        thumbnail: '/src/assets/images/poster_dastaan_e_dil_1794630974025.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'ScMzIvxBSi4',
        dramaId: 'drm_dastaan_dil',
        categoryId: 'cat_social',
        episodeNumber: 2,
        channel: 'Geo Entertainment',
        duration: '41:40',
        releaseDate: '2026-09-19',
        status: 'published',
        views: 367900,
        createdAt: '2026-09-19T20:00:00.000Z',
      },
      {
        _id: 'vid_08',
        title: 'Zindagi Ka Safar — Episode 01 (Original Archive)',
        description: 'Three siblings reunite in Islamabad as autumn rain taps against the study glass.',
        thumbnail: '/src/assets/images/poster_zindagi_safar_1794630974764.jpg',
        source_type: 'own_upload',
        videoUrl: '/uploads/samples/sample-zindagi-safar.mp4',
        dramaId: 'drm_zindagi_safar',
        categoryId: 'cat_family',
        episodeNumber: 1,
        channel: 'Green Entertainment',
        duration: '45:12',
        releaseDate: '2026-10-05',
        status: 'published',
        views: 143900,
        createdAt: '2026-10-05T20:00:00.000Z',
      },
      {
        _id: 'vid_09',
        title: 'Zindagi Ka Safar — Episode 02',
        description: 'Old family ledgers reveal quiet sacrifices made decades ago.',
        thumbnail: '/src/assets/images/poster_zindagi_safar_1794630974764.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'M7lc1UVf-VE',
        dramaId: 'drm_zindagi_safar',
        categoryId: 'cat_family',
        episodeNumber: 2,
        channel: 'Green Entertainment',
        duration: '42:30',
        releaseDate: '2026-10-12',
        status: 'published',
        views: 129400,
        createdAt: '2026-10-12T20:00:00.000Z',
      },
      {
        _id: 'vid_10',
        title: 'Chandni Chowk Lahore — Episode 01',
        description: 'A chaotic jalebi-making rivalry kicks off the festive season in Old Lahore.',
        thumbnail: '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'aqz-KE-bpKQ',
        dramaId: 'drm_kabli_chand',
        categoryId: 'cat_comedy',
        episodeNumber: 1,
        channel: 'HUM TV',
        duration: '38:15',
        releaseDate: '2026-08-18',
        status: 'published',
        views: 274300,
        createdAt: '2026-08-18T20:00:00.000Z',
      },
      {
        _id: 'vid_11',
        title: 'Koh-e-Swat — Episode 01 (Director’s Cut)',
        description: 'Mist rolls over the northern peaks as the locked walnut chest is opened.',
        thumbnail: '/src/assets/images/poster_shab_e_wafa_1794630973521.jpg',
        source_type: 'own_upload',
        videoUrl: '/uploads/samples/sample-shab-e-wafa.mp4',
        dramaId: 'drm_swat_mist',
        categoryId: 'cat_mystery',
        episodeNumber: 1,
        channel: 'Green Entertainment',
        duration: '46:00',
        releaseDate: '2026-11-01',
        status: 'published',
        views: 164500,
        createdAt: '2026-11-01T20:00:00.000Z',
      },
      {
        _id: 'vid_12',
        title: 'Mere Naseeb Ki Barish — Episode 01',
        description: 'Years after parting ways, an unexpected invitation brings them to the same courtyard.',
        thumbnail: '/src/assets/images/hero_karachi_rain_1794630973087.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'YE7VzlLtp-4',
        dramaId: 'drm_mere_naseeb',
        categoryId: 'cat_emotional',
        episodeNumber: 1,
        channel: 'Geo Entertainment',
        duration: '41:55',
        releaseDate: '2026-09-25',
        status: 'published',
        views: 289000,
        createdAt: '2026-09-25T20:00:00.000Z',
      },
      {
        _id: 'vid_13',
        title: 'Aakhri Qadam — Full Feature Telefilm',
        description: 'A high-stakes confrontation inside the district commissioner’s office tests every loyalty.',
        thumbnail: '/src/assets/images/poster_zindagi_safar_1794630974764.jpg',
        source_type: 'own_upload',
        videoUrl: '/uploads/samples/sample-zindagi-safar.mp4',
        dramaId: 'drm_aakhri_qadam',
        categoryId: 'cat_movies',
        episodeNumber: 1,
        channel: 'ARY Digital',
        duration: '1:28:40',
        releaseDate: '2026-10-28',
        status: 'published',
        views: 215800,
        createdAt: '2026-10-28T20:00:00.000Z',
      },
      {
        _id: 'vid_14',
        title: 'Aakhri Qadam — Behind the Frontier (Action Cut)',
        description: 'Extended dramatic sequence filmed on location across northern highways.',
        thumbnail: '/src/assets/images/poster_shab_e_wafa_1794630973521.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'ScMzIvxBSi4',
        dramaId: 'drm_aakhri_qadam',
        categoryId: 'cat_action',
        episodeNumber: 2,
        channel: 'ARY Digital',
        duration: '24:10',
        releaseDate: '2026-11-04',
        status: 'published',
        views: 94200,
        createdAt: '2026-11-04T20:00:00.000Z',
      },
    ];

    const stmt = db.prepare(`
      INSERT INTO videos (
        _id, title, description, thumbnail, source_type, youtubeVideoId, youtubePlaylistId,
        videoUrl, dramaId, categoryId, episodeNumber, channel, duration, releaseDate, status, views, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const v of videos) {
      stmt.run(
        v._id,
        v.title,
        v.description,
        v.thumbnail,
        v.source_type,
        v.youtubeVideoId || '',
        v.youtubePlaylistId || '',
        v.videoUrl || '',
        v.dramaId,
        v.categoryId,
        v.episodeNumber,
        v.channel,
        v.duration,
        v.releaseDate || '',
        v.status,
        v.views,
        v.createdAt
      );
    }
  }
}

// --- Mapping helpers ---
function mapDrama(row: Record<string, unknown>, episodeCountMap?: Map<string, number>): Drama {
  const id = String(row._id);
  return {
    _id: id,
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description || ''),
    poster: String(row.poster || ''),
    banner: String(row.banner || ''),
    heroVideo: row.heroVideo ? String(row.heroVideo) : (id === 'drm_ishq_haveli' ? '/hero1.mp4' : id === 'drm_shab_e_wafa' ? '/hero2.mp4' : undefined),
    actors: JSON.parse(String(row.actors || '[]')),
    channel: String(row.channel || ''),
    genres: JSON.parse(String(row.genres || '[]')),
    releaseYear: Number(row.releaseYear || 2025),
    status: (row.status as 'published' | 'draft') || 'published',
    featured: Boolean(row.featured),
    totalEpisodes: episodeCountMap ? episodeCountMap.get(id) || 0 : undefined,
    createdAt: String(row.createdAt),
  };
}

function mapVideo(row: Record<string, unknown>): Video {
  return {
    _id: String(row._id),
    title: String(row.title),
    description: String(row.description || ''),
    thumbnail: String(row.thumbnail || ''),
    source_type: row.source_type as SourceType,
    youtubeVideoId: String(row.youtubeVideoId || ''),
    youtubePlaylistId: String(row.youtubePlaylistId || ''),
    videoUrl: String(row.videoUrl || ''),
    dramaId: String(row.dramaId),
    dramaTitle: row.dramaTitle ? String(row.dramaTitle) : undefined,
    dramaSlug: row.dramaSlug ? String(row.dramaSlug) : undefined,
    categoryId: String(row.categoryId),
    categoryName: row.categoryName ? String(row.categoryName) : undefined,
    categorySlug: row.categorySlug ? String(row.categorySlug) : undefined,
    episodeNumber: Number(row.episodeNumber || 1),
    channel: String(row.channel || ''),
    duration: String(row.duration || '40:00'),
    releaseDate: String(row.releaseDate || ''),
    status: (row.status as 'published' | 'draft') || 'published',
    views: Number(row.views || 0),
    createdAt: String(row.createdAt),
  };
}

// --- Users & Auth ---
export function findUserByIdentifier(identifier: string): (User & { password: string }) | null {
  const clean = identifier.trim();
  const row = db
    .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)')
    .get(clean, clean) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    _id: String(row._id),
    username: row.username ? String(row.username) : undefined,
    name: String(row.name),
    email: String(row.email),
    password: String(row.password),
    role: row.role as 'admin' | 'viewer',
    watchlist: JSON.parse(String(row.watchlist || '[]')),
    createdAt: String(row.createdAt),
  };
}

export function findUserByEmail(email: string): (User & { password: string }) | null {
  return findUserByIdentifier(email);
}

export function findUserById(id: string): User | null {
  const row = db.prepare('SELECT _id, username, name, email, role, watchlist, createdAt FROM users WHERE _id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return {
    _id: String(row._id),
    username: row.username ? String(row.username) : undefined,
    name: String(row.name),
    email: String(row.email),
    role: row.role as 'admin' | 'viewer',
    watchlist: JSON.parse(String(row.watchlist || '[]')),
    createdAt: String(row.createdAt),
  };
}

export function createUser(input: {
  username?: string;
  name: string;
  email: string;
  passwordHash: string;
  role?: 'admin' | 'viewer';
}): User {
  const id = createId('usr');
  const createdAt = new Date().toISOString();
  const username = input.username ? input.username.toLowerCase().trim() : input.email.split('@')[0].toLowerCase();
  db.prepare(
    'INSERT INTO users (_id, username, name, email, password, role, watchlist, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, username, input.name, input.email.toLowerCase(), input.passwordHash, input.role || 'viewer', '[]', createdAt);
  runMongoSync(() =>
    UserModel.findByIdAndUpdate(
      id,
      {
        _id: id,
        username,
        name: input.name,
        email: input.email.toLowerCase(),
        password: input.passwordHash,
        role: input.role || 'viewer',
        watchlist: [],
      },
      { upsert: true }
    )
  );
  return findUserById(id)!;
}

export function listUsers(): User[] {
  const rows = db
    .prepare('SELECT _id, username, name, email, role, watchlist, createdAt FROM users ORDER BY createdAt DESC')
    .all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    _id: String(r._id),
    username: r.username ? String(r.username) : undefined,
    name: String(r.name),
    email: String(r.email),
    role: r.role as 'admin' | 'viewer',
    watchlist: JSON.parse(String(r.watchlist || '[]')),
    createdAt: String(r.createdAt),
  }));
}

export function updateUserRole(userId: string, role: 'admin' | 'viewer'): User | null {
  db.prepare('UPDATE users SET role = ? WHERE _id = ?').run(role, userId);
  runMongoSync(() => UserModel.findByIdAndUpdate(userId, { role }));
  return findUserById(userId);
}

export function toggleWatchlist(userId: string, dramaId: string, action: 'add' | 'remove'): string[] {
  const user = findUserById(userId);
  if (!user) return [];
  const set = new Set(user.watchlist);
  if (action === 'add') set.add(dramaId);
  else set.delete(dramaId);
  const next = Array.from(set);
  db.prepare('UPDATE users SET watchlist = ? WHERE _id = ?').run(JSON.stringify(next), userId);
  runMongoSync(() => UserModel.findByIdAndUpdate(userId, { watchlist: next }));
  return next;
}

// --- Categories ---
export function listCategories(includeInactive = false): Category[] {
  const where = includeInactive ? '' : `WHERE c.status = 'active'`;
  const rows = db
    .prepare(
      `
    SELECT c.*,
      COUNT(CASE WHEN v.status = 'published' THEN 1 END) as totalCount,
      COUNT(CASE WHEN v.status = 'published' AND v.source_type = 'youtube' THEN 1 END) as youtubeCount,
      COUNT(CASE WHEN v.status = 'published' AND v.source_type = 'own_upload' THEN 1 END) as ownUploadCount
    FROM categories c
    LEFT JOIN videos v ON v.categoryId = c._id
    ${where}
    GROUP BY c._id
    ORDER BY c.displayOrder ASC, c.name ASC
  `
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    _id: String(r._id),
    name: String(r.name),
    slug: String(r.slug),
    description: String(r.description || ''),
    image: String(r.image || ''),
    status: (r.status as 'active' | 'inactive') || 'active',
    displayOrder: Number(r.displayOrder || 0),
    totalCount: Number(r.totalCount || 0),
    youtubeCount: Number(r.youtubeCount || 0),
    ownUploadCount: Number(r.ownUploadCount || 0),
  }));
}

export function getCategoryBySlug(slug: string): Category | null {
  const all = listCategories(true);
  return all.find((c) => c.slug === slug) || null;
}

export function createCategory(input: Partial<Category>): Category {
  const id = createId('cat');
  const slug = input.slug ? slugify(input.slug) : slugify(input.name || 'category');
  db.prepare(
    'INSERT INTO categories (_id, name, slug, description, image, status, displayOrder) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    input.name || 'Untitled',
    slug,
    input.description || '',
    input.image || '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
    input.status || 'active',
    Number(input.displayOrder ?? 99)
  );
  const created = listCategories(true).find((c) => c._id === id)!;
  runMongoSync(() => CategoryModel.findByIdAndUpdate(id, { ...created }, { upsert: true }));
  return created;
}

export function updateCategory(id: string, input: Partial<Category>): Category | null {
  const existing = listCategories(true).find((c) => c._id === id);
  if (!existing) return null;
  const slug = input.slug ? slugify(input.slug) : input.name ? slugify(input.name) : existing.slug;
  db.prepare(
    'UPDATE categories SET name = ?, slug = ?, description = ?, image = ?, status = ?, displayOrder = ? WHERE _id = ?'
  ).run(
    input.name ?? existing.name,
    slug,
    input.description ?? existing.description,
    input.image ?? existing.image,
    input.status ?? existing.status,
    input.displayOrder ?? existing.displayOrder,
    id
  );
  const updated = listCategories(true).find((c) => c._id === id) || null;
  if (updated) runMongoSync(() => CategoryModel.findByIdAndUpdate(id, { ...updated }, { upsert: true }));
  return updated;
}

export function deleteCategory(id: string): boolean {
  const info = db.prepare('DELETE FROM categories WHERE _id = ?').run(id);
  if (info.changes > 0) runMongoSync(() => CategoryModel.findByIdAndDelete(id));
  return info.changes > 0;
}

// --- Channels & Actors ---
export function listChannels(): Channel[] {
  return db.prepare('SELECT * FROM channels ORDER BY name ASC').all() as Channel[];
}

export function createChannel(input: Partial<Channel>): Channel {
  const id = createId('chn');
  db.prepare('INSERT INTO channels (_id, name, logo, youtubeChannelId, description, accentColor) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    input.name || 'New Channel',
    input.logo || (input.name || 'CH').slice(0, 3).toUpperCase(),
    input.youtubeChannelId || '',
    input.description || '',
    input.accentColor || '#087F5B'
  );
  const ch = db.prepare('SELECT * FROM channels WHERE _id = ?').get(id) as Channel;
  runMongoSync(() => ChannelModel.findByIdAndUpdate(id, { ...ch }, { upsert: true }));
  return ch;
}

export function updateChannel(id: string, input: Partial<Channel>): Channel | null {
  const existing = db.prepare('SELECT * FROM channels WHERE _id = ?').get(id) as Channel | undefined;
  if (!existing) return null;
  db.prepare('UPDATE channels SET name = ?, logo = ?, youtubeChannelId = ?, description = ?, accentColor = ? WHERE _id = ?').run(
    input.name ?? existing.name,
    input.logo ?? existing.logo,
    input.youtubeChannelId ?? existing.youtubeChannelId,
    input.description ?? existing.description,
    input.accentColor ?? existing.accentColor,
    id
  );
  const ch = db.prepare('SELECT * FROM channels WHERE _id = ?').get(id) as Channel;
  runMongoSync(() => ChannelModel.findByIdAndUpdate(id, { ...ch }, { upsert: true }));
  return ch;
}

export function deleteChannel(id: string): boolean {
  const ok = db.prepare('DELETE FROM channels WHERE _id = ?').run(id).changes > 0;
  if (ok) runMongoSync(() => ChannelModel.findByIdAndDelete(id));
  return ok;
}

export function listActors(): Actor[] {
  return db.prepare('SELECT * FROM actors ORDER BY name ASC').all() as Actor[];
}

export function createActor(input: Partial<Actor>): Actor {
  const id = createId('act');
  db.prepare('INSERT INTO actors (_id, name, bio, avatar, knownFor) VALUES (?, ?, ?, ?, ?)').run(
    id,
    input.name || 'Actor',
    input.bio || '',
    input.avatar || '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
    input.knownFor || ''
  );
  const actor = db.prepare('SELECT * FROM actors WHERE _id = ?').get(id) as Actor;
  runMongoSync(() => ActorModel.findByIdAndUpdate(id, { ...actor }, { upsert: true }));
  return actor;
}

export function deleteActor(id: string): boolean {
  const ok = db.prepare('DELETE FROM actors WHERE _id = ?').run(id).changes > 0;
  if (ok) runMongoSync(() => ActorModel.findByIdAndDelete(id));
  return ok;
}

// --- Dramas ---
function getEpisodeCountMap(): Map<string, number> {
  const rows = db
    .prepare(`SELECT dramaId, COUNT(*) as c FROM videos WHERE status = 'published' GROUP BY dramaId`)
    .all() as Array<{ dramaId: string; c: number }>;
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.dramaId, r.c);
  return map;
}

export function listDramas(options?: { includeDrafts?: boolean; channel?: string; genre?: string }): Drama[] {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (!options?.includeDrafts) {
    conditions.push(`status = 'published'`);
  }
  if (options?.channel) {
    conditions.push(`LOWER(channel) = LOWER(?)`);
    params.push(options.channel);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT * FROM dramas ${where} ORDER BY featured DESC, createdAt DESC`).all(...params) as Array<
    Record<string, unknown>
  >;
  const counts = getEpisodeCountMap();
  let dramas = rows.map((r) => mapDrama(r, counts));
  if (options?.genre) {
    const g = options.genre.toLowerCase();
    dramas = dramas.filter((d) => d.genres.some((item) => item.toLowerCase() === g));
  }
  return dramas;
}

export function getDramaBySlug(slug: string): Drama | null {
  const row = db.prepare('SELECT * FROM dramas WHERE slug = ? OR _id = ?').get(slug, slug) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return mapDrama(row, getEpisodeCountMap());
}

export function createDrama(input: Partial<Drama>): Drama {
  const id = createId('drm');
  const baseSlug = slugify(input.slug || input.title || 'drama');
  const existing = db.prepare('SELECT _id FROM dramas WHERE slug = ?').get(baseSlug);
  const slug = existing ? `${baseSlug}-${crypto.randomBytes(2).toString('hex')}` : baseSlug;
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO dramas (_id, title, slug, description, poster, banner, heroVideo, actors, channel, genres, releaseYear, status, featured, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.title || 'Untitled Drama',
    slug,
    input.description || '',
    input.poster || '/src/assets/images/poster_ishq_haveli_1794630974308.jpg',
    input.banner || '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
    input.heroVideo || '',
    JSON.stringify(input.actors || []),
    input.channel || 'HUM TV',
    JSON.stringify(input.genres || ['Romantic']),
    Number(input.releaseYear || 2026),
    input.status || 'published',
    input.featured ? 1 : 0,
    createdAt
  );
  const drama = getDramaBySlug(id)!;
  runMongoSync(() => DramaModel.findByIdAndUpdate(id, { ...drama }, { upsert: true }));
  return drama;
}

export function updateDrama(id: string, input: Partial<Drama>): Drama | null {
  const row = db.prepare('SELECT * FROM dramas WHERE _id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const current = mapDrama(row);
  db.prepare(`
    UPDATE dramas
    SET title = ?, description = ?, poster = ?, banner = ?, heroVideo = ?, actors = ?, channel = ?, genres = ?, releaseYear = ?, status = ?, featured = ?
    WHERE _id = ?
  `).run(
    input.title ?? current.title,
    input.description ?? current.description,
    input.poster ?? current.poster,
    input.banner ?? current.banner,
    input.heroVideo ?? (current as { heroVideo?: string }).heroVideo ?? '',
    JSON.stringify(input.actors ?? current.actors),
    input.channel ?? current.channel,
    JSON.stringify(input.genres ?? current.genres),
    input.releaseYear ?? current.releaseYear,
    input.status ?? current.status,
    input.featured !== undefined ? (input.featured ? 1 : 0) : current.featured ? 1 : 0,
    id
  );
  const updated = getDramaBySlug(id);
  if (updated) runMongoSync(() => DramaModel.findByIdAndUpdate(id, { ...updated }, { upsert: true }));
  return updated;
}

export function deleteDrama(id: string): boolean {
  const ok = db.prepare('DELETE FROM dramas WHERE _id = ?').run(id).changes > 0;
  if (ok) runMongoSync(() => DramaModel.findByIdAndDelete(id));
  return ok;
}

// --- Videos ---
export interface VideoQuery {
  source_type?: SourceType | 'all';
  categoryId?: string;
  categorySlug?: string;
  dramaId?: string;
  channel?: string;
  status?: 'published' | 'draft' | 'all';
  search?: string;
  sort?: 'latest' | 'popular' | 'episode';
  page?: number;
  limit?: number;
}

export function listVideos(query: VideoQuery = {}): { videos: Video[]; total: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.status && query.status !== 'all') {
    conditions.push('v.status = ?');
    params.push(query.status);
  } else if (!query.status) {
    conditions.push(`v.status = 'published'`);
  }

  if (query.source_type && query.source_type !== 'all') {
    conditions.push('v.source_type = ?');
    params.push(query.source_type);
  }
  if (query.categoryId) {
    conditions.push('v.categoryId = ?');
    params.push(query.categoryId);
  }
  if (query.categorySlug) {
    conditions.push('c.slug = ?');
    params.push(query.categorySlug);
  }
  if (query.dramaId) {
    conditions.push('v.dramaId = ?');
    params.push(query.dramaId);
  }
  if (query.channel) {
    conditions.push('LOWER(v.channel) = LOWER(?)');
    params.push(query.channel);
  }
  if (query.search) {
    conditions.push(
      '(LOWER(v.title) LIKE LOWER(?) OR LOWER(d.title) LIKE LOWER(?) OR LOWER(v.channel) LIKE LOWER(?) OR LOWER(d.actors) LIKE LOWER(?))'
    );
    const term = `%${query.search}%`;
    params.push(term, term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderBy =
    query.sort === 'popular'
      ? 'ORDER BY v.views DESC, v.createdAt DESC'
      : query.sort === 'episode'
      ? 'ORDER BY v.episodeNumber ASC, v.createdAt ASC'
      : 'ORDER BY v.createdAt DESC';

  const countRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM videos v
       LEFT JOIN dramas d ON v.dramaId = d._id
       LEFT JOIN categories c ON v.categoryId = c._id
       ${where}`
    )
    .get(...params) as { total: number };

  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 100);
  const page = Math.max(Number(query.page || 1), 1);
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT v.*, d.title as dramaTitle, d.slug as dramaSlug, c.name as categoryName, c.slug as categorySlug
       FROM videos v
       LEFT JOIN dramas d ON v.dramaId = d._id
       LEFT JOIN categories c ON v.categoryId = c._id
       ${where}
       ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Array<Record<string, unknown>>;

  return {
    videos: rows.map(mapVideo),
    total: countRow.total,
  };
}

export function getVideoById(id: string): Video | null {
  const row = db
    .prepare(
      `SELECT v.*, d.title as dramaTitle, d.slug as dramaSlug, c.name as categoryName, c.slug as categorySlug
       FROM videos v
       LEFT JOIN dramas d ON v.dramaId = d._id
       LEFT JOIN categories c ON v.categoryId = c._id
       WHERE v._id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapVideo(row) : null;
}

export function incrementVideoViews(id: string): void {
  db.prepare('UPDATE videos SET views = views + 1 WHERE _id = ?').run(id);
}

export function createVideo(input: Partial<Video>): Video {
  const id = createId('vid');
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO videos (
      _id, title, description, thumbnail, source_type, youtubeVideoId, youtubePlaylistId,
      videoUrl, dramaId, categoryId, episodeNumber, channel, duration, releaseDate, status, views, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.title || 'Untitled Episode',
    input.description || '',
    input.thumbnail || '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
    input.source_type || 'youtube',
    input.youtubeVideoId || '',
    input.youtubePlaylistId || '',
    input.videoUrl || '',
    input.dramaId || 'drm_ishq_haveli',
    input.categoryId || 'cat_romantic',
    Number(input.episodeNumber || 1),
    input.channel || 'HUM TV',
    input.duration || '40:00',
    input.releaseDate || createdAt.slice(0, 10),
    input.status || 'published',
    Number(input.views || 0),
    createdAt
  );
  const created = getVideoById(id)!;
  runMongoSync(() => VideoModel.findByIdAndUpdate(id, { ...created }, { upsert: true }));
  return created;
}

export function updateVideo(id: string, input: Partial<Video>): Video | null {
  const existing = getVideoById(id);
  if (!existing) return null;
  db.prepare(`
    UPDATE videos
    SET title = ?, description = ?, thumbnail = ?, source_type = ?, youtubeVideoId = ?, youtubePlaylistId = ?,
        videoUrl = ?, dramaId = ?, categoryId = ?, episodeNumber = ?, channel = ?, duration = ?, releaseDate = ?, status = ?
    WHERE _id = ?
  `).run(
    input.title ?? existing.title,
    input.description ?? existing.description,
    input.thumbnail ?? existing.thumbnail,
    input.source_type ?? existing.source_type,
    input.youtubeVideoId ?? existing.youtubeVideoId ?? '',
    input.youtubePlaylistId ?? existing.youtubePlaylistId ?? '',
    input.videoUrl ?? existing.videoUrl ?? '',
    input.dramaId ?? existing.dramaId,
    input.categoryId ?? existing.categoryId,
    input.episodeNumber ?? existing.episodeNumber,
    input.channel ?? existing.channel,
    input.duration ?? existing.duration,
    input.releaseDate ?? existing.releaseDate ?? '',
    input.status ?? existing.status,
    id
  );
  const updated = getVideoById(id);
  if (updated) runMongoSync(() => VideoModel.findByIdAndUpdate(id, { ...updated }, { upsert: true }));
  return updated;
}

export function deleteVideo(id: string): boolean {
  const ok = db.prepare('DELETE FROM videos WHERE _id = ?').run(id).changes > 0;
  if (ok) runMongoSync(() => VideoModel.findByIdAndDelete(id));
  return ok;
}

// --- Watch History ---
export function upsertWatchHistory(userId: string, videoId: string, dramaId: string, progressSeconds: number): void {
  const id = createId('his');
  const updatedAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO watch_history (_id, userId, videoId, dramaId, progressSeconds, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(userId, videoId) DO UPDATE SET progressSeconds = excluded.progressSeconds, updatedAt = excluded.updatedAt
  `).run(id, userId, videoId, dramaId, Math.max(0, Math.floor(progressSeconds)), updatedAt);
}

export function listWatchHistory(userId: string): WatchHistoryItem[] {
  const rows = db
    .prepare('SELECT * FROM watch_history WHERE userId = ? ORDER BY updatedAt DESC LIMIT 20')
    .all(userId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    _id: String(r._id),
    userId: String(r.userId),
    videoId: String(r.videoId),
    dramaId: String(r.dramaId),
    progressSeconds: Number(r.progressSeconds || 0),
    updatedAt: String(r.updatedAt),
    video: getVideoById(String(r.videoId)) || undefined,
    drama: getDramaBySlug(String(r.dramaId)) || undefined,
  }));
}

// --- Homepage & Search Aggregations ---
export function getHomePayload(): HomePayload {
  const allDramas = listDramas();
  const featuredDramas = allDramas.filter((d) => d.featured);
  const { videos: popularVideos } = listVideos({ sort: 'popular', limit: 16 });
  const { videos: latestVideos } = listVideos({ sort: 'latest', limit: 16 });
  const { videos: ownVideos } = listVideos({ source_type: 'own_upload', sort: 'latest', limit: 16 });
  const { videos: ytVideos } = listVideos({ source_type: 'youtube', sort: 'latest', limit: 16 });

  const rawSections: HomeSection[] = [
    {
      id: 'trending',
      title: 'Trending Pakistani Dramas',
      subtitle: 'Critically acclaimed serials drawing audiences across Pakistan',
      kind: 'drama',
      items: allDramas,
    },
    {
      id: 'latest-episodes',
      title: 'Latest Episodes',
      subtitle: 'Fresh releases across official broadcasts and DramaKhana originals',
      kind: 'video',
      items: latestVideos,
    },
    {
      id: 'most-watched',
      title: 'Most Watched',
      subtitle: 'Top-streamed episodes from our library',
      kind: 'video',
      items: popularVideos,
    },
    {
      id: 'own-uploads',
      title: 'Admin Uploaded Originals',
      subtitle: 'Direct high-bitrate streams curated and hosted on DramaKhana',
      kind: 'video',
      items: ownVideos,
    },
    {
      id: 'youtube-collection',
      title: 'YouTube Collection',
      subtitle: 'Official channel episodes synchronized via YouTube',
      kind: 'video',
      items: ytVideos,
    },
    {
      id: 'romantic',
      title: 'Romantic Dramas',
      kind: 'drama',
      items: allDramas.filter((d) => d.genres.includes('Romantic')),
    },
    {
      id: 'family',
      title: 'Family Dramas',
      kind: 'drama',
      items: allDramas.filter((d) => d.genres.includes('Family') || d.genres.includes('Emotional')),
    },
    {
      id: 'hum-tv',
      title: 'Popular HUM TV Dramas',
      kind: 'drama',
      items: allDramas.filter((d) => d.channel === 'HUM TV'),
    },
    {
      id: 'ary-digital',
      title: 'ARY Digital Dramas',
      kind: 'drama',
      items: allDramas.filter((d) => d.channel === 'ARY Digital'),
    },
    {
      id: 'geo-entertainment',
      title: 'Geo Entertainment Dramas',
      kind: 'drama',
      items: allDramas.filter((d) => d.channel === 'Geo Entertainment'),
    },
    {
      id: 'green-entertainment',
      title: 'Green Entertainment Dramas',
      kind: 'drama',
      items: allDramas.filter((d) => d.channel === 'Green Entertainment'),
    },
  ];

  const sections = rawSections.filter((sec) => sec.items.length > 0);

  return {
    featuredDramas: featuredDramas.length > 0 ? featuredDramas : allDramas.slice(0, 3),
    sections,
    categories: listCategories(false),
    channels: listChannels(),
  };
}

export function globalSearch(params: {
  q?: string;
  source_type?: SourceType | 'all';
  categorySlug?: string;
  year?: number;
  sort?: 'latest' | 'popular';
}) {
  const term = (params.q || '').trim().toLowerCase();
  const { videos } = listVideos({
    source_type: params.source_type,
    categorySlug: params.categorySlug,
    sort: params.sort || 'latest',
    limit: 60,
  });
  let dramas = listDramas();

  if (term) {
    dramas = dramas.filter(
      (d) =>
        d.title.toLowerCase().includes(term) ||
        d.channel.toLowerCase().includes(term) ||
        d.actors.some((a) => a.toLowerCase().includes(term)) ||
        d.genres.some((g) => g.toLowerCase().includes(term)) ||
        String(d.releaseYear).includes(term)
    );
  }

  let matchedVideos = videos;
  if (term) {
    matchedVideos = matchedVideos.filter(
      (v) =>
        v.title.toLowerCase().includes(term) ||
        (v.dramaTitle || '').toLowerCase().includes(term) ||
        (v.categoryName || '').toLowerCase().includes(term) ||
        v.channel.toLowerCase().includes(term) ||
        (v.releaseDate || '').includes(term)
    );
  }
  if (params.year) {
    dramas = dramas.filter((d) => d.releaseYear === params.year);
    matchedVideos = matchedVideos.filter((v) => (v.releaseDate || '').startsWith(String(params.year)));
  }

  return {
    dramas,
    videos: matchedVideos,
  };
}

export function getAdminStats(): AdminStats {
  const totalVideos = (db.prepare('SELECT COUNT(*) as c FROM videos').get() as { c: number }).c;
  const youtubeVideos = (db.prepare(`SELECT COUNT(*) as c FROM videos WHERE source_type = 'youtube'`).get() as { c: number }).c;
  const ownUploadedVideos = (db.prepare(`SELECT COUNT(*) as c FROM videos WHERE source_type = 'own_upload'`).get() as { c: number }).c;
  const totalDramas = (db.prepare('SELECT COUNT(*) as c FROM dramas').get() as { c: number }).c;
  const totalCategories = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const { videos: recentUploads } = listVideos({ status: 'all', sort: 'latest', limit: 6 });

  const categories = listCategories(true);
  const categoryBreakdown = categories.map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    youtubeCount: c.youtubeCount || 0,
    ownUploadCount: c.ownUploadCount || 0,
    totalCount: c.totalCount || 0,
  }));

  return {
    totalVideos,
    youtubeVideos,
    ownUploadedVideos,
    totalDramas,
    totalCategories,
    totalEpisodes: totalVideos,
    totalUsers,
    recentUploads,
    categoryBreakdown,
  };
}

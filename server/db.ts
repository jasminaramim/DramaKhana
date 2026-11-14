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

const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'dramakhana.db');

let db: Database.Database | null = null;
let mongoConnected = false;

let catalogDataCache: any = null;
export function getCatalogData(): any {
  if (!catalogDataCache) {
    try {
      const p = path.resolve(process.cwd(), 'src', 'data', 'catalog.json');
      if (fs.existsSync(p)) {
        catalogDataCache = JSON.parse(fs.readFileSync(p, 'utf-8'));
      }
    } catch {
      catalogDataCache = null;
    }
  }
  return catalogDataCache;
}

export function getDb(): Database.Database | null {
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
  try {
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
  } catch (err) {
    console.warn('SQLite init warning (operating in resilient memory/Mongo mode):', (err as Error).message);
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && !mongoConnected) {
      try {
        await mongoose.connect(mongoUri.trim(), { serverSelectionTimeoutMS: 4000 });
        mongoConnected = true;
        console.log('MongoDB connected via resilient fallback.');
      } catch {}
    }
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
  if (!db) return;
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

  // Auto-migrate from demo mock data to real YouTube data if needed
  const hasRealDramas = (db.prepare(`SELECT COUNT(*) as c FROM dramas WHERE _id = 'drm_dar_e_nijat'`).get() as { c: number }).c > 0;
  if (!hasRealDramas) {
    db.exec(`
      DELETE FROM videos;
      DELETE FROM dramas;
      DELETE FROM categories;
      DELETE FROM actors;
    `);
  }

  const existingCategories = (db.prepare('SELECT COUNT(*) as c FROM categories').get() as { c: number }).c;
  if (existingCategories === 0) {
    const cats = [
      {
        _id: 'cat_family',
        name: 'Family & Social',
        slug: 'family',
        description: 'Compelling household narratives, cultural ethics, and generational resilience.',
        image: 'https://i.ytimg.com/vi/0ZYscAm2xrA/hqdefault.jpg',
        status: 'active',
        displayOrder: 1,
      },
      {
        _id: 'cat_romantic',
        name: 'Romantic',
        slug: 'romantic',
        description: 'Soulful Pakistani love stories, poetry, and emotional journeys.',
        image: 'https://i.ytimg.com/vi/MyLZnzEcnG8/hqdefault.jpg',
        status: 'active',
        displayOrder: 2,
      },
      {
        _id: 'cat_emotional',
        name: 'Emotional Drama',
        slug: 'emotional',
        description: 'Deeply moving, tear-jerking performances and powerful screenplays.',
        image: 'https://i.ytimg.com/vi/wykbxHM2Ch4/hqdefault.jpg',
        status: 'active',
        displayOrder: 3,
      },
      {
        _id: 'cat_thriller',
        name: 'Thriller & Mystery',
        slug: 'thriller',
        description: 'High-tension mysteries, revenge sagas, and breathtaking cliffhangers.',
        image: 'https://i.ytimg.com/vi/-Q7llGMTsR4/hqdefault.jpg',
        status: 'active',
        displayOrder: 4,
      },
      {
        _id: 'cat_classic',
        name: 'Timeless Classics',
        slug: 'classic',
        description: 'Golden-era Pakistani masterworks that shaped modern South Asian television.',
        image: 'https://i.ytimg.com/vi/iQYGN1_4p08/hqdefault.jpg',
        status: 'active',
        displayOrder: 5,
      },
      {
        _id: 'cat_comedy',
        name: 'Rom-Com & Light Drama',
        slug: 'comedy',
        description: 'Witty banter, heartwarming romance, and cheerful ensemble serials.',
        image: 'https://i.ytimg.com/vi/F4Z6EEzlQY4/hqdefault.jpg',
        status: 'active',
        displayOrder: 6,
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
        _id: 'act_sheheryar',
        name: 'Sheheryar Munawar',
        bio: 'Celebrated leading actor headlining Pakistan’s top-trending broadcast dramas and cinema.',
        avatar: 'https://i.ytimg.com/vi/0ZYscAm2xrA/hqdefault.jpg',
        knownFor: 'Dar-e-Nijaat, Pehli Si Muhabbat, Zindagi Gulzar Hai',
      },
      {
        _id: 'act_durefishan',
        name: 'Dur-e-Fishan Saleem',
        bio: 'Critically acclaimed Pakistani star celebrated for commanding emotional depth in record-breaking serials.',
        avatar: 'https://i.ytimg.com/vi/0ZYscAm2xrA/hqdefault.jpg',
        knownFor: 'Dar-e-Nijaat, Ishq Murshid, Khaie',
      },
      {
        _id: 'act_fahad',
        name: 'Fahad Mustafa',
        bio: 'Superstar actor, producer, and host loved across Pakistan for his magnetic screen presence.',
        avatar: 'https://i.ytimg.com/vi/MyLZnzEcnG8/hqdefault.jpg',
        knownFor: 'Kabhi Main Kabhi Tum, Na Maloom Afraad',
      },
      {
        _id: 'act_hania',
        name: 'Hania Aamir',
        bio: 'One of South Asia’s most popular actresses, charming millions with heartfelt, expressive portrayals.',
        avatar: 'https://i.ytimg.com/vi/MyLZnzEcnG8/hqdefault.jpg',
        knownFor: 'Kabhi Main Kabhi Tum, Mere Humsafar',
      },
      {
        _id: 'act_wahaj',
        name: 'Wahaj Ali',
        bio: 'Charismatic superstar with global acclaim for intense romantic and historic performances.',
        avatar: 'https://i.ytimg.com/vi/wykbxHM2Ch4/hqdefault.jpg',
        knownFor: 'Tere Bin, Mujhe Pyaar Hua Tha, Jo Bichar Gaye',
      },
      {
        _id: 'act_yumna',
        name: 'Yumna Zaidi',
        bio: 'Multiple Lux Style Award-winning actress revered for unparalleled versatility and powerhouse drama roles.',
        avatar: 'https://i.ytimg.com/vi/wykbxHM2Ch4/hqdefault.jpg',
        knownFor: 'Tere Bin, Parizaad, Pyar Ke Sadqay',
      },
      {
        _id: 'act_bilal',
        name: 'Bilal Abbas Khan',
        bio: 'Transformative method actor known for nuance, comedic brilliance, and gripping romantic sagas.',
        avatar: 'https://i.ytimg.com/vi/F4Z6EEzlQY4/hqdefault.jpg',
        knownFor: 'Ishq Murshid, Pyar Ke Sadqay, Cheekh',
      },
      {
        _id: 'act_ahmed',
        name: 'Ahmed Ali Akbar',
        bio: 'Internationally celebrated actor who delivered an epochal performance as Parizaad.',
        avatar: 'https://i.ytimg.com/vi/fwZ6JNfXezg/hqdefault.jpg',
        knownFor: 'Parizaad, Laal Kabootar, Yeh Raha Dil',
      },
      {
        _id: 'act_humayun',
        name: 'Humayun Saeed',
        bio: 'Pakistani cinema and television giant known for landmark prime-time blockbusters.',
        avatar: 'https://i.ytimg.com/vi/KsI9py8Z0hM/hqdefault.jpg',
        knownFor: 'Mere Paas Tum Ho, Dil Lagi',
      },
      {
        _id: 'act_ayeza',
        name: 'Ayeza Khan',
        bio: 'Leading icon of modern Pakistani drama renowned for commanding lead roles across every genre.',
        avatar: 'https://i.ytimg.com/vi/KsI9py8Z0hM/hqdefault.jpg',
        knownFor: 'Mere Paas Tum Ho, Jaan-e-Jahan, Chupke Chupke',
      },
      {
        _id: 'act_fawad',
        name: 'Fawad Khan',
        bio: 'Legendary screen idol whose understated intensity redefined Urdu television worldwide.',
        avatar: 'https://i.ytimg.com/vi/iQYGN1_4p08/hqdefault.jpg',
        knownFor: 'Humsafar, Zindagi Gulzar Hai, Dastaan',
      },
      {
        _id: 'act_mahira',
        name: 'Mahira Khan',
        bio: 'Global Pakistani screen icon with universally celebrated romantic and dramatic performances.',
        avatar: 'https://i.ytimg.com/vi/iQYGN1_4p08/hqdefault.jpg',
        knownFor: 'Humsafar, Shehr-e-Zaat, Sadqay Tumhare',
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
        _id: 'drm_dar_e_nijat',
        title: 'Dar-e-Nijaat',
        slug: 'dar-e-nijaat',
        description:
          'A gripping story of faith, redemption, and emotional trials starring Sheheryar Munawar and Dur-e-Fishan Saleem. The #1 top trending sensation on ARY Digital with millions of YouTube views.',
        poster: 'https://i.ytimg.com/vi/0ZYscAm2xrA/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/0ZYscAm2xrA/maxresdefault.jpg',
        heroVideo: '/hero1.mp4',
        actors: ['Sheheryar Munawar', 'Dur-e-Fishan Saleem', 'Ahmed Ali Akbar'],
        channel: 'ARY Digital',
        genres: ['Family', 'Emotional', 'Romantic'],
        releaseYear: 2026,
        status: 'published',
        featured: 1,
        createdAt: '2026-11-14T10:00:00.000Z',
      },
      {
        _id: 'drm_kabhi_main_kabhi_tum',
        title: 'Kabhi Main Kabhi Tum',
        slug: 'kabhi-main-kabhi-tum',
        description:
          'The sensational Pakistani blockbuster starring Fahad Mustafa and Hania Aamir as Mustafa and Sharjeena, celebrating love, resilience, and true companionship across life hurdles.',
        poster: 'https://i.ytimg.com/vi/MyLZnzEcnG8/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/MyLZnzEcnG8/maxresdefault.jpg',
        heroVideo: '/hero2.mp4',
        actors: ['Fahad Mustafa', 'Hania Aamir', 'Emmad Irfani', 'Javeria Abbasi'],
        channel: 'ARY Digital',
        genres: ['Romantic', 'Emotional', 'Family'],
        releaseYear: 2024,
        status: 'published',
        featured: 1,
        createdAt: '2026-11-10T10:00:00.000Z',
      },
      {
        _id: 'drm_tere_bin',
        title: 'Tere Bin',
        slug: 'tere-bin',
        description:
          'Murtasim and Meerab capture international audiences in Pakistan’s record-shattering romantic drama series produced by 7th Sky Entertainment on Har Pal Geo.',
        poster: 'https://i.ytimg.com/vi/wykbxHM2Ch4/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/wykbxHM2Ch4/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Wahaj Ali', 'Yumna Zaidi', 'Sabeena Farooq', 'Bushra Ansari'],
        channel: 'Geo Entertainment',
        genres: ['Romantic', 'Emotional'],
        releaseYear: 2023,
        status: 'published',
        featured: 1,
        createdAt: '2026-11-05T10:00:00.000Z',
      },
      {
        _id: 'drm_ishq_murshid',
        title: 'Ishq Murshid',
        slug: 'ishq-murshid',
        description:
          'Fazal Bakhsh and Shibra win hearts in HUM TV’s sensation that swept the subcontinent, intertwining political drama with wholesome romance and iconic music.',
        poster: 'https://i.ytimg.com/vi/F4Z6EEzlQY4/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/F4Z6EEzlQY4/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Bilal Abbas Khan', 'Dur-e-Fishan Saleem', 'Omair Rana'],
        channel: 'HUM TV',
        genres: ['Romantic', 'Comedy', 'Family'],
        releaseYear: 2024,
        status: 'published',
        featured: 1,
        createdAt: '2026-11-01T10:00:00.000Z',
      },
      {
        _id: 'drm_parizaad',
        title: 'Parizaad',
        slug: 'parizaad',
        description:
          'Hashim Nadeem’s masterpiece brought to life by Ahmed Ali Akbar in an unforgettable exploration of inner beauty, poetry, ambition, and humanity.',
        poster: 'https://i.ytimg.com/vi/fwZ6JNfXezg/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/fwZ6JNfXezg/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Ahmed Ali Akbar', 'Yumna Zaidi', 'Ushna Shah', 'Nauman Ijaz'],
        channel: 'HUM TV',
        genres: ['Emotional', 'Family'],
        releaseYear: 2021,
        status: 'published',
        featured: 1,
        createdAt: '2026-10-25T10:00:00.000Z',
      },
      {
        _id: 'drm_mere_paas_tum_ho',
        title: 'Mere Paas Tum Ho',
        slug: 'mere-paas-tum-ho',
        description:
          'Khalil-ur-Rehman Qamar’s emotional roller-coaster that stopped traffic across Pakistan on ARY Digital, starring Humayun Saeed and Ayeza Khan.',
        poster: 'https://i.ytimg.com/vi/KsI9py8Z0hM/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/KsI9py8Z0hM/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Humayun Saeed', 'Ayeza Khan', 'Adnan Siddiqui', 'Hira Mani'],
        channel: 'ARY Digital',
        genres: ['Emotional', 'Romantic'],
        releaseYear: 2020,
        status: 'published',
        featured: 1,
        createdAt: '2026-10-20T10:00:00.000Z',
      },
      {
        _id: 'drm_khaie',
        title: 'Khaie',
        slug: 'khaie',
        description:
          'An intense Pashtun revenge thriller set in northern peaks, where Zamda seeks retribution against the tyrannical Channar Khan on Har Pal Geo.',
        poster: 'https://i.ytimg.com/vi/-Q7llGMTsR4/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/-Q7llGMTsR4/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Faysal Quraishi', 'Dur-e-Fishan Saleem', 'Shuja Asad'],
        channel: 'Geo Entertainment',
        genres: ['Thriller', 'Emotional'],
        releaseYear: 2024,
        status: 'published',
        featured: 0,
        createdAt: '2026-10-15T10:00:00.000Z',
      },
      {
        _id: 'drm_noor_jahan',
        title: 'Noor Jahan',
        slug: 'noor-jahan',
        description:
          'A powerful matriarch rules her family with an iron fist until strong-willed daughters-in-law challenge the household authority on ARY Digital.',
        poster: 'https://i.ytimg.com/vi/6Tgh-K8hnlE/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/6Tgh-K8hnlE/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Saba Hamid', 'Kubra Khan', 'Ali Rehman Khan'],
        channel: 'ARY Digital',
        genres: ['Family', 'Emotional'],
        releaseYear: 2024,
        status: 'published',
        featured: 0,
        createdAt: '2026-10-10T10:00:00.000Z',
      },
      {
        _id: 'drm_jaan_e_jahan',
        title: 'Jaan-e-Jahan',
        slug: 'jaan-e-jahan',
        description:
          'Hamza Ali Abbasi makes his grand television return opposite Ayeza Khan in a tale of devotion, honor, and destined reunion.',
        poster: 'https://i.ytimg.com/vi/w14APWbqbcM/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/w14APWbqbcM/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Hamza Ali Abbasi', 'Ayeza Khan', 'Asif Raza Mir'],
        channel: 'ARY Digital',
        genres: ['Romantic', 'Emotional', 'Family'],
        releaseYear: 2024,
        status: 'published',
        featured: 0,
        createdAt: '2026-10-05T10:00:00.000Z',
      },
      {
        _id: 'drm_humsafar',
        title: 'Humsafar',
        slug: 'humsafar',
        description:
          'The cultural milestone that redefined Pakistani television across the world, starring Fawad Khan as Ashar and Mahira Khan as Khirad.',
        poster: 'https://i.ytimg.com/vi/iQYGN1_4p08/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/iQYGN1_4p08/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Fawad Khan', 'Mahira Khan', 'Naveen Waqar', 'Atiqa Odho'],
        channel: 'HUM TV',
        genres: ['Romantic', 'Emotional'],
        releaseYear: 2012,
        status: 'published',
        featured: 0,
        createdAt: '2026-09-20T10:00:00.000Z',
      },
      {
        _id: 'drm_zindagi_gulzar_hai',
        title: 'Zindagi Gulzar Hai',
        slug: 'zindagi-gulzar-hai',
        description:
          'Kashaf Murtaza and Zaroon Junaid’s unforgettable journey from polar opposite backgrounds into mature mutual respect and enduring love.',
        poster: 'https://i.ytimg.com/vi/HkRRv2tz4yA/maxresdefault.jpg',
        banner: 'https://i.ytimg.com/vi/HkRRv2tz4yA/maxresdefault.jpg',
        heroVideo: '',
        actors: ['Sanam Saeed', 'Fawad Khan', 'Ayesha Omer', 'Samina Peerzada'],
        channel: 'HUM TV',
        genres: ['Romantic', 'Family'],
        releaseYear: 2013,
        status: 'published',
        featured: 0,
        createdAt: '2026-09-15T10:00:00.000Z',
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
        _id: 'vid_yt_dar_01',
        title: 'Dar-e-Nijaat — Episode 01 (Official Broadcast)',
        description: 'Dar-e-Nijaat EP 1 starring Sheheryar Munawar and Dur-e-Fishan Saleem on ARY Digital.',
        thumbnail: 'https://i.ytimg.com/vi/0ZYscAm2xrA/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: '0ZYscAm2xrA',
        dramaId: 'drm_dar_e_nijat',
        categoryId: 'cat_family',
        episodeNumber: 1,
        channel: 'ARY Digital',
        duration: '37:54',
        releaseDate: '2026-08-01',
        status: 'published',
        views: 152000000,
        createdAt: '2026-11-14T09:00:00.000Z',
      },
      {
        _id: 'vid_yt_dar_30',
        title: 'Dar-e-Nijaat — Episode 30 (Climax)',
        description: 'High-emotion turning point episode in Dar-e-Nijaat on ARY Digital.',
        thumbnail: 'https://i.ytimg.com/vi/dk4uVsevJeU/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'dk4uVsevJeU',
        dramaId: 'drm_dar_e_nijat',
        categoryId: 'cat_family',
        episodeNumber: 30,
        channel: 'ARY Digital',
        duration: '38:08',
        releaseDate: '2026-11-13',
        status: 'published',
        views: 42000000,
        createdAt: '2026-11-13T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_dar_ost',
        title: 'Dar-e-Nijaat — Original Soundtrack (OST)',
        description: 'Soul-stirring OST of Dar-e-Nijaat performed by Nabeel Shaukat Ali and Osaf Fateh Ali Khan.',
        thumbnail: 'https://i.ytimg.com/vi/cX5YhkapzVk/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'cX5YhkapzVk',
        dramaId: 'drm_dar_e_nijat',
        categoryId: 'cat_romantic',
        episodeNumber: 0,
        channel: 'ARY Digital',
        duration: '04:02',
        releaseDate: '2026-08-01',
        status: 'published',
        views: 38000000,
        createdAt: '2026-11-12T10:00:00.000Z',
      },
      {
        _id: 'vid_yt_terebin_01',
        title: 'Tere Bin — Episode 01',
        description: 'Murtasim and Meerab first meet in Pakistan’s record-breaking romantic sensation on Har Pal Geo.',
        thumbnail: 'https://i.ytimg.com/vi/wykbxHM2Ch4/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'wykbxHM2Ch4',
        dramaId: 'drm_tere_bin',
        categoryId: 'cat_romantic',
        episodeNumber: 1,
        channel: 'Geo Entertainment',
        duration: '40:43',
        releaseDate: '2022-12-28',
        status: 'published',
        views: 110200000,
        createdAt: '2026-11-05T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_kabhi_01',
        title: 'Kabhi Main Kabhi Tum — Episode 01',
        description: 'Mustafa and Sharjeena begin their unforgettable journey in ARY Digital’s blockbuster.',
        thumbnail: 'https://i.ytimg.com/vi/MyLZnzEcnG8/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'MyLZnzEcnG8',
        dramaId: 'drm_kabhi_main_kabhi_tum',
        categoryId: 'cat_romantic',
        episodeNumber: 1,
        channel: 'ARY Digital',
        duration: '39:30',
        releaseDate: '2024-07-02',
        status: 'published',
        views: 89400000,
        createdAt: '2026-11-10T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_parizaad_01',
        title: 'Parizaad — Episode 01',
        description: 'A profound and intense story featuring Ahmed Ali Akbar in his career-defining performance on HUM TV.',
        thumbnail: 'https://i.ytimg.com/vi/fwZ6JNfXezg/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'fwZ6JNfXezg',
        dramaId: 'drm_parizaad',
        categoryId: 'cat_emotional',
        episodeNumber: 1,
        channel: 'HUM TV',
        duration: '36:40',
        releaseDate: '2021-07-20',
        status: 'published',
        views: 65100000,
        createdAt: '2026-10-25T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_merepaas_01',
        title: 'Mere Paas Tum Ho — Episode 01',
        description: 'Danish and Mehwish face the fragile nature of trust and sacrifice in ARY Digital’s classic.',
        thumbnail: 'https://i.ytimg.com/vi/KsI9py8Z0hM/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'KsI9py8Z0hM',
        dramaId: 'drm_mere_paas_tum_ho',
        categoryId: 'cat_emotional',
        episodeNumber: 1,
        channel: 'ARY Digital',
        duration: '41:54',
        releaseDate: '2019-08-17',
        status: 'published',
        views: 35400000,
        createdAt: '2026-10-20T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_khaie_01',
        title: 'Khaie — Episode 01',
        description: 'A pulse-pounding revenge saga begins in the northern heights on Har Pal Geo.',
        thumbnail: 'https://i.ytimg.com/vi/-Q7llGMTsR4/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: '-Q7llGMTsR4',
        dramaId: 'drm_khaie',
        categoryId: 'cat_thriller',
        episodeNumber: 1,
        channel: 'Geo Entertainment',
        duration: '42:48',
        releaseDate: '2024-01-03',
        status: 'published',
        views: 31200000,
        createdAt: '2026-10-15T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_ishqmurshid_01',
        title: 'Ishq Murshid — Episode 01',
        description: 'Shahmir Ansari transforms into Fazal Bakhsh for love in HUM TV’s smash hit.',
        thumbnail: 'https://i.ytimg.com/vi/F4Z6EEzlQY4/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'F4Z6EEzlQY4',
        dramaId: 'drm_ishq_murshid',
        categoryId: 'cat_comedy',
        episodeNumber: 1,
        channel: 'HUM TV',
        duration: '37:12',
        releaseDate: '2023-10-08',
        status: 'published',
        views: 27500000,
        createdAt: '2026-11-01T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_noorjahan_01',
        title: 'Noor Jahan — Episode 01',
        description: 'Saba Hamid commands the screen in an explosive familial clash on ARY Digital.',
        thumbnail: 'https://i.ytimg.com/vi/6Tgh-K8hnlE/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: '6Tgh-K8hnlE',
        dramaId: 'drm_noor_jahan',
        categoryId: 'cat_family',
        episodeNumber: 1,
        channel: 'ARY Digital',
        duration: '40:15',
        releaseDate: '2024-05-25',
        status: 'published',
        views: 25800000,
        createdAt: '2026-10-10T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_jaanejahan_01',
        title: 'Jaan-e-Jahan — Episode 01',
        description: 'Hamza Ali Abbasi and Ayeza Khan in a tale of eternal commitment on ARY Digital.',
        thumbnail: 'https://i.ytimg.com/vi/w14APWbqbcM/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'w14APWbqbcM',
        dramaId: 'drm_jaan_e_jahan',
        categoryId: 'cat_romantic',
        episodeNumber: 1,
        channel: 'ARY Digital',
        duration: '39:51',
        releaseDate: '2023-12-22',
        status: 'published',
        views: 21400000,
        createdAt: '2026-10-05T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_humsafar_01',
        title: 'Humsafar — Episode 01',
        description: 'Fawad Khan and Mahira Khan star in the timeless television phenomenon on HUM TV.',
        thumbnail: 'https://i.ytimg.com/vi/iQYGN1_4p08/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'iQYGN1_4p08',
        dramaId: 'drm_humsafar',
        categoryId: 'cat_classic',
        episodeNumber: 1,
        channel: 'HUM TV',
        duration: '38:03',
        releaseDate: '2011-09-24',
        status: 'published',
        views: 18900000,
        createdAt: '2026-09-20T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_zindagi_01',
        title: 'Zindagi Gulzar Hai — Episode 01',
        description: 'Kashaf’s diary unfolds in Umera Ahmed’s legendary masterpiece on HUM TV.',
        thumbnail: 'https://i.ytimg.com/vi/HkRRv2tz4yA/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'HkRRv2tz4yA',
        dramaId: 'drm_zindagi_gulzar_hai',
        categoryId: 'cat_classic',
        episodeNumber: 1,
        channel: 'HUM TV',
        duration: '38:31',
        releaseDate: '2012-11-30',
        status: 'published',
        views: 16700000,
        createdAt: '2026-09-15T19:00:00.000Z',
      },
      {
        _id: 'vid_yt_dar_31',
        title: 'Dar-e-Nijaat — Episode 31 (Teaser)',
        description: 'Upcoming dramatic finale teaser for Dar-e-Nijaat on ARY Digital.',
        thumbnail: 'https://i.ytimg.com/vi/lGCxpNJnqic/maxresdefault.jpg',
        source_type: 'youtube',
        youtubeVideoId: 'lGCxpNJnqic',
        dramaId: 'drm_dar_e_nijat',
        categoryId: 'cat_family',
        episodeNumber: 31,
        channel: 'ARY Digital',
        duration: '01:00',
        releaseDate: '2026-11-14',
        status: 'published',
        views: 12400000,
        createdAt: '2026-11-14T08:00:00.000Z',
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
    heroVideo: row.heroVideo ? String(row.heroVideo) : (id === 'drm_dar_e_nijat' ? '/hero1.mp4' : id === 'drm_kabhi_main_kabhi_tum' ? '/hero2.mp4' : undefined),
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
  if (!db) {
    if (clean.toLowerCase() === 'jasmin' || clean.toLowerCase() === 'jasmin@dramakhana.pk') {
      return {
        _id: 'usr_jasmin',
        username: 'jasmin',
        name: 'Jasmin Admin',
        email: 'jasmin@dramakhana.pk',
        password: hashPassword('jasmin1142005'),
        role: 'admin',
        watchlist: ['drm_dare_nijat', 'drm_kmkt'],
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  }
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
  if (!db) {
    if (id === 'usr_jasmin') {
      return {
        _id: 'usr_jasmin',
        username: 'jasmin',
        name: 'Jasmin Admin',
        email: 'jasmin@dramakhana.pk',
        role: 'admin',
        watchlist: ['drm_dare_nijat', 'drm_kmkt'],
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  }
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
  if (!db) {
    return (getCatalogData()?.categories || []) as Category[];
  }
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
  if (!db) {
    return (getCatalogData()?.channels || []) as Channel[];
  }
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
  if (!db) {
    return (getCatalogData()?.actors || []) as Actor[];
  }
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
  if (!db) {
    const cat = getCatalogData();
    let items: Drama[] = cat?.dramas || [];
    if (options?.channel) {
      items = items.filter((d) => d.channel.toLowerCase() === options.channel?.toLowerCase());
    }
    if (options?.genre) {
      const g = options.genre.toLowerCase();
      items = items.filter((d) => d.genres.some((item) => item.toLowerCase() === g));
    }
    return items;
  }
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (!options?.includeDrafts) {
    conditions.push(`d.status = 'published'`);
  }
  if (options?.channel) {
    conditions.push(`LOWER(d.channel) = LOWER(?)`);
    params.push(options.channel);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT d.*,
      COALESCE((SELECT SUM(v.views) FROM videos v WHERE v.dramaId = d._id), 0) as totalViews
    FROM dramas d
    ${where}
    ORDER BY
      CASE WHEN d._id = 'drm_dar_e_nijat' THEN 1 ELSE 0 END DESC,
      d.featured DESC,
      totalViews DESC,
      d.createdAt DESC
  `).all(...params) as Array<Record<string, unknown>>;
  const counts = getEpisodeCountMap();
  let dramas = rows.map((r) => mapDrama(r, counts));
  if (options?.genre) {
    const g = options.genre.toLowerCase();
    dramas = dramas.filter((d) => d.genres.some((item) => item.toLowerCase() === g));
  }
  return dramas;
}

export function getDramaBySlug(slug: string): Drama | null {
  if (!db) {
    const cat = getCatalogData();
    return (cat?.dramas || []).find((d: any) => d.slug === slug || d._id === slug) || null;
  }
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
  if (!db) {
    const cat = getCatalogData();
    let items: Video[] = cat?.videos || [];
    if (query.dramaId) items = items.filter((v: any) => v.dramaId === query.dramaId);
    if (query.channel) items = items.filter((v: any) => v.channel.toLowerCase() === query.channel?.toLowerCase());
    if (query.source_type && query.source_type !== 'all') items = items.filter((v: any) => v.source_type === query.source_type);
    return { videos: items, total: items.length };
  }
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
    query.sort === 'latest'
      ? 'ORDER BY v.createdAt DESC'
      : query.sort === 'episode'
      ? 'ORDER BY v.episodeNumber ASC, v.createdAt ASC'
      : 'ORDER BY v.views DESC, v.createdAt DESC';

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
  if (!db) {
    const cat = getCatalogData();
    return (cat?.videos || []).find((v: any) => v._id === id || v.youtubeVideoId === id) || null;
  }
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
  if (!db) {
    const cat = getCatalogData();
    if (cat?.home) return cat.home;
  }
  const allDramas = listDramas();
  const featuredDramas = allDramas.filter((d) => d.featured);
  const { videos: popularVideos } = listVideos({ sort: 'popular', limit: 16 });
  const { videos: latestVideos } = listVideos({ sort: 'latest', limit: 16 });
  const { videos: ytVideos } = listVideos({ source_type: 'youtube', sort: 'popular', limit: 16 });

  const rawSections: HomeSection[] = [
    {
      id: 'trending',
      title: 'Trending Pakistani Dramas',
      subtitle: 'Pakistan’s top-trending broadcast serials dominating YouTube views',
      kind: 'drama',
      items: allDramas,
    },
    {
      id: 'most-watched',
      title: 'Most Watched on YouTube',
      subtitle: 'Blockbuster episodes ranked by total YouTube audience popularity',
      kind: 'video',
      items: popularVideos,
    },
    {
      id: 'latest-episodes',
      title: 'Latest Official Broadcasts',
      subtitle: 'Fresh releases across official YouTube broadcast channels',
      kind: 'video',
      items: latestVideos,
    },
    {
      id: 'romantic',
      title: 'Romantic & Melodrama Serials',
      subtitle: 'Soul-stirring romance and acclaimed emotional masterworks',
      kind: 'drama',
      items: allDramas.filter((d) => d.genres.some((g) => g.toLowerCase().includes('romantic') || g.toLowerCase().includes('emotional'))),
    },
    {
      id: 'family',
      title: 'Family & Social Dramas',
      subtitle: 'Critically acclaimed Pakistani narratives exploring family bonds',
      kind: 'drama',
      items: allDramas.filter((d) => d.genres.some((g) => g.toLowerCase().includes('family') || g.toLowerCase().includes('social'))),
    },
    {
      id: 'ary-digital',
      title: 'Top ARY Digital Hits',
      subtitle: 'Prime-time sensations from Pakistan’s leading entertainment network',
      kind: 'drama',
      items: allDramas.filter((d) => d.channel === 'ARY Digital'),
    },
    {
      id: 'hum-tv',
      title: 'Acclaimed HUM TV Classics',
      subtitle: 'Award-winning literary adaptations and modern masterpieces',
      kind: 'drama',
      items: allDramas.filter((d) => d.channel === 'HUM TV'),
    },
    {
      id: 'geo-entertainment',
      title: 'Har Pal Geo Blockbusters',
      subtitle: 'Grand-scale storytelling and historic subcontinent hits',
      kind: 'drama',
      items: allDramas.filter((d) => d.channel === 'Geo Entertainment'),
    },
    {
      id: 'youtube-collection',
      title: 'Official YouTube Collection',
      subtitle: 'Direct high-definition episodes streamed from official networks',
      kind: 'video',
      items: ytVideos,
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
  if (!db) {
    const cat = getCatalogData();
    const totalVideos = cat?.videos?.length || 0;
    const youtubeVideos = totalVideos;
    const ownUploadedVideos = 0;
    const totalDramas = cat?.dramas?.length || 0;
    const totalCategories = cat?.categories?.length || 0;
    const totalUsers = 1;
    const recentUploads = (cat?.videos || []).slice(0, 6);
    const categoryBreakdown = (cat?.categories || []).map((c: any) => ({
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

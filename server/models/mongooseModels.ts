import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDoc extends Document<string> {
  _id: string;
  username?: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'viewer';
  watchlist: string[];
  createdAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    _id: { type: String, required: true },
    username: { type: String, trim: true, lowercase: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
    watchlist: [{ type: String }],
  },
  { timestamps: true, _id: false }
);

const CategorySchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false }
);

const DramaSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    poster: { type: String, default: '' },
    banner: { type: String, default: '' },
    heroVideo: { type: String, default: '' },
    actors: [{ type: String }],
    channel: { type: String, default: '' },
    genres: [{ type: String }],
    releaseYear: { type: Number, default: 2025 },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false }
);

const VideoSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    source_type: { type: String, enum: ['youtube', 'own_upload'], required: true },
    youtubeVideoId: { type: String, default: '' },
    youtubePlaylistId: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    dramaId: { type: String, required: true, index: true },
    categoryId: { type: String, required: true, index: true },
    episodeNumber: { type: Number, default: 1 },
    channel: { type: String, default: '' },
    duration: { type: String, default: '42:00' },
    releaseDate: { type: String, default: '' },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    views: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false }
);

const ChannelSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
    youtubeChannelId: { type: String, default: '' },
    description: { type: String, default: '' },
    accentColor: { type: String, default: '#087F5B' },
  },
  { timestamps: true, _id: false }
);

const ActorSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    knownFor: { type: String, default: '' },
  },
  { timestamps: true, _id: false }
);

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
export const CategoryModel = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export const DramaModel = mongoose.models.Drama || mongoose.model('Drama', DramaSchema);
export const VideoModel = mongoose.models.Video || mongoose.model('Video', VideoSchema);
export const ChannelModel = mongoose.models.Channel || mongoose.model('Channel', ChannelSchema);
export const ActorModel = mongoose.models.Actor || mongoose.model('Actor', ActorSchema);

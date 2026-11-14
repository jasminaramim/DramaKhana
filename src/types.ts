export type SourceType = 'youtube' | 'own_upload';
export type ContentStatus = 'published' | 'draft' | 'active' | 'inactive';
export type UserRole = 'admin' | 'viewer';

export interface User {
  _id: string;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  watchlist: string[];
  createdAt: string;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string;
  publishedText: string;
  viewsText: string;
  description: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  status: 'active' | 'inactive';
  displayOrder: number;
  totalCount?: number;
  youtubeCount?: number;
  ownUploadCount?: number;
}

export interface Channel {
  _id: string;
  name: string;
  logo: string;
  youtubeChannelId: string;
  description: string;
  accentColor?: string;
}

export interface Actor {
  _id: string;
  name: string;
  bio: string;
  avatar: string;
  knownFor: string;
}

export interface Drama {
  _id: string;
  title: string;
  slug: string;
  description: string;
  poster: string;
  banner: string;
  heroVideo?: string;
  actors: string[];
  channel: string;
  genres: string[];
  releaseYear: number;
  status: 'published' | 'draft';
  featured: boolean;
  totalEpisodes?: number;
  createdAt: string;
}

export interface Video {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  source_type: SourceType;
  youtubeVideoId?: string;
  youtubePlaylistId?: string;
  videoUrl?: string;
  dramaId: string;
  dramaTitle?: string;
  dramaSlug?: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  episodeNumber: number;
  channel: string;
  duration: string;
  releaseDate?: string;
  status: 'published' | 'draft';
  views: number;
  createdAt: string;
}

export interface WatchHistoryItem {
  _id: string;
  userId: string;
  videoId: string;
  dramaId: string;
  progressSeconds: number;
  updatedAt: string;
  video?: Video;
  drama?: Drama;
}

export interface HomeSection {
  id: string;
  title: string;
  subtitle?: string;
  kind: 'drama' | 'video';
  items: Array<Drama | Video>;
}

export interface HomePayload {
  featuredDramas: Drama[];
  sections: HomeSection[];
  categories: Category[];
  channels: Channel[];
}

export interface AdminStats {
  totalVideos: number;
  youtubeVideos: number;
  ownUploadedVideos: number;
  totalDramas: number;
  totalCategories: number;
  totalEpisodes: number;
  totalUsers: number;
  recentUploads: Video[];
  categoryBreakdown: Array<{
    _id: string;
    name: string;
    slug: string;
    youtubeCount: number;
    ownUploadCount: number;
    totalCount: number;
  }>;
}

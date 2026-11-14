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

export function extractYouTubeIds(input: string): { videoId: string; playlistId: string } {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { videoId: trimmed, playlistId: '' };
  }
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const playlistId = url.searchParams.get('list') || '';
    let videoId = url.searchParams.get('v') || '';
    if (!videoId && url.hostname.includes('youtu.be')) {
      videoId = url.pathname.replace('/', '').split('/')[0];
    }
    if (!videoId && url.pathname.includes('/embed/')) {
      videoId = url.pathname.split('/embed/')[1]?.split('/')[0] || '';
    }
    if (!videoId && url.pathname.includes('/shorts/')) {
      videoId = url.pathname.split('/shorts/')[1]?.split('/')[0] || '';
    }
    return { videoId, playlistId };
  } catch {
    return { videoId: '', playlistId: '' };
  }
}

export async function searchYouTube(query: string, maxResults = 12): Promise<YouTubeSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(
        q
      )}&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = (await res.json()) as {
          items?: Array<{
            id?: { videoId?: string };
            snippet?: {
              title?: string;
              channelTitle?: string;
              description?: string;
              publishedAt?: string;
              thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
            };
          }>;
        };
        const items = (json.items || [])
          .filter((item) => item.id?.videoId)
          .map((item) => {
            const vid = item.id!.videoId!;
            return {
              videoId: vid,
              title: item.snippet?.title || 'YouTube Video',
              channel: item.snippet?.channelTitle || 'YouTube',
              thumbnail:
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              duration: '40:00',
              publishedText: item.snippet?.publishedAt?.slice(0, 10) || '',
              viewsText: '',
              description: item.snippet?.description || '',
            };
          });
        if (items.length > 0) return items;
      }
    } catch {
      // Fall through to public YouTube search extraction
    }
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const marker = 'var ytInitialData = ';
    const startIdx = html.indexOf(marker);
    if (startIdx === -1) return [];
    const jsonStart = startIdx + marker.length;
    const endIdx = html.indexOf(';</script>', jsonStart);
    if (endIdx === -1) return [];
    const raw = html.slice(jsonStart, endIdx);
    const data = JSON.parse(raw) as Record<string, unknown>;

    const results: YouTubeSearchResult[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object' || results.length >= maxResults) return;
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      const rec = node as Record<string, unknown>;
      if (rec.videoRenderer && typeof rec.videoRenderer === 'object') {
        const vr = rec.videoRenderer as Record<string, unknown>;
        const videoId = String(vr.videoId || '');
        if (videoId) {
          const titleRuns = (vr.title as { runs?: Array<{ text?: string }> })?.runs || [];
          const title = titleRuns.map((r) => r.text || '').join('') || 'YouTube Video';
          const ownerRuns = (vr.ownerText as { runs?: Array<{ text?: string }> })?.runs || [];
          const channel = ownerRuns.map((r) => r.text || '').join('') || 'YouTube';
          const thumbs = (vr.thumbnail as { thumbnails?: Array<{ url?: string }> })?.thumbnails || [];
          const thumbnail = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          const duration = (vr.lengthText as { simpleText?: string })?.simpleText || '40:00';
          const publishedText = (vr.publishedTimeText as { simpleText?: string })?.simpleText || '';
          const viewsText = (vr.shortViewCountText as { simpleText?: string })?.simpleText || '';
          const descRuns =
            ((vr.detailedMetadataSnippets as Array<{ snippetText?: { runs?: Array<{ text?: string }> } }>)?.[0]
              ?.snippetText?.runs) || [];
          const description = descRuns.map((r) => r.text || '').join('') || `${title} — ${channel}`;

          if (!results.some((r) => r.videoId === videoId)) {
            results.push({
              videoId,
              title,
              channel,
              thumbnail,
              duration,
              publishedText,
              viewsText,
              description,
            });
          }
        }
        return;
      }
      for (const val of Object.values(rec)) {
        walk(val);
      }
    };

    walk(data);
    return results;
  } catch (err) {
    console.warn('YouTube search fetch failed:', (err as Error).message);
    return [];
  }
}

export async function fetchYouTubePlaylist(playlistId: string): Promise<YouTubeSearchResult[]> {
  const id = playlistId.trim();
  if (!id) return [];

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=${encodeURIComponent(
        id
      )}&key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = (await res.json()) as {
          items?: Array<{
            snippet?: {
              title?: string;
              description?: string;
              channelTitle?: string;
              publishedAt?: string;
              resourceId?: { videoId?: string };
              thumbnails?: { high?: { url?: string } };
            };
          }>;
        };
        const items = (json.items || [])
          .filter((item) => item.snippet?.resourceId?.videoId)
          .map((item) => {
            const vid = item.snippet!.resourceId!.videoId!;
            return {
              videoId: vid,
              title: item.snippet?.title || 'Episode',
              channel: item.snippet?.channelTitle || 'YouTube',
              thumbnail: item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              duration: '40:00',
              publishedText: item.snippet?.publishedAt?.slice(0, 10) || '',
              viewsText: '',
              description: item.snippet?.description || '',
            };
          });
        if (items.length > 0) return items;
      }
    } catch {
      // Fallback to official YouTube XML feed
    }
  }

  try {
    const feedRes = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(id)}`);
    if (!feedRes.ok) return [];
    const xml = await feedRes.text();
    const entries = xml.split('<entry>').slice(1);
    const items: YouTubeSearchResult[] = [];
    for (const entry of entries) {
      const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
      const authorMatch = entry.match(/<name>([^<]+)<\/name>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
      const videoId = videoIdMatch?.[1]?.trim() || '';
      if (!videoId) continue;
      items.push({
        videoId,
        title: titleMatch?.[1]?.trim() || 'YouTube Episode',
        channel: authorMatch?.[1]?.trim() || 'YouTube',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: '40:00',
        publishedText: publishedMatch?.[1]?.slice(0, 10) || '',
        viewsText: '',
        description: `Imported from YouTube playlist (${id}).`,
      });
    }
    return items;
  } catch {
    return [];
  }
}

export async function fetchYouTubeSingleInfo(input: string) {
  const { videoId, playlistId } = extractYouTubeIds(input);
  if (!videoId && !playlistId) {
    throw new Error('Could not extract a valid YouTube video or playlist ID.');
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey && videoId) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(
        videoId
      )}&key=${encodeURIComponent(apiKey)}`;
      const ytRes = await fetch(apiUrl);
      if (ytRes.ok) {
        const data = (await ytRes.json()) as {
          items?: Array<{
            snippet: {
              title: string;
              description: string;
              channelTitle: string;
              thumbnails?: { maxres?: { url: string }; high?: { url: string } };
            };
          }>;
        };
        const item = data.items?.[0];
        if (item) {
          return {
            videoId,
            playlistId,
            title: item.snippet.title,
            description: item.snippet.description,
            channel: item.snippet.channelTitle,
            thumbnail:
              item.snippet.thumbnails?.maxres?.url ||
              item.snippet.thumbnails?.high?.url ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          };
        }
      }
    } catch {
      // Fallback to oEmbed
    }
  }

  if (videoId) {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        return {
          videoId,
          playlistId,
          title: data.title || `Pakistani Drama Episode (${videoId})`,
          description: `Official YouTube stream published via ${data.author_name || 'YouTube'}.`,
          channel: data.author_name || 'HUM TV',
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    } catch {
      // Fallback below
    }
  }

  return {
    videoId,
    playlistId,
    title: playlistId ? `YouTube Drama Playlist (${playlistId})` : `YouTube Drama Video (${videoId})`,
    description: 'Fetched YouTube reference ready for editorial metadata assignment.',
    channel: 'HUM TV',
    thumbnail: videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : '/src/assets/images/hero_lahore_mansion_1794630972170.jpg',
  };
}

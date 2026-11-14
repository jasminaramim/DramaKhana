import { useEffect, useState } from 'react';
import type { Channel, Drama } from '../types';
import { api } from '../lib/api';
import { DramaCard } from '../components/MediaCards';

interface ChannelsPageProps {
  watchlistIds: string[];
  onNavigate: (path: string) => void;
  onToggleWatchlist: (dramaId: string) => void;
}

export function ChannelsPage({ watchlistIds, onNavigate, onToggleWatchlist }: ChannelsPageProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ channels: Channel[] }>('/api/channels'),
      api.get<{ dramas: Drama[] }>('/api/dramas'),
    ])
      .then(([chRes, dRes]) => {
        setChannels(chRes.channels);
        setDramas(dRes.dramas);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredDramas = selectedChannel
    ? dramas.filter((d) => d.channel === selectedChannel)
    : dramas;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold text-white">Pakistani Broadcast Channels</h1>
        <p className="text-sm text-white/65 mt-1">
          Browse flagship drama serials from Pakistan’s most beloved television networks.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-[#1A211D] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {channels.map((ch) => {
              const active = selectedChannel === ch.name;
              const count = dramas.filter((d) => d.channel === ch.name).length;
              return (
                <button
                  key={ch._id}
                  type="button"
                  onClick={() => setSelectedChannel(active ? '' : ch.name)}
                  className={`p-5 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#087F5B]/20 border-[#087F5B]'
                      : 'bg-[#1A211D] border-white/10 hover:border-[#D4AF6A]/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold tracking-wider text-white"
                      style={{ backgroundColor: ch.accentColor || '#087F5B' }}
                    >
                      {ch.logo}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-white/60">
                      {count} {count === 1 ? 'Serial' : 'Serials'}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-white">{ch.name}</h2>
                  <p className="text-xs text-white/65 mt-1 line-clamp-2">{ch.description}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl font-semibold text-white">
              {selectedChannel ? `${selectedChannel} Serials` : 'All Network Serials'}
            </h2>
            {selectedChannel && (
              <button
                type="button"
                onClick={() => setSelectedChannel('')}
                className="text-xs font-medium text-[#D4AF6A] hover:underline cursor-pointer"
              >
                Show All Channels
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {filteredDramas.map((d) => (
              <DramaCard
                key={d._id}
                drama={d}
                onSelect={(slug) => onNavigate(`/drama/${slug}`)}
                inWatchlist={watchlistIds.includes(d._id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

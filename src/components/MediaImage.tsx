import { useState } from 'react';
import { Film } from 'lucide-react';

interface MediaImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function MediaImage({ src, alt, className = '', fallbackTitle }: MediaImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1A211D] via-[#12221B] to-[#261118] text-center p-4 select-none ${className}`}
        aria-label={alt}
      >
        <Film className="w-7 h-7 text-[#D4AF6A]/60 mb-2" />
        <span className="font-display text-sm text-[#D4AF6A]/90 line-clamp-2 max-w-[18ch]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
}

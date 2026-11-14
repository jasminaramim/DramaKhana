import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  client?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdBanner({
  slot = '1234567890',
  client = 'ca-pub-0000000000000000',
  format = 'auto',
  className = '',
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch {
      // AdSense push error or adblocker suppression handled gracefully
    }
  }, []);

  const isConfigured = client !== 'ca-pub-0000000000000000';

  return (
    <div className={`w-full max-w-[1440px] mx-auto px-4 sm:px-8 my-6 ${className}`}>
      <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#0F1411] border border-white/8 text-center overflow-hidden">
        {/* Google AdSense Required Label */}
        <span className="text-[10px] font-mono tracking-widest uppercase text-white/35 mb-2 select-none">
          Advertisement
        </span>

        {isConfigured ? (
          <ins
            ref={adRef}
            className="adsbygoogle block w-full min-h-[90px]"
            style={{ display: 'block' }}
            data-ad-client={client}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        ) : (
          <div className="w-full min-h-[90px] rounded-xl border border-dashed border-[#D4AF6A]/25 bg-[#141C18]/60 flex flex-col items-center justify-center p-4">
            <span className="text-xs font-semibold text-[#D4AF6A]/80 tracking-wide uppercase">
              Google AdSense Placement Slot
            </span>
            <p className="text-[11px] text-white/50 mt-1 max-w-md">
              Ad space reserved for Google AdSense monetization. Automatically activates upon adding your <code className="text-[#48d597] font-mono">ca-pub-XXXX</code> ID in <code className="text-white/70">index.html</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

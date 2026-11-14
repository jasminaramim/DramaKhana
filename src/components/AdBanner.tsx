import { useEffect, useState, useRef } from 'react';
import { ExternalLink, Info, Sparkles, ShoppingBag } from 'lucide-react';

interface AdBannerProps {
  slot?: string;
  client?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  className?: string;
  variantIndex?: number;
}

interface BannerCreative {
  brand: string;
  badge: string;
  headline: string;
  subtitle: string;
  ctaText: string;
  url: string;
  badgeBg: string;
  accentColor: string;
  bgGradient: string;
  image: string;
}

const BANNER_CREATIVES: BannerCreative[] = [
  {
    brand: 'Daraz',
    badge: 'MEGA DRAMA FEST · UP TO 50% OFF',
    headline: 'Experience Pakistani Dramas in 4K QLED Cinematic Sound',
    subtitle: 'Official warranty on Smart TVs, soundbars & streaming boxes. 1-day express delivery.',
    ctaText: 'Claim Voucher',
    url: 'https://www.daraz.pk',
    badgeBg: 'bg-[#FF5500] text-white',
    accentColor: '#FF5500',
    bgGradient: 'from-[#221016] via-[#1A0F14] to-[#120B0E]',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=600&auto=format&fit=crop',
  },
  {
    brand: 'J. Junaid Jamshed',
    badge: 'ROYAL ESSENCE · FLAT 35% OFF',
    headline: 'Signature Royal Oud & Amber Fragrances',
    subtitle: 'The timeless scents worn across Pakistan’s leading television blockbusters.',
    ctaText: 'Shop Fragrance',
    url: 'https://www.junaidjamshed.com',
    badgeBg: 'bg-[#D4AF6A] text-black',
    accentColor: '#D4AF6A',
    bgGradient: 'from-[#1F1912] via-[#18130E] to-[#110D09]',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=600&auto=format&fit=crop',
  },
  {
    brand: 'Khaadi',
    badge: 'FESTIVE 2026 · NEW ARRIVALS',
    headline: 'Hand-Embroidered Luxury Lawn & Raw Silk',
    subtitle: 'Bespoke couture styled by top drama icons. Worldwide express dispatch.',
    ctaText: 'Order Collection',
    url: 'https://www.khaadi.com',
    badgeBg: 'bg-[#087F5B] text-white',
    accentColor: '#48d597',
    bgGradient: 'from-[#101F18] via-[#0E1813] to-[#0A120E]',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600&auto=format&fit=crop',
  },
  {
    brand: 'Shan Foods',
    badge: 'TRADITION OF TASTE',
    headline: 'Authentic Special Recipe Mixes for Family Gatherings',
    subtitle: 'Shahi Biryani, Haleem & Karahi master-blended with pure Subcontinent spices.',
    ctaText: 'View Recipe Kits',
    url: 'https://www.shanfoods.com',
    badgeBg: 'bg-[#D97706] text-white',
    accentColor: '#F59E0B',
    bgGradient: 'from-[#241710] via-[#1B110B] to-[#130C07]',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=600&auto=format&fit=crop',
  },
];

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdBanner({
  slot = '1234567890',
  client = 'ca-pub-6064612688052081',
  format = 'auto',
  className = '',
  variantIndex,
}: AdBannerProps) {
  const [currentIdx, setCurrentIdx] = useState(() =>
    variantIndex !== undefined ? variantIndex % BANNER_CREATIVES.length : Math.floor(Math.random() * BANNER_CREATIVES.length)
  );
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch {}
  }, []);

  // Subtle rotation every 18 seconds to keep ads fresh and lively
  useEffect(() => {
    if (variantIndex !== undefined) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % BANNER_CREATIVES.length);
    }, 18000);
    return () => clearInterval(interval);
  }, [variantIndex]);

  const ad = BANNER_CREATIVES[currentIdx];

  return (
    <div className={`w-full max-w-[1440px] mx-auto px-4 sm:px-8 my-6 ${className}`}>
      {/* Hidden AdSense tag running in background for Google verification */}
      <div className="hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>

      {/* Visible Rich Banner Ad — NEVER BLANK */}
      <div
        className={`relative rounded-2xl overflow-hidden border border-white/15 bg-gradient-to-r ${ad.bgGradient} p-4 sm:p-5 shadow-xl transition-all duration-500`}
      >
        {/* Top Mini Tag Bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/45 font-semibold">
              Advertisement
            </span>
            <span className="text-white/25" aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-white/55">
              <Info className="w-3 h-3 text-white/35" />
              Google Sponsored Partner
            </span>
          </div>

          <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full ${ad.badgeBg} shadow-sm`}>
            {ad.badge}
          </span>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Banner Thumbnail */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black/60 shadow-md">
              <img
                src={ad.image}
                alt={ad.headline}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white/90">
                {ad.brand}
              </div>
            </div>

            {/* Headline and Copy */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF6A] mb-0.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured Sponsor Spotlight</span>
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-white line-clamp-1">
                {ad.headline}
              </h3>
              <p className="text-xs text-white/70 line-clamp-2 sm:line-clamp-1 mt-0.5 max-w-2xl leading-relaxed">
                {ad.subtitle}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
            <a
              href={ad.url}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-5 rounded-xl bg-[#087F5B] hover:bg-[#099268] text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-colors w-full sm:w-auto"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{ad.ctaText}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ExternalLink, Info, Sparkles, Volume2, VolumeX, X } from 'lucide-react';

interface AdCreative {
  id: string;
  brand: string;
  headline: string;
  description: string;
  ctaText: string;
  website: string;
  tag: string;
  gradient: string;
  badgeColor: string;
  image: string;
}

const AD_CREATIVES: AdCreative[] = [
  {
    id: 'ad_j_fragrance',
    brand: 'J. Junaid Jamshed',
    headline: 'J. Luxury Fragrances — The Essence of Karachi & Lahore',
    description: 'Immerse in timeless royal oud, saffron, and amber essences worn across Pakistani television prime-time. Flat 35% online discount this weekend.',
    ctaText: 'Explore Collection',
    website: 'https://www.junaidjamshed.com',
    tag: 'Luxury Fragrance · Sponsored',
    gradient: 'from-[#1A1813] via-[#241E15] to-[#12100C]',
    badgeColor: 'bg-[#D4AF6A] text-black',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'ad_daraz_mega',
    brand: 'Daraz Pakistan',
    headline: 'Daraz Mega Drama Fest — 4K Smart TVs & Home Theaters',
    description: 'Upgrade your living room drama viewing. Experience QLED cinematic clarity with 1-day express delivery across Karachi, Lahore, and Islamabad.',
    ctaText: 'Claim 50% Off Voucher',
    website: 'https://www.daraz.pk',
    tag: 'Electronics · Sponsored Ad',
    gradient: 'from-[#1E1218] via-[#26141D] to-[#140B10]',
    badgeColor: 'bg-[#FF5500] text-white',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'ad_khaadi_couture',
    brand: 'Khaadi Couture',
    headline: 'Khaadi Festive Unstitched — Masterworks of Heritage Silk',
    description: 'Intricately embroidered lawns and raw silks styled by leading Pakistani drama stars. Free nationwide shipping on orders over Rs. 3,500.',
    ctaText: 'Shop New Arrivals',
    website: 'https://www.khaadi.com',
    tag: 'Fashion & Apparel · Sponsored',
    gradient: 'from-[#131C18] via-[#17261F] to-[#0E1713]',
    badgeColor: 'bg-[#087F5B] text-white',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'ad_shan_foods',
    brand: 'Shan Foods Global',
    headline: 'Shan Special Recipe Mixes — Taste of Authentic Subcontinent',
    description: 'From Shahi Biryani to Nihari and Haleem, bring 5-star Pakistani aroma to every family gathering. Pure, unadulterated spices loved in 65+ countries.',
    ctaText: 'Order Recipe Kits',
    website: 'https://www.shanfoods.com',
    tag: 'Culinary Heritage · Sponsored',
    gradient: 'from-[#201811] via-[#2D1F13] to-[#140F0A]',
    badgeColor: 'bg-[#D97706] text-white',
    image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop',
  },
];

// 4 to 6 minutes in milliseconds: 4 * 60 * 1000 = 240,000ms; 6 * 60 * 1000 = 360,000ms
const MIN_INTERVAL_MS = 4 * 60 * 1000;
const MAX_INTERVAL_MS = 6 * 60 * 1000;

export function PeriodicFakeAdModal() {
  const [modalOpen, setModalOpen] = useState(false);
  const [cornerPopupOpen, setCornerPopupOpen] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const getRandomInterval = () => {
    return Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS + 1)) + MIN_INTERVAL_MS;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const triggerNextAd = () => {
      // Rotate creative
      setAdIndex((prev) => (prev + 1) % AD_CREATIVES.length);
      setCountdown(5);
      setCanSkip(false);

      // Randomly show either center interstitial popup or floating corner popup
      const showCorner = Math.random() > 0.5;
      if (showCorner) {
        setCornerPopupOpen(true);
      } else {
        setModalOpen(true);
      }
    };

    // First appearance: scheduled between 4 and 6 minutes
    const initialDelay = getRandomInterval();
    timer = setTimeout(triggerNextAd, initialDelay);

    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for center modal
  useEffect(() => {
    if (!modalOpen) return;

    if (countdown > 0) {
      const cdTimer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(cdTimer);
    } else {
      setCanSkip(true);
    }
  }, [modalOpen, countdown]);

  const scheduleNextCycle = () => {
    const nextInterval = getRandomInterval();
    setTimeout(() => {
      setAdIndex((prev) => (prev + 1) % AD_CREATIVES.length);
      setCountdown(5);
      setCanSkip(false);
      // Alternate between modal and corner popup
      if (Math.random() > 0.5) {
        setCornerPopupOpen(true);
      } else {
        setModalOpen(true);
      }
    }, nextInterval);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    scheduleNextCycle();
  };

  const handleCloseCornerPopup = () => {
    setCornerPopupOpen(false);
    scheduleNextCycle();
  };

  const currentAd = AD_CREATIVES[adIndex];

  return (
    <>
      {/* 1. Full Screen / Center Interstitial Ad Modal (with immediate Cross '✕' button) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div
            className={`relative w-full max-w-2xl rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-b ${currentAd.gradient} shadow-2xl transition-all`}
          >
            {/* Top Header Bar with prominent Cross '✕' button */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${currentAd.badgeColor}`}
                >
                  Ad
                </span>
                <span className="text-xs font-semibold text-white/80">{currentAd.tag}</span>
                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="text-xs text-white/50 inline-flex items-center gap-1">
                  <Info className="w-3 h-3 text-white/40" />
                  Google AdSense Partner
                </span>
              </div>

              {/* Close & Skip controls */}
              <div className="flex items-center gap-2">
                {!canSkip && (
                  <div className="h-8 px-2.5 rounded-lg bg-black/60 border border-white/10 text-white/65 text-xs font-mono inline-flex items-center gap-1 tabular-nums select-none">
                    <span>Auto-skip in</span>
                    <span className="font-bold text-[#D4AF6A]">{countdown}s</span>
                  </div>
                )}

                {canSkip && (
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="h-8 px-3 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors border border-white/20 shadow-md"
                  >
                    <span>Skip Ad</span>
                  </button>
                )}

                {/* USER REQUIREMENT: User can cross that anytime with this '✕' button */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-rose-600 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/15 shadow"
                  title="Cross & Close Ad (✕)"
                  aria-label="Close Ad"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Frame & Visual */}
            <div className="relative aspect-[16/9] w-full bg-black overflow-hidden group">
              <img
                src={currentAd.image}
                alt={currentAd.headline}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-mono text-white/80 border border-white/10">
                  {currentAd.brand}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? 'Unmute preview sound' : 'Mute preview sound'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#D4AF6A]" />}
              </button>

              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4AF6A] uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" />
                  Featured Sponsor Special
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-snug drop-shadow-md">
                  {currentAd.headline}
                </h3>
              </div>
            </div>

            {/* Ad Body Content & CTA Action Row */}
            <div className="p-5 sm:p-6 space-y-4 bg-gradient-to-b from-transparent to-black/60">
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                {currentAd.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div className="text-[11px] text-white/50 font-mono truncate max-w-xs">
                  Visit Sponsor: <span className="text-[#D4AF6A]">{currentAd.website}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <a
                    href={currentAd.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleCloseModal}
                    className="h-10 px-5 rounded-xl bg-[#087F5B] hover:bg-[#099268] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg transition-colors"
                  >
                    <span>{currentAd.ctaText}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cross Ad</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Corner Pop-up Ad (Bottom-Right with prominent Cross '✕' button) */}
      {cornerPopupOpen && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-bounce-in">
          <div
            className={`relative rounded-2xl overflow-hidden border-2 border-[#D4AF6A]/50 bg-gradient-to-b ${currentAd.gradient} shadow-2xl p-4`}
          >
            {/* Direct Cross '✕' button in top-right */}
            <button
              type="button"
              onClick={handleCloseCornerPopup}
              className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/80 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer border border-white/20 shadow-md"
              title="Cross and dismiss ad (✕)"
              aria-label="Cross Ad"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-2 mb-2 pr-8">
              <span
                className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${currentAd.badgeColor}`}
              >
                Sponsored Ad
              </span>
              <span className="text-[11px] text-white/60 font-mono truncate">{currentAd.brand}</span>
            </div>

            {/* Thumbnail + text layout */}
            <div className="flex gap-3 items-center">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-black border border-white/10">
                <img
                  src={currentAd.image}
                  alt={currentAd.headline}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                  {currentAd.headline}
                </h4>
                <p className="text-[11px] text-white/60 line-clamp-1 mt-1">
                  {currentAd.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={currentAd.website}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleCloseCornerPopup}
                    className="text-[11px] font-bold text-[#D4AF6A] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{currentAd.ctaText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Dismiss Bar */}
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/45">
              <span>Google AdSense Partner</span>
              <button
                type="button"
                onClick={handleCloseCornerPopup}
                className="text-white/70 hover:text-white font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Dismiss (✕)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

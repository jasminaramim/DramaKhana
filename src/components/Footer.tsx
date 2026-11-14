import { ShieldCheck, Mail, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0D110F]">
      <div className="jali-divider w-full" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand Column */}
        <div className="space-y-4">
          <span className="font-display text-2xl font-bold text-white block">
            Drama<span className="text-[#D4AF6A]">Khana</span>
          </span>
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-sm">
            A premier Pakistani drama streaming sanctuary uniting classic broadcast serials, official YouTube releases, and curated studio uploads.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#087F5B]/20 border border-[#087F5B]/40 text-[#48d597] text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Google Publisher & AdSense Ready</span>
          </div>
        </div>

        {/* Column 2: Browse & Discover */}
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
          <span className="text-xs font-semibold text-[#D4AF6A] tracking-wider uppercase mb-1">
            Browse Library
          </span>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="text-left text-white/65 hover:text-white transition-colors cursor-pointer"
          >
            Home Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/explore')}
            className="text-left text-white/65 hover:text-white transition-colors cursor-pointer"
          >
            Explore All Dramas
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/categories')}
            className="text-left text-white/65 hover:text-white transition-colors cursor-pointer"
          >
            Browse Categories
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/channels')}
            className="text-left text-white/65 hover:text-white transition-colors cursor-pointer"
          >
            Pakistani TV Channels
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/watchlist')}
            className="text-left text-white/65 hover:text-white transition-colors cursor-pointer"
          >
            My Saved Watchlist
          </button>
        </div>

        {/* Column 3: About, Legal & Policies (User Requirement for Google Ads) */}
        <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
          <span className="text-xs font-semibold text-[#D4AF6A] tracking-wider uppercase mb-1">
            Company & Policies
          </span>
          <button
            type="button"
            onClick={() => onNavigate('/about')}
            className="text-left text-white/75 hover:text-[#D4AF6A] transition-colors cursor-pointer font-medium"
          >
            About Us
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/privacy')}
            className="text-left text-white/75 hover:text-[#D4AF6A] transition-colors cursor-pointer font-medium"
          >
            Privacy Policy (GDPR / CCPA)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/contact')}
            className="text-left text-white/75 hover:text-[#D4AF6A] transition-colors cursor-pointer font-medium"
          >
            Contact Us & Support
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/terms')}
            className="text-left text-white/65 hover:text-white transition-colors cursor-pointer"
          >
            Terms of Service & DMCA
          </button>
          <a
            href="/ads.txt"
            target="_blank"
            rel="noreferrer"
            className="text-left text-white/50 hover:text-white/80 transition-colors text-[11px] font-mono"
          >
            ads.txt Authorization
          </a>
        </div>

        {/* Column 4: Networks & Credits */}
        <div className="flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
              Official Network Catalog
            </span>
            <p className="text-xs text-white/55 leading-relaxed">
              Featuring verified broadcasts from ARY Digital, HUM TV, Har Pal Geo, and Green Entertainment networks.
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-1.5">
            <p className="text-xs text-white/60">
              Developed with <Heart className="w-3.5 h-3.5 inline text-rose-500 fill-current mx-0.5" /> by{' '}
              <a
                href="https://jasmin-v01.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D4AF6A] hover:text-[#f3d08c] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              >
                Jasmin
              </a>
            </p>
            <p className="text-[11px] text-white/40">
              © {new Date().getFullYear()} DramaKhana. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

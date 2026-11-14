interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#0D110F]">
      <div className="jali-divider w-full" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <span className="font-display text-2xl font-bold text-white">
            Drama<span className="text-[#D4AF6A]">Khana</span>
          </span>
          <p className="text-sm text-white/60 mt-3 max-w-sm leading-relaxed">
            A dedicated Pakistani drama streaming sanctuary uniting classic broadcast serials, official YouTube releases, and curated studio uploads.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-[#D4AF6A]">Browse</span>
            <button type="button" onClick={() => onNavigate('/')} className="text-left text-white/65 hover:text-white cursor-pointer">
              Home
            </button>
            <button type="button" onClick={() => onNavigate('/explore')} className="text-left text-white/65 hover:text-white cursor-pointer">
              Explore Library
            </button>
            <button type="button" onClick={() => onNavigate('/categories')} className="text-left text-white/65 hover:text-white cursor-pointer">
              Categories
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-[#D4AF6A]">Networks</span>
            <button type="button" onClick={() => onNavigate('/channels')} className="text-left text-white/65 hover:text-white cursor-pointer">
              Pakistani Channels
            </button>
            <button type="button" onClick={() => onNavigate('/search')} className="text-left text-white/65 hover:text-white cursor-pointer">
              Global Search
            </button>
            <button type="button" onClick={() => onNavigate('/watchlist')} className="text-left text-white/65 hover:text-white cursor-pointer">
              My Watchlist
            </button>
          </div>
        </div>

        <div className="md:text-right flex flex-col justify-between gap-4">
          <p className="text-xs text-white/55">
            Featuring HUM TV, ARY Digital, Geo Entertainment, and Green Entertainment catalogs.
          </p>
          <div className="flex flex-col md:items-end gap-1">
            <p className="text-xs text-white/50">
              Developed by{' '}
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
              © {new Date().getFullYear()} DramaKhana. Crafted for Pakistani Storytelling.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

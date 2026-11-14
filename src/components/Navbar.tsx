import { useState } from 'react';
import { Menu, Search, Shield, User as UserIcon, X, LogOut, Bookmark } from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  currentPath: string;
  user: User | null;
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Navbar({ currentPath, user, onNavigate, onOpenAuth, onLogout }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Explore', path: '/explore' },
    { label: 'Categories', path: '/categories' },
    { label: 'Channels', path: '/channels' },
    { label: 'Watchlist', path: '/watchlist' },
  ];

  const handleLink = (path: string) => {
    setMobileOpen(false);
    setMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#101512]/85 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLink('/');
          }}
          className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span>Drama</span>
          <span className="text-[#D4AF6A]">Khana</span>
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
          {navItems.map((item) => {
            const active =
              item.path === '/'
                ? currentPath === '/'
                : currentPath === item.path || currentPath.startsWith(`${item.path}/`);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(item.path);
                }}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                  active ? 'text-[#D4AF6A]' : 'text-white/75 hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[#087F5B] rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Search + Single Primary Account/Admin Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLink('/search')}
            aria-label="Search dramas and episodes"
            className="h-10 px-3 flex items-center gap-2 rounded-lg bg-[#1A211D] border border-white/10 text-white/80 hover:text-white hover:border-[#D4AF6A]/40 transition-colors text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4 text-[#D4AF6A]" />
            <span className="hidden sm:inline">Search</span>
          </button>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="h-10 px-3.5 flex items-center gap-2 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <UserIcon className="w-4 h-4" />
                <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#1A211D] border border-white/12 shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-white/55 truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLink('/watchlist')}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-white/85 hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Bookmark className="w-4 h-4 text-[#D4AF6A]" />
                    My Watchlist
                  </button>
                  {user.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleLink('/admin')}
                      className="w-full px-4 py-2.5 text-left text-xs font-medium text-[#D4AF6A] hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                      Admin Studio
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-300 hover:bg-white/5 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="h-10 px-4 rounded-lg bg-[#087F5B] hover:bg-[#099268] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-[#1A211D] border border-white/10 text-white cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-[#101512] border-t border-white/10 px-4 py-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleLink(item.path)}
              className={`min-h-[44px] px-3 rounded-lg text-left text-sm font-medium transition-colors ${
                currentPath === item.path ? 'bg-[#087F5B]/20 text-[#D4AF6A]' : 'text-white/80 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={() => handleLink('/admin')}
              className="min-h-[44px] px-3 rounded-lg text-left text-sm font-medium text-[#D4AF6A] hover:bg-white/5"
            >
              Admin Studio
            </button>
          )}
        </div>
      )}
    </header>
  );
}

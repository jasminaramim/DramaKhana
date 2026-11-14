/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import type { User } from './types';
import { api, getToken, setToken } from './lib/api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { SearchPage } from './pages/SearchPage';
import { DramaDetailPage } from './pages/DramaDetailPage';
import { WatchPage } from './pages/WatchPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AboutUsPage } from './pages/AboutUsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { ContactUsPage } from './pages/ContactUsPage';
import { TermsPage } from './pages/TermsPage';
import { PeriodicFakeAdModal } from './components/PeriodicFakeAdModal';

export default function App() {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');
  const [user, setUser] = useState<User | null>(null);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [authOpen, setAuthOpen] = useState(false);

  const navigate = (nextPath: string) => {
    if (nextPath !== window.location.pathname) {
      window.history.pushState({}, '', nextPath);
    }
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api
      .get<{ user: User }>('/api/auth/me')
      .then((res) => {
        setUser(res.user);
        setWatchlistIds(res.user.watchlist || []);
      })
      .catch(() => {
        setToken(null);
      });
  }, []);

  const handleAuthSuccess = (nextUser: User | null) => {
    setUser(nextUser);
    setWatchlistIds(nextUser?.watchlist || []);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setWatchlistIds([]);
    if (path.startsWith('/admin')) {
      navigate('/');
    }
  };

  const handleToggleWatchlist = async (dramaId: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const exists = watchlistIds.includes(dramaId);
    try {
      const res = exists
        ? await api.delete<{ watchlist: string[] }>(`/api/watchlist/${dramaId}`)
        : await api.post<{ watchlist: string[] }>(`/api/watchlist/${dramaId}`);
      setWatchlistIds(res.watchlist);
    } catch {
      // ignore error
    }
  };

  const routePath = path.split('?')[0];

  // Dedicated Admin Route (/admin) renders its own workspace without public navbar/footer
  if (routePath === '/admin' || routePath.startsWith('/admin/')) {
    return (
      <AdminDashboard
        user={user}
        onUserChange={handleAuthSuccess}
        onNavigate={navigate}
      />
    );
  }

  let view = (
    <HomePage
      watchlistIds={watchlistIds}
      onNavigate={navigate}
      onToggleWatchlist={handleToggleWatchlist}
    />
  );

  if (routePath === '/explore') {
    view = (
      <ExplorePage
        watchlistIds={watchlistIds}
        onNavigate={navigate}
        onToggleWatchlist={handleToggleWatchlist}
      />
    );
  } else if (routePath === '/categories') {
    view = <CategoriesPage onNavigate={navigate} />;
  } else if (routePath.startsWith('/categories/')) {
    const slug = routePath.replace('/categories/', '').split('/')[0];
    view = <CategoriesPage slug={slug} onNavigate={navigate} />;
  } else if (routePath === '/channels') {
    view = (
      <ChannelsPage
        watchlistIds={watchlistIds}
        onNavigate={navigate}
        onToggleWatchlist={handleToggleWatchlist}
      />
    );
  } else if (routePath === '/search') {
    view = (
      <SearchPage
        user={user}
        watchlistIds={watchlistIds}
        onNavigate={navigate}
        onToggleWatchlist={handleToggleWatchlist}
      />
    );
  } else if (routePath === '/watchlist') {
    view = (
      <WatchlistPage
        user={user}
        watchlistIds={watchlistIds}
        onNavigate={navigate}
        onToggleWatchlist={handleToggleWatchlist}
        onOpenAuth={() => setAuthOpen(true)}
      />
    );
  } else if (routePath.startsWith('/drama/')) {
    const slug = routePath.replace('/drama/', '').split('/')[0];
    view = (
      <DramaDetailPage
        slug={slug}
        watchlistIds={watchlistIds}
        onNavigate={navigate}
        onToggleWatchlist={handleToggleWatchlist}
      />
    );
  } else if (routePath.startsWith('/watch/')) {
    const videoId = decodeURIComponent(routePath.replace('/watch/', '').split('/')[0]);
    view = (
      <WatchPage
        videoId={videoId}
        watchlistIds={watchlistIds}
        onNavigate={navigate}
        onToggleWatchlist={handleToggleWatchlist}
      />
    );
  } else if (routePath === '/about' || routePath === '/about-us') {
    view = <AboutUsPage onNavigate={navigate} />;
  } else if (routePath === '/privacy' || routePath === '/privacy-policy') {
    view = <PrivacyPolicyPage onNavigate={navigate} />;
  } else if (routePath === '/contact' || routePath === '/contact-us') {
    view = <ContactUsPage onNavigate={navigate} />;
  } else if (routePath === '/terms' || routePath === '/terms-of-service') {
    view = <TermsPage onNavigate={navigate} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#101512] text-white">
      <Navbar
        currentPath={routePath}
        user={user}
        onNavigate={navigate}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1">{view}</main>

      <Footer onNavigate={navigate} />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Periodic Interstitial Ad: surfaces every 4-6 minutes */}
      <PeriodicFakeAdModal />
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/contexts/i18nContext';
import { useCart } from '@/contexts/CartContext';
import {
  Music2, Search, ChevronDown, LogOut, LayoutDashboard, ShieldCheck,
  Wallet, Plus, Globe, Briefcase, Package, Radio, ListMusic,
  Users, BookOpen, Upload, Video, TrendingUp, LifeBuoy, Crown, ShoppingBag,
  MapPin, Guitar
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Logo from '@/components/Logo';
import NotificationCenter from '@/components/NotificationCenter';
import CartDrawer from '@/components/CartDrawer';

const EXPLORE_ITEMS = [
  { label: 'Beatler', href: '/beats', icon: Music2, desc: 'Tüm beat ve samplelar' },
  { label: 'Sound Packs', href: '/beats?type=pack', icon: Package, desc: 'Drum kits ve loop paketleri' },
  { label: 'Servisler', href: '/gigs', icon: Briefcase, desc: 'Freelance müzik hizmetleri' },
  { label: 'Stüdyo Kirala', href: '/studios', icon: MapPin, desc: 'Kayıt stüdyosu rezervasyonu' },
  { label: 'Gear Market', href: '/gear', icon: Guitar, desc: 'İkinci el müzik aletleri' },
  { label: 'Playlist', href: '/playlists', icon: ListMusic, desc: 'Küratörlü playlistler' },
  { label: 'Studio Feed', href: '/feed', icon: Radio, desc: 'Prodüktör topluluğu' },
  { label: 'İş Talepleri', href: '/jobs', icon: Users, desc: 'Proje talep panosu' },
  { label: 'Blog', href: '/blog', icon: BookOpen, desc: 'Prodüksiyon rehberleri' },
];

const CREATE_ITEMS = [
  { label: 'Beat Yükle', href: '/beats/upload', icon: Upload, roles: ['producer', 'admin'] },
  { label: 'Gig Oluştur', href: '/gigs/create', icon: Briefcase, roles: ['producer', 'engineer', 'designer', 'artist', 'admin'] },
  { label: 'Canlı Oda', href: '/liveroom', icon: Video, roles: null },
  { label: 'Blog Yaz', href: '/blog/create', icon: BookOpen, roles: ['admin'] },
];

const SEARCH_CATEGORIES = ['Beatler', 'Servisler', 'Prodüktörler', 'Sound Packs'];

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useI18n();
  const { count: cartCount, setIsOpen: openCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [searchCat, setSearchCat] = useState('Beatler');
  const [showSearchCatDrop, setShowSearchCatDrop] = useState(false);

  const handleSearch = () => {
    if (!search.trim()) return;
    const routes = { Beatler: '/beats', Servisler: '/gigs', 'Prodüktörler': '/beats', 'Sound Packs': '/beats' };
    navigate(`${routes[searchCat] || '/beats'}?search=${encodeURIComponent(search)}`);
  };

  const getRoleBadge = (role) => {
    const colors = { admin: '#ec4899', producer: '#8b5cf6', artist: '#10b981', engineer: '#f59e0b', designer: '#06b6d4', buyer: '#a1a1aa' };
    return colors[role] || '#a1a1aa';
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0d0d0f]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo — bigger brand identifier */}
          <Link to="/" className="flex-shrink-0 mr-1" data-testid="nav-logo">
            <Logo size="lg" showText textSize="md" glow />
          </Link>

          {/* Explore dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-colors" data-testid="explore-dropdown">
                Keşfet <ChevronDown size={13} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-[#141416] border-white/10 text-white p-2">
              {EXPLORE_ITEMS.map(item => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className="cursor-pointer hover:bg-white/5 rounded-md p-2 flex items-start gap-3 mb-0.5"
                    data-testid={`explore-${item.label}`}
                  >
                    <div className="w-7 h-7 rounded-md bg-[#8b5cf6]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={13} className="text-[#8b5cf6]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white leading-tight">{item.label}</p>
                      <p className="text-[11px] text-[#a1a1aa] leading-tight">{item.desc}</p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create dropdown — only for sellers */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-colors" data-testid="create-dropdown">
                  Oluştur <ChevronDown size={13} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-[#141416] border-white/10 text-white">
                {CREATE_ITEMS.filter(i => !i.roles || i.roles.includes(user.role)).map(item => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)} className="cursor-pointer hover:bg-white/5">
                      <Icon size={14} className="mr-2 text-[#8b5cf6]" /> {item.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Search bar with category selector */}
          <div className="flex-1 max-w-lg hidden md:flex items-center gap-0">
            {/* Category dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSearchCatDrop(s => !s)}
                className="flex items-center gap-1 h-9 px-3 bg-[#1a1a1f] border border-white/10 border-r-0 rounded-l-md text-xs text-[#a1a1aa] hover:text-white transition-colors"
                data-testid="search-category-btn"
              >
                {searchCat} <ChevronDown size={10} />
              </button>
              {showSearchCatDrop && (
                <div className="absolute top-10 left-0 bg-[#141416] border border-white/10 rounded-md shadow-lg z-50 py-1 min-w-[130px]">
                  {SEARCH_CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setSearchCat(cat); setShowSearchCatDrop(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-colors">
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Search input */}
            <input
              type="text"
              placeholder={`${searchCat} ara...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 h-9 px-3 bg-[#0d0d0f] border border-white/10 text-sm text-white outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-colors"
              data-testid="navbar-search"
            />
            <button
              onClick={handleSearch}
              className="h-9 px-3 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-r-md transition-all flex items-center"
            >
              <Search size={14} />
            </button>
          </div>

          {/* Right section */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* Language toggle only — Dark mode is permanent */}
            <button onClick={toggleLocale} className="px-2 py-1 rounded-md text-[#a1a1aa] hover:text-white hover:bg-white/5 text-xs font-mono transition-colors" data-testid="lang-toggle-btn">
              <Globe size={13} className="inline mr-1" />{locale}
            </button>

            {user ? (
              <>
                {/* Start Selling CTA */}
                {['producer', 'engineer', 'designer', 'artist', 'admin'].includes(user.role) && (
                  <button
                    onClick={() => navigate('/beats/upload')}
                    className="hidden sm:flex items-center gap-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-xs font-bold px-3 py-2 rounded-md transition-all hover:shadow-glow uppercase tracking-wide"
                    data-testid="start-selling-btn"
                  >
                    <TrendingUp size={12} /> Sat
                  </button>
                )}

                {/* Cart */}
                <button
                  onClick={() => openCart(true)}
                  className="relative p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-colors"
                  data-testid="cart-btn"
                >
                  <ShoppingBag size={18} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#8b5cf6] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>

                {/* Notifications */}
                <NotificationCenter />

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors" data-testid="nav-user-menu">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `${getRoleBadge(user.role)}20`, border: `1px solid ${getRoleBadge(user.role)}40`, color: getRoleBadge(user.role) }}
                      >
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <ChevronDown size={12} className="text-[#a1a1aa] hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-[#141416] border-white/10 text-white">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs font-mono uppercase" style={{ color: getRoleBadge(user.role) }}>{user.role}</p>
                    </div>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer hover:bg-white/5" data-testid="menu-dashboard">
                      <LayoutDashboard size={14} className="mr-2" /> Panel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/roadmap')} className="cursor-pointer hover:bg-white/5">
                      <Crown size={14} className="mr-2 text-[#f59e0b]" /> Yol Haritam
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer hover:bg-white/5">
                      <ListMusic size={14} className="mr-2" /> Favoriler
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/wallet')} className="cursor-pointer hover:bg-white/5">
                      <Wallet size={14} className="mr-2" /> Cüzdan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/analytics')} className="cursor-pointer hover:bg-white/5">
                      <TrendingUp size={14} className="mr-2" /> Analitik
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/support')} className="cursor-pointer hover:bg-white/5">
                      <LifeBuoy size={14} className="mr-2" /> Destek
                    </DropdownMenuItem>
                    {user.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer hover:bg-white/5 text-[#ec4899]" data-testid="menu-admin">
                          <ShieldCheck size={14} className="mr-2" /> Admin
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={async () => { await logout(); navigate('/'); }} className="cursor-pointer hover:bg-white/5 text-[#a1a1aa]" data-testid="menu-logout">
                      <LogOut size={14} className="mr-2" /> Çıkış
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/auth')} className="text-sm text-[#a1a1aa] hover:text-white transition-colors px-3 py-1.5" data-testid="nav-login-btn">
                  Giriş
                </button>
                <button onClick={() => navigate('/auth?tab=register')} className="text-sm bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-1.5 rounded-md font-semibold transition-all hover:shadow-glow" data-testid="nav-register-btn">
                  Ücretsiz Başla
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <CartDrawer />
    </>
  );
};

export default Navbar;

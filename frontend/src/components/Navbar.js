import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Music, Search, Bell, User, ChevronDown, LogOut,
  LayoutDashboard, ShieldCheck, Wallet, Settings, Plus
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

const NAV_LINKS = [
  { label: 'Beats', href: '/beats' },
  { label: 'Gigs', href: '/gigs' },
  { label: 'AI Coach', href: '/coach' },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');

  const isActive = (href) => location.pathname.startsWith(href);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'text-[#ec4899]', producer: 'text-[#8b5cf6]',
      artist: 'text-[#10b981]', engineer: 'text-[#f59e0b]',
      designer: 'text-[#06b6d4]', buyer: 'text-[#a1a1aa]'
    };
    return colors[role] || 'text-[#a1a1aa]';
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0d0d0f]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-2" data-testid="nav-logo">
          <div className="w-7 h-7 rounded-md bg-[#8b5cf6] flex items-center justify-center glow-purple">
            <Music size={14} className="text-white" />
          </div>
          <span className="font-heading font-bold text-white text-sm tracking-tight hidden sm:block">
            REVERSOUND
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]'
                  : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
              }`}
              data-testid={`nav-link-${link.label.toLowerCase().replace(' ', '-')}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs hidden md:block">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
            <input
              type="text"
              placeholder="Search beats, gigs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && search.trim()) navigate(`/beats?search=${encodeURIComponent(search)}`);
              }}
              className="rs-input pl-9 py-1.5 text-sm h-8"
              data-testid="navbar-search"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {/* Upload / Sell CTA */}
              {['producer', 'engineer', 'designer', 'artist', 'admin'].includes(user.role) && (
                <button
                  onClick={() => navigate(user.role === 'producer' || user.role === 'admin' ? '/beats/upload' : '/gigs/create')}
                  className="hidden sm:flex items-center gap-1.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-medium px-3 py-1.5 rounded-md transition-all hover:shadow-glow"
                  data-testid="nav-sell-btn"
                >
                  <Plus size={14} /> Sell
                </button>
              )}

              {/* Messages */}
              <button
                onClick={() => navigate('/messages')}
                className="p-1.5 rounded-md text-[#a1a1aa] hover:text-white hover:bg-white/5 transition-colors"
                data-testid="nav-messages-btn"
              >
                <Bell size={18} />
              </button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
                    data-testid="nav-user-menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center text-xs font-bold text-[#8b5cf6]">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-sm text-white hidden sm:block max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown size={14} className="text-[#a1a1aa] hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 bg-[#141416] border-white/10 text-white"
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className={`text-xs font-mono uppercase ${getRoleBadge(user.role)}`}>{user.role}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer hover:bg-white/5" data-testid="menu-dashboard">
                    <LayoutDashboard size={14} className="mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wallet')} className="cursor-pointer hover:bg-white/5" data-testid="menu-wallet">
                    <Wallet size={14} className="mr-2" /> Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/messages')} className="cursor-pointer hover:bg-white/5" data-testid="menu-messages">
                    <Bell size={14} className="mr-2" /> Messages
                  </DropdownMenuItem>
                  {user.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer hover:bg-white/5 text-[#ec4899]" data-testid="menu-admin">
                      <ShieldCheck size={14} className="mr-2" /> Admin Portal
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-white/5 text-[#a1a1aa]" data-testid="menu-logout">
                    <LogOut size={14} className="mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/auth')} className="text-sm text-[#a1a1aa] hover:text-white transition-colors px-3 py-1.5" data-testid="nav-login-btn">
                Sign In
              </button>
              <button onClick={() => navigate('/auth?tab=register')} className="text-sm bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-3 py-1.5 rounded-md transition-all hover:shadow-glow" data-testid="nav-register-btn">
                Join Free
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Music2, Briefcase, MessageSquare, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Music2, label: 'Beats', href: '/beats' },
  { icon: Briefcase, label: 'Gigs', href: '/gigs' },
  { icon: MessageSquare, label: 'Messages', href: '/messages' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0f]/80 backdrop-blur-xl border-t border-white/5" data-testid="bottom-nav">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
          const active = location.pathname === href || (href !== '/' && location.pathname.startsWith(href));
          return (
            <button
              key={href}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-md transition-colors ${
                active ? 'text-[#8b5cf6]' : 'text-[#a1a1aa]'
              }`}
              data-testid={`bottom-nav-${label.toLowerCase()}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

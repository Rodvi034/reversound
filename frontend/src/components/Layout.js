import React from 'react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import GlobalPlayer from '@/components/GlobalPlayer';
import SupportWidget from '@/components/SupportWidget';
import { usePlayer } from '@/contexts/PlayerContext';

const Layout = ({ children }) => {
  const { currentBeat } = usePlayer();

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col transition-colors duration-300">
      <Navbar />
      <main
        className="flex-1 main-content"
        style={{ paddingBottom: currentBeat ? '4.5rem' : '0' }}
      >
        {children}
      </main>
      <BottomNav />
      <GlobalPlayer />
      <SupportWidget />
    </div>
  );
};

export default Layout;

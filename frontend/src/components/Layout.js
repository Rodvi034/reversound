import React from 'react';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import GlobalPlayer from '@/components/GlobalPlayer';
import { usePlayer } from '@/contexts/PlayerContext';

const Layout = ({ children }) => {
  const { currentBeat } = usePlayer();

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex flex-col">
      <Navbar />
      <main
        className="flex-1 main-content"
        style={{ paddingBottom: currentBeat ? '4rem' : '0' }}
      >
        {children}
      </main>
      <BottomNav />
      <GlobalPlayer />
    </div>
  );
};

export default Layout;

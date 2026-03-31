import React from 'react';

// Horizontal infinite marquee for partner logos
const PARTNERS = [
  { name: 'Universal Music', letter: 'U' },
  { name: 'Sony Music', letter: 'S' },
  { name: 'Warner Music', letter: 'W' },
  { name: 'Atlantic Records', letter: 'A' },
  { name: 'Columbia Records', letter: 'C' },
  { name: 'Def Jam', letter: 'D' },
  { name: 'Capitol Music', letter: 'C' },
  { name: 'Interscope', letter: 'I' },
  { name: 'Republic Records', letter: 'R' },
  { name: 'Motown', letter: 'M' },
];

const PartnerLogo = ({ name, letter }) => (
  <div className="flex items-center gap-2 flex-shrink-0 px-6 opacity-40 hover:opacity-70 transition-opacity">
    <div
      className="w-8 h-8 rounded-md border border-white/20 flex items-center justify-center text-white font-bold text-sm"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      {letter}
    </div>
    <span className="text-white font-semibold text-sm tracking-wide whitespace-nowrap">{name}</span>
  </div>
);

const MarqueeLogos = ({ speed = 30, reverse = false }) => {
  const doubled = [...PARTNERS, ...PARTNERS];

  return (
    <div className="overflow-hidden py-4">
      <div
        className="flex items-center"
        style={{
          animation: `${reverse ? 'marquee-reverse' : 'marquee'} ${speed}s linear infinite`,
          width: 'max-content',
          willChange: 'transform',
        }}
      >
        {doubled.map((p, i) => (
          <PartnerLogo key={i} {...p} />
        ))}
      </div>
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

// Alternating vertical auto-scroll columns for reference tracks/artists
const TRACKS_COL1 = [
  { title: "Dark Trap Beat", artist: "BeatMakerTR", cover: "https://picsum.photos/seed/t1/200/200" },
  { title: "Lo-Fi Study", artist: "LofiStudio", cover: "https://picsum.photos/seed/t2/200/200" },
  { title: "Berlin Warehouse", artist: "TechnoGod", cover: "https://picsum.photos/seed/t3/200/200" },
  { title: "Summer Pop", artist: "PopKingTR", cover: "https://picsum.photos/seed/t4/200/200" },
  { title: "UK Drill Night", artist: "DrillBoss", cover: "https://picsum.photos/seed/t5/200/200" },
];
const TRACKS_COL2 = [
  { title: "Trap 808 Vol.2", artist: "TrapcStar", cover: "https://picsum.photos/seed/t6/200/200" },
  { title: "Boom Bap Classic", artist: "HipHopHero", cover: "https://picsum.photos/seed/t7/200/200" },
  { title: "R&B Vibes", artist: "SoulMaster", cover: "https://picsum.photos/seed/t8/200/200" },
  { title: "EDM Festival", artist: "EDMKing", cover: "https://picsum.photos/seed/t9/200/200" },
  { title: "Reggaeton Hit", artist: "LatinBeat", cover: "https://picsum.photos/seed/t10/200/200" },
];

const TrackCard = ({ title, artist, cover }) => (
  <div className="relative rounded-lg overflow-hidden flex-shrink-0 w-40 h-52 group cursor-pointer mb-3">
    <img src={cover} alt={title} className="w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-3">
      <p className="text-white font-bold text-xs leading-tight">{title}</p>
      <p className="text-[#a1a1aa] text-[10px]">{artist}</p>
    </div>
  </div>
);

export const AlternatingScroll = ({ duration = 25 }) => {
  const col1Items = [...TRACKS_COL1, ...TRACKS_COL1];
  const col2Items = [...TRACKS_COL2, ...TRACKS_COL2];

  return (
    <div className="flex gap-3 h-80 overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
      {/* Column 1: scrolls up */}
      <div
        className="flex flex-col"
        style={{ animation: `vert-scroll-up ${duration}s linear infinite`, willChange: 'transform' }}
      >
        {col1Items.map((t, i) => <TrackCard key={i} {...t} />)}
      </div>
      {/* Column 2: scrolls down */}
      <div
        className="flex flex-col"
        style={{ animation: `vert-scroll-down ${duration}s linear infinite`, willChange: 'transform', marginTop: '-120px' }}
      >
        {col2Items.map((t, i) => <TrackCard key={i} {...t} />)}
      </div>

      <style>{`
        @keyframes vert-scroll-up {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        @keyframes vert-scroll-down {
          from { transform: translateY(-50%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MarqueeLogos;

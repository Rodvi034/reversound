import React from 'react';

// Skeleton pulse loader for cards
export const SkeletonCard = () => (
  <div className="rs-card p-4 animate-pulse">
    <div className="h-40 bg-white/5 rounded-md mb-4" />
    <div className="h-3 bg-white/5 rounded mb-2 w-3/4" />
    <div className="h-3 bg-white/5 rounded w-1/2" />
  </div>
);

// Skeleton for beat table rows
export const SkeletonBeatRow = () => (
  <div className="flex items-center gap-4 px-4 py-3 border-b border-white/5 animate-pulse">
    <div className="w-5 h-3 bg-white/5 rounded" />
    <div className="w-9 h-9 rounded-full bg-white/5" />
    <div className="w-9 h-9 rounded bg-white/5 hidden sm:block" />
    <div className="flex-1">
      <div className="h-3 bg-white/5 rounded mb-2 w-40" />
      <div className="h-2.5 bg-white/5 rounded w-24" />
    </div>
    <div className="w-14 h-5 bg-white/5 rounded hidden md:block" />
    <div className="w-10 h-5 bg-white/5 rounded hidden md:block" />
    <div className="w-10 h-5 bg-white/5 rounded hidden md:block" />
    <div className="w-16 h-7 bg-white/5 rounded" />
  </div>
);

// Skeleton for post/feed items
export const SkeletonPost = () => (
  <div className="rs-card p-4 animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-full bg-white/5" />
      <div>
        <div className="h-3 bg-white/5 rounded mb-1 w-24" />
        <div className="h-2.5 bg-white/5 rounded w-16" />
      </div>
    </div>
    <div className="h-3 bg-white/5 rounded mb-2 w-full" />
    <div className="h-3 bg-white/5 rounded w-4/5" />
  </div>
);

// Skeleton for stat cards on dashboard
export const SkeletonStat = () => (
  <div className="rs-card p-5 flex items-center gap-4 animate-pulse">
    <div className="w-10 h-10 rounded-lg bg-white/5" />
    <div>
      <div className="h-5 bg-white/5 rounded mb-1.5 w-16" />
      <div className="h-2.5 bg-white/5 rounded w-24" />
    </div>
  </div>
);

export default { SkeletonCard, SkeletonBeatRow, SkeletonPost, SkeletonStat };

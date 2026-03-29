import React from 'react';

// Animated waveform bars component
const WaveformBars = ({ playing = false, color = '#8b5cf6', bars = 5, height = 16 }) => {
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: height,
            background: color,
            borderRadius: 2,
            transformOrigin: 'bottom',
            animation: playing ? `wave-bar 0.8s ease-in-out ${i * 0.1}s infinite` : 'none',
            transform: playing ? undefined : 'scaleY(0.3)',
            transition: 'transform 0.2s',
          }}
        />
      ))}
    </div>
  );
};

export default WaveformBars;

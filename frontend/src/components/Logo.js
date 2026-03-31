import React from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_freelance-beats-test/artifacts/reddx9n4_Gemini_Generated_Image_7ia35j7ia35j7ia3.png";

const SIZES = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64, '2xl': 96 };
const TEXT_SIZES = { sm: 14, md: 16, lg: 20, xl: 26, '2xl': 32 };

const Logo = ({
  size = 'md',
  showText = true,
  textSize = 'sm',
  className = '',
  textClassName = '',
  glow = false,
}) => {
  const px = SIZES[size] || SIZES.md;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={LOGO_URL}
        alt="ReverSound Logo"
        style={{
          width: px,
          height: px,
          objectFit: 'contain',
          filter: glow ? 'drop-shadow(0 0 8px rgba(139,92,246,0.6))' : undefined,
        }}
        className="flex-shrink-0"
      />
      {showText && (
        <span
          className={`font-heading font-bold tracking-tight text-white ${textClassName}`}
          style={{ fontSize: TEXT_SIZES[textSize] || TEXT_SIZES.md }}
        >
          REVERSOUND
        </span>
      )}
    </div>
  );
};

export const LogoMark = ({ size = 'md', glow = false }) => {
  const px = SIZES[size] || SIZES.md;
  return (
    <img
      src={LOGO_URL}
      alt="ReverSound"
      style={{
        width: px,
        height: px,
        objectFit: 'contain',
        filter: glow ? 'drop-shadow(0 0 8px rgba(139,92,246,0.6))' : undefined,
      }}
    />
  );
};

export const LOGO_URL_EXPORT = LOGO_URL;
export default Logo;

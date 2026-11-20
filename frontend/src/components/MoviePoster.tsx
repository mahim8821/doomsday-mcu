import React, { useState, useEffect } from 'react';
import { Film, Sparkles } from 'lucide-react';
import {
  getCanonicalPoster,
  getCustomPoster,
  getDeterministicGradient,
} from '../utils/posters';

interface MoviePosterProps {
  movieId?: string;
  title: string;
  releaseYear?: number;
  runtimeMinutes?: number;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}

export const MoviePoster: React.FC<MoviePosterProps> = ({
  movieId,
  title,
  releaseYear,
  runtimeMinutes,
  className = '',
  imgClassName = '',
}) => {
  const canonical = getCanonicalPoster(title);
  const customUrl = movieId ? getCustomPoster(movieId) : null;

  // Decide initial image source:
  // 1. Custom URL if user saved one
  // 2. Canonical CDN URL if available
  // 3. Local bundled SVG path
  const initialSrc = customUrl || (canonical ? canonical.cdnUrl : null);

  const [currentSrc, setCurrentSrc] = useState<string | null>(initialSrc);
  const [loadStage, setLoadStage] = useState<'cdn' | 'local' | 'fallback'>(
    customUrl ? 'cdn' : canonical ? 'cdn' : 'fallback'
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const updatedCustom = movieId ? getCustomPoster(movieId) : null;
    const nextSrc = updatedCustom || (canonical ? canonical.cdnUrl : null);
    setCurrentSrc(nextSrc);
    setLoadStage(updatedCustom ? 'cdn' : canonical ? 'cdn' : 'fallback');
    setLoaded(false);
  }, [movieId, title]);

  const handleImageError = () => {
    if (loadStage === 'cdn' && canonical?.localPath) {
      // Step down to local bundled SVG
      setLoadStage('local');
      setCurrentSrc(canonical.localPath);
    } else {
      // Step down to procedural gradient poster
      setLoadStage('fallback');
      setCurrentSrc(null);
    }
  };

  const gradient = getDeterministicGradient(title);

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800/80 shadow-lg select-none group ${className}`}
    >
      {currentSrc && loadStage !== 'fallback' ? (
        <>
          <img
            src={currentSrc}
            alt={`${title} poster`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              loaded ? 'opacity-100' : 'opacity-0'
            } ${imgClassName}`}
          />
          {/* Subtle bottom vignette to ensure typography legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-60 pointer-events-none" />

          {/* Loading Skeleton */}
          {!loaded && (
            <div className="absolute inset-0 bg-slate-900 animate-pulse flex items-center justify-center">
              <Film className="w-8 h-8 text-slate-700 animate-spin" />
            </div>
          )}
        </>
      ) : (
        /* Stylized Minimalist Cinema Card Fallback */
        <div
          className="absolute inset-0 p-4 flex flex-col justify-between"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${gradient.from}, ${gradient.to})`,
          }}
        >
          {/* Subtle grid border overlay */}
          <div className="absolute inset-2 border border-white/10 rounded-lg pointer-events-none" />

          {/* Top Brand Tag */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[9px] tracking-widest rounded uppercase shadow-sm">
              MARVEL
            </span>
            <Sparkles className="w-4 h-4 text-white/30" />
          </div>

          {/* Center Title Icon Artwork */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto px-2 space-y-2">
            <div
              className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center shadow-lg"
              style={{ backgroundColor: `${gradient.accent}20` }}
            >
              <Film className="w-6 h-6 text-white" style={{ color: gradient.accent }} />
            </div>
            <h4
              className="font-black text-white text-base sm:text-lg leading-tight uppercase tracking-wider drop-shadow-md line-clamp-3"
              style={{ textShadow: `0 0 12px ${gradient.accent}50` }}
            >
              {title}
            </h4>
          </div>

          {/* Bottom Metadata Badges */}
          <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-slate-300 font-mono">
            {releaseYear && <span className="font-semibold text-white/80">{releaseYear}</span>}
            {runtimeMinutes && (
              <span className="px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-white/90">
                {runtimeMinutes}m
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

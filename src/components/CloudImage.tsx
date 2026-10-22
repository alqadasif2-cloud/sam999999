import React, { useState, useEffect } from 'react';
import { resolveCloudImageUrl, getCachedCloudMedia } from '../services/firebase';
import { LocalCacheService } from '../services/localCache';
import { ImageIcon } from 'lucide-react';

interface CloudImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
}

export const CloudImage: React.FC<CloudImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackText,
  fallbackIcon,
  ...rest
}) => {
  // Synchronous cache lookup: Memory cache first, then persistent disk cache
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null;
    const mem = getCachedCloudMedia(src);
    if (mem) return mem;
    const disk = LocalCacheService.getImage(src);
    if (disk) return disk;
    // If it's a standard web URL, we can use it directly while caching
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    return null;
  });

  const [hasError, setHasError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(() => !resolvedSrc && Boolean(src));

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      setResolvedSrc(null);
      setLoading(false);
      return;
    }

    // Check fast cache
    const mem = getCachedCloudMedia(src);
    if (mem) {
      setResolvedSrc(mem);
      setLoading(false);
      return;
    }
    const disk = LocalCacheService.getImage(src);
    if (disk) {
      setResolvedSrc(disk);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasError(false);

    resolveCloudImageUrl(src)
      .then((url) => {
        if (!isMounted) return;
        if (url) {
          setResolvedSrc(url);
          LocalCacheService.setImage(src, url);
        } else {
          setResolvedSrc(src);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setResolvedSrc(src);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  // Fallback placeholder with identical dimensions
  const renderFallback = () => {
    return (
      <div
        className={`flex items-center justify-center bg-[#0d1527] border border-amber-500/20 text-amber-400/80 select-none overflow-hidden ${className}`}
        title={alt || 'صورة'}
      >
        {fallbackIcon ? (
          fallbackIcon
        ) : fallbackText ? (
          <span className="font-black text-xs uppercase tracking-wider">{fallbackText.slice(0, 2)}</span>
        ) : (
          <ImageIcon className="w-4 h-4 opacity-40 text-amber-300" />
        )}
      </div>
    );
  };

  if (!src || hasError) {
    return renderFallback();
  }

  if (loading && !resolvedSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-[#0c1322] border border-slate-800 animate-pulse ${className}`}
      >
        <span className="w-3.5 h-3.5 border-2 border-amber-400/60 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc || src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        setHasError(true);
      }}
      {...rest}
    />
  );
};

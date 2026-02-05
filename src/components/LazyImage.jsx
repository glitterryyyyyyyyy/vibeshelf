import React, { useState, useRef, useEffect, memo } from 'react';

const LazyImage = memo(({ src, candidates = [], alt, className, onError, placeholder = "https://placehold.co/128x192/F0D9E6/8B5F6C?text=No+Cover", debugName = '', ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Try the primary src first, then candidates in order. Stop on first success.
    if (!isInView) return;
    const tryList = [];
    if (src) tryList.push(src);
    if (Array.isArray(candidates)) tryList.push(...candidates.filter(Boolean));

    let cancelled = false;

    const tryNext = (i) => {
      if (cancelled) return;
      if (i >= tryList.length) {
        setImageSrc(placeholder);
        setIsLoaded(true);
        if (onError) onError();
        return;
      }
      const url = tryList[i];
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        setImageSrc(url);
        setIsLoaded(true);
      };
      img.onerror = () => {
        // try next candidate
        tryNext(i + 1);
      };
      img.src = url;
    };

    tryNext(0);

    return () => { cancelled = true; };
  }, [isInView, src, candidates, placeholder, onError]);

  return (
    <div ref={imgRef} className="relative">
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        {...props}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 animate-pulse rounded-lg">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
import { useEffect, useRef } from "react";

// Cache global de imagens pré-carregadas
const preloadedImages = new Set<string>();
const imageCache = new Map<string, HTMLImageElement>();

export const preloadImage = (src: string): Promise<void> => {
  if (!src || preloadedImages.has(src)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.add(src);
      imageCache.set(src, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
};

export const preloadImages = (urls: string[]): Promise<void[]> => {
  return Promise.all(urls.filter(Boolean).map(preloadImage));
};

export const isImagePreloaded = (src: string): boolean => {
  return preloadedImages.has(src);
};

export const useImagePreload = (urls: string[]) => {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const validUrls = urls.filter(Boolean);
    if (validUrls.length > 0) {
      preloadImages(validUrls);
    }
  }, [urls]);
};

export const useCriticalImagePreload = (urls: string[]) => {
  useEffect(() => {
    const validUrls = urls.filter(Boolean);
    if (validUrls.length === 0) return;

    // Preload crítico usando link preload
    validUrls.slice(0, 6).forEach((url) => {
      if (preloadedImages.has(url)) return;
      
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = url;
      document.head.appendChild(link);
      preloadedImages.add(url);
    });
  }, [urls]);
};

export default useImagePreload;

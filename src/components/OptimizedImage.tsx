import { memo, useState, useCallback } from "react";
import { isImagePreloaded } from "@/hooks/useImagePreload";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
  onLoad?: () => void;
}

const OptimizedImage = memo(({ 
  src, 
  alt, 
  className = "", 
  loading = "lazy",
  priority = false,
  onLoad 
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(() => isImagePreloaded(src));
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  return (
    <img
      src={error ? "/placeholder.svg" : src}
      alt={alt}
      className={`${className} ${loaded ? "" : "opacity-0"} transition-opacity duration-200`}
      loading={priority ? "eager" : loading}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;

import { useState, useEffect, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import Autoplay from "embla-carousel-autoplay";
import { ChevronRight } from "lucide-react";
import { useCriticalImagePreload } from "@/hooks/useImagePreload";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  link_type: string | null;
  link_id: string | null;
  is_active: boolean;
}

interface BannerCarouselProps {
  establishmentId?: string;
}

// Cache global para banners
const bannersCache = new Map<string, Banner[]>();

const BannerCarousel = memo(({ establishmentId }: BannerCarouselProps) => {
  const slug = useStoreSlug();
  const cacheKey = establishmentId || "global";
  const [banners, setBanners] = useState<Banner[]>(() => bannersCache.get(cacheKey) || []);
  const [loading, setLoading] = useState(!bannersCache.has(cacheKey));

  // Preload crítico das imagens dos banners
  useCriticalImagePreload(banners.map(b => b.image_url));

  useEffect(() => {
    if (bannersCache.has(cacheKey)) {
      setBanners(bannersCache.get(cacheKey)!);
      setLoading(false);
      return;
    }
    loadBanners();
  }, [establishmentId, cacheKey]);

  const loadBanners = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      let query = supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order("display_order", { ascending: true });

      if (establishmentId) {
        query = query.eq("establishment_id", establishmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      const result = data || [];
      bannersCache.set(cacheKey, result);
      setBanners(result);
    } catch (error) {
      console.error("Error loading banners:", error);
    } finally {
      setLoading(false);
    }
  }, [establishmentId, cacheKey]);

  const getBannerLink = (banner: Banner) => {
    if (banner.link_type === "product" && banner.link_id) {
      return buildStorePath(slug, `/product/${banner.link_id}`);
    }
    if (banner.link_type === "category" && banner.link_id) {
      return `/?category=${banner.link_id}`;
    }
    if (banner.link_type === "url" && banner.link_url) {
      return banner.link_url;
    }
    return null;
  };

  if (loading) {
    return <Skeleton className="w-full h-40 sm:h-56 rounded-2xl" />;
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <Carousel
      opts={{ align: "start", loop: true }}
      plugins={[Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true })]}
      className="w-full"
    >
      <CarouselContent className="-ml-2">
        {banners.map((banner) => {
          const link = getBannerLink(banner);
          const content = (
            <div className="relative aspect-[21/9] sm:aspect-[3/1] overflow-hidden rounded-2xl">
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                <h3 className="text-white font-bold text-lg sm:text-2xl line-clamp-1">{banner.title}</h3>
                {banner.subtitle && (
                  <p className="text-white/80 text-sm sm:text-base line-clamp-1 mt-1">{banner.subtitle}</p>
                )}
                {link && (
                  <div className="flex items-center text-white text-sm mt-2 gap-1">
                    Ver mais <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );

          return (
            <CarouselItem key={banner.id} className="pl-2 basis-full">
              {link ? (
                link.startsWith("http") ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="block">
                    {content}
                  </a>
                ) : (
                  <Link to={link} className="block">
                    {content}
                  </Link>
                )
              ) : (
                content
              )}
            </CarouselItem>
          );
        })}
      </CarouselContent>
      
      {banners.length > 1 && (
        <div className="flex justify-center mt-3 gap-1.5">
          {banners.map((_, index) => (
            <div
              key={index}
              className="h-1.5 w-6 rounded-full bg-primary/30"
            />
          ))}
        </div>
      )}
    </Carousel>
  );
});

BannerCarousel.displayName = "BannerCarousel";

export default BannerCarousel;

import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { Plus, Star, Heart, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { getProductImage } from "@/utils/imageHelper";
import { supabase } from "@/integrations/supabase/client";
import { preloadImages } from "@/hooks/useImagePreload";

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number | null;
  is_on_sale?: boolean | null;
  image_url?: string;
  rating?: number;
  reviews_count?: number;
  brands?: { name: string };
  product_categories?: { name: string };
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onClick?: () => void;
}

// Cache global para imagens de produtos
const productImagesCache = new Map<string, string[]>();

const ProductCard = memo(({ product, onAddToCart, onClick }: ProductCardProps) => {
  const { toggleFavorite, isFavorite, loading: favLoading } = useFavorites();
  const [isHovered, setIsHovered] = useState(false);
  const [allImages, setAllImages] = useState<string[]>(() => {
    // Inicializar com cache se disponível
    const cached = productImagesCache.get(product.id);
    if (cached) return cached;
    return product.image_url ? [product.image_url] : ["/placeholder.svg"];
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Se já temos no cache, não precisamos buscar
    if (productImagesCache.has(product.id)) return;
    
    loadAllImages();
  }, [product.id]);

  const loadAllImages = useCallback(async () => {
    const images: string[] = [];
    
    if (product.image_url) {
      images.push(product.image_url);
    }

    const { data } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", product.id)
      .order("display_order");

    if (data) {
      images.push(...data.map(img => img.image_url));
    }

    if (images.length === 0) {
      images.push("/placeholder.svg");
    }

    // Salvar no cache
    productImagesCache.set(product.id, images);
    setAllImages(images);
    setCurrentIndex(0);
    
    // Preload das imagens
    preloadImages(images);
  }, [product.id, product.image_url]);

  const goToPrevious = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const isOnSale = product.is_on_sale && product.sale_price && product.sale_price < product.price;
  const discountPercentage = isOnSale 
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100) 
    : 0;
  const displayPrice = isOnSale ? product.sale_price! : product.price;
  const hasMultipleImages = allImages.length > 1;

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-200 hover:shadow-hover cursor-pointer bg-card border border-border"
      style={{ borderRadius: '5px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="block">
        <div className="relative overflow-hidden aspect-square bg-muted" style={{ borderTopLeftRadius: '5px', borderTopRightRadius: '5px' }}>
          <img
            src={getProductImage(allImages[currentIndex])}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="eager"
            decoding="async"
          />

          <Button
            variant="ghost"
            size="sm"
            className={`absolute top-1.5 right-1.5 h-7 w-7 p-0 rounded-full bg-background/90 border border-border hover:bg-background transition-all ${
              isFavorite(product.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"
            }`}
            disabled={favLoading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite(product.id) ? "fill-current" : ""}`} />
          </Button>

          {isOnSale && (
            <Badge className="absolute top-1.5 left-1.5 bg-red-500 text-primary-foreground font-bold text-[10px] px-1.5 py-0.5 border-0">
              -{discountPercentage}%
            </Badge>
          )}

          {product.product_categories && (
            <Badge variant="secondary" className="absolute bottom-1.5 left-1.5 bg-background/90 border border-border font-medium text-[9px] px-1.5 py-0.5">
              {product.product_categories.name}
            </Badge>
          )}

          {/* Navigation buttons - only show when multiple images */}
          {hasMultipleImages && (
            <>
              {/* Previous button - left side centered */}
              <button
                onClick={goToPrevious}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-background transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
              </button>

              {/* Next button - right side centered */}
              <button
                onClick={goToNext}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-background transition-all"
              >
                <ChevronRight className="h-3.5 w-3.5 text-foreground" />
              </button>

              {/* Dots indicator - bottom center */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                {allImages.map((_, index) => (
                  <span
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      index === currentIndex ? "bg-primary" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <CardContent className="p-2.5 space-y-1">
        {product.brands && (
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {product.brands.name}
          </p>
        )}

        <h3 className="font-semibold text-xs leading-tight line-clamp-2 text-foreground min-h-[2rem]">
          {product.name}
        </h3>

        {typeof product.rating === 'number' && product.rating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-2.5 w-2.5 ${
                    i < Math.floor(product.rating!)
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            {product.reviews_count && product.reviews_count > 0 && (
              <span className="text-[10px] text-muted-foreground">({product.reviews_count})</span>
            )}
          </div>
        )}

        <div className="pt-1.5 mt-1">
          {isOnSale ? (
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground line-through">{formatPrice(product.price)}</span>
              <span className="text-base font-bold text-red-500">{formatPrice(displayPrice)}</span>
            </div>
          ) : (
            <span className="text-base font-bold text-foreground">{formatPrice(product.price)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;

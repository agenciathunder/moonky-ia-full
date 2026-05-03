import { useState, useEffect, useRef } from "react";
import { X, Plus, Minus, ShoppingBag, Star, Heart, ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { getProductImage } from "@/utils/imageHelper";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number | null;
  is_on_sale?: boolean | null;
  image_url?: string;
  rating?: number;
  reviews_count?: number;
  description?: string;
  brands?: { name: string };
  product_categories?: { name: string };
}

interface ProductVariant {
  id: string;
  name: string;
  options: string[];
  is_required: boolean;
}

interface ProductQuickAddProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (product: Product, quantity: number, selectedVariants?: Record<string, string>) => void;
}

const ProductQuickAdd = ({ product, open, onOpenChange, onAddToCart }: ProductQuickAddProps) => {
  const [quantity, setQuantity] = useState(1);
  const [imageFullscreen, setImageFullscreen] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { toggleFavorite, isFavorite, loading: favLoading } = useFavorites();
  const { isCatalogOnly } = useEstablishment();

  const minSwipeDistance = 50;

  useEffect(() => {
    if (product?.id && open) {
      loadVariants(product.id);
      loadAllImages(product.id, product.image_url);
    }
  }, [product?.id, open]);

  const loadAllImages = async (productId: string, mainImage?: string) => {
    const images: string[] = [];
    
    if (mainImage) {
      images.push(mainImage);
    }

    const { data } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId)
      .order("display_order");

    if (data) {
      images.push(...data.map(img => img.image_url));
    }

    if (images.length === 0) {
      images.push("/placeholder.svg");
    }

    setAllImages(images);
    setCurrentImageIndex(0);
  };

  const loadVariants = async (productId: string) => {
    const { data } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("display_order");
    
    if (data && data.length > 0) {
      setVariants(data.map(v => ({
        id: v.id,
        name: v.name,
        options: v.options || [],
        is_required: v.is_required || false
      })));
    } else {
      setVariants([]);
    }
    setSelectedVariants({});
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  if (!product) return null;

  const isOnSale = product.is_on_sale && product.sale_price && product.sale_price < product.price;
  const discountPercentage = isOnSale 
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100) 
    : 0;
  const displayPrice = isOnSale ? product.sale_price! : product.price;
  const totalPrice = displayPrice * quantity;

  const canAddToCart = variants.filter(v => v.is_required).every(v => selectedVariants[v.name]);

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    onAddToCart(product, quantity, Object.keys(selectedVariants).length > 0 ? selectedVariants : undefined);
    setQuantity(1);
    setSelectedVariants({});
    onOpenChange(false);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const currentImage = allImages[currentImageIndex] || product.image_url;

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold">
              {isCatalogOnly ? "Detalhes do Produto" : "Adicionar ao Carrinho"}
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Product Image and Info */}
          <div className="flex gap-4">
            <div 
              className="relative w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-muted cursor-pointer group"
              onClick={() => setImageFullscreen(true)}
            >
              <img
                src={getProductImage(currentImage)}
                alt={product.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {isOnSale && (
                <Badge className="absolute top-1.5 left-1.5 bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.5 border-0">
                  -{discountPercentage}%
                </Badge>
              )}
              {/* Multiple images indicator */}
              {allImages.length > 1 && (
                <div className="absolute right-1.5 bottom-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-background/90 border border-border">
                  <ChevronRight className="h-3.5 w-3.5 text-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {product.brands && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {product.brands.name}
                </p>
              )}
              <h3 className="font-semibold text-base leading-tight text-foreground mb-2">
                {product.name}
              </h3>
              
              {product.product_categories && (
                <Badge variant="secondary" className="text-[10px] mb-2">
                  {product.product_categories.name}
                </Badge>
              )}

              {typeof product.rating === 'number' && product.rating > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.floor(product.rating!)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  {product.reviews_count && product.reviews_count > 0 && (
                    <span className="text-xs text-muted-foreground">({product.reviews_count})</span>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 flex-shrink-0 rounded-full border ${
                isFavorite(product.id) ? "text-red-500 border-red-200" : "text-muted-foreground border-border"
              }`}
              disabled={favLoading}
              onClick={() => toggleFavorite(product.id)}
            >
              <Heart className={`h-4 w-4 ${isFavorite(product.id) ? "fill-current" : ""}`} />
            </Button>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          {/* Variants Selection */}
          {variants.length > 0 && (
            <div className="space-y-3">
              {variants.map((variant) => (
                <div key={variant.id} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {variant.name}
                    {variant.is_required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((option) => (
                      <Button
                        key={option}
                        type="button"
                        variant={selectedVariants[variant.name] === option ? "default" : "outline"}
                        size="sm"
                        className="h-9 px-4"
                        onClick={() => setSelectedVariants({
                          ...selectedVariants,
                          [variant.name]: selectedVariants[variant.name] === option ? "" : option
                        })}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Preço unitário</p>
                {isOnSale ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-red-500">{formatPrice(displayPrice)}</span>
                    <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</span>
                  </div>
                ) : (
                  <span className="text-xl font-bold text-foreground">{formatPrice(product.price)}</span>
                )}
              </div>

              {/* Quantity Selector - Only show if not catalog only */}
              {!isCatalogOnly && (
                <div className="flex items-center gap-3 bg-background rounded-xl p-1 border border-border">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold text-lg">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg"
                    onClick={() => handleQuantityChange(1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add to Cart Button - Only show if not catalog only */}
        {!isCatalogOnly && (
          <div className="p-4 border-t border-border bg-background">
            <Button
              className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
              onClick={handleAddToCart}
              disabled={!canAddToCart}
            >
              <ShoppingBag className="h-5 w-5" />
              Adicionar {formatPrice(totalPrice)}
            </Button>
            {!canAddToCart && variants.some(v => v.is_required) && (
              <p className="text-xs text-red-500 text-center mt-2">
                Selecione as opções obrigatórias
              </p>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>

    {/* Fullscreen Image Dialog with Swipe */}
    <Dialog open={imageFullscreen} onOpenChange={setImageFullscreen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0 overflow-hidden [&>button]:hidden">
        <DialogClose asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogClose>
        
        {/* Navigation arrows for desktop */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        <div 
          className="flex items-center justify-center w-full h-full min-h-[50vh]"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={getProductImage(allImages[currentImageIndex] || product.image_url)}
            alt={product.name}
            className="max-w-full max-h-[90vh] object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Dots indicator */}
        {allImages.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentImageIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  </>
  );
};

export default ProductQuickAdd;
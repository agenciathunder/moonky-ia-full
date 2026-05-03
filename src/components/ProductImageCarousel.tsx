import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getProductImage } from "@/utils/imageHelper";

interface ProductImageCarouselProps {
  productId: string;
  mainImage?: string;
  productName: string;
}

const ProductImageCarousel = ({ productId, mainImage, productName }: ProductImageCarouselProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadImages();
  }, [productId]);

  const loadImages = async () => {
    const allImages: string[] = [];
    
    if (mainImage) {
      allImages.push(mainImage);
    }

    const { data } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId)
      .order("display_order");

    if (data) {
      allImages.push(...data.map(img => img.image_url));
    }

    if (allImages.length === 0) {
      allImages.push("/placeholder.svg");
    }

    setImages(allImages);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full">
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        <img
          src={getProductImage(images[currentIndex])}
          alt={`${productName} - Imagem ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
      </div>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
            onClick={goToNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          {/* Dots indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-primary" : "bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentIndex ? "border-primary" : "border-transparent"
                }`}
              >
                <img
                  src={getProductImage(img)}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductImageCarousel;

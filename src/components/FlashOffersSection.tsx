import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { Timer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { useEstablishment } from "@/contexts/EstablishmentContext";

interface FlashOffersSectionProps {
  products: any[];
  onAddToCart: (product: any) => void;
  onProductClick?: (product: any) => void;
}

const FlashOffersSection = ({ products, onAddToCart, onProductClick }: FlashOffersSectionProps) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 29, seconds: 47 });
  const { settings } = useEstablishment();
  const slug = useStoreSlug();

  const primaryColor = settings?.primary_color || "#3834ED";

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds === 0) {
          if (prev.minutes === 0) {
            if (prev.hours === 0) {
              return { hours: 2, minutes: 29, seconds: 47 };
            }
            return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
          }
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        }
        return { ...prev, seconds: prev.seconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (value: number) => value.toString().padStart(2, "0");

  if (products.length === 0) return null;

  return (
    <section 
      className="rounded-2xl p-4 sm:p-6"
      style={{ backgroundColor: `${primaryColor}10` }}
    >
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        {/* Title */}
        <div className="flex items-center gap-2.5">
          <div 
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl"
            style={{ backgroundColor: primaryColor }}
          >
            <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              Ofertas Relâmpago
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Preços exclusivos por tempo limitado
            </p>
          </div>
        </div>
        
        {/* Timer and Link */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Timer */}
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <span 
                className="font-mono font-bold text-sm sm:text-base px-2 py-1 rounded-lg min-w-[32px] sm:min-w-[38px] text-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {formatTime(timeLeft.hours)}
              </span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5 uppercase">Hrs</span>
            </div>
            <span className="text-muted-foreground font-bold text-base sm:text-lg mb-3">:</span>
            <div className="flex flex-col items-center">
              <span 
                className="font-mono font-bold text-sm sm:text-base px-2 py-1 rounded-lg min-w-[32px] sm:min-w-[38px] text-center text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {formatTime(timeLeft.minutes)}
              </span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5 uppercase">Min</span>
            </div>
            <span className="text-muted-foreground font-bold text-base sm:text-lg mb-3">:</span>
            <div className="flex flex-col items-center">
              <span 
                className="font-mono font-bold text-sm sm:text-base px-2 py-1 rounded-lg min-w-[32px] sm:min-w-[38px] text-center animate-pulse text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {formatTime(timeLeft.seconds)}
              </span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5 uppercase">Seg</span>
            </div>
          </div>
          
          <Link to={buildStorePath(slug, '/offers')} className="hidden sm:block">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              Ver todas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.slice(0, 6).map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAddToCart={onAddToCart}
            onClick={() => onProductClick?.(product)}
          />
        ))}
      </div>

      {products.length > 6 && (
        <div className="mt-4 text-center sm:hidden">
          <Link to={buildStorePath(slug, '/offers')}>
            <Button variant="outline" size="sm" className="gap-1.5">
              Ver todas as ofertas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
};

export default FlashOffersSection;

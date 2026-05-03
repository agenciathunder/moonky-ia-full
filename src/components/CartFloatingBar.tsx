import { useState } from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { cn } from "@/lib/utils";
import CheckoutModal from "./CheckoutModal";

const CartFloatingBar = () => {
  const { getTotalItems, getTotalPrice } = useCart();
  const { isCatalogOnly } = useEstablishment();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Hide cart bar if catalog only mode or no items
  if (isCatalogOnly || totalItems === 0) return null;

  return (
    <>
      <div 
        className={cn(
          "fixed bottom-16 left-0 right-0 z-40 md:hidden",
          "animate-in slide-in-from-bottom-8 duration-500 ease-out"
        )}
      >
        <div className="mx-4 mb-2">
          <button 
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-green-500 via-emerald-400 to-lime-500 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(34,197,94,0.4)] border border-green-300/40 overflow-hidden transition-all duration-500 ease-out hover:shadow-[0_12px_40px_rgba(34,197,94,0.5)] hover:scale-[1.01] active:scale-[0.99]">
              <div className="relative px-5 py-4 flex items-center justify-between">
                {/* Left side - Icon and count */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 border border-white/20 transition-transform duration-300 ease-out">
                      <ShoppingBag className="h-5 w-5 text-white" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 bg-white text-emerald-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-emerald-300 shadow-sm">
                      {totalItems}
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                      {totalItems} {totalItems === 1 ? 'Item' : 'Itens'}
                    </span>
                    <span className="text-lg font-bold text-white">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Right side - CTA */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    Finalizar
                  </span>
                  <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2 border border-white/20 transition-all duration-300 ease-out">
                    <ArrowRight className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
    </>
  );
};

export default CartFloatingBar;

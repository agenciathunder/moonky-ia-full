import { Home, ShoppingCart, User, Heart, ClipboardList, Ticket } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { cn } from "@/lib/utils";

const BottomNavigation = () => {
  const location = useLocation();
  const slug = useStoreSlug();
  const { getTotalItems } = useCart();
  const { user } = useAuth();
  const { establishment, settings } = useEstablishment();
  const cartCount = getTotalItems();
  const primaryColor = settings?.primary_color || "#3834ED";

  // Build store-specific paths
  const storeSlug = slug || establishment?.slug;
  const authPath = buildStorePath(storeSlug, '/auth');

  const navItems = [
    { icon: Home, path: buildStorePath(storeSlug, ''), label: "Home" },
    { icon: Heart, path: buildStorePath(storeSlug, '/favorites'), label: "Favoritos" },
    { icon: ClipboardList, path: buildStorePath(storeSlug, '/orders'), label: "Pedidos", isCenter: true },
    { icon: ShoppingCart, path: buildStorePath(storeSlug, '/cart'), label: "Carrinho", badge: cartCount },
    { icon: User, path: user ? buildStorePath(storeSlug, '/profile') : authPath, label: user ? "Perfil" : "Entrar" }
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t shadow-lg"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.isCenter) {
            return (
              <Link key={item.path} to={item.path} className="flex items-center justify-center relative">
                <div className="absolute -top-3">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center bg-background shadow-lg border border-border/50",
                    isActive && "shadow-xl scale-[1.02]"
                  )}>
                    <Icon className="h-6 w-6" style={{ color: primaryColor }} />
                  </div>
                </div>
                <span className="absolute bottom-1 text-[10px] font-medium text-white/80">{item.label}</span>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200",
                isActive ? "text-white" : "text-white/60 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon className={cn("transition-all duration-200", isActive ? "h-6 w-6" : "h-5 w-5")} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 flex items-center justify-center text-[10px] font-bold bg-background rounded-full shadow-lg"
                    style={{ color: primaryColor }}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;

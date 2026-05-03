import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, Heart, Package, ShoppingCart, Trash2, Plus, Minus 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { getProductImage } from "@/utils/imageHelper";

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  image_url: string | null;
  brands: { name: string } | null;
  product_categories: { name: string } | null;
}

const Favorites = () => {
  const navigate = useNavigate();
  const slug = useStoreSlug();
  const { user } = useAuth();
  const { establishment, settings } = useEstablishment();
  const { toast } = useToast();
  const { favorites, toggleFavorite, isInitialized } = useFavorites();
  const { addItem, items, updateQuantity, removeItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const primaryColor = settings?.primary_color || "#3834ED";

  // Build store-specific paths
  const storeSlug = slug || establishment?.slug;
  const basePath = buildStorePath(storeSlug, '');
  const authPath = buildStorePath(storeSlug, '/auth');

  useEffect(() => {
    if (!isInitialized) {
      setLoading(true);
      return;
    }

    if (user && favorites.length > 0) {
      fetchFavoriteProducts();
    } else {
      setProducts([]);
      setLoading(false);
    }
  }, [user, favorites, isInitialized]);

  const fetchFavoriteProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, sale_price, is_on_sale, image_url, brands(name), product_categories(name)')
        .in('id', favorites);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching favorite products:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os favoritos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getCartQuantity = (productId: string) => {
    const item = items.find(i => i.id === productId);
    return item?.quantity || 0;
  };

  const handleAddToCart = (product: Product) => {
    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
    addItem({
      id: product.id,
      name: product.name,
      price: price,
      image: product.image_url || '',
      category: product.product_categories?.name || '',
      brand: product.brands?.name || '',
      rating: 0,
      reviews: 0
    });
  };

  const handleRemoveFavorite = async (productId: string) => {
    await toggleFavorite(productId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-24">
        <DynamicThemeStyles />
        <Heart className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Faça login</h2>
        <p className="text-muted-foreground text-center mb-6">
          Entre para ver seus produtos favoritos
        </p>
        <Button 
          onClick={() => navigate(authPath)} 
          className="h-12 px-8"
          style={{ backgroundColor: primaryColor }}
        >
          Entrar
        </Button>
        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent mx-auto mb-4"
            style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          ></div>
          <p className="text-sm text-muted-foreground">Carregando favoritos...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <DynamicThemeStyles />
      {/* Header Mobile */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 touch-manipulation">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Favoritos</h1>
          <div className="w-10" />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <Heart className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum favorito</h2>
          <p className="text-muted-foreground text-center mb-6">
            Adicione produtos aos favoritos para vê-los aqui
          </p>
          <Button 
            onClick={() => navigate(basePath || '/')} 
            className="h-12 px-8"
            style={{ backgroundColor: primaryColor }}
          >
            Explorar produtos
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </p>
          
          <div className="space-y-3">
            {products.map((product) => {
              const price = product.is_on_sale && product.sale_price ? product.sale_price : product.price;
              const originalPrice = product.is_on_sale ? product.price : null;
              const cartQty = getCartQuantity(product.id);

              return (
                <div 
                  key={product.id} 
                  className="bg-card rounded-xl border overflow-hidden"
                >
                  <div className="flex items-stretch">
                    {/* Imagem */}
                    <button 
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="w-24 h-24 flex-shrink-0 bg-muted"
                    >
                      {product.image_url ? (
                        <img
                          src={getProductImage(product.image_url)}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div>
                        <button 
                          onClick={() => navigate(`/product/${product.id}`)}
                          className="text-left w-full"
                        >
                          <h3 className="font-medium text-sm line-clamp-2">
                            {product.name}
                          </h3>
                        </button>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {product.brands?.name}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="font-bold" style={{ color: primaryColor }}>
                            {formatPrice(price)}
                          </p>
                          {originalPrice && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(originalPrice)}
                            </p>
                          )}
                        </div>

                        {/* Controles do Carrinho */}
                        {cartQty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (cartQty === 1) {
                                  removeItem(product.id);
                                } else {
                                  updateQuantity(product.id, cartQty - 1);
                                }
                              }}
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center touch-manipulation"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-6 text-center font-semibold text-sm">
                              {cartQty}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, cartQty + 1)}
                              className="w-8 h-8 rounded-full text-white flex items-center justify-center touch-manipulation"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(product)}
                            className="h-8 px-3"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Botão Remover */}
                    <button
                      onClick={() => handleRemoveFavorite(product.id)}
                      className="px-3 flex items-center justify-center border-l bg-red-500/5 hover:bg-red-500/10 transition-colors touch-manipulation"
                    >
                      <Trash2 className="h-5 w-5 text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Favorites;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import ProductCard from "@/components/ProductCard";
import BottomNavigation from "@/components/BottomNavigation";
import Footer from "@/components/Footer";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { ArrowLeft, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  brand_id: string;
  category_id: string;
  stock: number;
  is_on_sale: boolean;
  sale_price: number | null;
  rating?: number;
  reviews_count?: number;
  brands?: { name: string };
  product_categories?: { name: string };
}

const BrandProducts = () => {
  const { brandName } = useParams<{ brandName: string }>();
  const slug = useStoreSlug();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addItem } = useCart();
  const { settings } = useEstablishment();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  const primaryColor = settings?.primary_color || "#3834ED";
  const basePath = buildStorePath(slug, '');

  useEffect(() => {
    if (brandName) {
      loadBrandAndProducts();
    }
  }, [brandName]);

  const loadBrandAndProducts = async () => {
    try {
      setLoading(true);
      
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("name", decodeURIComponent(brandName!))
        .single();

      if (brandError) throw brandError;
      setBrand(brandData);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          brands (name),
          product_categories (name)
        `)
        .eq("brand_id", brandData.id)
        .eq("active", true);

      if (productsError) throw productsError;
      setProducts(productsData || []);
      
    } catch (error) {
      console.error("Error loading brand products:", error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar os produtos da marca.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || "/placeholder.svg",
      category: product.product_categories?.name || "",
      brand: product.brands?.name || brand?.name || "",
      rating: product.rating || 5,
      reviews: product.reviews_count || 0,
    });
    toast({
      title: "Adicionado ao carrinho!",
      description: `${product.name} foi adicionado.`,
    });
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <DynamicThemeStyles />
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <DynamicThemeStyles />
        <header 
          className="sticky top-0 z-40 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(basePath || "/")}
              className="text-white hover:bg-white/10 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Marca não encontrada</h1>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl">😕</span>
          </div>
          <p className="text-lg font-medium text-foreground mb-2">Marca não encontrada</p>
          <p className="text-sm text-muted-foreground mb-6 text-center">
            A marca que você está procurando não existe ou foi removida.
          </p>
          <Button onClick={() => navigate(basePath || "/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para início
          </Button>
        </div>
        
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DynamicThemeStyles />
      
      {/* Sticky Header with establishment color */}
      <header 
        className="sticky top-0 z-40 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(basePath || "/")}
              className="text-white hover:bg-white/10 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              {brand.logo_url && (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1"
                />
              )}
              <h1 className="text-lg font-bold truncate max-w-[150px]">{brand.name}</h1>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(!showSearch)}
            className="text-white hover:bg-white/10"
          >
            {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
        </div>

        {/* Search Input */}
        {showSearch && (
          <div className="px-4 pb-3">
            <Input
              placeholder={`Buscar em ${brand.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
              autoFocus
            />
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-4 pb-20">
        {/* Brand Info Card */}
        <div 
          className="rounded-2xl p-4 mb-5 border"
          style={{ 
            backgroundColor: `${primaryColor}10`,
            borderColor: `${primaryColor}30`
          }}
        >
          <div className="flex items-center gap-4">
            {brand.logo_url && (
              <div className="w-16 h-16 bg-background rounded-xl p-2 flex items-center justify-center shadow-sm">
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{brand.name}</h2>
              <p className="text-sm text-muted-foreground">
                {products.length} {products.length === 1 ? 'produto disponível' : 'produtos disponíveis'}
              </p>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'} para "{searchQuery}"
            </p>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="text-xs h-7">
              Limpar
            </Button>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              {searchQuery ? "Nenhum produto encontrado" : "Sem produtos disponíveis"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery 
                ? "Tente buscar por outro termo" 
                : "Volte em breve para conferir novidades!"}
            </p>
            {searchQuery && (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Limpar busca
              </Button>
            )}
          </div>
        )}
      </main>

      <Footer />
      <BottomNavigation />
    </div>
  );
};

export default BrandProducts;

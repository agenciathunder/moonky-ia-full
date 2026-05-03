import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Package, TrendingUp, Grid3x3, Search } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductQuickAdd from "@/components/ProductQuickAdd";
import BottomNavigation from "@/components/BottomNavigation";
import BannerCarousel from "@/components/BannerCarousel";
import EventsSectionWrapper from "@/components/EventsSectionWrapper";
import FlashOffersSection from "@/components/FlashOffersSection";
import CartFloatingBar from "@/components/CartFloatingBar";
import Footer from "@/components/Footer";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const slug = useStoreSlug();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; display_order: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const { addItem, getTotalItems } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    try {
      // First, get the establishment_id from the slug
      let estId: string | null = null;
      
      if (slug) {
        const { data: establishment } = await supabase
          .from("establishments")
          .select("id")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        
        if (establishment) {
          estId = establishment.id;
          setEstablishmentId(estId);
        }
      }

      // Build queries with establishment filter if available
      let productsQuery = supabase
        .from("products")
        .select(`*, brands(id, name, logo_url), product_categories(id, name, display_order)`)
        .eq("active", true)
        .order("created_at", { ascending: false });

      let brandsQuery = supabase.from("brands").select("*").order("name");
      
      let categoriesQuery = supabase
        .from("product_categories")
        .select("id, name, display_order")
        .order("display_order", { ascending: true });

      if (estId) {
        productsQuery = productsQuery.eq("establishment_id", estId);
        brandsQuery = brandsQuery.eq("establishment_id", estId);
        categoriesQuery = categoriesQuery.eq("establishment_id", estId);
      }

      const [productsRes, brandsRes, categoriesRes] = await Promise.all([
        productsQuery, 
        brandsQuery,
        categoriesQuery
      ]);

      if (productsRes.data) {
        setProducts(productsRes.data);
      }
      if (brandsRes.data) {
        setBrands(brandsRes.data);
      }
      if (categoriesRes.data) {
        // Filter categories that have at least one product
        const categoriesWithProducts = categoriesRes.data.filter(cat =>
          productsRes.data?.some(p => p.product_categories?.id === cat.id)
        );
        setCategories(categoriesWithProducts);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erro ao carregar produtos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, products]);

  const getProductsByCategory = (categoryId: string) => {
    const categoryProducts = products.filter(p => p.product_categories?.id === categoryId);
    // Sort by sales count (most sold first), then by created_at
    return categoryProducts.sort((a, b) => {
      const salesA = a.sales_count || 0;
      const salesB = b.sales_count || 0;
      if (salesB !== salesA) return salesB - salesA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '';
  };

  const offerProducts = products.filter(p => p.is_on_sale);

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setQuickAddOpen(true);
  };

  const handleAddToCart = (product: any, quantity: number = 1) => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.sale_price && product.is_on_sale ? product.sale_price : product.price,
        image: product.image_url || '/placeholder.svg',
        category: product.product_categories?.name || 'Sem categoria',
        brand: product.brands?.name || 'Sem marca',
        rating: product.rating || 0,
        reviews: product.reviews_count || 0
      });
    }
    toast({ title: "Adicionado ao carrinho!", description: `${quantity}x ${product.name} foi adicionado.` });
  };

  const handleSimpleAddToCart = (product: any) => {
    handleProductClick(product);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-clip">
      <DynamicThemeStyles />
      <Header cartCount={getTotalItems()} onLogoClick={() => setSearchTerm("")} />
      
      <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="O que você procura hoje?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base border-2 focus:border-primary rounded-2xl"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-border"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"></div>
            </div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : searchTerm ? (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Search className="h-5 w-5" />
              Resultados para "{searchTerm}"
            </h2>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={handleSimpleAddToCart}
                    onClick={() => handleProductClick(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Banners */}
            <BannerCarousel establishmentId={establishmentId || undefined} />

            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <Button key={cat.id} variant="outline" size="sm" className="rounded-full whitespace-nowrap" onClick={() => setSearchTerm(cat.name)}>
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Flash Offers Section */}
            {offerProducts.length > 0 && (
              <FlashOffersSection 
                products={offerProducts} 
                onAddToCart={handleSimpleAddToCart}
                onProductClick={handleProductClick}
              />
            )}

            {/* Brands Section */}
            {brands.length > 0 && (
              <section>
                <h3 className="text-base font-semibold text-primary flex items-center gap-1.5 mb-3">
                  Marcas
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
                  {brands.filter(b => b.logo_url).map((brand) => (
                    <Link 
                      key={brand.id} 
                      to={buildStorePath(slug, `/brand/${encodeURIComponent(brand.name)}`)}
                      className="flex-shrink-0 hover:scale-105 transition-transform snap-start"
                    >
                      <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 bg-card rounded-xl border shadow-sm p-3 flex items-center justify-center">
                        <img 
                          src={brand.logo_url} 
                          alt={brand.name} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Events Section - Only shows if there are active events */}
            <EventsSectionWrapper establishmentId={establishmentId || undefined} />

            {/* Products by Category */}
            {categories.map((category) => {
              const categoryProducts = getProductsByCategory(category.id).slice(0, 10);
              if (categoryProducts.length === 0) return null;
              
              return (
                <section key={category.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-primary flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      {category.name}
                    </h3>
                    <Link
                      to={buildStorePath(slug, `/category/${encodeURIComponent(category.id)}`)}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      Ver todos
                    </Link>
                  </div>
                  {/* Mobile: horizontal scroll | Desktop: grid */}
                  <div className="flex md:grid md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-x-auto md:overflow-visible scrollbar-hide pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0">
                    {categoryProducts.map((product) => (
                      <div key={product.id} className="flex-shrink-0 w-[45vw] sm:w-[40vw] md:w-auto">
                        <ProductCard 
                          product={product} 
                          onAddToCart={handleSimpleAddToCart}
                          onClick={() => handleProductClick(product)}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {products.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
                <p className="text-muted-foreground">Adicione produtos pelo painel admin.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer - Desktop */}
      <Footer />

      {/* Product Quick Add Modal */}
      <ProductQuickAdd 
        product={selectedProduct}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onAddToCart={handleAddToCart}
      />

      {/* Floating Cart Bar */}
      <CartFloatingBar />

      <BottomNavigation />
    </div>
  );
};

export default Index;

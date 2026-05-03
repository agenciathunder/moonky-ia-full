import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Package, ArrowLeft, Search, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductQuickAdd from "@/components/ProductQuickAdd";
import BottomNavigation from "@/components/BottomNavigation";
import CartFloatingBar from "@/components/CartFloatingBar";
import Footer from "@/components/Footer";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CategoryProducts = () => {
  const { categoryId } = useParams();
  const slug = useStoreSlug();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { addItem, getTotalItems } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [slug, categoryId]);

  const loadData = async () => {
    try {
      // First, get the establishment_id from the slug
      const { data: establishment } = await supabase
        .from("establishments")
        .select("id")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!establishment) {
        toast({ title: "Estabelecimento não encontrado", variant: "destructive" });
        return;
      }

      // Get category info
      const { data: categoryData } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("id", categoryId)
        .maybeSingle();

      if (categoryData) {
        setCategory(categoryData);
      }

      // Get products for this category sorted by sales
      const { data: productsData } = await supabase
        .from("products")
        .select(`*, brands(id, name, logo_url), product_categories(id, name)`)
        .eq("establishment_id", establishment.id)
        .eq("category_id", categoryId)
        .eq("active", true)
        .order("sales_count", { ascending: false, nullsFirst: false });

      if (productsData) {
        setProducts(productsData);
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
      product.brands?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, products]);

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

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(buildStorePath(slug, ''));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <DynamicThemeStyles />
      <Header cartCount={getTotalItems()} />
      
      <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Back Button & Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {category?.name || "Categoria"}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar nesta categoria..."
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
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToCart={() => handleProductClick(product)}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Tente buscar por outro termo." 
                : "Esta categoria ainda não possui produtos."}
            </p>
          </div>
        )}
      </main>

      <Footer />

      <ProductQuickAdd 
        product={selectedProduct}
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onAddToCart={handleAddToCart}
      />

      <CartFloatingBar />
      <BottomNavigation />
    </div>
  );
};

export default CategoryProducts;

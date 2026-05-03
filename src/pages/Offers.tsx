import { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Flame, ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import BottomNavigation from "@/components/BottomNavigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { useEstablishment } from "@/contexts/EstablishmentContext";

interface Filters {
  categories: string[];
  brands: string[];
  priceRange: number[];
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

const Offers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    categories: [],
    brands: [],
    priceRange: [0, 500]
  });
  const { addItem } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { establishment, settings } = useEstablishment();
  const primaryColor = settings?.primary_color || "#3834ED";

  // Load data from database when establishment is loaded
  useEffect(() => {
    if (establishment?.id) {
      loadData();
    }
  }, [establishment?.id]);

  const loadData = async () => {
    if (!establishment?.id) return;
    setLoading(true);
    
    try {
      // Load products, categories and brands in parallel
      const [productsRes, categoriesRes, brandsRes] = await Promise.all([
        supabase
          .from("products")
          .select(`
            *,
            brands(id, name),
            product_categories(id, name)
          `)
          .eq("establishment_id", establishment.id)
          .eq("active", true)
          .eq("is_on_sale", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("product_categories")
          .select("id, name")
          .eq("establishment_id", establishment.id)
          .order("name"),
        supabase
          .from("brands")
          .select("id, name")
          .eq("establishment_id", establishment.id)
          .order("name")
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;
      if (brandsRes.error) throw brandsRes.error;

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
      setBrands(brandsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar ofertas",
        description: "Não foi possível carregar os produtos em oferta.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Filter products that are on sale
  const offerProducts = products;

  // Apply search and filters to offer products
  const filteredProducts = useMemo(() => {
    return offerProducts.filter(product => {
      const categoryName = product.product_categories?.name || '';
      const brandName = product.brands?.name || '';

      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          brandName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filters.categories.length === 0 ||
                            filters.categories.includes(product.category_id);

      const matchesBrand = filters.brands.length === 0 ||
                         filters.brands.includes(product.brand_id);

      const matchesPrice = product.price >= filters.priceRange[0] &&
                         product.price <= filters.priceRange[1];

      return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
    });
  }, [offerProducts, searchTerm, filters]);

  const handleAddToCart = (product: any) => {
    addItem(product);
    toast({
      title: "Adicionado ao carrinho!",
      description: `${product.name} foi adicionado.`,
    });
  };


  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      categories: checked 
        ? [...prev.categories, categoryId]
        : prev.categories.filter(c => c !== categoryId)
    }));
  };

  const handleBrandChange = (brandId: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      brands: checked 
        ? [...prev.brands, brandId]
        : prev.brands.filter(b => b !== brandId)
    }));
  };

  const clearFilters = () => {
    setFilters({
      categories: [],
      brands: [],
      priceRange: [0, 500]
    });
    setSearchTerm("");
  };

  const activeFiltersCount = filters.categories.length + filters.brands.length + 
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 500 ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <DynamicThemeStyles />
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5" />
              <h1 className="text-lg font-bold">Ofertas</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary-foreground hover:bg-primary-foreground/10 relative"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-background text-primary text-xs font-bold rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl flex flex-col">
                <SheetHeader className="pb-4 flex-shrink-0">
                  <SheetTitle className="flex items-center justify-between">
                    <span>Filtros</span>
                    {activeFiltersCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Limpar tudo
                      </Button>
                    )}
                  </SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6 overflow-y-auto flex-1 pr-2 pb-4">
                  {/* Price Range */}
                  <div>
                    <h3 className="font-semibold mb-3">Faixa de Preço</h3>
                    <div className="px-2">
                      <Slider
                        value={filters.priceRange}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                        max={500}
                        min={0}
                        step={10}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>R$ {filters.priceRange[0]}</span>
                        <span>R$ {filters.priceRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  {categories.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Categorias</h3>
                      <div className="space-y-3">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center gap-3">
                            <Checkbox
                              id={`cat-${category.id}`}
                              checked={filters.categories.includes(category.id)}
                              onCheckedChange={(checked) => handleCategoryChange(category.id, checked as boolean)}
                            />
                            <Label htmlFor={`cat-${category.id}`} className="text-base">{category.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Brands */}
                  {brands.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Marcas</h3>
                      <div className="space-y-3">
                        {brands.map((brand) => (
                          <div key={brand.id} className="flex items-center gap-3">
                            <Checkbox
                              id={`brand-${brand.id}`}
                              checked={filters.brands.includes(brand.id)}
                              onCheckedChange={(checked) => handleBrandChange(brand.id, checked as boolean)}
                            />
                            <Label htmlFor={`brand-${brand.id}`} className="text-base">{brand.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Search Input */}
        {showSearch && (
          <div className="px-4 pb-3">
            <Input
              placeholder="Buscar ofertas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60"
              autoFocus
            />
          </div>
        )}
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-border"></div>
              <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin"></div>
            </div>
            <p className="text-sm text-muted-foreground">Carregando ofertas...</p>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-xl border border-primary/20">
                <div className="text-2xl font-bold text-primary">{offerProducts.length}</div>
                <div className="text-xs text-muted-foreground">Produtos em oferta</div>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-3 rounded-xl border border-green-500/20">
                <div className="text-2xl font-bold text-green-600">Até 25%</div>
                <div className="text-xs text-muted-foreground">De desconto</div>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
                {searchTerm && ` para "${searchTerm}"`}
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                  Limpar filtros
                </Button>
              )}
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                  <Flame className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">
                  Nenhuma oferta encontrada
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || activeFiltersCount > 0 
                    ? "Tente ajustar os filtros" 
                    : "Volte mais tarde para novas ofertas"}
                </p>
                {(searchTerm || activeFiltersCount > 0) && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Offers;

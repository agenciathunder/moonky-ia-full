import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "@/components/ImageUpload";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Pencil, Trash2, Loader2, X, ChevronLeft, ChevronRight, Download, Link, Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportedProduct {
  name: string;
  description: string;
  price: number;
  image_url: string;
  selected?: boolean;
}
interface ProductVariant {
  id?: string;
  name: string;
  options: string[];
  is_required: boolean;
  display_order: number;
}

interface ProductForm {
  name: string;
  description: string;
  cost_price: string;
  price: string;
  stock: string;
  is_on_sale: boolean;
  sale_price: string;
  is_featured: boolean;
  category_id: string;
  brand_id: string;
  attribute_1: string;
  attribute_1_label: string;
  attribute_2: string;
  attribute_2_label: string;
  image_url: string;
  additional_images: string[];
  variants: ProductVariant[];
}

const initialForm: ProductForm = {
  name: "",
  description: "",
  cost_price: "",
  price: "",
  stock: "0",
  is_on_sale: false,
  sale_price: "",
  is_featured: false,
  category_id: "",
  brand_id: "",
  attribute_1: "",
  attribute_1_label: "",
  attribute_2: "",
  attribute_2_label: "",
  image_url: "",
  additional_images: [],
  variants: []
};

interface ProductManagementProps {
  establishmentId?: string | null;
}

export const ProductManagement = ({ establishmentId }: ProductManagementProps) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState<ProductForm>(initialForm);
  const [productImages, setProductImages] = useState<any[]>([]);
  const [additionalUploadKey, setAdditionalUploadKey] = useState(0);
  
  // Import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importingProducts, setImportingProducts] = useState(false);

  useEffect(() => {
    loadData();
  }, [establishmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let productsQuery = supabase.from("products").select("*, brands(id, name), product_categories(id, name)").order("created_at", { ascending: false });
      let brandsQuery = supabase.from("brands").select("*").order("name");
      let categoriesQuery = supabase.from("product_categories").select("*").order("name");
      
      if (establishmentId) {
        productsQuery = productsQuery.eq("establishment_id", establishmentId);
        brandsQuery = brandsQuery.eq("establishment_id", establishmentId);
        categoriesQuery = categoriesQuery.eq("establishment_id", establishmentId);
      }

      const [productsRes, brandsRes, categoriesRes] = await Promise.all([
        productsQuery,
        brandsQuery,
        categoriesQuery
      ]);
      
      if (productsRes.data) setProducts(productsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductImages = async (productId: string) => {
    const { data } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order");
    if (data) setProductImages(data);
  };

  const handleOpenDialog = async (product?: any) => {
    if (product) {
      setEditingProduct(product);
      // Load existing variants
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id)
        .order("display_order");
      
      setProductForm({
        name: product.name || "",
        description: product.description || "",
        cost_price: product.cost_price?.toString() || "",
        price: product.price?.toString() || "",
        stock: product.stock?.toString() || "0",
        is_on_sale: product.is_on_sale || false,
        sale_price: product.sale_price?.toString() || "",
        is_featured: product.is_featured || false,
        category_id: product.category_id || "",
        brand_id: product.brand_id || "",
        attribute_1: product.alcohol_content || "",
        attribute_1_label: product.alcohol_content ? "Teor Alcoólico" : "",
        attribute_2: product.volume || "",
        attribute_2_label: product.volume ? "Volume" : "",
        image_url: product.image_url || "",
        additional_images: [],
        variants: variantsData?.map(v => ({
          id: v.id,
          name: v.name,
          options: v.options || [],
          is_required: v.is_required || false,
          display_order: v.display_order || 0
        })) || []
      });
      await loadProductImages(product.id);
    } else {
      setEditingProduct(null);
      setProductForm(initialForm);
      setProductImages([]);
    }
    setIsDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) {
      toast({ title: "Erro", description: "Nome e preço são obrigatórios", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const productData = {
        name: productForm.name,
        description: productForm.description || null,
        cost_price: productForm.cost_price ? parseFloat(productForm.cost_price) : null,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        is_on_sale: productForm.is_on_sale,
        sale_price: productForm.sale_price ? parseFloat(productForm.sale_price) : null,
        is_featured: productForm.is_featured,
        category_id: productForm.category_id || null,
        brand_id: productForm.brand_id || null,
        alcohol_content: productForm.attribute_1 || null,
        volume: productForm.attribute_2 || null,
        image_url: productForm.image_url || null,
        ...(establishmentId && { establishment_id: establishmentId })
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        await supabase.from("products").update(productData).eq("id", editingProduct.id);
        toast({ title: "Produto atualizado" });
      } else {
        const { data } = await supabase.from("products").insert([productData]).select().single();
        productId = data?.id;
        toast({ title: "Produto criado" });
      }

      // Save additional images
      if (productId && productForm.additional_images.length > 0) {
        const newImages = productForm.additional_images.map((url, index) => ({
          product_id: productId,
          image_url: url,
          display_order: productImages.length + index
        }));
        await supabase.from("product_images").insert(newImages);
      }

      // Save variants
      if (productId) {
        // Delete existing variants
        await supabase.from("product_variants").delete().eq("product_id", productId);
        
        // Insert new variants
        if (productForm.variants.length > 0) {
          const variantsToInsert = productForm.variants.map((v, index) => ({
            product_id: productId,
            name: v.name,
            options: v.options,
            is_required: v.is_required,
            display_order: index
          }));
          await supabase.from("product_variants").insert(variantsToInsert);
        }
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setProductForm(initialForm);
      setProductImages([]);
      loadData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast({ title: "Produto removido" });
    loadData();
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const newActive = !currentActive;
    // Atualização otimista para resposta instantânea
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: newActive } : p)));
    const { error } = await supabase.from("products").update({ active: newActive }).eq("id", id);
    if (error) {
      // Reverte em caso de erro
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, active: currentActive } : p)));
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: newActive ? "Produto exibido na loja" : "Produto ocultado da loja" });
  };

  const handleDeleteProductImage = async (imageId: string) => {
    await supabase.from("product_images").delete().eq("id", imageId);
    setProductImages(prev => prev.filter(img => img.id !== imageId));
    toast({ title: "Imagem removida" });
  };

  const handleAddImage = (url: string) => {
    const alreadyAdded =
      productImages.some((img) => img.image_url === url) ||
      productForm.additional_images.includes(url);

    if (alreadyAdded) {
      toast({
        title: "Imagem já adicionada",
        description: "Escolha uma foto diferente para as imagens adicionais.",
        variant: "destructive",
      });
      // Force reset of the picker so it doesn't keep showing the same preview
      setAdditionalUploadKey((k) => k + 1);
      return;
    }

    setProductForm((prev) => ({
      ...prev,
      additional_images: [...prev.additional_images, url],
    }));

    // Reset the upload component so it doesn't keep the previous preview,
    // preventing the "duplicated image" effect in the UI.
    setAdditionalUploadKey((k) => k + 1);
  };

  const handleRemoveNewImage = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index)
    }));
  };

  const calculateMargin = () => {
    const cost = parseFloat(productForm.cost_price) || 0;
    const price = parseFloat(productForm.price) || 0;
    if (cost === 0 || price === 0) return "0%";
    const margin = ((price - cost) / price) * 100;
    return `${margin.toFixed(1)}%`;
  };

  // Import functions
  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setImportError("Cole o link do cardápio do iFood ou 99food");
      return;
    }

    setImportLoading(true);
    setImportError(null);
    setImportedProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke('import-menu', {
        body: { url: importUrl.trim() }
      });

      if (error) throw error;

      if (data.error) {
        setImportError(data.error);
        return;
      }

      if (data.products && data.products.length > 0) {
        setImportedProducts(data.products.map((p: ImportedProduct) => ({ ...p, selected: true })));
        toast({ title: `${data.products.length} produtos encontrados!` });
      } else {
        setImportError("Nenhum produto encontrado neste cardápio.");
      }
    } catch (error: any) {
      console.error("Import error:", error);
      setImportError("Erro ao importar cardápio. Verifique o link e tente novamente.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleToggleProductSelection = (index: number) => {
    setImportedProducts(prev => prev.map((p, i) => 
      i === index ? { ...p, selected: !p.selected } : p
    ));
  };

  const handleSelectAllProducts = () => {
    const allSelected = importedProducts.every(p => p.selected);
    setImportedProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const handleImportSelectedProducts = async () => {
    const selectedProducts = importedProducts.filter(p => p.selected);
    if (selectedProducts.length === 0) {
      toast({ title: "Selecione pelo menos um produto", variant: "destructive" });
      return;
    }

    setImportingProducts(true);
    let successCount = 0;

    try {
      for (const product of selectedProducts) {
        const productData = {
          name: product.name,
          description: product.description || null,
          price: product.price || 0,
          image_url: product.image_url || null,
          active: true,
          stock: 0,
          ...(establishmentId && { establishment_id: establishmentId })
        };

        const { error } = await supabase.from("products").insert([productData]);
        if (!error) successCount++;
      }

      toast({ title: `${successCount} produtos importados com sucesso!` });
      setIsImportDialogOpen(false);
      setImportUrl("");
      setImportedProducts([]);
      loadData();
    } catch (error: any) {
      toast({ title: "Erro ao importar produtos", description: error.message, variant: "destructive" });
    } finally {
      setImportingProducts(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h3 className="text-lg font-semibold">Produtos ({products.length})</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="gap-1.5">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Importar produtos</span>
          </Button>
          <Button onClick={() => handleOpenDialog()} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Produto</span>
          </Button>
        </div>
      </div>

      <Card className="border-0 bg-card/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imagem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Margem</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const margin = p.cost_price && p.price ? (((p.price - p.cost_price) / p.price) * 100).toFixed(1) : "-";
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image_url ? (
                      <img src={p.image_url} className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.product_categories?.name || "-"}</TableCell>
                  <TableCell>
                    {p.is_on_sale && p.sale_price ? (
                      <div>
                        <span className="line-through text-muted-foreground text-xs">R$ {p.price?.toFixed(2)}</span>
                        <br />
                        <span className="text-destructive font-semibold">R$ {p.sale_price?.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span>R$ {p.price?.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell>{margin !== "-" ? `${margin}%` : "-"}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? "default" : "secondary"}>
                      {p.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(p.id, p.active)}
                        title={p.active ? "Ocultar da loja" : "Mostrar na loja"}
                      >
                        {p.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Preencha os dados do produto</p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Nome */}
            <div>
              <Label>Nome</Label>
              <Input
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Nome do produto..."
              />
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Descrição do produto..."
                rows={3}
              />
            </div>

            {/* Preços */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Custo do Produto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Preço de Venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Estoque</Label>
                <Input
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Margem */}
            {productForm.cost_price && productForm.price && (
              <div className="text-sm text-muted-foreground">
                Margem de lucro: <span className="font-semibold text-foreground">{calculateMargin()}</span>
              </div>
            )}

            {/* Oferta */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_on_sale"
                  checked={productForm.is_on_sale}
                  onCheckedChange={(checked) => setProductForm({ ...productForm, is_on_sale: !!checked })}
                />
                <Label htmlFor="is_on_sale" className="font-medium">Produto em oferta</Label>
              </div>

              {productForm.is_on_sale && (
                <div>
                  <Label>Preço de Venda (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={productForm.sale_price}
                    onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                    placeholder="Preço promocional"
                  />
                </div>
              )}
            </div>

            {/* Destaque */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_featured"
                checked={productForm.is_featured}
                onCheckedChange={(checked) => setProductForm({ ...productForm, is_featured: !!checked })}
              />
              <Label htmlFor="is_featured">Aparecer no carrinho em destaque</Label>
              <span className="text-xs text-muted-foreground">Produtos marcados apareceráo na seção "Peça também" do carrinho</span>
            </div>

            {/* Categoria e Marca */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={productForm.category_id}
                  onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marca</Label>
                <Select
                  value={productForm.brand_id}
                  onValueChange={(value) => setProductForm({ ...productForm, brand_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Atributos Opcionais */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium text-sm">Atributos Adicionais (Opcional)</h4>
              <p className="text-xs text-muted-foreground">Use para informações como teor alcoólico, volume, material, peso, etc.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    value={productForm.attribute_1_label}
                    onChange={(e) => setProductForm({ ...productForm, attribute_1_label: e.target.value })}
                    placeholder="Nome do atributo (ex: Teor Alcoólico)"
                    className="text-sm"
                  />
                  <Input
                    value={productForm.attribute_1}
                    onChange={(e) => setProductForm({ ...productForm, attribute_1: e.target.value })}
                    placeholder="Valor (ex: 4.7%)"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    value={productForm.attribute_2_label}
                    onChange={(e) => setProductForm({ ...productForm, attribute_2_label: e.target.value })}
                    placeholder="Nome do atributo (ex: Volume)"
                    className="text-sm"
                  />
                  <Input
                    value={productForm.attribute_2}
                    onChange={(e) => setProductForm({ ...productForm, attribute_2: e.target.value })}
                    placeholder="Valor (ex: 473ml)"
                  />
                </div>
              </div>
            </div>

            {/* Especificações do Produto */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-sm">Especificações do Produto</h4>
                  <p className="text-xs text-muted-foreground">Adicione grupos de opções como tamanho, sabor, tipo, etc. que o cliente deverá escolher.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductForm({
                    ...productForm,
                    variants: [...productForm.variants, { name: "", options: [], is_required: true, display_order: productForm.variants.length }]
                  })}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Grupo
                </Button>
              </div>

              {productForm.variants.map((variant, index) => (
                <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input
                        value={variant.name}
                        onChange={(e) => {
                          const newVariants = [...productForm.variants];
                          newVariants[index].name = e.target.value;
                          setProductForm({ ...productForm, variants: newVariants });
                        }}
                        placeholder="Nome do grupo (ex: Tamanho, Sabor, Tipo)"
                      />
                      <Input
                        value={variant.options.join(", ")}
                        onChange={(e) => {
                          const newVariants = [...productForm.variants];
                          newVariants[index].options = e.target.value.split(",").map(o => o.trim()).filter(o => o);
                          setProductForm({ ...productForm, variants: newVariants });
                        }}
                        placeholder="Opções separadas por vírgula (ex: Pequeno, Médio, Grande)"
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={variant.is_required}
                          onCheckedChange={(checked) => {
                            const newVariants = [...productForm.variants];
                            newVariants[index].is_required = !!checked;
                            setProductForm({ ...productForm, variants: newVariants });
                          }}
                        />
                        <Label className="text-xs">Obrigatório selecionar</Label>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        const newVariants = productForm.variants.filter((_, i) => i !== index);
                        setProductForm({ ...productForm, variants: newVariants });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {variant.options.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variant.options.map((opt, optIndex) => (
                        <Badge key={optIndex} variant="secondary" className="text-xs">
                          {opt}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Imagem Principal */}
            <div className="space-y-2">
              <Label>Imagem Principal do Produto</Label>
              <div className="p-4 border border-dashed rounded-lg bg-muted/30">
                <ImageUpload
                  currentImageUrl={productForm.image_url}
                  onImageUploaded={(url) => setProductForm({ ...productForm, image_url: url })}
                  bucketName="products"
                />
              </div>
            </div>

            {/* Imagens Adicionais */}
            <div className="space-y-2">
              <Label>Imagens Adicionais (máx. 3)</Label>
              <p className="text-xs text-muted-foreground">
                Adicione até 3 fotos extras para mostrar diferentes ângulos do produto (total de 4 fotos com a principal)
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 px-1">
                {/* Existing images from database */}
                {productImages.map((img) => (
                  <div key={img.id} className="relative group aspect-square">
                    <img src={img.image_url} className="w-full h-full object-cover rounded-lg border border-border" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 shadow-lg"
                      onClick={() => handleDeleteProductImage(img.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* New images pending save */}
                {productForm.additional_images.map((url, index) => (
                  <div key={`new-${index}`} className="relative group aspect-square">
                    <img src={url} className="w-full h-full object-cover rounded-lg border-2 border-primary" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-8 w-8 shadow-lg"
                      onClick={() => handleRemoveNewImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Add new image - only show if less than 3 additional images (total 4 with main) */}
                {(productImages.length + productForm.additional_images.length) < 3 && (
                  <div className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors p-2">
                    <ImageUpload
                      key={`additional-upload-${additionalUploadKey}`}
                      currentImageUrl=""
                      onImageUploaded={handleAddImage}
                      bucketName="products"
                    />
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleSaveProduct} disabled={loading} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Produto
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Importar Produtos
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Importe produtos automaticamente de plataformas de delivery
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Platform options */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/IFood_logo.svg/200px-IFood_logo.svg.png" alt="iFood" className="w-4 h-4 mr-1.5" />
                iFood
              </Badge>
              <Badge variant="outline" className="px-3 py-1.5 text-xs font-medium">
                99food
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="Cole o link do cardápio (iFood ou 99food)"
                  disabled={importLoading}
                />
              </div>
              <Button onClick={handleImportFromUrl} disabled={importLoading} size="sm">
                {importLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
                <span className="ml-2">Buscar</span>
              </Button>
            </div>

            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}

            {importedProducts.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {importedProducts.filter(p => p.selected).length} de {importedProducts.length} selecionados
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleSelectAllProducts}>
                    {importedProducts.every(p => p.selected) ? "Desmarcar todos" : "Selecionar todos"}
                  </Button>
                </div>

                <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                  {importedProducts.map((product, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${product.selected ? 'bg-primary/5' : ''}`}
                      onClick={() => handleToggleProductSelection(index)}
                    >
                      <Checkbox 
                        checked={product.selected} 
                        onCheckedChange={() => handleToggleProductSelection(index)}
                      />
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-primary">
                        R$ {product.price.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleImportSelectedProducts} 
                  disabled={importingProducts || importedProducts.filter(p => p.selected).length === 0}
                  className="w-full"
                >
                  {importingProducts ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Importar {importedProducts.filter(p => p.selected).length} Produtos Selecionados
                </Button>
              </div>
            )}

            {!importLoading && importedProducts.length === 0 && !importError && (
              <div className="text-center py-8 text-muted-foreground">
                <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Cole o link do seu cardápio do iFood ou 99food</p>
                <p className="text-xs mt-1">Os produtos serão importados automaticamente com nome, descrição, preço e imagem</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

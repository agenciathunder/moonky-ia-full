import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  link_type: string;
  link_id: string | null;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface BannerManagementProps {
  establishmentId?: string | null;
}

export const BannerManagement = ({ establishmentId }: BannerManagementProps) => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    image_url: "",
    link_type: "none",
    link_id: "",
    link_url: "",
    is_active: true,
    starts_at: "",
    ends_at: "",
  });

  useEffect(() => {
    loadData();
  }, [establishmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let bannersQuery = supabase
        .from("banners")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (establishmentId) {
        bannersQuery = bannersQuery.eq("establishment_id", establishmentId);
      }
      
      let productsQuery = supabase.from("products").select("id, name").eq("active", true);
      let categoriesQuery = supabase.from("product_categories").select("id, name");
      
      if (establishmentId) {
        productsQuery = productsQuery.eq("establishment_id", establishmentId);
        categoriesQuery = categoriesQuery.eq("establishment_id", establishmentId);
      }

      const [bannersRes, productsRes, categoriesRes] = await Promise.all([
        bannersQuery,
        productsQuery,
        categoriesQuery,
      ]);

      if (bannersRes.data) setBanners(bannersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({
        title: banner.title,
        subtitle: banner.subtitle || "",
        image_url: banner.image_url,
        link_type: banner.link_type || "none",
        link_id: banner.link_id || "",
        link_url: banner.link_url || "",
        is_active: banner.is_active,
        starts_at: banner.starts_at ? banner.starts_at.slice(0, 16) : "",
        ends_at: banner.ends_at ? banner.ends_at.slice(0, 16) : "",
      });
    } else {
      setEditingBanner(null);
      setBannerForm({
        title: "",
        subtitle: "",
        image_url: "",
        link_type: "none",
        link_id: "",
        link_url: "",
        is_active: true,
        starts_at: "",
        ends_at: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!bannerForm.title || !bannerForm.image_url) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e imagem são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const bannerData = {
        title: bannerForm.title,
        subtitle: bannerForm.subtitle || null,
        image_url: bannerForm.image_url,
        link_type: bannerForm.link_type,
        link_id: bannerForm.link_type !== "none" && bannerForm.link_type !== "external" 
          ? bannerForm.link_id 
          : null,
        link_url: bannerForm.link_type === "external" ? bannerForm.link_url : null,
        is_active: bannerForm.is_active,
        starts_at: bannerForm.starts_at || null,
        ends_at: bannerForm.ends_at || null,
      };

      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update(bannerData)
          .eq("id", editingBanner.id);

        if (error) throw error;
        toast({ title: "Banner atualizado com sucesso!" });
      } else {
        const maxOrder = banners.length > 0 
          ? Math.max(...banners.map(b => b.display_order)) + 1 
          : 0;

        const { error } = await supabase
          .from("banners")
          .insert([{ ...bannerData, display_order: maxOrder, establishment_id: establishmentId }]);

        if (error) throw error;
        toast({ title: "Banner criado com sucesso!" });
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving banner:", error);
      toast({
        title: "Erro ao salvar banner",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este banner?")) return;

    try {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Banner removido" });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao remover banner",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);

      if (error) throw error;
      toast({
        title: banner.is_active ? "Banner desativado" : "Banner ativado",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMoveOrder = async (banner: Banner, direction: "up" | "down") => {
    const currentIndex = banners.findIndex((b) => b.id === banner.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const targetBanner = banners[targetIndex];

    try {
      await Promise.all([
        supabase
          .from("banners")
          .update({ display_order: targetBanner.display_order })
          .eq("id", banner.id),
        supabase
          .from("banners")
          .update({ display_order: banner.display_order })
          .eq("id", targetBanner.id),
      ]);

      loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao reordenar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Banners do Slideshow</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os banners exibidos no slideshow da página inicial
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Banner
        </Button>
      </div>

      {loading && banners.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : banners.length === 0 ? (
        <Card className="border-0 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">Nenhum banner cadastrado</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione banners para exibir no slideshow da página inicial
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro banner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 bg-card/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Ordem</TableHead>
                <TableHead className="w-[100px]">Imagem</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner, index) => (
                <TableRow key={banner.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveOrder(banner, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveOrder(banner, "down")}
                        disabled={index === banners.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-20 h-12 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{banner.title}</p>
                      {banner.subtitle && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {banner.subtitle}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground capitalize">
                      {banner.link_type === "none"
                        ? "Sem link"
                        : banner.link_type === "product"
                        ? "Produto"
                        : banner.link_type === "category"
                        ? "Categoria"
                        : "Externo"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(banner)}
                      className={`gap-1 ${
                        banner.is_active
                          ? "text-emerald-600 hover:text-emerald-700"
                          : "text-muted-foreground"
                      }`}
                    >
                      {banner.is_active ? (
                        <>
                          <Eye className="w-4 h-4" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Inativo
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(banner)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(banner.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Banner Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBanner ? "Editar Banner" : "Novo Banner"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Imagem do Banner *</Label>
              <ImageUpload
                onImageUploaded={(url) =>
                  setBannerForm({ ...bannerForm, image_url: url })
                }
                currentImageUrl={bannerForm.image_url}
                bucketName="banners"
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 1920x600px ou proporção 16:5
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={bannerForm.title}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, title: e.target.value })
                  }
                  placeholder="Ex: Promoção de Verão"
                />
              </div>

              <div className="space-y-2">
                <Label>Subtítulo</Label>
                <Input
                  value={bannerForm.subtitle}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, subtitle: e.target.value })
                  }
                  placeholder="Ex: Até 50% de desconto"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Link</Label>
              <Select
                value={bannerForm.link_type}
                onValueChange={(value) =>
                  setBannerForm({ ...bannerForm, link_type: value, link_id: "", link_url: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem link</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="category">Categoria</SelectItem>
                  <SelectItem value="external">Link externo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bannerForm.link_type === "product" && (
              <div className="space-y-2">
                <Label>Selecionar Produto</Label>
                <Select
                  value={bannerForm.link_id}
                  onValueChange={(value) =>
                    setBannerForm({ ...bannerForm, link_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bannerForm.link_type === "category" && (
              <div className="space-y-2">
                <Label>Selecionar Categoria</Label>
                <Select
                  value={bannerForm.link_id}
                  onValueChange={(value) =>
                    setBannerForm({ ...bannerForm, link_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bannerForm.link_type === "external" && (
              <div className="space-y-2">
                <Label>URL Externa</Label>
                <Input
                  value={bannerForm.link_url}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, link_url: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início da exibição (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={bannerForm.starts_at}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, starts_at: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Fim da exibição (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={bannerForm.ends_at}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, ends_at: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={bannerForm.is_active}
                onCheckedChange={(checked) =>
                  setBannerForm({ ...bannerForm, is_active: checked })
                }
              />
              <Label>Banner ativo</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingBanner ? "Salvar Alterações" : "Criar Banner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

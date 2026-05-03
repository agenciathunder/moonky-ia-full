import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, GripVertical, ChevronUp, ChevronDown, Trash2 } from "lucide-react";

interface CategoryManagementProps {
  establishmentId?: string | null;
}

export const CategoryManagement = ({ establishmentId }: CategoryManagementProps) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "" });

  useEffect(() => {
    loadCategories();
  }, [establishmentId]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("product_categories")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (establishmentId) {
        query = query.eq("establishment_id", establishmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    try {
      if (editingCategory) {
        await supabase
          .from("product_categories")
          .update({ name: categoryForm.name })
          .eq("id", editingCategory.id);
        toast({ title: "Categoria atualizada" });
      } else {
        // Get the highest display_order and add 1
        const maxOrder = categories.length > 0 
          ? Math.max(...categories.map(c => c.display_order || 0)) 
          : -1;
        
        await supabase.from("product_categories").insert([{
          name: categoryForm.name,
          display_order: maxOrder + 1,
          establishment_id: establishmentId
        }]);
        toast({ title: "Categoria criada" });
      }
      
      setIsDialogOpen(false);
      setCategoryForm({ name: "" });
      setEditingCategory(null);
      loadCategories();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Excluir categoria? Produtos desta categoria ficarão sem categoria.")) return;
    
    try {
      await supabase.from("product_categories").delete().eq("id", id);
      toast({ title: "Categoria removida" });
      loadCategories();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const moveCategory = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === categories.length - 1)
    ) {
      return;
    }

    const newCategories = [...categories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    // Swap positions
    [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
    
    // Update display_order for both categories
    try {
      await Promise.all([
        supabase
          .from("product_categories")
          .update({ display_order: index })
          .eq("id", newCategories[index].id),
        supabase
          .from("product_categories")
          .update({ display_order: targetIndex })
          .eq("id", newCategories[targetIndex].id)
      ]);
      
      setCategories(newCategories);
      toast({ title: "Ordem atualizada" });
    } catch (error: any) {
      toast({ title: "Erro ao reordenar", description: error.message, variant: "destructive" });
      loadCategories(); // Reload on error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h3 className="text-lg font-semibold">Categorias</h3>
          <p className="text-sm text-muted-foreground">Use as setas para ordenar as categorias na loja</p>
        </div>
        <Button onClick={() => { 
          setEditingCategory(null); 
          setCategoryForm({ name: "" }); 
          setIsDialogOpen(true); 
        }} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>
      
      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {categories.map((c, index) => (
          <Card key={c.id} className="p-4 border-0 bg-card/50">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={() => moveCategory(index, "up")}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  disabled={index === categories.length - 1}
                  onClick={() => moveCategory(index, "down")}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium">{c.name}</span>
                <p className="text-xs text-muted-foreground">Posição: {index + 1}</p>
              </div>
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { 
                    setEditingCategory(c); 
                    setCategoryForm({ name: c.name }); 
                    setIsDialogOpen(true); 
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDeleteCategory(c.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {categories.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground border-0 bg-card/50">
            Nenhuma categoria cadastrada
          </Card>
        )}
      </div>
      
      {/* Desktop table */}
      <Card className="hidden md:block border-0 bg-card/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Ordem</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c, index) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      disabled={index === 0}
                      onClick={() => moveCategory(index, "up")}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      disabled={index === categories.length - 1}
                      onClick={() => moveCategory(index, "down")}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { 
                        setEditingCategory(c); 
                        setCategoryForm({ name: c.name }); 
                        setIsDialogOpen(true); 
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input 
                value={categoryForm.name} 
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} 
                placeholder="Ex: Bebidas, Destilados, Cervejas..."
              />
            </div>
            <Button onClick={handleSaveCategory} className="w-full">
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

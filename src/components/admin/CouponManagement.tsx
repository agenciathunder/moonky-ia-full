import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Copy, Tag, Percent, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  minimum_order_value: number | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

interface CouponManagementProps {
  establishmentId?: string | null;
}

export function CouponManagement({ establishmentId }: CouponManagementProps) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    minimum_order_value: "",
    max_uses: "",
    valid_from: "",
    valid_until: "",
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
  }, [establishmentId]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (establishmentId) {
        query = query.eq("establishment_id", establishmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCoupons(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cupons",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Informe o código do cupom",
        variant: "destructive",
      });
      return;
    }

    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      toast({
        title: "Valor do desconto obrigatório",
        description: "Informe um valor de desconto válido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const couponData = {
        code: form.code.toUpperCase().trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        minimum_order_value: form.minimum_order_value ? parseFloat(form.minimum_order_value) : null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
        ...(establishmentId && { establishment_id: establishmentId })
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;
        toast({ title: "Cupom atualizado" });
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert([couponData]);

        if (error) throw error;
        toast({ title: "Cupom criado" });
      }

      resetForm();
      setIsDialogOpen(false);
      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cupom",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      minimum_order_value: coupon.minimum_order_value?.toString() || "",
      max_uses: coupon.max_uses?.toString() || "",
      valid_from: coupon.valid_from ? coupon.valid_from.split('T')[0] : "",
      valid_until: coupon.valid_until ? coupon.valid_until.split('T')[0] : "",
      is_active: coupon.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;

    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Cupom removido" });
      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Erro ao remover cupom",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;
      toast({ 
        title: coupon.is_active ? "Cupom desativado" : "Cupom ativado" 
      });
      loadCoupons();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado!" });
  };

  const resetForm = () => {
    setEditingCoupon(null);
    setForm({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      minimum_order_value: "",
      max_uses: "",
      valid_from: "",
      valid_until: "",
      is_active: true,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" />
            Cupons de Desconto
          </h2>
          <p className="text-muted-foreground">
            Gerencie os cupons promocionais da loja
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Editar Cupom" : "Criar Cupom"}
              </DialogTitle>
              <DialogDescription>
                {editingCoupon ? "Atualize os dados do cupom" : "Preencha os dados do novo cupom"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label>Código *</Label>
                <Input
                  placeholder="Ex: DESCONTO10"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  placeholder="Descrição do cupom"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Desconto *</Label>
                  <Select
                    value={form.discount_type}
                    onValueChange={(value) => setForm({ ...form, discount_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Porcentagem
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Valor Fixo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor do Desconto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={form.discount_type === "percentage" ? "10" : "5.00"}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {form.discount_type === "percentage" ? "%" : "R$"}
                  </span>
                </div>
              </div>
              <div>
                <Label>Valor Mínimo do Pedido</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00 (sem mínimo)"
                  value={form.minimum_order_value}
                  onChange={(e) => setForm({ ...form, minimum_order_value: e.target.value })}
                />
              </div>
              <div>
                <Label>Limite de Usos</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Válido a partir de</Label>
                  <Input
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Válido até</Label>
                  <Input
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Cupom ativo</Label>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCoupon ? "Salvar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading && coupons.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum cupom cadastrado</p>
        </div>
      ) : (
        <div className="border-0 rounded-lg overflow-x-auto bg-card/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {coupon.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyCode(coupon.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {coupon.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">
                      {coupon.discount_type === "percentage" 
                        ? `${coupon.discount_value}%` 
                        : formatPrice(coupon.discount_value)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {coupon.minimum_order_value 
                      ? formatPrice(coupon.minimum_order_value) 
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {coupon.current_uses}
                    {coupon.max_uses && `/${coupon.max_uses}`}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      {coupon.valid_from && (
                        <span>De: {formatDate(coupon.valid_from)}</span>
                      )}
                      {coupon.valid_until && (
                        <span className={isExpired(coupon.valid_until) ? "text-destructive" : ""}>
                          {coupon.valid_from && <br />}
                          Até: {formatDate(coupon.valid_until)}
                          {isExpired(coupon.valid_until) && " (expirado)"}
                        </span>
                      )}
                      {!coupon.valid_from && !coupon.valid_until && "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.is_active}
                      onCheckedChange={() => handleToggleActive(coupon)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

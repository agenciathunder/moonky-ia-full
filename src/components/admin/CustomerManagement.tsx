import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, Pencil, Trash2, Ban, UserCheck, Loader2, Users, Phone, Mail, Calendar, ShoppingBag, Ticket, Eye, EyeOff, Lock, UserCog } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  original_email: string | null;
  phone: string | null;
  created_at: string;
  is_blocked?: boolean;
  orders_count?: number;
  tickets_count?: number;
  total_spent?: number;
  last_order_date?: string | null;
  role?: 'user' | 'employee';
}

interface CustomerManagementProps {
  establishmentId: string | null;
}

export const CustomerManagement = ({ establishmentId }: CustomerManagementProps) => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [customerToBlock, setCustomerToBlock] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user" as "user" | "employee"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (establishmentId) {
      loadCustomers();
    }
  }, [establishmentId]);

  const loadCustomers = async () => {
    if (!establishmentId) return;
    
    setLoading(true);
    try {
      // Get all users registered for this establishment via profiles.establishment_id
      const { data: registeredProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, original_email, phone, created_at, establishment_id")
        .eq("establishment_id", establishmentId)
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        throw profilesError;
      }

      // Also get users who made orders or bought tickets (may not have establishment_id set)
      const [ordersResult, ticketsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("user_id")
          .eq("establishment_id", establishmentId),
        supabase
          .from("tickets")
          .select("user_id, event_id, events!inner(establishment_id)")
          .eq("events.establishment_id", establishmentId)
      ]);

      const orderUserIds = ordersResult.data?.map(o => o.user_id).filter(Boolean) || [];
      const ticketUserIds = ticketsResult.data?.map(t => t.user_id).filter(Boolean) || [];
      
      // Combine all user IDs
      const registeredUserIds = registeredProfiles?.map(p => p.id) || [];
      const allUserIds = [...new Set([...registeredUserIds, ...orderUserIds, ...ticketUserIds])];

      if (allUserIds.length === 0) {
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Get all profiles (including those from orders/tickets that may not have establishment_id)
      let allProfiles = registeredProfiles || [];
      
      // Find additional profiles from orders/tickets not in registeredProfiles
      const additionalUserIds = allUserIds.filter(id => !registeredUserIds.includes(id));
      if (additionalUserIds.length > 0) {
        const { data: additionalProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, original_email, phone, created_at, establishment_id")
          .in("id", additionalUserIds);
        
        if (additionalProfiles) {
          allProfiles = [...allProfiles, ...additionalProfiles];
        }
      }

      // Get statistics and role for each customer
      const customersWithStats = await Promise.all(
        allProfiles.map(async (profile) => {
          // Get orders statistics
          const { data: orderStats } = await supabase
            .from("orders")
            .select("total, created_at")
            .eq("user_id", profile.id)
            .eq("establishment_id", establishmentId)
            .order("created_at", { ascending: false });

          // Get tickets count
          const { data: ticketStats } = await supabase
            .from("tickets")
            .select("id, events!inner(establishment_id)")
            .eq("user_id", profile.id)
            .eq("events.establishment_id", establishmentId);

          // Check if user is an employee of this establishment
          const { data: memberData } = await supabase
            .from("establishment_members")
            .select("role")
            .eq("user_id", profile.id)
            .eq("establishment_id", establishmentId)
            .maybeSingle();

          const ordersCount = orderStats?.length || 0;
          const ticketsCount = ticketStats?.length || 0;
          const totalSpent = orderStats?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;
          const lastOrderDate = orderStats?.[0]?.created_at || null;
          const userRole: 'user' | 'employee' = memberData?.role === 'employee' ? 'employee' : 'user';

          return {
            ...profile,
            orders_count: ordersCount,
            tickets_count: ticketsCount,
            total_spent: totalSpent,
            last_order_date: lastOrderDate,
            is_blocked: false,
            role: userRole
          };
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
      email: customer.original_email || customer.email || "",
      password: "",
      confirmPassword: "",
      role: customer.role || "user"
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer || !establishmentId) return;

    // Validate password if provided
    if (editForm.password) {
      if (editForm.password.length < 6) {
        toast({
          title: "Senha muito curta",
          description: "A senha deve ter no mínimo 6 caracteres.",
          variant: "destructive"
        });
        return;
      }
      if (editForm.password !== editForm.confirmPassword) {
        toast({
          title: "Senhas não conferem",
          description: "A senha e a confirmação devem ser iguais.",
          variant: "destructive"
        });
        return;
      }
    }

    setSaving(true);
    try {
      // Use edge function to update customer (includes password and role update capability)
      const { data, error } = await supabase.functions.invoke("update-customer", {
        body: {
          customer_id: editingCustomer.id,
          establishment_id: establishmentId,
          full_name: editForm.full_name,
          phone: editForm.phone,
          password: editForm.password || undefined,
          role: editForm.role
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Cliente atualizado com sucesso" });
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      loadCustomers();
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o cliente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    setSaving(true);
    try {
      toast({ 
        title: "Cliente removido",
        description: "O cliente foi removido da lista deste estabelecimento."
      });
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
    } catch (error) {
      console.error("Error removing customer:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o cliente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!customerToBlock) return;

    setSaving(true);
    try {
      const newBlockStatus = !customerToBlock.is_blocked;
      
      setCustomers(prev => 
        prev.map(c => 
          c.id === customerToBlock.id 
            ? { ...c, is_blocked: newBlockStatus } 
            : c
        )
      );

      toast({ 
        title: newBlockStatus ? "Cliente bloqueado" : "Cliente desbloqueado",
        description: newBlockStatus 
          ? "O cliente não poderá mais fazer pedidos neste estabelecimento."
          : "O cliente pode fazer pedidos novamente."
      });
      setIsBlockDialogOpen(false);
      setCustomerToBlock(null);
    } catch (error) {
      console.error("Error blocking customer:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do cliente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${formattedPhone}`;
  };

  // Display original_email if available, otherwise email (without the slug prefix)
  const getDisplayEmail = (customer: Customer | null) => {
    if (!customer) return "-";
    return customer.original_email || customer.email || "-";
  };

  const filteredCustomers = customers.filter(c => {
    const search = searchTerm.toLowerCase();
    const displayEmail = getDisplayEmail(c);
    return (
      (c.full_name?.toLowerCase().includes(search)) ||
      (displayEmail?.toLowerCase().includes(search)) ||
      (c.phone?.includes(search))
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1 sm:px-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Usuários</h3>
            <p className="text-sm text-muted-foreground">{customers.length} usuário(s) cadastrado(s)</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative px-1 sm:px-0">
        <Search className="absolute left-4 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Mobile Cards */}
      <div className="grid gap-3 md:hidden px-1">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="border border-border/40 bg-card overflow-hidden">
            <CardContent className="p-0">
              {/* Customer Header */}
              <div className="p-4 border-b border-border/40 bg-muted/30">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-base">{customer.full_name || "Sem nome"}</p>
                      {customer.is_blocked && (
                        <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cliente desde {formatDate(customer.created_at)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mr-2 -mt-1">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(customer)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {customer.phone && getWhatsAppLink(customer.phone) && (
                        <DropdownMenuItem asChild>
                          <a href={getWhatsAppLink(customer.phone)!} target="_blank" rel="noopener noreferrer">
                            <WhatsAppIcon size={16} className="mr-2 text-green-600" />
                            Conversar no WhatsApp
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => {
                          setCustomerToBlock(customer);
                          setIsBlockDialogOpen(true);
                        }}
                      >
                        {customer.is_blocked ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Desbloquear
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            Bloquear
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setCustomerToDelete(customer);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-4 space-y-3">
                {/* Contact */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate text-foreground">{getDisplayEmail(customer)}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground">{customer.phone}</span>
                      </div>
                      {getWhatsAppLink(customer.phone) && (
                        <a
                          href={getWhatsAppLink(customer.phone)!}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5 text-green-600 border-green-600/30 hover:bg-green-50 hover:text-green-700"
                          >
                            <WhatsAppIcon size={16} />
                            <span className="text-xs">Conversar</span>
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/40">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-lg font-semibold">{customer.orders_count}</p>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Ticket className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-lg font-semibold">{customer.tickets_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Ingressos</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(customer.total_spent || 0)}</p>
                  </div>
                </div>

                {/* Last Order */}
                {customer.last_order_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Último pedido: {formatDate(customer.last_order_date)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <Card className="border border-border/40 bg-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              {searchTerm ? "Nenhum usuário encontrado com esse termo." : "Nenhum usuário cadastrado ainda."}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block border border-border/40 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Usuário</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-center">Ingressos</TableHead>
              <TableHead className="text-right">Total Gasto</TableHead>
              <TableHead>Último Pedido</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">WhatsApp</TableHead>
              <TableHead className="w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{customer.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {formatDate(customer.created_at)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-sm">
                    <p className="text-muted-foreground truncate max-w-[200px]">{getDisplayEmail(customer)}</p>
                    {customer.phone && <p className="text-muted-foreground">{customer.phone}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{customer.orders_count}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{customer.tickets_count || 0}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-primary">
                  {formatCurrency(customer.total_spent || 0)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(customer.last_order_date)}
                </TableCell>
                <TableCell className="text-center">
                  {customer.is_blocked ? (
                    <Badge variant="destructive">Bloqueado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-green-600 border-green-600/30">Ativo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {customer.phone && getWhatsAppLink(customer.phone) ? (
                    <a
                      href={getWhatsAppLink(customer.phone)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100">
                        <WhatsAppIcon size={18} />
                      </Button>
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(customer)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {customer.phone && getWhatsAppLink(customer.phone) && (
                        <DropdownMenuItem asChild>
                          <a href={getWhatsAppLink(customer.phone)!} target="_blank" rel="noopener noreferrer">
                            <WhatsAppIcon size={16} className="mr-2 text-green-600" />
                            Conversar no WhatsApp
                          </a>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => {
                          setCustomerToBlock(customer);
                          setIsBlockDialogOpen(true);
                        }}
                      >
                        {customer.is_blocked ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Desbloquear
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            Bloquear
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setCustomerToDelete(customer);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "Nenhum usuário encontrado com esse termo." : "Nenhum usuário cadastrado ainda."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg w-full mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-border/40">
            <DialogTitle className="text-lg sm:text-xl">Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-4">
            {/* Personal Info Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Informações Pessoais
              </h4>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder="Nome do cliente"
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={editForm.email}
                      disabled
                      className="pl-10 h-11 bg-muted"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado por segurança.</p>
                </div>
              </div>
            </div>

            {/* Role Section */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Tipo de Acesso
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="role">Função do Usuário</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: "user" | "employee") => setEditForm({ ...editForm, role: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Usuário (Cliente)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <UserCog className="w-4 h-4" />
                        <span>Funcionário</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {editForm.role === 'employee' 
                    ? "Funcionários têm acesso ao PDV e Scanner de ingressos."
                    : "Usuários podem apenas fazer compras e visualizar o catálogo."
                  }
                </p>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Alterar Senha
                <span className="text-xs font-normal">(opcional)</span>
              </h4>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10 h-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={editForm.confirmPassword}
                      onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                      placeholder="Repita a senha"
                      className="pr-10 h-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a senha atual do cliente.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-border/40">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={saving}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário <strong>{customerToDelete?.full_name || getDisplayEmail(customerToDelete as Customer)}</strong> será removido da lista deste estabelecimento. 
              Esta ação remove apenas a associação com seu estabelecimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation */}
      <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {customerToBlock?.is_blocked ? "Desbloquear usuário?" : "Bloquear usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {customerToBlock?.is_blocked 
                ? `O usuário ${customerToBlock?.full_name || getDisplayEmail(customerToBlock as Customer)} poderá fazer pedidos novamente.`
                : `O usuário ${customerToBlock?.full_name || getDisplayEmail(customerToBlock as Customer)} não poderá mais fazer pedidos neste estabelecimento.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBlockToggle}
              className={customerToBlock?.is_blocked ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {customerToBlock?.is_blocked ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

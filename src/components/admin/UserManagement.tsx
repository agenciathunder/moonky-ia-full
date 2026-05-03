import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Search, Filter, Loader2, Pencil, Trash2, 
  User, Shield, Building2, Mail, Phone, Eye, EyeOff,
  X, ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserData {
  id: string;
  email: string | null;
  original_email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  establishment_id: string | null;
  establishment?: { name: string; slug: string } | null;
  is_master_admin?: boolean;
  establishment_role?: string | null;
}

interface Establishment {
  id: string;
  name: string;
  slug: string;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstablishment, setFilterEstablishment] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    establishment_id: "",
    user_type: "user" as "user" | "employee" | "store_admin" | "master_admin"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profiles with establishment info
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          original_email,
          full_name,
          phone,
          created_at,
          establishment_id,
          establishments:establishment_id (name, slug)
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Load user_roles to identify master admins
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");

      const adminUserIds = new Set(rolesData?.map(r => r.user_id) || []);

      // Load establishment_members to get roles
      const { data: membersData } = await supabase
        .from("establishment_members")
        .select("user_id, role, establishment_id");

      const memberMap = new Map(membersData?.map(m => [m.user_id, m.role]) || []);

      // Map profiles with admin status and establishment role
      const mappedUsers: UserData[] = (profilesData || []).map((profile: any) => ({
        id: profile.id,
        email: profile.email,
        original_email: profile.original_email,
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        establishment_id: profile.establishment_id,
        establishment: profile.establishments,
        is_master_admin: adminUserIds.has(profile.id),
        establishment_role: memberMap.get(profile.id) || null
      }));

      setUsers(mappedUsers);

      // Load establishments
      const { data: estData } = await supabase
        .from("establishments")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (estData) setEstablishments(estData);

    } catch (error) {
      console.error("Error loading users:", error);
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserForm({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      establishment_id: "",
      user_type: "user"
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    
    // Determine user type based on roles
    let userType: "user" | "employee" | "store_admin" | "master_admin" = "user";
    if (user.is_master_admin) {
      userType = "master_admin";
    } else if (user.establishment_role === "admin") {
      userType = "store_admin";
    } else if (user.establishment_role === "employee") {
      userType = "employee";
    }
    
    setUserForm({
      full_name: user.full_name || "",
      email: user.original_email || user.email || "",
      phone: user.phone || "",
      password: "",
      establishment_id: user.establishment_id || "",
      user_type: userType
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!userForm.full_name.trim() || !userForm.email.trim()) {
      toast({ title: "Erro", description: "Nome e email são obrigatórios", variant: "destructive" });
      return;
    }

    if (!editingUser && !userForm.password) {
      toast({ title: "Erro", description: "Senha é obrigatória para novo usuário", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Determine flags based on user_type
      const is_master_admin = userForm.user_type === "master_admin";
      let establishment_role = "user";
      if (userForm.user_type === "store_admin") {
        establishment_role = "admin";
      } else if (userForm.user_type === "employee") {
        establishment_role = "employee";
      }
      
      const payload: any = {
        action: editingUser ? "update" : "create",
        full_name: userForm.full_name,
        email: userForm.email,
        phone: userForm.phone || null,
        establishment_id: userForm.establishment_id || null,
        establishment_role: establishment_role,
        is_master_admin: is_master_admin
      };

      if (editingUser) {
        payload.user_id = editingUser.id;
      }

      if (userForm.password) {
        payload.password = userForm.password;
      }

      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: payload
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: editingUser ? "Usuário atualizado!" : "Usuário criado!" });
      setIsDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserData) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", user_id: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Usuário excluído com sucesso!" });
      loadData();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const getRoleBadge = (user: UserData) => {
    if (user.is_master_admin) {
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Shield className="w-3 h-3 mr-1" />Admin Master</Badge>;
    }
    if (user.establishment_role === "admin") {
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Shield className="w-3 h-3 mr-1" />Admin Loja</Badge>;
    }
    if (user.establishment_role === "employee") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><User className="w-3 h-3 mr-1" />Funcionário</Badge>;
    }
    return <Badge variant="secondary"><User className="w-3 h-3 mr-1" />Usuário</Badge>;
  };

  // Filtered users
  const filteredUsers = users.filter(user => {
    const displayEmail = user.original_email || user.email;
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (displayEmail?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (user.phone?.includes(searchTerm) || false);

    const matchesEstablishment = 
      filterEstablishment === "all" || 
      (filterEstablishment === "none" && !user.establishment_id) ||
      user.establishment_id === filterEstablishment;

    const matchesRole = 
      filterRole === "all" ||
      (filterRole === "master" && user.is_master_admin) ||
      (filterRole === "admin" && user.establishment_role === "admin") ||
      (filterRole === "employee" && user.establishment_role === "employee") ||
      (filterRole === "user" && !user.is_master_admin && user.establishment_role !== "admin" && user.establishment_role !== "employee");

    return matchesSearch && matchesEstablishment && matchesRole;
  });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Usuários</h2>
          <p className="text-sm text-muted-foreground">{filteredUsers.length} usuários encontrados</p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/40">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={filterEstablishment} onValueChange={setFilterEstablishment}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background">
                <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Estabelecimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estabelecimentos</SelectItem>
                <SelectItem value="none">Sem estabelecimento</SelectItem>
                {establishments.map(est => (
                  <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <Shield className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="master">Admin Master</SelectItem>
                <SelectItem value="admin">Admin Loja</SelectItem>
                <SelectItem value="employee">Funcionário</SelectItem>
                <SelectItem value="user">Usuário</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-card/50 border-border/40">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="md:hidden divide-y divide-border">
                {filteredUsers.map(user => {
                  const displayEmail = user.original_email || user.email;
                  return (
                    <div key={user.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{user.full_name || "Sem nome"}</p>
                            <p className="text-xs text-muted-foreground truncate">{displayEmail || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                            className="h-8 w-8"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O usuário <strong>{user.full_name || displayEmail}</strong> será removido permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(user)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {getRoleBadge(user)}
                        {user.establishment && (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="w-3 h-3 mr-1" />
                            {user.establishment.name}
                          </Badge>
                        )}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold">Usuário</TableHead>
                      <TableHead className="font-semibold">Contato</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="font-semibold">Estabelecimento</TableHead>
                      <TableHead className="font-semibold hidden xl:table-cell">Criado em</TableHead>
                      <TableHead className="text-right font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => {
                      const displayEmail = user.original_email || user.email;
                      return (
                        <TableRow key={user.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{user.full_name || "Sem nome"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="truncate">{displayEmail || "-"}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(user)}</TableCell>
                          <TableCell>
                            {user.establishment ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{user.establishment.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-muted-foreground text-sm">
                            {user.created_at ? format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(user)}
                                className="h-8 w-8"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O usuário <strong>{user.full_name || displayEmail}</strong> será removido permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(user)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input
                  id="full_name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Nome do usuário"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">WhatsApp</Label>
                <Input
                  id="phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <Label htmlFor="password">
                  {editingUser ? "Nova senha (deixe vazio para manter)" : "Senha *"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder={editingUser ? "••••••••" : "Mínimo 6 caracteres"}
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
            </div>

            {/* User Type Selection */}
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label>Tipo de Usuário *</Label>
                <Select
                  value={userForm.user_type}
                  onValueChange={(value: "user" | "employee" | "store_admin" | "master_admin") => setUserForm({ ...userForm, user_type: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Usuário</span>
                          <span className="text-xs text-muted-foreground ml-2">Acesso apenas à loja (compras/catálogo)</span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="employee">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-500" />
                        <div>
                          <span className="font-medium">Funcionário</span>
                          <span className="text-xs text-muted-foreground ml-2">Acesso somente a PDV e Eventos</span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="store_admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <div>
                          <span className="font-medium">Admin da Loja</span>
                          <span className="text-xs text-muted-foreground ml-2">Controle geral do estabelecimento</span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="master_admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-500" />
                        <div>
                          <span className="font-medium">Admin Master</span>
                          <span className="text-xs text-muted-foreground ml-2">Acesso ao painel Admin Master</span>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Establishment - Read-only for existing users, selectable only for new users OR if Master Admin */}
              <div>
                <Label>Estabelecimento vinculado</Label>
                {editingUser && userForm.establishment_id ? (
                  // Show as read-only badge for existing users with establishment
                  <div className="mt-1.5 p-3 bg-muted/50 rounded-md border border-border">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">
                        {establishments.find(e => e.id === userForm.establishment_id)?.name || "Estabelecimento"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      O usuário está vinculado a este estabelecimento (definido no momento do cadastro)
                    </p>
                  </div>
                ) : (
                  // Selectable for new users or users without establishment
                  <Select
                    value={userForm.establishment_id || "none"}
                    onValueChange={(value) => setUserForm({ ...userForm, establishment_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Selecione um estabelecimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (Admin Master sem loja)</SelectItem>
                      {establishments.map(est => (
                        <SelectItem key={est.id} value={est.id}>{est.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {userForm.user_type !== "master_admin" && !userForm.establishment_id && !editingUser && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Para usuários e admins de loja, o estabelecimento é obrigatório
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? "Salvar" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;

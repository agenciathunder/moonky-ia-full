import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useEstablishmentAdmin } from "@/hooks/useEstablishmentAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { Package, Plus, Pencil, Loader2, Tag } from "lucide-react";
import { BannerManagement } from "@/components/admin/BannerManagement";
import { StoreSettings } from "@/components/admin/StoreSettings";
import { CouponManagement } from "@/components/admin/CouponManagement";
import { EventManagement } from "@/components/admin/EventManagement";
import { CustomerManagement } from "@/components/admin/CustomerManagement";
import { ProductManagement } from "@/components/admin/ProductManagement";
import { CategoryManagement } from "@/components/admin/CategoryManagement";
import { PDV } from "@/components/admin/PDV";
import { OrdersKanban } from "@/components/admin/OrdersKanban";
import { DashboardOverview } from "@/components/admin/DashboardOverview";
import { WalletManagement } from "@/components/admin/WalletManagement";
import { TicketScanner } from "@/components/admin/TicketScanner";
import { FinancialReport } from "@/components/admin/FinancialReport";
import { AdminSidebar, getMenuItemLabel } from "@/components/admin/AdminSidebar";
import { SuspendedAccountScreen } from "@/components/admin/SuspendedAccountScreen";
import { PlanExpirationBanner } from "@/components/admin/PlanExpirationBanner";
import { NumberVisibilityProvider, useNumberVisibility } from "@/contexts/NumberVisibilityContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { WhatsAppSettings } from "@/components/admin/WhatsAppSettings";

const NumberVisibilityToggle = () => {
  const { visible, toggle } = useNumberVisibility();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label={visible ? "Ocultar valores" : "Mostrar valores"}
      title={visible ? "Ocultar valores" : "Mostrar valores"}
    >
      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin: isMasterAdmin, loading: masterAdminLoading } = useAdmin();
  const { 
    isEstablishmentAdmin, 
    isEstablishmentMember,
    isEmployee,
    membership, 
    loading: establishmentLoading, 
    establishmentId, 
    isSuspended 
  } = useEstablishmentAdmin();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brandForm, setBrandForm] = useState({ name: "", logo_url: "" });

  const isLoading = masterAdminLoading || establishmentLoading;
  // Allow access for master admins, establishment admins, and employees
  const hasAccess = isMasterAdmin || isEstablishmentMember;

  // Set default tab for employees to PDV
  useEffect(() => {
    if (isEmployee && !isLoading) {
      setActiveTab("pdv");
    }
  }, [isEmployee, isLoading]);

  useEffect(() => {
    if (!isLoading && !hasAccess) {
      toast({ 
        title: "Acesso negado", 
        description: "Você não tem permissão para acessar esta página.", 
        variant: "destructive" 
      });
      navigate("/");
    }
  }, [hasAccess, isLoading, navigate, toast]);

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess, activeTab, establishmentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build query with establishment filter
      let brandsQuery = supabase.from("brands").select("*").order("name");
      
      // Filter by establishment if not master admin
      if (!isMasterAdmin && establishmentId) {
        brandsQuery = brandsQuery.eq("establishment_id", establishmentId);
      }

      const { data: brandsRes } = await brandsQuery;
      
      if (brandsRes) setBrands(brandsRes);

      if (activeTab === "products" || activeTab === "overview") {
        let productsQuery = supabase
          .from("products")
          .select("*, brands(id, name), product_categories(id, name)")
          .order("created_at", { ascending: false });
        
        if (!isMasterAdmin && establishmentId) {
          productsQuery = productsQuery.eq("establishment_id", establishmentId);
        }
        
        const { data: productsData } = await productsQuery;
        if (productsData) setProducts(productsData);
      }
      
      if (activeTab === "orders" || activeTab === "overview") {
        let ordersQuery = supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (!isMasterAdmin && establishmentId) {
          ordersQuery = ordersQuery.eq("establishment_id", establishmentId);
        }
        
        const { data: ordersData } = await ordersQuery;
        if (ordersData) setOrders(ordersData);
      }
      
      if (activeTab === "users" || activeTab === "overview") {
        // For establishment admins, show only users who ordered from them
        if (!isMasterAdmin && establishmentId) {
          const { data: orderUsers } = await supabase
            .from("orders")
            .select("user_id")
            .eq("establishment_id", establishmentId);
          
          if (orderUsers) {
            const userIds = [...new Set(orderUsers.map(o => o.user_id).filter(Boolean))];
            if (userIds.length > 0) {
              const { data: usersData } = await supabase
                .from("profiles")
                .select("*")
                .in("id", userIds)
                .order("created_at", { ascending: false });
              if (usersData) setUsers(usersData);
            } else {
              setUsers([]);
            }
          }
        } else {
          const { data: usersData } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });
          if (usersData) setUsers(usersData);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBrand = async () => {
    const brandData = {
      ...brandForm,
      establishment_id: establishmentId
    };
    
    if (editingBrand) {
      await supabase.from("brands").update(brandForm).eq("id", editingBrand.id);
    } else {
      await supabase.from("brands").insert([brandData]);
    }
    
    setIsBrandDialogOpen(false);
    setBrandForm({ name: "", logo_url: "" });
    setEditingBrand(null);
    loadData();
    toast({ title: editingBrand ? "Marca atualizada" : "Marca criada" });
  };

  if (isLoading || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show suspended screen if establishment is suspended (but not for master admins)
  if (isSuspended && !isMasterAdmin) {
    return <SuspendedAccountScreen establishmentName={membership?.establishment?.name} />;
  }

  return (
    <NumberVisibilityProvider>
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col min-w-0">
          <PlanExpirationBanner establishmentId={establishmentId} />
          <header className="h-14 border-b border-border bg-card flex items-center px-4 md:px-6 sticky top-0 z-10">
            <SidebarTrigger className="mr-3 md:hidden" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-semibold truncate">{getMenuItemLabel(activeTab)}</h2>
              {membership?.establishment && (
                <p className="text-xs text-muted-foreground truncate">
                  {membership.establishment.name}
                </p>
              )}
            </div>
            <NumberVisibilityToggle />
          </header>
          <main className="flex-1 overflow-auto p-3 md:p-6 bg-muted/30">
            {activeTab === "banners" && <BannerManagement establishmentId={establishmentId} />}
            {activeTab === "coupons" && <CouponManagement establishmentId={establishmentId} />}
            {activeTab === "events" && <EventManagement establishmentId={establishmentId} />}
            {activeTab === "scanner" && <TicketScanner />}
            {activeTab === "settings" && <StoreSettings establishmentId={establishmentId} />}
            {activeTab === "pdv" && <PDV establishmentId={establishmentId} plan={membership?.plan || null} />}
            {activeTab === "wallet" && <WalletManagement establishmentId={establishmentId} />}
            {activeTab === "report" && <FinancialReport establishmentId={establishmentId} />}
            {activeTab === "whatsapp" && <WhatsAppSettings establishmentId={establishmentId} />}
            {activeTab === "overview" && (
              <DashboardOverview 
                establishmentId={establishmentId} 
                isMasterAdmin={isMasterAdmin}
                onNavigateToOrders={() => setActiveTab("orders")}
                plan={membership?.plan || null}
              />
            )}
            
            {activeTab === "products" && (
              <ProductManagement establishmentId={establishmentId} />
            )}
            
            {activeTab === "brands" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h3 className="text-lg font-semibold">Marcas</h3>
                  <Button onClick={() => { 
                    setEditingBrand(null); 
                    setBrandForm({ name: "", logo_url: "" }); 
                    setIsBrandDialogOpen(true); 
                  }} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Marca
                  </Button>
                </div>
                
                {/* Mobile view - cards */}
                <div className="grid gap-3 md:hidden">
                  {brands.map((b) => (
                    <Card key={b.id} className="p-4 border-0 bg-card/50">
                      <div className="flex items-center gap-3">
                        {b.logo_url ? (
                          <img src={b.logo_url} className="w-12 h-12 object-contain rounded-lg bg-muted" alt={b.name} />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Tag className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{b.name}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { 
                            setEditingBrand(b); 
                            setBrandForm({ name: b.name, logo_url: b.logo_url || "" }); 
                            setIsBrandDialogOpen(true); 
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {brands.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground border-0 bg-card/50">
                      Nenhuma marca cadastrada
                    </Card>
                  )}
                </div>
                
                {/* Desktop view - table */}
                <Card className="hidden md:block overflow-x-auto border-0 bg-card/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Logo</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>
                            {b.logo_url ? (
                              <img src={b.logo_url} className="w-10 h-10 object-contain" alt={b.name} />
                            ) : (
                              <Tag className="w-5 h-5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { 
                                setEditingBrand(b); 
                                setBrandForm({ name: b.name, logo_url: b.logo_url || "" }); 
                                setIsBrandDialogOpen(true); 
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {brands.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            Nenhuma marca cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
                
                <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
                  <DialogContent className="max-w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingBrand ? "Editar Marca" : "Nova Marca"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome</Label>
                        <Input 
                          value={brandForm.name} 
                          onChange={(e) => setBrandForm({...brandForm, name: e.target.value})} 
                        />
                      </div>
                      <div>
                        <Label>Logo</Label>
                        <ImageUpload 
                          currentImageUrl={brandForm.logo_url} 
                          onImageUploaded={(url) => setBrandForm({...brandForm, logo_url: url})} 
                          bucketName="brand-logos" 
                        />
                      </div>
                      <Button onClick={handleSaveBrand} className="w-full">
                        Salvar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {activeTab === "categories" && (
              <CategoryManagement establishmentId={establishmentId} />
            )}
            
            {activeTab === "orders" && (
              <OrdersKanban establishmentId={establishmentId} />
            )}
            
            {activeTab === "users" && (
              <CustomerManagement establishmentId={establishmentId} />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
    </NumberVisibilityProvider>
  );
};

export default Admin;

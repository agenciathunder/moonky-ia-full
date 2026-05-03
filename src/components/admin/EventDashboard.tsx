import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, Ticket, DollarSign, Users, CheckCircle, 
  Plus, Trash2, Loader2, Download, Send, QrCode,
  TrendingUp, AlertCircle, Search, Eye, Check, X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { getPlatformFees, calculateTicketFee, calculatePriceWithFee } from "@/utils/ticketUtils";

interface EventDashboardProps {
  eventId: string;
  establishmentId?: string | null;
  onBack: () => void;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
  event_time: string;
  image_url: string | null;
  establishment_id: string | null;
}

interface TicketBatch {
  id: string;
  event_id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

interface TicketType {
  id: string;
  event_id: string;
  batch_id: string | null;
  name: string;
  description: string | null;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  is_active: boolean;
  batch?: TicketBatch | null;
}

interface IndividualTicket {
  id: string;
  ticket_sale_id: string;
  ticket_type_id: string;
  event_id: string;
  user_id: string;
  qr_code: string;
  is_validated: boolean;
  validated_at: string | null;
  created_at: string;
  ticket_sale?: {
    id: string;
    total_price: number;
    payment_status: string;
    created_at: string;
  } | null;
  ticket_type?: {
    name: string;
  } | null;
  user_profile?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface TicketSale {
  id: string;
  event_id: string;
  ticket_type_id: string;
  user_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  fee_amount: number;
  subtotal: number;
  payment_status: string;
  created_at: string;
  ticket_type?: { name: string } | null;
  user_profile?: { full_name: string | null; email: string | null; phone: string | null } | null;
}

interface DashboardStats {
  totalSold: number;
  totalRevenue: number;
  totalValidated: number;
  totalAvailable: number;
}

export const EventDashboard = ({ eventId, establishmentId, onBack }: EventDashboardProps) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [batches, setBatches] = useState<TicketBatch[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [tickets, setTickets] = useState<IndividualTicket[]>([]);
  const [sales, setSales] = useState<TicketSale[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalSold: 0, totalRevenue: 0, totalValidated: 0, totalAvailable: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialogs
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showTicketTypeDialog, setShowTicketTypeDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<IndividualTicket | null>(null);
  
  // Forms
  const [batchForm, setBatchForm] = useState({ name: "", display_order: 0 });
  const [ticketTypeForm, setTicketTypeForm] = useState({
    name: "",
    description: "",
    price: 0,
    quantity_available: 0,
    batch_id: ""
  });
  const [editingBatch, setEditingBatch] = useState<TicketBatch | null>(null);
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);
  
  // Search
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dynamic platform fees
  const [feePercentage, setFeePercentage] = useState(10);
  const [feeMinimum, setFeeMinimum] = useState(2.50);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch platform fees dynamically
      const fees = await getPlatformFees();
      setFeePercentage(fees.percentage);
      setFeeMinimum(fees.minimum);

      // Fetch event
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      setEvent(eventData);

      // Fetch batches
      const { data: batchesData } = await supabase
        .from("ticket_batches")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order");
      setBatches(batchesData || []);

      // Fetch ticket types with batch info
      const { data: ticketTypesData } = await supabase
        .from("ticket_types")
        .select("*, batch:ticket_batches(*)")
        .eq("event_id", eventId)
        .order("price");
      setTicketTypes(ticketTypesData || []);

      // Fetch individual tickets
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select(`
          *,
          ticket_sale:ticket_sales(id, total_price, payment_status, created_at),
          ticket_type:ticket_types(name)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      
      // Fetch user profiles for tickets
      if (ticketsData && ticketsData.length > 0) {
        const userIds = [...new Set(ticketsData.map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const ticketsWithProfiles = ticketsData.map(t => ({
          ...t,
          user_profile: profileMap.get(t.user_id) || null
        }));
        setTickets(ticketsWithProfiles);
      } else {
        setTickets([]);
      }

      // Fetch sales
      const { data: salesData } = await supabase
        .from("ticket_sales")
        .select(`
          *,
          ticket_type:ticket_types(name)
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      
      // Fetch user profiles for sales
      if (salesData && salesData.length > 0) {
        const userIds = [...new Set(salesData.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const salesWithProfiles = salesData.map(s => ({
          ...s,
          user_profile: profileMap.get(s.user_id) || null
        }));
        setSales(salesWithProfiles);
      } else {
        setSales([]);
      }

      // Calculate stats - use subtotal (establishment net revenue, excludes Moonky fees)
      const totalSold = ticketsData?.length || 0;
      const paidSales = salesData?.filter(s => s.payment_status === 'paid' || s.payment_status === 'completed') || [];
      const totalRevenue = paidSales.reduce((sum, s) => sum + (Number(s.subtotal) || 0), 0);
      const totalValidated = ticketsData?.filter(t => t.is_validated).length || 0;
      const totalAvailable = ticketTypesData?.reduce((sum, t) => sum + (t.quantity_available - t.quantity_sold), 0) || 0;

      setStats({ totalSold, totalRevenue, totalValidated, totalAvailable });
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados do evento");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes for tickets
    const channel = supabase
      .channel(`event-tickets-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, loadData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Use dynamic fees from platform_fees table
  const calculateFeeLocal = (price: number) => {
    return calculateTicketFee(price, feePercentage, feeMinimum);
  };

  const calculatePriceWithFeeLocal = (price: number) => {
    return calculatePriceWithFee(price, feePercentage, feeMinimum);
  };

  // Batch handlers
  const handleSaveBatch = async () => {
    try {
      if (editingBatch) {
        await supabase
          .from("ticket_batches")
          .update({ name: batchForm.name, display_order: batchForm.display_order })
          .eq("id", editingBatch.id);
        toast.success("Lote atualizado!");
      } else {
        await supabase.from("ticket_batches").insert({
          event_id: eventId,
          name: batchForm.name,
          display_order: batchForm.display_order
        });
        toast.success("Lote criado!");
      }
      setShowBatchDialog(false);
      setBatchForm({ name: "", display_order: 0 });
      setEditingBatch(null);
      loadData();
    } catch (error) {
      toast.error("Erro ao salvar lote");
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("Excluir este lote? Os tipos de ingresso vinculados ficarão sem lote.")) return;
    await supabase.from("ticket_batches").delete().eq("id", batchId);
    toast.success("Lote excluído!");
    loadData();
  };

  // Ticket type handlers
  const handleSaveTicketType = async () => {
    if (!ticketTypeForm.name.trim()) {
      toast.error("Nome do ingresso é obrigatório");
      return;
    }
    if (ticketTypeForm.quantity_available <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    try {
      const data = {
        event_id: eventId,
        name: ticketTypeForm.name,
        description: ticketTypeForm.description || null,
        price: ticketTypeForm.price,
        quantity_available: ticketTypeForm.quantity_available,
        batch_id: ticketTypeForm.batch_id || null
      };

      if (editingTicketType) {
        const { error } = await supabase.from("ticket_types").update(data).eq("id", editingTicketType.id);
        if (error) throw error;
        toast.success("Tipo de ingresso atualizado!");
      } else {
        const { error } = await supabase.from("ticket_types").insert(data);
        if (error) throw error;
        toast.success("Tipo de ingresso criado!");
      }
      setShowTicketTypeDialog(false);
      setTicketTypeForm({ name: "", description: "", price: 0, quantity_available: 0, batch_id: "" });
      setEditingTicketType(null);
      loadData();
    } catch (error: any) {
      console.error("Erro ao salvar ingresso:", error);
      toast.error(error.message || "Erro ao salvar tipo de ingresso");
    }
  };

  const handleToggleTicketType = async (ticketType: TicketType) => {
    await supabase
      .from("ticket_types")
      .update({ is_active: !ticketType.is_active })
      .eq("id", ticketType.id);
    toast.success(ticketType.is_active ? "Ingresso desativado" : "Ingresso ativado");
    loadData();
  };

  // Ticket validation
  const handleValidateTicket = async (ticket: IndividualTicket) => {
    if (ticket.is_validated) {
      toast.error("Este ingresso já foi validado!");
      return;
    }
    
    await supabase
      .from("tickets")
      .update({ 
        is_validated: true, 
        validated_at: new Date().toISOString(),
        validated_by: user?.id 
      })
      .eq("id", ticket.id);
    
    toast.success("Ingresso validado com sucesso!");
    loadData();
  };

  // QR Code handlers
  const handleViewQR = (ticket: IndividualTicket) => {
    setSelectedTicket(ticket);
    setShowQRDialog(true);
  };

  const downloadQRCode = () => {
    if (!selectedTicket) return;
    
    const canvas = document.createElement('canvas');
    const svg = document.querySelector('#ticket-qr-code svg') as SVGElement;
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 256;
      canvas.height = 256;
      ctx?.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = `ingresso-${selectedTicket.qr_code.slice(0, 8)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Filter tickets by search
  const filteredTickets = tickets.filter(t => {
    const search = searchTerm.toLowerCase();
    return (
      t.user_profile?.full_name?.toLowerCase().includes(search) ||
      t.user_profile?.email?.toLowerCase().includes(search) ||
      t.qr_code.toLowerCase().includes(search) ||
      t.ticket_type?.name?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{event?.name}</h2>
          <p className="text-muted-foreground">
            {event?.event_date && format(new Date(event.event_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
            {" às "}
            {event?.event_time?.substring(0, 5)}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendidos</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSold}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAvailable} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Receita total
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalValidated}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSold > 0 ? Math.round((stats.totalValidated / stats.totalSold) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSold > 0 ? formatCurrency(stats.totalRevenue / stats.totalSold) : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por ingresso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent -mx-1 px-1">
          <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-4 gap-1">
            <TabsTrigger value="overview" className="whitespace-nowrap">Ingressos</TabsTrigger>
            <TabsTrigger value="tickets" className="whitespace-nowrap">Vendidos</TabsTrigger>
            <TabsTrigger value="sales" className="whitespace-nowrap">Pedidos</TabsTrigger>
            <TabsTrigger value="validate" className="whitespace-nowrap">Validar</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview - Ticket Types Management */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <h3 className="text-lg font-semibold">Tipos de Ingresso</h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEditingBatch(null);
                  setBatchForm({ name: "", display_order: batches.length });
                  setShowBatchDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Lote
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  setEditingTicketType(null);
                  setTicketTypeForm({ name: "", description: "", price: 0, quantity_available: 0, batch_id: "" });
                  setShowTicketTypeDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Ingresso
              </Button>
            </div>
          </div>

          {/* Batches */}
          {batches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {batches.map(batch => {
                const batchTypes = ticketTypes.filter(t => t.batch_id === batch.id);
                const allSoldOut = batchTypes.every(t => t.quantity_sold >= t.quantity_available);
                
                return (
                  <Badge 
                    key={batch.id} 
                    variant={allSoldOut ? "secondary" : "default"}
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingBatch(batch);
                      setBatchForm({ name: batch.name, display_order: batch.display_order });
                      setShowBatchDialog(true);
                    }}
                  >
                    {batch.name}
                    {allSoldOut && " - ESGOTADO"}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Ticket Types Table */}
          <Card className="border-0 bg-card/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingresso</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Com Taxa</TableHead>
                  <TableHead className="text-right">Vendidos</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum tipo de ingresso cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  ticketTypes.map(ticket => {
                    const available = ticket.quantity_available - ticket.quantity_sold;
                    const isSoldOut = available === 0;
                    
                    return (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{ticket.name}</div>
                            {ticket.description && (
                              <div className="text-xs text-muted-foreground">{ticket.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {ticket.batch?.name || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {ticket.price === 0 ? (
                            <Badge variant="secondary">Grátis</Badge>
                          ) : (
                            formatCurrency(ticket.price)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {ticket.price === 0 ? "-" : formatCurrency(calculatePriceWithFee(ticket.price))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {ticket.quantity_sold}
                        </TableCell>
                        <TableCell className="text-right">
                          {available}
                        </TableCell>
                        <TableCell>
                          {isSoldOut ? (
                            <Badge variant="destructive">Esgotado</Badge>
                          ) : ticket.is_active ? (
                            <Badge variant="default">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingTicketType(ticket);
                                setTicketTypeForm({
                                  name: ticket.name,
                                  description: ticket.description || "",
                                  price: ticket.price,
                                  quantity_available: ticket.quantity_available,
                                  batch_id: ticket.batch_id || ""
                                });
                                setShowTicketTypeDialog(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleTicketType(ticket)}
                            >
                              {ticket.is_active ? "Desativar" : "Ativar"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Sold Tickets */}
        <TabsContent value="tickets" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou QR code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Card className="border-0 bg-card/50">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum ingresso vendido
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map(ticket => {
                      const clientName = ticket.user_profile?.full_name?.trim() 
                        || ticket.user_profile?.email?.split('@')[0] 
                        || "Carregando...";
                      const clientEmail = ticket.user_profile?.email || "";
                      
                      return (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {clientName}
                            </div>
                            {clientEmail && (
                            <div className="text-xs text-muted-foreground">
                              {clientEmail}
                            </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{ticket.ticket_type?.name}</TableCell>
                        <TableCell>
                          <code className="text-xs">{ticket.qr_code.slice(0, 12)}...</code>
                        </TableCell>
                        <TableCell>
                          {ticket.is_validated ? (
                            <Badge className="bg-green-500">Validado</Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(ticket.created_at), "dd/MM HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewQR(ticket)}
                              title="Ver QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            {!ticket.is_validated && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleValidateTicket(ticket)}
                                title="Validar"
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );})
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Sales/Orders */}
        <TabsContent value="sales" className="space-y-4">
          <Card className="border-0 bg-card/50">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ingresso</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum pedido realizado
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map(sale => {
                      const clientName = sale.user_profile?.full_name?.trim() 
                        || sale.user_profile?.email?.split('@')[0] 
                        || "Carregando...";
                      const clientEmail = sale.user_profile?.email || "";
                      
                      return (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {clientName}
                            </div>
                            {clientEmail && (
                            <div className="text-xs text-muted-foreground">
                              {clientEmail}
                            </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{sale.ticket_type?.name}</TableCell>
                        <TableCell className="text-right">{sale.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(sale.total_price)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sale.payment_status === 'completed' ? 'default' : 'secondary'}>
                            {sale.payment_status === 'completed' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    );})
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Validate Tickets */}
        <TabsContent value="validate" className="space-y-4">
          <Card className="border-0 bg-card/50 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Validação de Ingressos</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Para validar um ingresso, busque pelo QR code ou nome do cliente na aba "Vendidos" e clique no botão de validar.
              </p>
              
              <div className="pt-4">
                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                  <div className="text-center p-4 rounded-lg bg-green-500/10">
                    <div className="text-3xl font-bold text-green-600">{stats.totalValidated}</div>
                    <div className="text-sm text-muted-foreground">Validados</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-amber-500/10">
                    <div className="text-3xl font-bold text-amber-600">{stats.totalSold - stats.totalValidated}</div>
                    <div className="text-sm text-muted-foreground">Pendentes</div>
                  </div>
                </div>
              </div>

              <Button onClick={() => setActiveTab("tickets")}>
                Ir para lista de ingressos
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Batch Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBatch ? "Editar Lote" : "Novo Lote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Lote</Label>
              <Input
                value={batchForm.name}
                onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                placeholder="Ex: 1º Lote, Lote Promocional"
              />
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={batchForm.display_order}
                onChange={(e) => setBatchForm({ ...batchForm, display_order: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {editingBatch && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  handleDeleteBatch(editingBatch.id);
                  setShowBatchDialog(false);
                }}
              >
                Excluir
              </Button>
            )}
            <Button onClick={handleSaveBatch}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Type Dialog */}
      <Dialog open={showTicketTypeDialog} onOpenChange={setShowTicketTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTicketType ? "Editar Ingresso" : "Novo Ingresso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={ticketTypeForm.name}
                onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, name: e.target.value })}
                placeholder="Ex: Pista, VIP, Camarote"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                value={ticketTypeForm.description}
                onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, description: e.target.value })}
                placeholder="Benefícios do ingresso..."
              />
            </div>
            <div>
              <Label>Lote (opcional)</Label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                value={ticketTypeForm.batch_id}
                onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, batch_id: e.target.value })}
              >
                <option value="">Sem lote</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>{batch.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={ticketTypeForm.price}
                  onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, price: Number(e.target.value) })}
                  placeholder="0,00 = Grátis"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  0,00 = Ingresso cortesia
                </p>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={ticketTypeForm.quantity_available}
                  onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, quantity_available: Number(e.target.value) })}
                />
              </div>
            </div>
            {ticketTypeForm.price > 0 && (
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex justify-between text-sm">
                  <span>Preço base:</span>
                  <span>{formatCurrency(ticketTypeForm.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Taxa ({feePercentage}% min R${feeMinimum.toFixed(2)}):</span>
                  <span>{formatCurrency(calculateFeeLocal(ticketTypeForm.price))}</span>
                </div>
                <div className="flex justify-between font-medium pt-2 border-t mt-2">
                  <span>Cliente paga:</span>
                  <span>{formatCurrency(calculatePriceWithFeeLocal(ticketTypeForm.price))}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveTicketType}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code do Ingresso</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="font-medium">{selectedTicket.user_profile?.full_name}</div>
                <div className="text-sm text-muted-foreground">{selectedTicket.ticket_type?.name}</div>
              </div>
              
              <div id="ticket-qr-code" className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG 
                  value={selectedTicket.qr_code}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="text-center">
                {selectedTicket.is_validated ? (
                  <Badge className="bg-green-500">Validado em {format(new Date(selectedTicket.validated_at!), "dd/MM HH:mm")}</Badge>
                ) : (
                  <Badge variant="outline">Aguardando validação</Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={downloadQRCode}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
                {!selectedTicket.is_validated && (
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      handleValidateTicket(selectedTicket);
                      setShowQRDialog(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Validar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

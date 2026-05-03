import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { buildStorePath } from "@/utils/subdomain";
import { useStoreSlug } from "@/hooks/useStoreSlug";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEstablishment } from "@/contexts/EstablishmentContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, Ticket, Calendar, MapPin, Clock, Download, QrCode
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/BottomNavigation";
import { DynamicThemeStyles } from "@/components/DynamicThemeStyles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import moonkyLogo from "@/assets/moonky-logo.png";

interface TicketSale {
  id: string;
  quantity: number;
  total_price: number;
  unit_price: number;
  created_at: string;
  payment_status: string;
  event: {
    id: string;
    name: string;
    event_date: string;
    event_time: string;
    location: string | null;
    image_url: string | null;
  };
  ticket_type: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface IndividualTicket {
  id: string;
  qr_code: string;
  created_at: string;
}

const MyTickets = () => {
  const navigate = useNavigate();
  const slug = useStoreSlug();
  const { user } = useAuth();
  const { establishment, settings } = useEstablishment();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketSale | null>(null);
  const [selectedTicketIndex, setSelectedTicketIndex] = useState(0);
  const [individualTicketsBySale, setIndividualTicketsBySale] = useState<Record<string, IndividualTicket[]>>({});
  const ticketRef = useRef<HTMLDivElement>(null);

  const storeSlug = slug || establishment?.slug;
  const basePath = buildStorePath(storeSlug, '');
  const authPath = buildStorePath(storeSlug, '/auth');
  const primaryColor = settings?.primary_color || "#3834ED";

  useEffect(() => {
    if (user) {
      fetchTickets();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_sales')
        .select(`
          id,
          quantity,
          total_price,
          unit_price,
          created_at,
          payment_status,
          event:events(id, name, event_date, event_time, location, image_url),
          ticket_type:ticket_types(id, name, description)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match expected type
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        event: item.event,
        ticket_type: item.ticket_type
      }));
      
      setTickets(transformedData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os ingressos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string): string => {
    const d = new Date(date + 'T00:00:00');
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(d);
  };

  const formatTime = (time: string): string => {
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const downloadTicket = async () => {
    if (!selectedTicket) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 1000;

    // Background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Event image position
    const eventImageY = 100;
    const eventImageHeight = 280;
    
    const drawLogoAndContinue = (afterLogo: () => void) => {
      // Black header - full width, fixed at top
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, 80);
      
      // Load and draw Moonky logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.onload = () => {
        // Calculate logo dimensions (maintain aspect ratio, fit in header)
        const logoMaxHeight = 40;
        const logoAspect = logoImg.width / logoImg.height;
        const logoHeight = logoMaxHeight;
        const logoWidth = logoHeight * logoAspect;
        const logoX = (canvas.width - logoWidth) / 2;
        const logoY = (80 - logoHeight) / 2;
        
        // Draw logo as white: use offscreen canvas to invert colors
        const offscreen = document.createElement('canvas');
        offscreen.width = logoImg.width;
        offscreen.height = logoImg.height;
        const offCtx = offscreen.getContext('2d')!;
        offCtx.drawImage(logoImg, 0, 0);
        offCtx.globalCompositeOperation = 'source-in';
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
        
        ctx.drawImage(offscreen, logoX, logoY, logoWidth, logoHeight);
        afterLogo();
      };
      logoImg.onerror = () => {
        // Fallback to text if logo fails
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('moonky', canvas.width / 2, 92);
        afterLogo();
      };
      logoImg.src = moonkyLogo;
    };
    
    const drawRestOfTicket = () => {
      const contentStartY = eventImageY + eventImageHeight + 30;
      
      // Event name - bold pink
      ctx.fillStyle = '#E91E8C';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(selectedTicket.event.name, canvas.width / 2, contentStartY);
      
      // Ticket type - pink
      ctx.fillStyle = '#E91E8C';
      ctx.font = '20px Arial';
      ctx.fillText(selectedTicket.ticket_type.name, canvas.width / 2, contentStartY + 35);
      
      // Date - gray
      ctx.fillStyle = '#888888';
      ctx.font = '18px Arial';
      ctx.fillText(formatDate(selectedTicket.event.event_date), canvas.width / 2, contentStartY + 75);
      ctx.fillText(`às ${formatTime(selectedTicket.event.event_time)}`, canvas.width / 2, contentStartY + 100);
      
      // Location - pink/gray
      if (selectedTicket.event.location) {
        ctx.fillStyle = '#E91E8C';
        ctx.fillText(selectedTicket.event.location, canvas.width / 2, contentStartY + 135);
      }
      
      // QR Code - black
      const qrY = contentStartY + 170;
      const qrSize = 220;
      const qrCode = individualTicketsBySale[selectedTicket.id]?.[selectedTicketIndex]?.qr_code || '';
      
      // QR Code border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect((canvas.width - qrSize - 40) / 2, qrY - 10, qrSize + 40, qrSize + 40);
      
      // Generate QR Code image
      const qrSvg = document.querySelector('#download-qr-svg svg');
      if (qrSvg) {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, (canvas.width - qrSize) / 2, qrY, qrSize, qrSize);
          
          // Ticket number
          ctx.fillStyle = '#888888';
          ctx.font = '18px Arial';
          ctx.fillText(`Ingresso #${selectedTicketIndex + 1}`, canvas.width / 2, qrY + qrSize + 50);
          
          // QR Code ID
          ctx.font = '12px monospace';
          ctx.fillStyle = '#aaaaaa';
          ctx.fillText(qrCode, canvas.width / 2, qrY + qrSize + 75);
          
          // Footer
          ctx.fillStyle = '#888888';
          ctx.font = '14px Arial';
          ctx.fillText('Apresente este QR Code na entrada', canvas.width / 2, qrY + qrSize + 115);
          ctx.fillText('moonky.com.br', canvas.width / 2, qrY + qrSize + 140);
          
          // Download
          const link = document.createElement('a');
          link.download = `ingresso-${selectedTicket.event.name.replace(/\s+/g, '-')}-${selectedTicketIndex + 1}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
        qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    };

    // Start by drawing logo, then continue with event image
    drawLogoAndContinue(() => {
      // Load event image if available
      if (selectedTicket.event.image_url) {
        const eventImg = new Image();
        eventImg.crossOrigin = 'anonymous';
        eventImg.onload = () => {
          // Draw rounded rect clip for image
          const imgX = 60;
          const imgWidth = canvas.width - 120;
          const radius = 16;
          
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(imgX + radius, eventImageY);
          ctx.lineTo(imgX + imgWidth - radius, eventImageY);
          ctx.quadraticCurveTo(imgX + imgWidth, eventImageY, imgX + imgWidth, eventImageY + radius);
          ctx.lineTo(imgX + imgWidth, eventImageY + eventImageHeight - radius);
          ctx.quadraticCurveTo(imgX + imgWidth, eventImageY + eventImageHeight, imgX + imgWidth - radius, eventImageY + eventImageHeight);
          ctx.lineTo(imgX + radius, eventImageY + eventImageHeight);
          ctx.quadraticCurveTo(imgX, eventImageY + eventImageHeight, imgX, eventImageY + eventImageHeight - radius);
          ctx.lineTo(imgX, eventImageY + radius);
          ctx.quadraticCurveTo(imgX, eventImageY, imgX + radius, eventImageY);
          ctx.closePath();
          ctx.clip();
          
          // Calculate image dimensions to cover the area
          const imgAspect = eventImg.width / eventImg.height;
          const areaAspect = imgWidth / eventImageHeight;
          let drawWidth, drawHeight, drawX, drawY;
          
          if (imgAspect > areaAspect) {
            drawHeight = eventImageHeight;
            drawWidth = drawHeight * imgAspect;
            drawX = imgX - (drawWidth - imgWidth) / 2;
            drawY = eventImageY;
          } else {
            drawWidth = imgWidth;
            drawHeight = drawWidth / imgAspect;
            drawX = imgX;
            drawY = eventImageY - (drawHeight - eventImageHeight) / 2;
          }
          
          ctx.drawImage(eventImg, drawX, drawY, drawWidth, drawHeight);
          ctx.restore();
          
          drawRestOfTicket();
        };
        eventImg.onerror = () => {
          drawRestOfTicket();
        };
        eventImg.src = selectedTicket.event.image_url;
      } else {
        drawRestOfTicket();
      }
    });
  };

  const ensureIndividualTicketsLoaded = async (ticketSaleId: string) => {
    if (!user?.id) return;
    if (individualTicketsBySale[ticketSaleId]?.length) return;

    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, qr_code, created_at")
        .eq("ticket_sale_id", ticketSaleId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setIndividualTicketsBySale((prev) => ({
        ...prev,
        [ticketSaleId]: (data || []) as IndividualTicket[],
      }));
    } catch (error) {
      console.error("Error loading individual tickets:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o QR do ingresso.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!selectedTicket) return;
    ensureIndividualTicketsLoaded(selectedTicket.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?.id]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-24">
        <DynamicThemeStyles />
        <Ticket className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Faça login</h2>
        <p className="text-muted-foreground text-center mb-6">
          Entre para ver seus ingressos
        </p>
        <Button 
          onClick={() => navigate(authPath)} 
          className="h-12 px-8"
          style={{ backgroundColor: primaryColor }}
        >
          Entrar
        </Button>
        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <DynamicThemeStyles />
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent mx-auto mb-4"
            style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          ></div>
          <p className="text-sm text-muted-foreground">Carregando ingressos...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <DynamicThemeStyles />
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 touch-manipulation">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Meus Ingressos</h1>
          <div className="w-10" />
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <Ticket className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum ingresso</h2>
          <p className="text-muted-foreground text-center mb-6">
            Você ainda não comprou nenhum ingresso
          </p>
          <Button 
            onClick={() => navigate(basePath || '/')} 
            className="h-12 px-8"
            style={{ backgroundColor: primaryColor }}
          >
            Ver eventos
          </Button>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="overflow-hidden">
              {/* Event Image */}
              {ticket.event.image_url && (
                <div className="h-32 w-full">
                  <img 
                    src={ticket.event.image_url} 
                    alt={ticket.event.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{ticket.event.name}</h3>
                    <p className="text-sm" style={{ color: primaryColor }}>
                      {ticket.ticket_type.name}
                    </p>
                  </div>
                  {(() => {
                    const isConfirmed = ticket.payment_status === 'paid' || ticket.payment_status === 'completed';
                    return (
                      <Badge 
                        variant={isConfirmed ? 'default' : 'secondary'}
                        style={isConfirmed ? { backgroundColor: primaryColor } : {}}
                      >
                        {isConfirmed ? 'Confirmado' : 'Pendente'}
                      </Badge>
                    );
                  })()}
                </div>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" style={{ color: primaryColor }} />
                    <span>{formatDate(ticket.event.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" style={{ color: primaryColor }} />
                    <span>{formatTime(ticket.event.event_time)}</span>
                  </div>
                  {ticket.event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
                      <span>{ticket.event.location}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {ticket.quantity} {ticket.quantity === 1 ? 'ingresso' : 'ingressos'}
                    </p>
                    <p className="font-bold" style={{ color: primaryColor }}>
                      {formatPrice(ticket.total_price)}
                    </p>
                  </div>
                  
                  {/* Show QR buttons for each ticket */}
                  <div className="flex gap-2">
                    {Array.from({ length: ticket.quantity }).map((_, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setSelectedTicketIndex(idx);
                        }}
                        style={{ borderColor: primaryColor, color: primaryColor }}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        {ticket.quantity > 1 ? `#${idx + 1}` : 'Ver QR'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog - New Standard Template */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="w-[90vw] max-w-[360px] p-0 overflow-hidden max-h-[85vh] rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Seu Ingresso</DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="overflow-y-auto max-h-[calc(90vh-2rem)]">
              <div ref={ticketRef} className="bg-white">
                {/* Black Header - full width, fixed top */}
                <div className="w-full bg-black py-5">
                  <img 
                    src={moonkyLogo} 
                    alt="Moonky" 
                    className="h-8 mx-auto brightness-0 invert"
                  />
                </div>
                
                {/* Event Image */}
                {selectedTicket.event.image_url && (
                  <div className="px-5 pt-4">
                    <img 
                      src={selectedTicket.event.image_url}
                      alt={selectedTicket.event.name}
                      className="w-full h-auto rounded-2xl object-cover"
                    />
                  </div>
                )}
                
                {/* Event Info */}
                <div className="text-center px-5 pt-5 space-y-1">
                  <h3 className="font-bold text-2xl text-pink-600">{selectedTicket.event.name}</h3>
                  <p className="text-pink-500 text-lg">{selectedTicket.ticket_type.name}</p>
                  <div className="pt-2 space-y-0.5">
                    <p className="text-gray-500 text-sm">{formatDate(selectedTicket.event.event_date)}</p>
                    <p className="text-gray-500 text-sm">às {formatTime(selectedTicket.event.event_time)}</p>
                  </div>
                  {selectedTicket.event.location && (
                    <p className="text-pink-500 text-sm pt-1">{selectedTicket.event.location}</p>
                  )}
                </div>
                
                {/* QR Code - perfectly centered */}
                <div className="flex items-center justify-center py-6 px-5">
                  <div id="download-qr-svg" className="border-2 border-black p-5 rounded-lg bg-white flex items-center justify-center" style={{ width: 220, height: 220 }}>
                    {(() => {
                      const qr = individualTicketsBySale[selectedTicket.id]?.[selectedTicketIndex]?.qr_code;
                      return (
                        <QRCodeSVG 
                          value={qr || ""}
                          size={180}
                          level="H"
                          includeMargin={false}
                          fgColor="#000000"
                        />
                      );
                    })()}
                  </div>
                </div>
                
                {/* Ticket Number */}
                <div className="text-center pb-2">
                  <p className="text-gray-400 text-sm">
                    Ingresso #{selectedTicketIndex + 1}
                  </p>
                  <p className="text-gray-300 text-xs font-mono">
                    {individualTicketsBySale[selectedTicket.id]?.[selectedTicketIndex]?.qr_code || selectedTicket.id}
                  </p>
                </div>
                
                {/* Footer Instructions */}
                <div className="text-center pb-4 space-y-0.5">
                  <p className="text-gray-400 text-xs">
                    Apresente este QR Code na entrada
                  </p>
                  <p className="text-gray-400 text-xs">
                    moonky.com.br
                  </p>
                </div>
              </div>
              
              {/* Download Button - Fixed at bottom of scroll area */}
              <div className="px-6 pb-6 pt-2 bg-white sticky bottom-0">
                <Button 
                  className="w-full bg-pink-600 hover:bg-pink-700"
                  onClick={downloadTicket}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Ingresso
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default MyTickets;
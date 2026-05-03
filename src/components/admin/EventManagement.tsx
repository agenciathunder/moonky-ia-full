import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Calendar, Clock, ExternalLink, Pencil, Trash2, MapPin, Loader2, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ImageUpload } from "@/components/ImageUpload";
import { EventDashboard } from "./EventDashboard";

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  event_date: string;
  event_time: string;
  image_url: string | null;
  map_image_url: string | null;
  youtube_url: string | null;
  is_active: boolean;
  created_at: string;
  establishment_id: string | null;
}

interface EventFormData {
  name: string;
  description: string;
  location: string;
  event_date: string;
  event_time: string;
  image_url: string;
  map_image_url: string;
  youtube_url: string;
  is_active: boolean;
}

interface EventManagementProps {
  establishmentId?: string | null;
}

const initialFormData: EventFormData = {
  name: "",
  description: "",
  location: "",
  event_date: "",
  event_time: "",
  image_url: "",
  map_image_url: "",
  youtube_url: "",
  is_active: true,
};

export const EventManagement = ({ establishmentId }: EventManagementProps) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch establishment slug for public links
  useEffect(() => {
    const fetchSlug = async () => {
      if (!establishmentId) return;

      const { data, error } = await supabase
        .from("establishments")
        .select("slug")
        .eq("id", establishmentId)
        .single();

      if (error) {
        console.error("Erro ao buscar slug:", error);
        return;
      }

      setStoreSlug(data.slug);
    };

    fetchSlug();
  }, [establishmentId]);

  // Fetch events
  useEffect(() => {
    fetchEvents();
  }, [establishmentId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (establishmentId) {
        query = query.eq("establishment_id", establishmentId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar eventos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        description: event.description || "",
        location: event.location || "",
        event_date: event.event_date,
        event_time: event.event_time,
        image_url: event.image_url || "",
        map_image_url: event.map_image_url || "",
        youtube_url: event.youtube_url || "",
        is_active: event.is_active,
      });
    } else {
      setEditingEvent(null);
      setFormData(initialFormData);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome do evento é obrigatório");
      return;
    }
    if (!formData.event_date) {
      toast.error("Data do evento é obrigatória");
      return;
    }
    if (!formData.event_time) {
      toast.error("Horário do evento é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim() || null,
        event_date: formData.event_date,
        event_time: formData.event_time,
        image_url: formData.image_url || null,
        map_image_url: formData.map_image_url || null,
        youtube_url: formData.youtube_url.trim() || null,
        is_active: formData.is_active,
        establishment_id: establishmentId,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast.success("Evento atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("events")
          .insert([eventData]);

        if (error) throw error;
        toast.success("Evento criado com sucesso!");
      }

      handleCloseDialog();
      fetchEvents();
    } catch (error: any) {
      console.error("Erro ao salvar evento:", error);
      toast.error(error.message || "Erro ao salvar evento");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
      toast.success("Evento excluído com sucesso!");
      fetchEvents();
    } catch (error: any) {
      console.error("Erro ao excluir evento:", error);
      toast.error(error.message || "Erro ao excluir evento");
    }
  };

  const handleToggleActive = async (event: Event) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_active: !event.is_active })
        .eq("id", event.id);

      if (error) throw error;
      toast.success(event.is_active ? "Evento desativado" : "Evento ativado");
      fetchEvents();
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do evento");
    }
  };

  // If viewing a specific event dashboard - AFTER all hooks
  if (selectedEventId) {
    return (
      <EventDashboard 
        eventId={selectedEventId} 
        establishmentId={establishmentId} 
        onBack={() => setSelectedEventId(null)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Eventos</h2>
          <p className="text-muted-foreground">
            Gerencie eventos e ingressos
          </p>
        </div>

        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="border-0 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum evento cadastrado ainda.
              <br />
              Clique em "Novo Evento" para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md border-0 bg-card/50 overflow-hidden">
              <div className="aspect-video relative overflow-hidden">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <Badge 
                  className="absolute top-2 right-2"
                  variant={event.is_active ? "default" : "secondary"}
                >
                  {event.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-1">{event.name}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  {format(
                    new Date(event.event_date + "T00:00:00"),
                    "dd/MM/yyyy",
                    { locale: ptBR }
                  )}
                </div>

                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                  {event.event_time.substring(0, 5)}
                </div>

                {event.location && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    className="flex-1"
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Dashboard
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleOpenDialog(event)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDelete(event.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleToggleActive(event)}
                  >
                    {event.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  {storeSlug && (
                    <Button size="sm" variant="secondary" className="flex-1" asChild>
                      <a
                        href={`/loja/${storeSlug}/events/${event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Event Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Editar Evento" : "Novo Evento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Evento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Show de Rock"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o evento..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Praça Central"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_date">Data *</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="event_time">Horário *</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Imagem de Capa do Evento *</Label>
              <ImageUpload
                currentImageUrl={formData.image_url}
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                bucketName="events"
              />
            </div>

            <div>
              <Label>Mapa do Evento (opcional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Imagem com o layout do local, setores, palco, etc.
              </p>
              <ImageUpload
                currentImageUrl={formData.map_image_url}
                onImageUploaded={(url) => setFormData({ ...formData, map_image_url: url })}
                bucketName="events"
              />
            </div>

            <div>
              <Label htmlFor="youtube_url">Vídeo do YouTube (opcional)</Label>
              <Input
                id="youtube_url"
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole o link do YouTube do vídeo promocional
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Evento ativo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCloseDialog}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

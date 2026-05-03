import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { 
  Store, 
  Palette, 
  DollarSign, 
  Share2, 
  Loader2, 
  Save,
  Clock,
  Phone,
  Instagram,
  Facebook,
  Building2
} from "lucide-react";

interface EstablishmentData {
  id: string;
  name: string;
  cnpj_cpf: string | null;
  logo_url: string | null;
  description: string | null;
}

interface EstablishmentSettingsData {
  id: string;
  establishment_id: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  opening_hours: any;
  primary_color: string | null;
  secondary_color: string | null;
  default_theme: string | null;
  minimum_order_value: number | null;
  delivery_fee: number | null;
  free_delivery_threshold: number | null;
  delivery_cep: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  show_age_restriction: boolean | null;
}

const defaultOpeningHours = {
  monday: { open: "08:00", close: "22:00", isOpen: true },
  tuesday: { open: "08:00", close: "22:00", isOpen: true },
  wednesday: { open: "08:00", close: "22:00", isOpen: true },
  thursday: { open: "08:00", close: "22:00", isOpen: true },
  friday: { open: "08:00", close: "22:00", isOpen: true },
  saturday: { open: "08:00", close: "22:00", isOpen: true },
  sunday: { open: "08:00", close: "22:00", isOpen: true },
};

const dayNames: { [key: string]: string } = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

interface StoreSettingsProps {
  establishmentId?: string | null;
}

export function StoreSettings({ establishmentId }: StoreSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EstablishmentSettingsData | null>(null);
  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);

  useEffect(() => {
    if (establishmentId) loadData();
  }, [establishmentId]);

  const loadData = async () => {
    try {
      // Load establishment data
      const { data: estData, error: estError } = await supabase
        .from("establishments")
        .select("id, name, cnpj_cpf, logo_url, description")
        .eq("id", establishmentId)
        .single();

      if (estError) throw estError;
      setEstablishment(estData);

      // Load settings
      const { data, error } = await supabase
        .from("establishment_settings")
        .select("*")
        .eq("establishment_id", establishmentId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as EstablishmentSettingsData);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from("establishment_settings")
          .insert([{ 
            establishment_id: establishmentId,
            primary_color: "#3834ED",
            default_theme: "system",
            delivery_fee: 5.00,
            free_delivery_threshold: 100.00
          }])
          .select()
          .single();
        
        if (createError) throw createError;
        setSettings(newSettings as EstablishmentSettingsData);
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !establishmentId || !establishment) return;

    try {
      setSaving(true);
      
      // Save establishment data
      const { error: estError } = await supabase
        .from("establishments")
        .update({
          name: establishment.name,
          cnpj_cpf: establishment.cnpj_cpf,
          logo_url: establishment.logo_url,
          description: establishment.description,
        })
        .eq("id", establishmentId);

      if (estError) throw estError;

      // Save settings
      const { id, establishment_id, ...updateData } = settings;
      
      const { error } = await supabase
        .from("establishment_settings")
        .update(updateData)
        .eq("establishment_id", establishmentId);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof EstablishmentSettingsData, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  const updateEstablishment = (field: keyof EstablishmentData, value: any) => {
    if (!establishment) return;
    setEstablishment({ ...establishment, [field]: value });
  };

  const updateOpeningHour = (day: string, type: 'open' | 'close' | 'isOpen', value: string | boolean) => {
    if (!settings) return;
    const hours = settings.opening_hours || defaultOpeningHours;
    const dayData = hours[day] || defaultOpeningHours[day as keyof typeof defaultOpeningHours];
    setSettings({
      ...settings,
      opening_hours: {
        ...hours,
        [day]: { 
          ...dayData, 
          [type]: value,
          // Ensure isOpen field exists
          isOpen: type === 'isOpen' ? value : (dayData.isOpen !== undefined ? dayData.isOpen : true)
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings || !establishment) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Configurações não encontradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configurações da Loja</h2>
          <p className="text-muted-foreground">Personalize sua loja</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="establishment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="establishment" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Contato</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Aparência</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Negócio</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Redes</span>
          </TabsTrigger>
        </TabsList>

        {/* Establishment Tab */}
        <TabsContent value="establishment" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription>Informações principais do estabelecimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="est_name">Nome do Estabelecimento</Label>
                  <Input
                    id="est_name"
                    value={establishment.name || ""}
                    onChange={(e) => updateEstablishment("name", e.target.value)}
                    placeholder="Nome da sua loja"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="est_cnpj">CPF / CNPJ</Label>
                  <Input
                    id="est_cnpj"
                    value={establishment.cnpj_cpf || ""}
                    onChange={(e) => updateEstablishment("cnpj_cpf", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="est_description">Descrição</Label>
                  <Input
                    id="est_description"
                    value={establishment.description || ""}
                    onChange={(e) => updateEstablishment("description", e.target.value)}
                    placeholder="Breve descrição do seu negócio"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Logotipo
                </CardTitle>
                <CardDescription>A logo será exibida na loja e no login</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center gap-4">
                  {establishment.logo_url && (
                    <div className="w-32 h-32 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted">
                      <img 
                        src={establishment.logo_url} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  <ImageUpload
                    currentImageUrl={establishment.logo_url || ""}
                    onImageUploaded={(url) => updateEstablishment("logo_url", url)}
                    bucketName="establishment-logos"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Recomendado: PNG ou JPG, proporção quadrada
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Contato
                </CardTitle>
                <CardDescription>Informações de contato do estabelecimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={settings.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={settings.whatsapp || ""}
                    onChange={(e) => updateField("whatsapp", e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="contato@loja.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={settings.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Endereço completo"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Horário de Funcionamento
                </CardTitle>
                <CardDescription>Configure os horários de abertura</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.keys(dayNames).map((day) => {
                    const hours = settings.opening_hours?.[day] || defaultOpeningHours[day as keyof typeof defaultOpeningHours];
                    const isOpen = hours?.isOpen !== undefined ? hours.isOpen : true;
                    return (
                      <div key={day} className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 w-28 sm:w-32">
                          <Switch
                            checked={isOpen}
                            onCheckedChange={(checked) => updateOpeningHour(day, 'isOpen', checked)}
                            className="scale-75 sm:scale-100"
                          />
                          <span className={`text-xs sm:text-sm font-medium ${!isOpen ? 'text-muted-foreground line-through' : ''}`}>
                            {dayNames[day].slice(0, 3)}
                          </span>
                        </div>
                        {isOpen ? (
                          <>
                            <Input
                              type="time"
                              value={hours?.open || "08:00"}
                              onChange={(e) => updateOpeningHour(day, 'open', e.target.value)}
                              className="w-20 sm:w-24 text-xs sm:text-sm"
                            />
                            <span className="text-muted-foreground text-xs">às</span>
                            <Input
                              type="time"
                              value={hours?.close || "22:00"}
                              onChange={(e) => updateOpeningHour(day, 'close', e.target.value)}
                              className="w-20 sm:w-24 text-xs sm:text-sm"
                            />
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm text-destructive font-medium">Fechado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="border-0 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Cores e Tema
              </CardTitle>
              <CardDescription>Personalize as cores da sua loja</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Principal</Label>
                  <div className="flex gap-3">
                    <Input
                      id="primary_color"
                      type="color"
                      value={settings.primary_color || "#3834ED"}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.primary_color || "#3834ED"}
                      onChange={(e) => updateField("primary_color", e.target.value)}
                      placeholder="#3834ED"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Cor Secundária</Label>
                  <div className="flex gap-3">
                    <Input
                      id="secondary_color"
                      type="color"
                      value={settings.secondary_color || "#6366F1"}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={settings.secondary_color || ""}
                      onChange={(e) => updateField("secondary_color", e.target.value)}
                      placeholder="#6366F1"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Tema Padrão</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={settings.default_theme === 'light' ? 'default' : 'outline'}
                    onClick={() => updateField('default_theme', 'light')}
                    className="flex-1"
                  >
                    ☀️ Claro
                  </Button>
                  <Button
                    type="button"
                    variant={settings.default_theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => updateField('default_theme', 'dark')}
                    className="flex-1"
                  >
                    🌙 Escuro
                  </Button>
                  <Button
                    type="button"
                    variant={settings.default_theme === 'system' ? 'default' : 'outline'}
                    onClick={() => updateField('default_theme', 'system')}
                    className="flex-1"
                  >
                    💻 Sistema
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔞 Exibição +18
              </CardTitle>
              <CardDescription>Configure a exibição do indicador de restrição de idade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Mostrar indicador +18</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibe o badge "+18" ao lado da logomarca
                  </p>
                </div>
                <Switch
                  checked={settings.show_age_restriction ?? false}
                  onCheckedChange={(checked) => updateField("show_age_restriction", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Rules Tab */}
        <TabsContent value="business" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-0 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Valores
                </CardTitle>
                <CardDescription>Configure valores mínimos e taxas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="minimum_order_value">Valor Mínimo do Pedido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="minimum_order_value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.minimum_order_value || 0}
                      onChange={(e) => updateField("minimum_order_value", parseFloat(e.target.value) || 0)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_fee">Taxa de Entrega</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="delivery_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.delivery_fee || 0}
                      onChange={(e) => updateField("delivery_fee", parseFloat(e.target.value) || 0)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="free_delivery_threshold">Frete Grátis Acima de</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="free_delivery_threshold"
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings.free_delivery_threshold || 0}
                      onChange={(e) => updateField("free_delivery_threshold", parseFloat(e.target.value) || 0)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pedidos acima deste valor têm frete grátis
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Área de Entrega
                </CardTitle>
                <CardDescription>Configure a localização para entregas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="delivery_cep">CEP</Label>
                  <Input
                    id="delivery_cep"
                    value={settings.delivery_cep || ""}
                    onChange={(e) => updateField("delivery_cep", e.target.value)}
                    placeholder="00000-000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_city">Cidade</Label>
                  <Input
                    id="delivery_city"
                    value={settings.delivery_city || ""}
                    onChange={(e) => updateField("delivery_city", e.target.value)}
                    placeholder="Nome da cidade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_state">Estado</Label>
                  <Input
                    id="delivery_state"
                    value={settings.delivery_state || ""}
                    onChange={(e) => updateField("delivery_state", e.target.value)}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card className="border-0 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Redes Sociais
              </CardTitle>
              <CardDescription>Links para suas redes sociais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram_url" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram_url"
                  value={settings.instagram_url || ""}
                  onChange={(e) => updateField("instagram_url", e.target.value)}
                  placeholder="https://instagram.com/sualoja"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook_url" className="flex items-center gap-2">
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook_url"
                  value={settings.facebook_url || ""}
                  onChange={(e) => updateField("facebook_url", e.target.value)}
                  placeholder="https://facebook.com/sualoja"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok_url">TikTok</Label>
                <Input
                  id="tiktok_url"
                  value={settings.tiktok_url || ""}
                  onChange={(e) => updateField("tiktok_url", e.target.value)}
                  placeholder="https://tiktok.com/@sualoja"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

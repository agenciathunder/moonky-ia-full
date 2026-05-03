import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { useLandingSettings, LandingSettings, CardItem } from "@/hooks/useLandingSettings";
import { 
  Save, Loader2, Eye, EyeOff, Image, Type, 
  MousePointerClick, Layout, Sparkles, MessageSquare,
  Globe, ChevronDown, ChevronUp, Plus, Trash2, GripVertical
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CardsEditorProps {
  cards: CardItem[];
  onChange: (cards: CardItem[]) => void;
  colorScheme?: "primary" | "destructive";
  showHighlight?: boolean;
}

const CardsEditor = ({ cards, onChange, colorScheme = "primary", showHighlight = false }: CardsEditorProps) => {
  const updateCard = (index: number, field: keyof CardItem, value: any) => {
    const updated = [...cards];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addCard = () => {
    onChange([...cards, { icon_url: null, title: "", description: "", ...(showHighlight ? { highlight: false } : {}) }]);
  };

  const removeCard = (index: number) => {
    onChange(cards.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cards</p>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={addCard}>
          <Plus className="w-3 h-3" />
          Adicionar card
        </Button>
      </div>
      {cards.map((card, index) => (
        <div key={index} className="relative p-4 rounded-lg border border-border/60 bg-background/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
              <span className="text-xs font-medium text-muted-foreground">Card {index + 1}</span>
            </div>
            <div className="flex items-center gap-2">
              {showHighlight && (
                <div className="flex items-center gap-1.5">
                  <Label className="text-[10px] text-muted-foreground">Destaque</Label>
                  <Switch
                    checked={!!card.highlight}
                    onCheckedChange={(v) => updateCard(index, "highlight", v)}
                  />
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={() => removeCard(index)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground">Ícone do card (upload de imagem)</Label>
            <ImageUpload
              currentImageUrl={card.icon_url || ""}
              onImageUploaded={(url) => updateCard(index, "icon_url", url)}
              bucketName="store-assets"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Título</Label>
              <Input
                value={card.title}
                onChange={(e) => updateCard(index, "title", e.target.value)}
                placeholder="Título do card"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Descrição</Label>
              <Input
                value={card.description}
                onChange={(e) => updateCard(index, "description", e.target.value)}
                placeholder="Descrição do card"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

interface SectionEditorProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  visible?: boolean;
  onToggleVisible?: (v: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SectionEditor = ({ title, icon, description, visible, onToggleVisible, children, defaultOpen = false }: SectionEditorProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="bg-card/50 border-border/40">
      <CardHeader 
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {icon}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onToggleVisible !== undefined && (
              <div 
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {visible ? (
                  <Eye className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <Switch 
                  checked={visible} 
                  onCheckedChange={onToggleVisible}
                />
              </div>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-4">
          <Separator className="mb-4" />
          {children}
        </CardContent>
      )}
    </Card>
  );
};

const LandingPageBuilder = () => {
  const { settings, loading, updateSettings } = useLandingSettings();
  const { toast } = useToast();
  const [form, setForm] = useState<LandingSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm(settings);
    }
  }, [settings, loading]);

  const updateField = (field: keyof LandingSettings, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const { id, ...updates } = form;
    const success = await updateSettings(updates);
    setSaving(false);
    
    if (success) {
      setHasChanges(false);
      toast({ title: "Salvo!", description: "Landing page atualizada com sucesso." });
    } else {
      toast({ title: "Erro", description: "Erro ao salvar alterações.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Landing Page Builder</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize todos os textos, imagens e seções da landing page
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <Globe className="w-4 h-4" />
              Pré-visualizar
            </Button>
          </a>
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            size="sm"
            className="gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </Button>
        </div>
      </div>

      {/* Logo Management */}
      <SectionEditor 
        title="Logotipo"
        icon={<Image className="w-4 h-4 text-primary" />}
        description="Logo oficial exibida em toda a plataforma"
        defaultOpen
      >
        <div className="space-y-3">
          <Label className="text-xs">Logo da plataforma</Label>
          <ImageUpload
            currentImageUrl={form.logo_url || ""}
            onImageUploaded={(url) => updateField("logo_url", url)}
            bucketName="store-assets"
          />
          <p className="text-xs text-muted-foreground">
            Será exibido na Landing Page, Painel Admin, Painel do Estabelecimento e Login.
          </p>
        </div>
      </SectionEditor>

      {/* Banner */}
      <SectionEditor 
        title="Banner Principal"
        icon={<Layout className="w-4 h-4 text-primary" />}
        description="Banner full-width no topo da landing page"
        visible={form.banner_enabled}
        onToggleVisible={(v) => updateField("banner_enabled", v)}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Banner Desktop <span className="text-muted-foreground font-normal">(1920×600px)</span></Label>
              <ImageUpload
                currentImageUrl={form.banner_image_url || ""}
                onImageUploaded={(url) => updateField("banner_image_url", url)}
                bucketName="banners"
              />
              <p className="text-[10px] text-muted-foreground">Proporção recomendada: 16:5 (1920×600)</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Banner Mobile <span className="text-muted-foreground font-normal">(768×960px)</span></Label>
              <ImageUpload
                currentImageUrl={form.banner_mobile_image_url || ""}
                onImageUploaded={(url) => updateField("banner_mobile_image_url", url)}
                bucketName="banners"
              />
              <p className="text-[10px] text-muted-foreground">Proporção recomendada: 4:5 (768×960)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Título (opcional)</Label>
              <Input 
                value={form.banner_title || ""} 
                onChange={(e) => updateField("banner_title", e.target.value)}
                placeholder="Título do banner"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Input 
                value={form.banner_description || ""} 
                onChange={(e) => updateField("banner_description", e.target.value)}
                placeholder="Descrição do banner"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Texto do botão (opcional)</Label>
              <Input 
                value={form.banner_button_text || ""} 
                onChange={(e) => updateField("banner_button_text", e.target.value)}
                placeholder="Ex: Saiba mais"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Link do botão</Label>
              <Input 
                value={form.banner_button_link || ""} 
                onChange={(e) => updateField("banner_button_link", e.target.value)}
                placeholder="Ex: /auth"
              />
            </div>
          </div>
        </div>
      </SectionEditor>

      {/* Navbar */}
      <SectionEditor
        title="Barra de Navegação"
        icon={<Layout className="w-4 h-4 text-primary" />}
        description="Botão de ação na navbar"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Texto do botão</Label>
            <Input 
              value={form.navbar_cta_text} 
              onChange={(e) => updateField("navbar_cta_text", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Link do botão</Label>
            <Input 
              value={form.navbar_cta_link} 
              onChange={(e) => updateField("navbar_cta_link", e.target.value)}
            />
          </div>
        </div>
      </SectionEditor>

      {/* Hero Section */}
      <SectionEditor 
        title="Seção Hero"
        icon={<Sparkles className="w-4 h-4 text-primary" />}
        description="Seção principal com título, subtítulo e botões"
        visible={form.hero_visible}
        onToggleVisible={(v) => updateField("hero_visible", v)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Badge</Label>
            <Input 
              value={form.hero_badge_text} 
              onChange={(e) => updateField("hero_badge_text", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Título principal</Label>
            <Textarea 
              value={form.hero_title} 
              onChange={(e) => updateField("hero_title", e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subtítulo</Label>
            <Textarea 
              value={form.hero_subtitle} 
              onChange={(e) => updateField("hero_subtitle", e.target.value)}
              rows={2}
            />
          </div>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Botões</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Botão principal - texto</Label>
              <Input 
                value={form.hero_cta_text} 
                onChange={(e) => updateField("hero_cta_text", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Botão principal - link</Label>
              <Input 
                value={form.hero_cta_link} 
                onChange={(e) => updateField("hero_cta_link", e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch 
              checked={form.hero_secondary_btn_visible} 
              onCheckedChange={(v) => updateField("hero_secondary_btn_visible", v)} 
            />
            <Label className="text-xs">Mostrar botão secundário</Label>
          </div>
          {form.hero_secondary_btn_visible && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Botão secundário - texto</Label>
                <Input 
                  value={form.hero_secondary_btn_text} 
                  onChange={(e) => updateField("hero_secondary_btn_text", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Botão secundário - link</Label>
                <Input 
                  value={form.hero_secondary_btn_link} 
                  onChange={(e) => updateField("hero_secondary_btn_link", e.target.value)}
                />
              </div>
            </div>
          )}
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Indicadores de confiança</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Indicador 1</Label>
              <Input 
                value={form.hero_trust1} 
                onChange={(e) => updateField("hero_trust1", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Indicador 2</Label>
              <Input 
                value={form.hero_trust2} 
                onChange={(e) => updateField("hero_trust2", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Indicador 3</Label>
              <Input 
                value={form.hero_trust3} 
                onChange={(e) => updateField("hero_trust3", e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionEditor>

      {/* Pain Points */}
      <SectionEditor 
        title="Seção Dores"
        icon={<Type className="w-4 h-4 text-primary" />}
        description="Problemas que seu público enfrenta"
        visible={form.painpoints_visible}
        onToggleVisible={(v) => updateField("painpoints_visible", v)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Badge</Label>
            <Input 
              value={form.painpoints_badge} 
              onChange={(e) => updateField("painpoints_badge", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input 
              value={form.painpoints_title} 
              onChange={(e) => updateField("painpoints_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subtítulo</Label>
            <Textarea 
              value={form.painpoints_subtitle} 
              onChange={(e) => updateField("painpoints_subtitle", e.target.value)}
              rows={2}
            />
          </div>
          <Separator />
          <CardsEditor
            cards={form.painpoints_cards || []}
            onChange={(cards) => updateField("painpoints_cards", cards)}
            colorScheme="destructive"
          />
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bloco de solução</p>
          <div className="space-y-2">
            <Label className="text-xs">Título da solução</Label>
            <Input 
              value={form.painpoints_solution_title} 
              onChange={(e) => updateField("painpoints_solution_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subtítulo da solução</Label>
            <Input 
              value={form.painpoints_solution_subtitle} 
              onChange={(e) => updateField("painpoints_solution_subtitle", e.target.value)}
            />
          </div>
        </div>
      </SectionEditor>

      {/* Benefits */}
      <SectionEditor 
        title="Seção Benefícios"
        icon={<Sparkles className="w-4 h-4 text-primary" />}
        description="Benefícios do produto"
        visible={form.benefits_visible}
        onToggleVisible={(v) => updateField("benefits_visible", v)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Badge</Label>
            <Input 
              value={form.benefits_badge} 
              onChange={(e) => updateField("benefits_badge", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input 
              value={form.benefits_title} 
              onChange={(e) => updateField("benefits_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subtítulo</Label>
            <Textarea 
              value={form.benefits_subtitle} 
              onChange={(e) => updateField("benefits_subtitle", e.target.value)}
              rows={2}
            />
          </div>
          <Separator />
          <CardsEditor
            cards={form.benefits_cards || []}
            onChange={(cards) => updateField("benefits_cards", cards)}
          />
        </div>
      </SectionEditor>

      {/* Features */}
      <SectionEditor 
        title="Seção Funcionalidades"
        icon={<MousePointerClick className="w-4 h-4 text-primary" />}
        description="Lista de funcionalidades do sistema"
        visible={form.features_visible}
        onToggleVisible={(v) => updateField("features_visible", v)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Badge</Label>
            <Input 
              value={form.features_badge} 
              onChange={(e) => updateField("features_badge", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input 
              value={form.features_title} 
              onChange={(e) => updateField("features_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subtítulo</Label>
            <Textarea 
              value={form.features_subtitle} 
              onChange={(e) => updateField("features_subtitle", e.target.value)}
              rows={2}
            />
          </div>
          <Separator />
          <CardsEditor
            cards={form.features_cards || []}
            onChange={(cards) => updateField("features_cards", cards)}
            showHighlight
          />
        </div>
      </SectionEditor>

      {/* Pricing */}
      <SectionEditor 
        title="Seção Preços"
        icon={<Type className="w-4 h-4 text-primary" />}
        description="Cabeçalho da seção de preços"
        visible={form.pricing_visible}
        onToggleVisible={(v) => updateField("pricing_visible", v)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Badge</Label>
            <Input 
              value={form.pricing_badge} 
              onChange={(e) => updateField("pricing_badge", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input 
              value={form.pricing_title} 
              onChange={(e) => updateField("pricing_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Texto promocional</Label>
            <Input 
              value={form.pricing_promo_text} 
              onChange={(e) => updateField("pricing_promo_text", e.target.value)}
            />
          </div>
        </div>
      </SectionEditor>

      {/* CTA */}
      <SectionEditor 
        title="Seção CTA (Call to Action)"
        icon={<MousePointerClick className="w-4 h-4 text-primary" />}
        description="Chamada final para conversão"
        visible={form.cta_visible}
        onToggleVisible={(v) => updateField("cta_visible", v)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Título</Label>
            <Input 
              value={form.cta_title} 
              onChange={(e) => updateField("cta_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Subtítulo</Label>
            <Textarea 
              value={form.cta_subtitle} 
              onChange={(e) => updateField("cta_subtitle", e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Texto do botão</Label>
              <Input 
                value={form.cta_button_text} 
                onChange={(e) => updateField("cta_button_text", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Link do botão</Label>
              <Input 
                value={form.cta_button_link} 
                onChange={(e) => updateField("cta_button_link", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Prova social</Label>
            <Input 
              value={form.cta_social_proof} 
              onChange={(e) => updateField("cta_social_proof", e.target.value)}
            />
          </div>
        </div>
      </SectionEditor>

      {/* Footer */}
      <SectionEditor 
        title="Rodapé"
        icon={<MessageSquare className="w-4 h-4 text-primary" />}
        description="Links, redes sociais e descrição do rodapé"
        visible={form.footer_visible}
        onToggleVisible={(v) => updateField("footer_visible", v)}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Descrição da empresa</Label>
            <Textarea 
              value={form.footer_description} 
              onChange={(e) => updateField("footer_description", e.target.value)}
              rows={2}
            />
          </div>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Redes sociais</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Instagram URL</Label>
              <Input 
                value={form.footer_instagram_url} 
                onChange={(e) => updateField("footer_instagram_url", e.target.value)}
                placeholder="https://instagram.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Facebook URL</Label>
              <Input 
                value={form.footer_facebook_url} 
                onChange={(e) => updateField("footer_facebook_url", e.target.value)}
                placeholder="https://facebook.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">LinkedIn URL</Label>
              <Input 
                value={form.footer_linkedin_url} 
                onChange={(e) => updateField("footer_linkedin_url", e.target.value)}
                placeholder="https://linkedin.com/..."
              />
            </div>
          </div>
          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Links do rodapé</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Central de Ajuda URL</Label>
              <Input 
                value={form.footer_help_url} 
                onChange={(e) => updateField("footer_help_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Contato URL</Label>
              <Input 
                value={form.footer_contact_url} 
                onChange={(e) => updateField("footer_contact_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Termos de Uso URL</Label>
              <Input 
                value={form.footer_terms_url} 
                onChange={(e) => updateField("footer_terms_url", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Privacidade URL</Label>
              <Input 
                value={form.footer_privacy_url} 
                onChange={(e) => updateField("footer_privacy_url", e.target.value)}
              />
            </div>
          </div>
        </div>
      </SectionEditor>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2 shadow-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
};

export default LandingPageBuilder;

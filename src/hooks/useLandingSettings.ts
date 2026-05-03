import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CardItem {
  icon_url: string | null;
  title: string;
  description: string;
  highlight?: boolean;
}

export interface LandingSettings {
  id: string;
  logo_url: string | null;
  banner_enabled: boolean;
  banner_image_url: string | null;
  banner_mobile_image_url: string | null;
  banner_title: string | null;
  banner_description: string | null;
  banner_button_text: string | null;
  banner_button_link: string | null;
  hero_visible: boolean;
  hero_badge_text: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_cta_link: string;
  hero_secondary_btn_text: string;
  hero_secondary_btn_link: string;
  hero_secondary_btn_visible: boolean;
  hero_trust1: string;
  hero_trust2: string;
  hero_trust3: string;
  painpoints_visible: boolean;
  painpoints_badge: string;
  painpoints_title: string;
  painpoints_subtitle: string;
  painpoints_solution_title: string;
  painpoints_solution_subtitle: string;
  painpoints_cards: CardItem[];
  benefits_visible: boolean;
  benefits_badge: string;
  benefits_title: string;
  benefits_subtitle: string;
  benefits_cards: CardItem[];
  features_visible: boolean;
  features_badge: string;
  features_title: string;
  features_subtitle: string;
  features_cards: CardItem[];
  pricing_visible: boolean;
  pricing_badge: string;
  pricing_title: string;
  pricing_promo_text: string;
  cta_visible: boolean;
  cta_title: string;
  cta_subtitle: string;
  cta_button_text: string;
  cta_button_link: string;
  cta_social_proof: string;
  footer_visible: boolean;
  footer_description: string;
  footer_instagram_url: string;
  footer_facebook_url: string;
  footer_linkedin_url: string;
  footer_help_url: string;
  footer_contact_url: string;
  footer_terms_url: string;
  footer_privacy_url: string;
  navbar_cta_text: string;
  navbar_cta_link: string;
}

const defaultPainpointsCards: CardItem[] = [
  { icon_url: null, title: "Perda de vendas", description: "Por falta de organização e controle dos pedidos" },
  { icon_url: null, title: "Pedidos no papel", description: "Anotações confusas, erros e pedidos perdidos no WhatsApp" },
  { icon_url: null, title: "Sem controle financeiro", description: "Não sabe quanto entra, quanto sai, nem quanto lucra" },
  { icon_url: null, title: "Tempo desperdiçado", description: "Gerenciando estoque, pedidos e atendimento manualmente" },
  { icon_url: null, title: "Sistemas caros e complexos", description: "Vários sistemas que não conversam entre si" },
  { icon_url: null, title: "Sem visão do negócio", description: "Tomando decisões no escuro, sem dados concretos" }
];

const defaultBenefitsCards: CardItem[] = [
  { icon_url: null, title: "Loja criada em minutos", description: "Seu catálogo, cardápio ou loja virtual pronta para vender rapidamente" },
  { icon_url: null, title: "100% personalizável", description: "Adapte cores, logo e layout para combinar com sua marca" },
  { icon_url: null, title: "Mais vendas, menos erros", description: "Organização que converte visitantes em clientes fiéis" },
  { icon_url: null, title: "Tudo em um painel", description: "Controle completo do negócio em um único lugar" },
  { icon_url: null, title: "Economia de tempo", description: "Automatize tarefas repetitivas e foque no que importa" },
  { icon_url: null, title: "Visual profissional", description: "Transmita confiança e credibilidade aos seus clientes" }
];

const defaultFeaturesCards: CardItem[] = [
  { icon_url: null, title: "Controle Geral do Negócio", description: "Tudo centralizado em um único painel. Visão completa de pedidos, vendas, estoque e clientes.", highlight: true },
  { icon_url: null, title: "PDV Integrado", description: "Venda presencial e online no mesmo sistema. Aceite diversos meios de pagamento.", highlight: false },
  { icon_url: null, title: "Pedidos em Kanban", description: "Visual, organizado e fácil de acompanhar. Ideal para cozinha, balcão ou equipe.", highlight: false },
  { icon_url: null, title: "Eventos", description: "Venda de ingressos, reserva de mesas, camarotes. Controle total de eventos especiais.", highlight: false },
  { icon_url: null, title: "Financeiro Completo", description: "Entradas e saídas, relatórios claros, visão real do lucro. Saiba exatamente como está seu caixa.", highlight: false },
  { icon_url: null, title: "Nota de Serviço", description: "Emissão de nota de forma simples. Mais profissionalismo e segurança para seu negócio.", highlight: false }
];

const defaultSettings: LandingSettings = {
  id: "default",
  logo_url: null,
  banner_enabled: false,
  banner_image_url: null,
  banner_mobile_image_url: null,
  banner_title: null,
  banner_description: null,
  banner_button_text: null,
  banner_button_link: null,
  hero_visible: true,
  hero_badge_text: "Oferta por tempo limitado — Economize até 60%",
  hero_title: "Transforme seu negócio em uma máquina de vendas organizada — em minutos",
  hero_subtitle: "Crie sua loja virtual, catálogo ou cardápio digital personalizado. Controle pedidos, vendas e financeiro em um único sistema simples e poderoso.",
  hero_cta_text: "Acessar minha conta",
  hero_cta_link: "/auth",
  hero_secondary_btn_text: "Ver demonstração",
  hero_secondary_btn_link: "#",
  hero_secondary_btn_visible: true,
  hero_trust1: "Setup em 5 minutos",
  hero_trust2: "Sem conhecimento técnico",
  hero_trust3: "Suporte humanizado",
  painpoints_visible: true,
  painpoints_badge: "Você se identifica?",
  painpoints_title: "As dores que estão travando seu crescimento",
  painpoints_subtitle: "Se você passa por alguma dessas situações, está perdendo dinheiro e tempo todos os dias.",
  painpoints_solution_title: "Você não precisa de vários sistemas.",
  painpoints_solution_subtitle: "Precisa de um só que resolva tudo.",
  painpoints_cards: defaultPainpointsCards,
  benefits_visible: true,
  benefits_badge: "Resultados reais",
  benefits_title: "O que o Moonky faz pelo seu negócio",
  benefits_subtitle: "Focamos em resultados práticos que você vai sentir no dia a dia e no caixa.",
  benefits_cards: defaultBenefitsCards,
  features_visible: true,
  features_badge: "Funcionalidades",
  features_title: "Tudo que você precisa em um só lugar",
  features_subtitle: "Ferramentas profissionais para gerenciar seu negócio de ponta a ponta.",
  features_cards: defaultFeaturesCards,
  pricing_visible: true,
  pricing_badge: "Planos e preços",
  pricing_title: "Escolha o plano ideal para seu negócio",
  pricing_promo_text: "Oferta por tempo limitado — Economize até 60%",
  cta_visible: true,
  cta_title: "Pare de perder vendas por falta de controle",
  cta_subtitle: "Em poucos minutos, seu negócio pode estar vendendo de forma organizada e profissional.",
  cta_button_text: "Acessar minha conta",
  cta_button_link: "/auth",
  cta_social_proof: "+100 empresários já utilizam o Moonky",
  footer_visible: true,
  footer_description: "Sistema completo de gestão, pedidos e vendas para estabelecimentos comerciais. Simples, profissional e escalável.",
  footer_instagram_url: "#",
  footer_facebook_url: "#",
  footer_linkedin_url: "#",
  footer_help_url: "#",
  footer_contact_url: "#",
  footer_terms_url: "#",
  footer_privacy_url: "#",
  navbar_cta_text: "Entrar",
  navbar_cta_link: "/auth",
};

export function useLandingSettings() {
  const [settings, setSettings] = useState<LandingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_page_settings" as any)
        .select("*")
        .eq("id", "default")
        .single();

      if (error) throw error;
      if (data) {
        const d = data as any;
        setSettings({
          ...defaultSettings,
          ...d,
          painpoints_cards: Array.isArray(d.painpoints_cards) ? d.painpoints_cards : defaultPainpointsCards,
          benefits_cards: Array.isArray(d.benefits_cards) ? d.benefits_cards : defaultBenefitsCards,
          features_cards: Array.isArray(d.features_cards) ? d.features_cards : defaultFeaturesCards,
        });
      }
    } catch (error) {
      console.error("Error fetching landing settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<LandingSettings>) => {
    try {
      const { error } = await supabase
        .from("landing_page_settings" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", "default");

      if (error) throw error;
      setSettings(prev => ({ ...prev, ...updates }));
      return true;
    } catch (error) {
      console.error("Error updating landing settings:", error);
      return false;
    }
  };

  return { settings, loading, updateSettings, refetch: fetchSettings };
}

import {
  Package,
  ShoppingCart,
  Users,
  BarChart,
  Tag,
  Layers,
  Image as ImageIcon,
  Settings,
  Calendar,
  Calculator,
  Wallet,
  LucideIcon,
} from "lucide-react";

// Central configuration for admin panel features
// When adding new features to the admin panel, add them here
// They will automatically appear in the Admin Master plan configuration

export interface AdminFeature {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  // Database column name in plans table
  planColumn: string;
  // Menu value in AdminSidebar
  menuValue: string;
}

// All available admin panel features
// Add new features here and they will automatically appear in:
// 1. Admin Master plan configuration
// 2. Filtered based on establishment's plan in Admin panel
export const ADMIN_FEATURES: AdminFeature[] = [
  {
    id: "overview",
    label: "Visão Geral",
    description: "Dashboard com métricas e estatísticas",
    icon: BarChart,
    planColumn: "has_overview",
    menuValue: "overview",
  },
  {
    id: "pdv",
    label: "Caixa (PDV)",
    description: "Ponto de venda para vendas presenciais",
    icon: Calculator,
    planColumn: "has_pdv",
    menuValue: "pdv",
  },
  {
    id: "products",
    label: "Produtos",
    description: "Gerenciamento de produtos",
    icon: Package,
    planColumn: "has_products",
    menuValue: "products",
  },
  {
    id: "brands",
    label: "Marcas",
    description: "Gerenciamento de marcas",
    icon: Tag,
    planColumn: "has_brands",
    menuValue: "brands",
  },
  {
    id: "categories",
    label: "Categorias",
    description: "Gerenciamento de categorias",
    icon: Layers,
    planColumn: "has_categories",
    menuValue: "categories",
  },
  {
    id: "events",
    label: "Eventos",
    description: "Gerenciamento de eventos e ingressos",
    icon: Calendar,
    planColumn: "has_events",
    menuValue: "events",
  },
  {
    id: "banners",
    label: "Banners",
    description: "Banners promocionais da loja",
    icon: ImageIcon,
    planColumn: "has_banners",
    menuValue: "banners",
  },
  {
    id: "coupons",
    label: "Cupons",
    description: "Cupons de desconto",
    icon: Tag,
    planColumn: "has_coupons",
    menuValue: "coupons",
  },
  {
    id: "orders",
    label: "Pedidos",
    description: "Gerenciamento de pedidos",
    icon: ShoppingCart,
    planColumn: "has_orders",
    menuValue: "orders",
  },
  {
    id: "customers",
    label: "Clientes",
    description: "Gerenciamento de clientes",
    icon: Users,
    planColumn: "has_customers",
    menuValue: "users",
  },
  {
    id: "wallet",
    label: "Carteira",
    description: "Gestão financeira e saques",
    icon: Wallet,
    planColumn: "has_wallet",
    menuValue: "wallet",
  },
  {
    id: "settings",
    label: "Configurações",
    description: "Configurações da loja",
    icon: Settings,
    planColumn: "has_settings",
    menuValue: "settings",
  },
];

// Helper to get plan column names for database queries
export const getPlanFeatureColumns = (): string[] => {
  return ADMIN_FEATURES.map((f) => f.planColumn);
};

// Check if a menu item is enabled based on plan
export const isFeatureEnabled = (
  menuValue: string,
  plan: Record<string, boolean> | null
): boolean => {
  if (!plan) return true; // If no plan, show all (for master admin)
  
  const feature = ADMIN_FEATURES.find((f) => f.menuValue === menuValue);
  if (!feature) return true; // Unknown features are always shown
  
  return plan[feature.planColumn] !== false;
};

// Store mode types
export type StoreMode = "virtual_store" | "catalog_only";

export const STORE_MODES = [
  {
    id: "virtual_store" as StoreMode,
    label: "Loja Virtual",
    description: "Vendas online completas com carrinho e checkout",
  },
  {
    id: "catalog_only" as StoreMode,
    label: "Apenas Catálogo",
    description: "Exibe produtos sem opção de compra online",
  },
];

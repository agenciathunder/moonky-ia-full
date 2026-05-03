import {
  Package,
  ShoppingCart,
  Users,
  BarChart,
  Home,
  Tag,
  Layers,
  Image as ImageIcon,
  Settings,
  Store,
  Megaphone,
  ClipboardList,
  ChevronDown,
  Calendar,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Calculator,
  Wallet,
  ScanLine,
  FileText,
  Bot
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import moonkyLogo from "@/assets/moonky-logo.png";
import { useEstablishmentAdmin } from "@/hooks/useEstablishmentAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuSections = [
  {
    id: "operacional",
    label: "Operacional",
    icon: Store,
    items: [
      { value: "overview", label: "Visão Geral", icon: BarChart, planFeature: "has_overview" },
      { value: "pdv", label: "Caixa (PDV)", icon: Calculator, planFeature: "has_pdv" },
      { value: "orders", label: "Pedidos", icon: ShoppingCart, planFeature: "has_orders" },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    icon: Package,
    items: [
      { value: "products", label: "Produtos", icon: Package, planFeature: "has_products" },
      { value: "brands", label: "Marcas", icon: Tag, planFeature: "has_brands" },
      { value: "categories", label: "Categorias", icon: Layers, planFeature: "has_categories" },
    ],
  },
  {
    id: "eventos",
    label: "Eventos",
    icon: Calendar,
    items: [
      { value: "events", label: "Eventos", icon: Calendar, planFeature: "has_events" },
      { value: "scanner", label: "Scanner", icon: ScanLine, planFeature: "has_events" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { value: "banners", label: "Banners", icon: ImageIcon, planFeature: "has_banners" },
      { value: "coupons", label: "Cupons", icon: Tag, planFeature: "has_coupons" },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    icon: Wallet,
    items: [
      { value: "wallet", label: "Carteira", icon: Wallet, planFeature: "has_wallet" },
      { value: "report", label: "Relatório", icon: FileText, planFeature: "has_financial" },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: Settings,
    items: [
      { value: "whatsapp", label: "WhatsApp IA", icon: Bot, planFeature: "has_settings" },
      { value: "users", label: "Usuários", icon: Users, planFeature: "has_customers" },
      { value: "settings", label: "Configurações", icon: Settings, planFeature: "has_settings" },
    ],
  },
];

export const AdminSidebar = ({ activeTab, setActiveTab }: AdminSidebarProps) => {
  const navigate = useNavigate();
  const { membership, plan, isEmployee } = useEstablishmentAdmin();
  const { user, signOut } = useAuth();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          setProfile(data);
        });
    }
  }, [user?.id]);

  const employeeAllowedFeatures = ['pdv', 'events', 'scanner'];

  const isFeatureEnabled = (planFeature: string, menuValue: string): boolean => {
    if (isEmployee) {
      return employeeAllowedFeatures.includes(menuValue);
    }
    
    if (!plan) return true;
    const planRecord = plan as unknown as Record<string, boolean>;
    return planRecord[planFeature] !== false;
  };

  const filteredMenuSections = menuSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => isFeatureEnabled(item.planFeature, item.value))
    }))
    .filter(section => section.items.length > 0);
  
  const getActiveSectionId = () => {
    for (const section of filteredMenuSections) {
      if (section.items.some(item => item.value === activeTab)) {
        return section.id;
      }
    }
    return filteredMenuSections[0]?.id || "operacional";
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const activeSectionId = getActiveSectionId();
    return { [activeSectionId]: true };
  });

  useEffect(() => {
    const activeSectionId = getActiveSectionId();
    setOpenSections(prev => ({ ...prev, [activeSectionId]: true }));
  }, [activeTab]);

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleGoToStore = () => {
    if (membership?.establishment?.slug) {
      navigate(`/loja/${membership.establishment.slug}`);
    } else {
      navigate("/");
    }
  };

  const handleLogout = async () => {
    await signOut();
    if (membership?.establishment?.slug) {
      navigate(`/loja/${membership.establishment.slug}`);
    } else {
      navigate("/");
    }
  };

  const userName = profile?.full_name || user?.email?.split('@')[0] || "Usuário";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <Sidebar 
      className="border-r border-border bg-card"
      collapsible="icon"
    >
      {/* Header */}
      <div className={cn(
        "flex h-14 items-center border-b border-border",
        isCollapsed ? "justify-center px-2" : "px-4"
      )}>
        {!isCollapsed && (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleGoToStore}
              className="mr-3 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              title="Ir para a loja"
            >
              <Home className="w-4 h-4" />
            </Button>
            <img 
              src={moonkyLogo} 
              alt="Moonky" 
              className="h-7 w-auto"
            />
          </>
        )}
        {isCollapsed && (
          <img 
            src="/favicon.ico" 
            alt="Moonky" 
            className="h-7 w-7 object-contain"
          />
        )}
      </div>
      
      {/* Toggle button */}
      <div className={cn("p-2", isCollapsed ? "flex justify-center" : "flex justify-end")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 rounded-lg hover:bg-muted"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? (
            <PanelLeft className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <SidebarContent className={cn(
        "py-1 overflow-y-auto overflow-x-hidden scrollbar-none",
        isCollapsed ? "px-0" : "px-2"
      )}>
        {filteredMenuSections.map((section) => {
          const SectionIcon = section.icon;
          const isOpen = openSections[section.id] ?? false;
          const hasActiveItem = section.items.some(item => item.value === activeTab);
          
          if (isCollapsed) {
            return (
              <SidebarGroup key={section.id} className="mb-1 px-0">
                <SidebarMenu className="items-center">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.value;
                    
                    return (
                      <SidebarMenuItem key={item.value} className="w-full flex justify-center">
                        <SidebarMenuButton
                          onClick={() => setActiveTab(item.value)}
                          tooltip={item.label}
                          className={cn(
                            "flex items-center justify-center transition-all duration-150 rounded-lg my-0.5 w-10 h-10 p-0",
                            "hover:bg-muted",
                            isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            );
          }
          
          return (
            <Collapsible
              key={section.id}
              open={isOpen}
              onOpenChange={() => toggleSection(section.id)}
            >
              <SidebarGroup className="mb-0.5">
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors",
                      "hover:bg-muted group"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <SectionIcon className={cn(
                        "w-4 h-4",
                        hasActiveItem ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm",
                        hasActiveItem ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {section.label}
                      </span>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                      )} 
                    />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <SidebarGroupContent className="mt-0.5 ml-2 pl-4 border-l border-border">
                    <SidebarMenu>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.value;
                        
                        return (
                          <SidebarMenuItem key={item.value}>
                            <SidebarMenuButton
                              onClick={() => setActiveTab(item.value)}
                              className={cn(
                                "relative transition-all duration-150 rounded-lg my-0.5",
                                "hover:bg-muted",
                                isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-sm">{item.label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      
      <div className="mt-auto border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer",
              isCollapsed && "justify-center"
            )}>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary-foreground">
                  {userInitial}
                </span>
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {membership?.establishment?.name || "Painel"}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <div className="p-3 border-b border-border">
              <p className="font-medium text-sm truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={handleGoToStore} className="cursor-pointer">
              <Home className="w-4 h-4 mr-2" />
              Ir para a loja
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Sidebar>
  );
};

export const getMenuItemLabel = (value: string): string => {
  for (const section of menuSections) {
    const item = section.items.find(i => i.value === value);
    if (item) return item.label;
  }
  return "Painel";
};

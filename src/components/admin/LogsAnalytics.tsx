import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, subYears, startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity, Users, Clock, Shield, FileText, Search,
  TrendingUp, Eye, AlertTriangle, CheckCircle, Monitor, Smartphone,
  Tablet, Globe, RefreshCw, Loader2, ChevronLeft, ChevronRight, BarChart3,
  Calendar, Zap, UserCheck, LogIn, ShoppingCart, Ticket, MapPin, Crosshair,
  Layers, ArrowRight, XCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  establishment_id: string | null;
  establishment_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_name: string | null;
  details: any;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  result: string;
  error_message: string | null;
  created_at: string;
}

interface UserSession {
  id: string;
  user_id: string;
  user_email: string | null;
  establishment_id: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  location_city: string | null;
  location_state: string | null;
  is_active: boolean;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
}

interface SecurityAlert {
  id: string;
  user_id: string | null;
  user_email: string | null;
  establishment_id: string | null;
  alert_type: string;
  severity: string;
  description: string;
  metadata: any;
  ip_address: string | null;
  location: string | null;
  is_resolved: boolean;
  resolved_note: string | null;
  created_at: string;
}

interface Establishment {
  id: string;
  name: string;
}

interface UserMetrics {
  onlineNow: number;
  activeToday: number;
  activeWeek: number;
  activeMonth: number;
  activeYear: number;
  totalLogins: number;
  avgSessionDuration: number;
  totalActions: number;
}

interface PerformanceMetrics {
  peakHours: { hour: number; count: number }[];
  busiestDays: { day: string; count: number }[];
  returnRate: number;
  inactiveUsers: number;
  topPages: { page: string; count: number }[];
  topEstablishments: { name: string; count: number }[];
}

export default function LogsAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetrics>({
    onlineNow: 0, activeToday: 0, activeWeek: 0, activeMonth: 0,
    activeYear: 0, totalLogins: 0, avgSessionDuration: 0, totalActions: 0
  });
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics>({
    peakHours: [], busiestDays: [], returnRate: 0, inactiveUsers: 0,
    topPages: [], topEstablishments: []
  });

  // Filters
  const [periodFilter, setPeriodFilter] = useState("today");
  const [userFilter, setUserFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [establishmentFilter, setEstablishmentFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // IP Trace
  const [traceIp, setTraceIp] = useState("");
  const [traceUser, setTraceUser] = useState("");
  const [traceLogs, setTraceLogs] = useState<ActivityLog[]>([]);
  const [traceLoading, setTraceLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 50;

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (periodFilter) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "week": return { start: startOfWeek(now, { locale: ptBR }), end: now };
      case "month": return { start: startOfMonth(now), end: now };
      case "year": return { start: startOfYear(now), end: now };
      case "all": return { start: subYears(now, 10), end: now };
      default: return { start: startOfDay(now), end: endOfDay(now) };
    }
  }, [periodFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Load establishments
      const { data: estData } = await supabase
        .from("establishments")
        .select("id, name")
        .order("name");
      if (estData) setEstablishments(estData);

      // Build logs query
      let logsQuery = supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (userFilter) logsQuery = logsQuery.ilike("user_email", `%${userFilter}%`);
      if (ipFilter) logsQuery = logsQuery.eq("ip_address", ipFilter);
      if (userTypeFilter !== "all") logsQuery = logsQuery.eq("user_role", userTypeFilter);
      if (establishmentFilter !== "all") logsQuery = logsQuery.eq("establishment_id", establishmentFilter);
      if (actionFilter !== "all") logsQuery = logsQuery.eq("action", actionFilter);
      if (resultFilter !== "all") logsQuery = logsQuery.eq("result", resultFilter);
      if (sectionFilter !== "all") logsQuery = logsQuery.eq("resource_type", sectionFilter);
      if (searchTerm) {
        logsQuery = logsQuery.or(`user_email.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%,resource_name.ilike.%${searchTerm}%,ip_address.ilike.%${searchTerm}%`);
      }

      const { data: logsData, count, error: logsError } = await logsQuery
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (logsError) throw logsError;
      setLogs(logsData || []);
      setTotalLogs(count || 0);

      // Mark stale sessions as inactive (no heartbeat for 2+ min)
      const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      await supabase
        .from("user_sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("is_active", true)
        .lt("last_activity_at", staleThreshold);

      // Load active sessions
      const { data: sessionsData } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("is_active", true)
        .order("last_activity_at", { ascending: false });
      setSessions(sessionsData || []);

      // Load security alerts
      const { data: alertsData } = await supabase
        .from("security_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setAlerts(alertsData || []);

      // Calculate metrics - count unique users online (active sessions with recent heartbeat)
      const onlineThreshold = new Date(Date.now() - 2 * 60 * 1000);
      const onlineUserIds = new Set(
        (sessionsData || [])
          .filter(s => s.is_active && new Date(s.last_activity_at) > onlineThreshold)
          .map(s => s.user_id)
      );
      const onlineNow = onlineUserIds.size;

      const { data: allLogs } = await supabase
        .from("activity_logs")
        .select("user_id, created_at, action, resource_type, establishment_name, ip_address")
        .gte("created_at", subYears(new Date(), 1).toISOString());

      const now = new Date();
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now, { locale: ptBR });
      const monthStart = startOfMonth(now);
      const yearStart = startOfYear(now);

      const uniqueToday = new Set((allLogs || []).filter(l => l.user_id && new Date(l.created_at) >= todayStart).map(l => l.user_id));
      const uniqueWeek = new Set((allLogs || []).filter(l => l.user_id && new Date(l.created_at) >= weekStart).map(l => l.user_id));
      const uniqueMonth = new Set((allLogs || []).filter(l => l.user_id && new Date(l.created_at) >= monthStart).map(l => l.user_id));
      const uniqueYear = new Set((allLogs || []).filter(l => l.user_id && new Date(l.created_at) >= yearStart).map(l => l.user_id));

      const periodLogs = (allLogs || []).filter(l =>
        new Date(l.created_at) >= start && new Date(l.created_at) <= end
      );

      // Avg session duration
      const { data: completedSessions } = await supabase
        .from("user_sessions")
        .select("started_at, ended_at")
        .not("ended_at", "is", null)
        .limit(100);

      const avgDuration = completedSessions?.length
        ? completedSessions.reduce((sum, s) => sum + differenceInMinutes(new Date(s.ended_at!), new Date(s.started_at)), 0) / completedSessions.length
        : 0;

      setUserMetrics({
        onlineNow,
        activeToday: uniqueToday.size,
        activeWeek: uniqueWeek.size,
        activeMonth: uniqueMonth.size,
        activeYear: uniqueYear.size,
        totalLogins: periodLogs.filter(l => l.action === "login").length,
        avgSessionDuration: Math.round(avgDuration),
        totalActions: count || 0
      });

      // Performance metrics
      const hourCounts: Record<number, number> = {};
      const dayCounts: Record<string, number> = {};
      const pageCounts: Record<string, number> = {};
      const estCounts: Record<string, number> = {};

      (allLogs || []).forEach(log => {
        const date = new Date(log.created_at);
        const hour = date.getHours();
        const dayName = format(date, "EEEE", { locale: ptBR });
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
        if (log.resource_type) pageCounts[log.resource_type] = (pageCounts[log.resource_type] || 0) + 1;
        if (log.establishment_name) estCounts[log.establishment_name] = (estCounts[log.establishment_name] || 0) + 1;
      });

      const peakHours = Object.entries(hourCounts)
        .map(([h, c]) => ({ hour: parseInt(h), count: c }))
        .sort((a, b) => b.count - a.count).slice(0, 8);

      const busiestDays = Object.entries(dayCounts)
        .map(([d, c]) => ({ day: d, count: c }))
        .sort((a, b) => b.count - a.count);

      const topPages = Object.entries(pageCounts)
        .map(([p, c]) => ({ page: p, count: c }))
        .sort((a, b) => b.count - a.count).slice(0, 10);

      const topEstablishments = Object.entries(estCounts)
        .map(([n, c]) => ({ name: n, count: c }))
        .sort((a, b) => b.count - a.count).slice(0, 10);

      // Inactive users
      const { data: profiles } = await supabase.from("profiles").select("id");
      const activeUserIds = new Set((allLogs || [])
        .filter(l => l.user_id && new Date(l.created_at) >= subDays(now, 30))
        .map(l => l.user_id));
      const inactiveUsers = (profiles || []).filter(p => !activeUserIds.has(p.id)).length;

      // Return rate
      const userFirstSeen = new Map<string, Date>();
      (allLogs || []).filter(l => l.user_id).forEach(l => {
        const d = new Date(l.created_at);
        if (!userFirstSeen.has(l.user_id!) || d < userFirstSeen.get(l.user_id!)!) {
          userFirstSeen.set(l.user_id!, d);
        }
      });
      let returnedUsers = 0;
      for (const [userId, firstDate] of userFirstSeen) {
        const hasReturned = (allLogs || []).some(l =>
          l.user_id === userId && new Date(l.created_at) > new Date(firstDate.getTime() + 86400000)
        );
        if (hasReturned) returnedUsers++;
      }
      const returnRate = userFirstSeen.size > 0 ? (returnedUsers / userFirstSeen.size) * 100 : 0;

      setPerfMetrics({
        peakHours, busiestDays, returnRate: Math.round(returnRate),
        inactiveUsers, topPages, topEstablishments
      });

      // Audit
      await supabase.from("logs_access_audit").insert({
        user_id: user?.id,
        user_email: user?.email,
        action: "view_logs",
        filters_applied: { periodFilter, userFilter, ipFilter, userTypeFilter, establishmentFilter, actionFilter, resultFilter, sectionFilter },
        records_accessed: count || 0
      });

    } catch (error) {
      console.error("Error loading logs data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getDateRange, userFilter, ipFilter, userTypeFilter, establishmentFilter, actionFilter, resultFilter, sectionFilter, searchTerm, currentPage, user, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime subscriptions
  useEffect(() => {
    const ch1 = supabase.channel('logs-sessions-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => loadData())
      .subscribe();
    const ch2 = supabase.channel('logs-alerts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_alerts' }, () => loadData())
      .subscribe();
    const ch3 = supabase.channel('logs-activity-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
        if (activeTab === "realtime") loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [loadData, activeTab]);

  const handleTrace = async () => {
    if (!traceIp && !traceUser) return;
    setTraceLoading(true);
    try {
      let query = supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (traceIp) query = query.eq("ip_address", traceIp);
      if (traceUser) query = query.ilike("user_email", `%${traceUser}%`);
      const { data } = await query;
      setTraceLogs(data || []);
    } catch { /* ignore */ } finally { setTraceLoading(false); }
  };

  const handleRefresh = () => { setRefreshing(true); loadData(); };

  const getDeviceIcon = (device: string | null) => {
    switch (device?.toLowerCase()) {
      case "mobile": return <Smartphone className="w-4 h-4" />;
      case "tablet": return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case "success": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Sucesso</Badge>;
      case "error": return <Badge variant="destructive" className="text-[10px]">Erro</Badge>;
      case "blocked": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Bloqueado</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{result}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive" className="text-[10px]">Crítico</Badge>;
      case "high": return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px]">Alto</Badge>;
      case "medium": return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px]">Médio</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">Baixo</Badge>;
    }
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const onlineThreshold = new Date(Date.now() - 2 * 60 * 1000);
  const onlineSessions = sessions.filter(s => s.is_active && new Date(s.last_activity_at) > onlineThreshold);
  // Deduplicate by user_id for accurate unique online count
  const uniqueOnlineSessions = Array.from(
    new Map(onlineSessions.map(s => [s.user_id, s])).values()
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Logs & Analytics</h1>
          <p className="text-sm text-muted-foreground">Monitoramento completo da plataforma em tempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 md:grid-cols-8 h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          {[
            { value: "overview", icon: BarChart3, label: "Visão Geral" },
            { value: "sections", icon: Layers, label: "Seções" },
            { value: "logs", icon: FileText, label: "Logs" },
            { value: "realtime", icon: Zap, label: "Tempo Real" },
            { value: "sessions", icon: Users, label: "Sessões" },
            { value: "performance", icon: TrendingUp, label: "Performance" },
            { value: "security", icon: Shield, label: "Segurança" },
            { value: "trace", icon: Crosshair, label: "Rastreio" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center justify-center gap-1 px-1.5 py-2 text-[10px] sm:text-xs">
              <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden md:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ============ OVERVIEW ============ */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Online Agora", value: userMetrics.onlineNow, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-500/10" },
              { label: "Ativos Hoje", value: userMetrics.activeToday, icon: UserCheck, color: "text-primary", bg: "bg-primary/10" },
              { label: "Semana", value: userMetrics.activeWeek, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Mês", value: userMetrics.activeMonth, icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
              { label: "Ano", value: userMetrics.activeYear, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
              { label: "Ações Total", value: userMetrics.totalActions, icon: Zap, color: "text-primary", bg: "bg-primary/10" },
            ].map((m, i) => (
              <Card key={i} className="bg-card/50 border-border/40">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{m.label}</p>
                      <p className={`text-lg sm:text-2xl font-bold ${m.color}`}>{m.value.toLocaleString()}</p>
                    </div>
                    <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full ${m.bg} flex items-center justify-center shrink-0`}>
                      <m.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${m.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Session + Login metrics */}
          <div className="grid gap-3 grid-cols-3">
            {[
              { label: "Total de Logins", value: userMetrics.totalLogins, icon: LogIn, color: "text-primary", bg: "bg-primary/10" },
              { label: "Duração Média", value: `${userMetrics.avgSessionDuration} min`, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Sessões Ativas", value: sessions.length, icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            ].map((m, i) => (
              <Card key={i} className="bg-card/50 border-border/40">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full ${m.bg} flex items-center justify-center shrink-0`}>
                      <m.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${m.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{m.label}</p>
                      <p className="text-base sm:text-xl font-bold">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top establishments + Recent activity */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Estabelecimentos Mais Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {perfMetrics.topEstablishments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>
                  ) : perfMetrics.topEstablishments.slice(0, 5).map((est, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                        <span className="text-sm truncate">{est.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{est.count} ações</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {logs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        {getDeviceIcon(log.device_type)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{log.user_email || "Sistema"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{log.action} {log.resource_name && `- ${log.resource_name}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getResultBadge(log.result)}
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                          {format(new Date(log.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============ SECTIONS ============ */}
        <TabsContent value="sections" className="mt-4 space-y-4">
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Filtrar por Seção da Plataforma</CardTitle>
              <CardDescription className="text-xs">Selecione uma seção para ver todas as atividades relacionadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[
                  { key: "all", label: "Todas", icon: Globe },
                  { key: "landing", label: "Landing Page", icon: Globe },
                  { key: "admin_panel", label: "Painel Admin", icon: Shield },
                  { key: "establishment_panel", label: "Painel Loja", icon: Layers },
                  { key: "login", label: "Login/Auth", icon: LogIn },
                  { key: "store", label: "Loja Pública", icon: ShoppingCart },
                  { key: "events", label: "Eventos", icon: Calendar },
                  { key: "settings", label: "Configurações", icon: Activity },
                ].map(section => (
                  <Button
                    key={section.key}
                    variant={sectionFilter === section.key ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 text-xs justify-start"
                    onClick={() => { setSectionFilter(section.key); setCurrentPage(1); }}
                  >
                    <section.icon className="w-3.5 h-3.5" />
                    {section.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section activity top pages */}
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Páginas Mais Acessadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {perfMetrics.topPages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>
                ) : perfMetrics.topPages.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                      <span className="text-sm capitalize truncate">{p.page}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(p.count / (perfMetrics.topPages[0]?.count || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{p.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section-filtered recent logs */}
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Logs da Seção</CardTitle>
              <Badge variant="secondary" className="text-[10px] w-fit">{totalLogs} registros</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                      {getResultBadge(log.result)}
                    </div>
                    <p className="text-sm font-medium truncate">{log.user_email || "Sistema"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {log.action} {log.resource_name && `• ${log.resource_name}`}
                      {log.establishment_name && ` • ${log.establishment_name}`}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">{getDeviceIcon(log.device_type)} {log.device_type || "Desktop"}</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-center text-muted-foreground py-4 text-sm">Nenhum log encontrado</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ LOGS ============ */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          {/* Filters */}
          <Card className="bg-card/50 border-border/40">
            <CardContent className="p-3 sm:p-4">
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="year">Ano</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={userTypeFilter} onValueChange={(v) => { setUserTypeFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin">Admin Master</SelectItem>
                    <SelectItem value="moderator">Admin Loja</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="employee">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={establishmentFilter} onValueChange={(v) => { setEstablishmentFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Estabelecimento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {establishments.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Ação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                    <SelectItem value="create">Criar</SelectItem>
                    <SelectItem value="update">Atualizar</SelectItem>
                    <SelectItem value="delete">Excluir</SelectItem>
                    <SelectItem value="view">Visualizar</SelectItem>
                    <SelectItem value="sale">Venda</SelectItem>
                    <SelectItem value="page_view">Página</SelectItem>
                    <SelectItem value="click">Clique</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Resultado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="blocked">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="IP..." value={ipFilter} onChange={(e) => { setIpFilter(e.target.value); setCurrentPage(1); }} className="pl-8 h-9 text-xs" />
                </div>
                <div className="relative col-span-2 sm:col-span-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-8 h-9 text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs List */}
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm sm:text-base">Logs de Atividade</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{totalLogs} registros</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Cards */}
              <div className="block md:hidden space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </span>
                      {getResultBadge(log.result)}
                    </div>
                    <p className="font-medium text-sm truncate">{log.user_email || "Sistema"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium">{log.action}</span>
                      {log.resource_type && ` • ${log.resource_type}`}
                      {log.resource_name && ` • ${log.resource_name}`}
                    </p>
                    {log.establishment_name && <p className="text-[10px] text-muted-foreground mt-0.5">{log.establishment_name}</p>}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">{getDeviceIcon(log.device_type)} {log.device_type || "Desktop"}</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                      {log.location_city && <span>{log.location_city}</span>}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <p className="text-center text-muted-foreground py-6 text-sm">Nenhum log encontrado</p>}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data/Hora</TableHead>
                      <TableHead className="text-xs">Usuário</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs">Ação</TableHead>
                      <TableHead className="text-xs">Recurso</TableHead>
                      <TableHead className="text-xs">Estabelecimento</TableHead>
                      <TableHead className="text-xs">Dispositivo</TableHead>
                      <TableHead className="text-xs">IP</TableHead>
                      <TableHead className="text-xs">Local</TableHead>
                      <TableHead className="text-xs">Resultado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-sm">Nenhum log encontrado</TableCell></TableRow>
                    ) : logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}</TableCell>
                        <TableCell className="text-xs font-medium max-w-28 truncate">{log.user_email || "Sistema"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{log.user_role || "—"}</Badge></TableCell>
                        <TableCell className="text-xs">{log.action}</TableCell>
                        <TableCell className="text-xs max-w-20 truncate">{log.resource_name || log.resource_type || "—"}</TableCell>
                        <TableCell className="text-xs max-w-28 truncate">{log.establishment_name || "—"}</TableCell>
                        <TableCell><div className="flex items-center gap-1">{getDeviceIcon(log.device_type)}<span className="text-xs">{log.browser || ""}</span></div></TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address || "—"}</TableCell>
                        <TableCell className="text-xs">{log.location_city ? `${log.location_city}${log.location_state ? `, ${log.location_state}` : ''}` : "—"}</TableCell>
                        <TableCell>{getResultBadge(log.result)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ REALTIME ============ */}
        <TabsContent value="realtime" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Usuários Online ({onlineSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <div className="space-y-2">
                    {onlineSessions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">Nenhum usuário online</p>
                    ) : onlineSessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <div className="min-w-0">
                            <span className="text-sm truncate block">{s.user_email || "Usuário"}</span>
                            <span className="text-[10px] text-muted-foreground">{s.ip_address || ""} {s.location_city && `• ${s.location_city}`}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {getDeviceIcon(s.device_type)}
                          <span className="text-[10px] text-muted-foreground">{format(new Date(s.last_activity_at), "HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Feed de Atividade ao Vivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  <div className="space-y-2">
                    {logs.slice(0, 20).map(log => (
                      <div key={log.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                        <div className="w-1 h-8 rounded-full bg-primary/50 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{log.action} - {log.resource_name || log.resource_type || "Sistema"}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {log.user_email || "Sistema"} • {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                            {log.establishment_name && ` • ${log.establishment_name}`}
                          </p>
                        </div>
                        {getResultBadge(log.result)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-500" />
                Vendas em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.filter(l => ["sale", "order", "ticket_sale"].includes(l.action) || ["order", "ticket"].includes(l.resource_type || "")).slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-3 min-w-0">
                      {log.resource_type === "ticket" ? <Ticket className="w-5 h-5 text-emerald-600 shrink-0" /> : <ShoppingCart className="w-5 h-5 text-emerald-600 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{log.resource_name || "Venda"}</p>
                        <p className="text-[10px] text-muted-foreground">{log.establishment_name || "—"}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{format(new Date(log.created_at), "HH:mm", { locale: ptBR })}</span>
                  </div>
                ))}
                {logs.filter(l => ["sale", "order", "ticket_sale"].includes(l.action) || ["order", "ticket"].includes(l.resource_type || "")).length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma venda recente</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SESSIONS ============ */}
        <TabsContent value="sessions" className="mt-4 space-y-4">
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Sessões Ativas ({sessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="block md:hidden space-y-2">
                {sessions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma sessão ativa</p>
                ) : sessions.map(s => (
                  <div key={s.id} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-sm truncate">{s.user_email || "Usuário"}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Ativo</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">{getDeviceIcon(s.device_type)}<span>{s.device_type || "Desktop"}</span></div>
                      <div>{s.browser || "—"}</div>
                      <div>{s.ip_address || "—"}</div>
                      <div>{s.location_city || "—"}</div>
                      <div>OS: {s.os || "—"}</div>
                      <div>{format(new Date(s.last_activity_at), "HH:mm", { locale: ptBR })}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Usuário</TableHead>
                      <TableHead className="text-xs">Dispositivo</TableHead>
                      <TableHead className="text-xs">Navegador</TableHead>
                      <TableHead className="text-xs">OS</TableHead>
                      <TableHead className="text-xs">IP</TableHead>
                      <TableHead className="text-xs">Localização</TableHead>
                      <TableHead className="text-xs">Última Atividade</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm">Nenhuma sessão ativa</TableCell></TableRow>
                    ) : sessions.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs font-medium">{s.user_email || "—"}</TableCell>
                        <TableCell><div className="flex items-center gap-1">{getDeviceIcon(s.device_type)}<span className="text-xs">{s.device_type || "Desktop"}</span></div></TableCell>
                        <TableCell className="text-xs">{s.browser || "—"}</TableCell>
                        <TableCell className="text-xs">{s.os || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{s.ip_address || "—"}</TableCell>
                        <TableCell className="text-xs">{s.location_city ? `${s.location_city}${s.location_state ? `, ${s.location_state}` : ''}` : "—"}</TableCell>
                        <TableCell className="text-xs">{format(new Date(s.last_activity_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell><Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Ativo</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ PERFORMANCE ============ */}
        <TabsContent value="performance" className="mt-4 space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Taxa de Retorno", value: `${perfMetrics.returnRate}%`, sub: "Voltaram após 24h", color: "text-primary" },
              { label: "Usuários Inativos", value: perfMetrics.inactiveUsers, sub: "Sem atividade 30d", color: "text-orange-500" },
              { label: "Sessões Ativas", value: sessions.length, sub: "Agora", color: "text-emerald-500" },
              { label: "Online", value: onlineSessions.length, sub: "Últimos 5min", color: "text-emerald-600" },
            ].map((m, i) => (
              <Card key={i} className="bg-card/50 border-border/40">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl sm:text-3xl font-bold ${m.color}`}>{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Horários de Pico</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {perfMetrics.peakHours.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>
                  ) : perfMetrics.peakHours.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs w-12">{item.hour.toString().padStart(2, '0')}:00</span>
                      <div className="flex-1 mx-3"><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / (perfMetrics.peakHours[0]?.count || 1)) * 100}%` }} /></div></div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/40">
              <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Dias Mais Ativos</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {perfMetrics.busiestDays.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">Sem dados</p>
                  ) : perfMetrics.busiestDays.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs capitalize w-20 truncate">{item.day}</span>
                      <div className="flex-1 mx-3"><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(item.count / (perfMetrics.busiestDays[0]?.count || 1)) * 100}%` }} /></div></div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top pages */}
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Páginas Mais Acessadas</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {perfMetrics.topPages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm col-span-2">Sem dados</p>
                ) : perfMetrics.topPages.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/30">
                    <span className="text-xs capitalize truncate">{p.page}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{p.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ SECURITY ============ */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Críticos", count: alerts.filter(a => a.severity === "critical" && !a.is_resolved).length, color: "text-red-500", bg: "bg-red-500/5 border-red-500/20", icon: XCircle },
              { label: "Alto", count: alerts.filter(a => a.severity === "high" && !a.is_resolved).length, color: "text-orange-500", bg: "bg-orange-500/5 border-orange-500/20", icon: AlertTriangle },
              { label: "Médio", count: alerts.filter(a => a.severity === "medium" && !a.is_resolved).length, color: "text-yellow-500", bg: "bg-yellow-500/5 border-yellow-500/20", icon: AlertTriangle },
              { label: "Resolvidos", count: alerts.filter(a => a.is_resolved).length, color: "text-emerald-500", bg: "bg-emerald-500/5 border-emerald-500/20", icon: CheckCircle },
            ].map((a, i) => (
              <Card key={i} className={`${a.bg}`}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <a.icon className={`w-5 h-5 ${a.color} shrink-0`} />
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{a.label}</p>
                      <p className={`text-xl font-bold ${a.color}`}>{a.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3"><CardTitle className="text-sm sm:text-base">Alertas de Segurança</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Nenhum alerta registrado</p>
                ) : alerts.slice(0, 15).map(alert => (
                  <div key={alert.id} className={`p-3 sm:p-4 rounded-lg border ${
                    alert.is_resolved ? "bg-muted/30 border-border/40"
                    : alert.severity === "critical" ? "bg-red-500/5 border-red-500/20"
                    : "bg-orange-500/5 border-orange-500/20"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {getSeverityBadge(alert.severity)}
                          <Badge variant="outline" className="text-[10px]">{alert.alert_type}</Badge>
                          {alert.is_resolved && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Resolvido</Badge>}
                        </div>
                        <p className="text-sm">{alert.description}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                          <span>{alert.user_email || "Sistema"}</span>
                          {alert.ip_address && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] gap-1"
                              onClick={() => { setTraceIp(alert.ip_address!); setActiveTab("trace"); }}
                            >
                              <Crosshair className="w-3 h-3" />
                              IP: {alert.ip_address}
                            </Button>
                          )}
                          <span>{format(new Date(alert.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ TRACE ============ */}
        <TabsContent value="trace" className="mt-4 space-y-4">
          <Card className="bg-card/50 border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-primary" />
                Rastreamento Completo
              </CardTitle>
              <CardDescription className="text-xs">Rastreie a jornada completa de qualquer usuário ou endereço IP na plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Endereço IP..." value={traceIp} onChange={(e) => setTraceIp(e.target.value)} className="pl-8 h-9 text-xs" />
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Email do usuário..." value={traceUser} onChange={(e) => setTraceUser(e.target.value)} className="pl-8 h-9 text-xs" />
                </div>
                <Button onClick={handleTrace} disabled={traceLoading || (!traceIp && !traceUser)} size="sm" className="gap-2 h-9">
                  {traceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                  Rastrear
                </Button>
              </div>
            </CardContent>
          </Card>

          {traceLogs.length > 0 && (
            <>
              {/* Summary cards */}
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-primary">{traceLogs.length}</p>
                    <p className="text-[10px] text-muted-foreground">Ações Registradas</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{new Set(traceLogs.map(l => l.resource_type).filter(Boolean)).size}</p>
                    <p className="text-[10px] text-muted-foreground">Páginas Acessadas</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{new Set(traceLogs.map(l => l.establishment_name).filter(Boolean)).size}</p>
                    <p className="text-[10px] text-muted-foreground">Estabelecimentos</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/50 border-border/40">
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{new Set(traceLogs.map(l => l.ip_address).filter(Boolean)).size}</p>
                    <p className="text-[10px] text-muted-foreground">IPs Distintos</p>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card className="bg-card/50 border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Linha do Tempo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <div className="space-y-1">
                      {traceLogs.map((log, idx) => (
                        <div key={log.id} className="flex gap-3 p-2">
                          <div className="flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${log.result === 'success' ? 'bg-emerald-500' : log.result === 'error' ? 'bg-red-500' : 'bg-orange-500'}`} />
                            {idx < traceLogs.length - 1 && <div className="w-px flex-1 bg-border/40 mt-1" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-3">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className="text-xs font-medium truncate">{log.action} {log.resource_name && `- ${log.resource_name}`}</p>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                              <span>{log.user_email || "Sistema"}</span>
                              {log.establishment_name && <><ArrowRight className="w-2.5 h-2.5" /><span>{log.establishment_name}</span></>}
                              {log.ip_address && <span className="font-mono">IP: {log.ip_address}</span>}
                              <span className="flex items-center gap-0.5">{getDeviceIcon(log.device_type)} {log.browser || ""}</span>
                              {log.location_city && <span>{log.location_city}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}

          {traceLogs.length === 0 && (traceIp || traceUser) && !traceLoading && (
            <Card className="bg-card/50 border-border/40">
              <CardContent className="p-8 text-center">
                <Eye className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum registro encontrado para os critérios informados.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

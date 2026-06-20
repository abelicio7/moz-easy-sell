import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, Copy, Package, DollarSign, Clock, Smartphone, TrendingUp, Wallet, 
  ArrowUpRight, ShoppingBag, Users, Settings, CreditCard, Activity 
} from "lucide-react";
import { toast } from "sonner";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

interface Product {
  id: string;
  name: string;
  price: number;
  delivery_type: string;
  created_at: string;
}

interface MethodStats {
  totalOrders: number;
  paidOrders: number;
  revenue: number;
  conversion: number;
}

interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  revenue: number;
  availableBalance: number;
  methodStats: Record<string, MethodStats>;
}

import { SellerProgress } from "@/components/SellerProgress";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const [rawWithdrawals, setRawWithdrawals] = useState<any[]>([]);
  const [currency, setCurrency] = useState<"MZN" | "BRL">("MZN");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: prods }, { data: orders }, { data: withdrawals }] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*, products!inner(name, user_id)").eq("products.user_id", user.id),
        supabase.from("withdrawals").select("amount, status, currency").eq("user_id", user.id),
      ]);

      setProducts(prods || []);
      setRawOrders(orders || []);
      setRawWithdrawals(withdrawals || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const stats = useMemo(() => {
    const filteredOrders = rawOrders.filter(o => (o.currency || "MZN") === currency);
    const filteredWithdrawals = rawWithdrawals.filter(w => (w.currency || "MZN") === currency);
    const filteredProductsCount = products.filter(p => (p.currency || "MZN") === currency).length;

    // Cross-border opposite currency stats
    const oppositeCurrency = currency === "MZN" ? "BRL" : "MZN";
    const oppositeOrders = rawOrders.filter(o => (o.currency || "MZN") === oppositeCurrency);
    const oppositeRevenue = oppositeOrders
      .filter((o: any) => ["paid", "delivered"].includes(o.status))
      .reduce((sum: number, o: any) => sum + Number(o.price), 0);

    const methodStats = filteredOrders.reduce((acc: any, order: any) => {
      const method = order.payment_method || 'Outro';
      const cleanMethod = 
        method.toLowerCase() === 'pix' ? 'Pix' : 
        (method.toLowerCase() === 'mpesa' || method.toLowerCase() === 'm-pesa') ? 'M-Pesa' : 
        (method.toLowerCase() === 'emola' || method.toLowerCase() === 'e-mola') ? 'E-Mola' : 
        method;
      if (!acc[cleanMethod]) acc[cleanMethod] = { totalOrders: 0, paidOrders: 0, revenue: 0, conversion: 0 };
      acc[cleanMethod].totalOrders++;
      if (["paid", "delivered"].includes(order.status)) {
        acc[cleanMethod].paidOrders++;
        acc[cleanMethod].revenue += (order.price || 0);
      }
      return acc;
    }, {});

    Object.keys(methodStats).forEach(key => {
      methodStats[key].conversion = methodStats[key].totalOrders > 0 
        ? (methodStats[key].paidOrders / methodStats[key].totalOrders) * 100 
        : 0;
    });

    const totalNetEarnings = filteredOrders
      .filter((o: any) => ["paid", "delivered"].includes(o.status))
      .reduce((sum: number, o: any) => sum + Number(o.price), 0);
    
    const totalWithdrawnAndPending = filteredWithdrawals
      .filter((w: any) => w.status === "completed" || w.status === "pending")
      .reduce((sum: number, w: any) => sum + Number(w.amount), 0);

    // Timeline Chart Data for last 15 days
    const map = new Map<string, { date: string; Receita: number }>();
    const paidFilteredOrders = filteredOrders.filter((o: any) => ["paid", "delivered"].includes(o.status));
    
    // Sort orders chronological first to make timeline map work
    const sortedPaidOrders = [...paidFilteredOrders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    sortedPaidOrders.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const current = map.get(date) || { date, Receita: 0 };
      current.Receita += Number(t.price);
      map.set(date, current);
    });

    const timelineData = Array.from(map.values());

    // Extract last 5 activities (orders)
    const recentActivities = [...filteredOrders]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((o: any) => ({
        id: o.id,
        customer_name: o.customer_name,
        customer_email: o.customer_email,
        price: o.price,
        currency: o.currency || "MZN",
        status: o.status,
        created_at: o.created_at,
        payment_method: o.payment_method,
        product_name: o.products?.name || "Produto"
      }));

    return {
      productsCount: filteredProductsCount,
      total: filteredOrders.length,
      pending: filteredOrders.filter((o: any) => o.status === "pending").length,
      paid: filteredOrders.filter((o: any) => ["paid", "delivered"].includes(o.status)).length,
      revenue: totalNetEarnings, 
      availableBalance: totalNetEarnings - totalWithdrawnAndPending,
      methodStats,
      oppositeRevenue,
      timelineData,
      recentActivities
    };
  }, [rawOrders, rawWithdrawals, products, currency]);

  const copyCheckoutLink = (productId: string) => {
    const link = `${window.location.origin}/checkout/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 animate-in fade-in duration-300">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Olá, {user?.user_metadata?.name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || "Empreendedor"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-base">Aqui está o resumo das suas vendas de hoje.</p>
        </div>

        {/* Currency Switcher */}
        <div className="flex bg-muted/65 p-1.5 rounded-2xl border border-border/50 shrink-0">
          <button
            onClick={() => setCurrency("MZN")}
            className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              currency === "MZN"
                ? "bg-primary text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Moçambique (MZN)
          </button>
          <button
            onClick={() => setCurrency("BRL")}
            className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
              currency === "BRL"
                ? "bg-primary text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Brasil (BRL)
          </button>
        </div>
      </div>

      {/* Multicurrency Cross-Border Summary Banner */}
      {stats.oppositeRevenue > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/25 flex items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl">🌍</span>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Vendas Cruzadas Ativas
              </p>
              <div className="text-xs text-muted-foreground mt-0.5">
                {currency === "MZN" ? (
                  <>Você também acumulou <span className="font-bold text-foreground">{stats.oppositeRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> em vendas para o Brasil 🇧🇷</>
                ) : (
                  <>Você também acumulou <span className="font-bold text-foreground">{stats.oppositeRevenue.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span> em vendas locais em Moçambique 🇲🇿</>
                )}
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10 shrink-0 gap-1"
            onClick={() => setCurrency(currency === "MZN" ? "BRL" : "MZN")}
          >
            Ver Detalhes
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate("/dashboard/products")}
          className="h-14 rounded-2xl border-border/60 bg-background hover:bg-muted shadow-sm hover:shadow-md transition-all justify-start px-4 gap-3 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Criar Produto</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Cadastrar novo infoproduto</p>
          </div>
        </Button>

        <Button 
          variant="outline" 
          onClick={() => navigate("/dashboard/finance")}
          className="h-14 rounded-2xl border-border/60 bg-background hover:bg-muted shadow-sm hover:shadow-md transition-all justify-start px-4 gap-3 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Solicitar Saque</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Retirar saldo acumulado</p>
          </div>
        </Button>

        <Button 
          variant="outline" 
          onClick={() => navigate("/dashboard/integrations")}
          className="h-14 rounded-2xl border-border/60 bg-background hover:bg-muted shadow-sm hover:shadow-md transition-all justify-start px-4 gap-3 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Integrações de Pixel</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Configurar UTM, Pixel e Webhooks</p>
          </div>
        </Button>
      </div>

      <SellerProgress revenue={stats.revenue} currency={currency} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-6">
        {/* Products KPI */}
        <Card className="hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground tracking-tight">{stats.productsCount}</p>
                  <p className="text-xs text-muted-foreground font-medium">Produtos Ativos</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold">
                +1.2%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Available Balance KPI */}
        <Card className="hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground tracking-tight">
                    {currency === "BRL" 
                      ? stats.availableBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
                      : `${stats.availableBalance.toFixed(0)} MT`}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">Saldo Disponível</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold">
                Saque Livre
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Pending Sales KPI */}
        <Card className="hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1 transition-all duration-300 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground tracking-tight">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground font-medium">Não Concluídos</p>
                </div>
              </div>
              {stats.pending > 0 ? (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-0 text-[10px] font-bold animate-pulse">
                  Recuperável
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-slate-500/10 text-slate-500 border-0 text-[10px] font-bold">
                  Excelente
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sold Products KPI */}
        <Card className="hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground tracking-tight">{stats.paid}</p>
                  <p className="text-xs text-muted-foreground font-medium">Itens Vendidos</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold">
                +8.3%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart & Recent Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Timeline Chart Card (Col span 7) */}
        <Card className="lg:col-span-7 rounded-[24px] border-border/50 bg-card overflow-hidden shadow-md">
          <CardHeader className="p-6 border-b border-border/50">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Evolução de Ganhos ({currency})
            </CardTitle>
            <CardDescription className="text-xs">Faturamento acumulado nos últimos dias de vendas</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {stats.timelineData.length === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                <TrendingUp className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">Sem faturamento ainda</p>
                <p className="text-[10px] text-muted-foreground max-w-[200px] mt-1">Realize a sua primeira venda para ver a curva de crescimento.</p>
              </div>
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDashboard" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold' 
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Receita" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorDashboard)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities Card (Col span 5) */}
        <Card className="lg:col-span-5 rounded-[24px] border-border/50 bg-card overflow-hidden shadow-md flex flex-col justify-between">
          <CardHeader className="p-6 border-b border-border/50 flex flex-row items-center justify-between shrink-0">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Vendas Recentes
              </CardTitle>
              <CardDescription className="text-xs">Últimos pedidos processados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-bold gap-1" asChild>
              <Link to="/dashboard/orders">
                Ver Tudo
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardHeader>
          
          <CardContent className="p-4 sm:p-6 overflow-y-auto max-h-[295px] flex-1 space-y-3 custom-scrollbar">
            {stats.recentActivities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-10">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider">Nenhuma atividade</p>
                <p className="text-[10px] text-muted-foreground max-w-[200px] mt-1">Os dados dos seus clientes aparecerão aqui assim que comprarem.</p>
              </div>
            ) : (
              stats.recentActivities.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Method logo or default icon */}
                    <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 p-1 shadow-sm">
                      {act.payment_method?.toLowerCase() === 'pix' ? (
                        <img src="/pix_checkout_logo.png" alt="Pix" className="max-w-full max-h-full object-contain" />
                      ) : act.payment_method?.toLowerCase() === 'mpesa' || act.payment_method?.toLowerCase() === 'm-pesa' ? (
                        <img src="/mpesa_logo.png" alt="M-Pesa" className="max-w-full max-h-full object-contain" />
                      ) : act.payment_method?.toLowerCase() === 'emola' || act.payment_method?.toLowerCase() === 'e-mola' ? (
                        <img src="/emola_logo.png" alt="E-Mola" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate leading-tight">{act.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">{act.product_name}</p>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-bold text-foreground">
                      {act.currency === "BRL" 
                        ? act.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : `${act.price.toFixed(0)} MT`}
                    </p>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <span className="text-[9px] font-medium text-muted-foreground">
                        {act.currency === "BRL" ? "🇧🇷 BRL" : "🇲🇿 MZN"}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        ["paid", "delivered"].includes(act.status) ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                      }`} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Stats */}
      {Object.keys(stats.methodStats).length > 0 && (
        <div className="mb-8 animate-in fade-in duration-500">
          <h2 className="text-xl font-bold text-foreground mb-4">Métricas de Canais de Vendas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.methodStats).map(([method, data]) => (
              <Card 
                key={method} 
                className={`relative overflow-hidden border-0 shadow-lg transition-all hover:scale-[1.02] ${
                  (method.toLowerCase() === 'mpesa' || method.toLowerCase() === 'm-pesa')
                    ? 'bg-gradient-to-br from-[#E51B24] to-[#8A0A12]' 
                    : (method.toLowerCase() === 'emola' || method.toLowerCase() === 'e-mola')
                      ? 'bg-gradient-to-br from-[#F57C00] to-[#b34700]' 
                      : method.toLowerCase() === 'pix'
                        ? 'bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]'
                        : 'bg-gradient-to-br from-primary to-primary/80'
                }`}
              >
                {/* Decorative circles */}
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/20 opacity-50"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-white/10 opacity-50"></div>
                
                <CardContent className="p-6 relative z-10 flex items-center justify-between">
                  {/* Left: Logo/Icon */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center shadow-lg p-3">
                      {(method.toLowerCase() === 'mpesa' || method.toLowerCase() === 'm-pesa') ? (
                        <img src="/mpesa_logo.png" alt="M-Pesa" className="max-w-full max-h-full object-contain" />
                      ) : (method.toLowerCase() === 'emola' || method.toLowerCase() === 'e-mola') ? (
                        <img src="/emola_logo.png" alt="E-Mola" className="max-w-full max-h-full object-contain" />
                      ) : method.toLowerCase() === 'pix' ? (
                        <img src="/pix_checkout_logo.png" alt="Pix" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="text-center text-primary">
                          <Smartphone className="w-7 h-7 mx-auto mb-1" />
                          <span className="text-[11px] font-black tracking-tight uppercase leading-none block">{method}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Stats */}
                  <div className="text-right text-white ml-4">
                    <p className="text-2xl md:text-3xl font-black tracking-tight mb-1">
                      {currency === "BRL" 
                        ? data.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : `${data.revenue.toFixed(2)} MZN`}
                    </p>
                    <p className="text-xs font-semibold text-white/90 mb-3">
                      Total Coletado
                    </p>
                    
                    <div className="flex flex-col gap-1 items-end">
                      <div className="flex items-center gap-1.5 text-[10px] text-white/90 bg-black/25 px-2.5 py-1 rounded-full font-bold">
                        <span>{data.totalOrders} tentativas</span>
                      </div>
                      <div className="text-[10px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded mt-1">
                        {data.conversion.toFixed(1)}% conv.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;

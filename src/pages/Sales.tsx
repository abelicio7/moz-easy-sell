import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, TrendingUp, DollarSign, Smartphone, ArrowUpRight, ShoppingBag, UserCheck } from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from "recharts";

interface Transaction {
  id: string;
  type: 'direct' | 'affiliate';
  amount: number;
  product_name: string;
  created_at: string;
  payment_method?: string;
  currency?: string;
}

const Sales = () => {
  const { user } = useAuth();
  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState<"MZN" | "BRL" | "ZAR">("MZN");
  const [loading, setLoading] = useState(true);

  const transactions = useMemo(() => {
    return rawTransactions.filter(t => (t.currency || "MZN") === currency);
  }, [rawTransactions, currency]);

  useEffect(() => {
    if (!user) return;
    const fetchAllRevenue = async () => {
      setLoading(true);
      try {
        // 1. Fetch direct orders
        const { data: orders } = await supabase
          .from("orders")
          .select("id, price, payment_method, created_at, currency, products!inner(name, user_id)")
          .eq("products.user_id", user.id)
          .in("status", ["paid", "delivered"])
          .order("created_at", { ascending: false });

        const formatted: Transaction[] = orders?.map(o => ({
          id: o.id,
          type: 'direct',
          amount: o.price,
          product_name: (o.products as any).name,
          created_at: o.created_at,
          payment_method: o.payment_method,
          currency: o.currency || "MZN"
        })) || [];

        setRawTransactions(formatted);

      } catch (err) {
        console.error("Error fetching sales data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllRevenue();
  }, [user]);

  // Derived metrics
  const totalBilling = transactions.reduce((sum, t) => sum + t.amount, 0);
  const directCount = transactions.filter(t => t.type === 'direct').length;
  const affiliateCount = transactions.filter(t => t.type === 'affiliate').length;

  // Time-series Chart Data
  const timelineData = useMemo(() => {
    const map = new Map<string, { date: string; Receita: number }>();
    
    // Use last 15 entries for the chart to keep it clean
    [...transactions].reverse().forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const current = map.get(date) || { date, Receita: 0 };
      current.Receita += t.amount;
      map.set(date, current);
    });

    return Array.from(map.values());
  }, [transactions]);

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-foreground tracking-tight italic uppercase">Minhas Vendas & Faturamento</h2>
            <p className="text-muted-foreground font-medium">Histórico completo de todas as suas vendas realizadas.</p>
          </div>

          {/* Currency Switcher */}
          <div className="flex bg-muted/65 p-1.5 rounded-2xl border border-border/50 shrink-0 gap-1">
            <button
              onClick={() => setCurrency("MZN")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
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
            <button
              onClick={() => setCurrency("ZAR")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                currency === "ZAR"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              África do Sul (ZAR)
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-24 text-muted-foreground flex flex-col items-center gap-4">
            <BarChart3 className="w-12 h-12 animate-pulse text-primary/20" />
            <p className="animate-pulse font-bold tracking-tighter uppercase italic">Sincronizando extrato financeiro...</p>
          </div>
        ) : transactions.length === 0 ? (
          <Card className="border-dashed bg-card/50 rounded-[2.5rem]">
            <CardContent className="py-24 text-center">
              <BarChart3 className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
              <h3 className="font-bold text-xl mb-2 italic uppercase">Sem transações registradas</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Suas vendas aparecerão aqui assim que você realizar a primeira venda ou ganhar sua primeira comissão.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* TOP KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-primary/5 border-primary/20 rounded-3xl relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
                <CardContent className="p-8 relative z-10">
                  <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2 italic">Faturamento Total</p>
                  <p className="text-4xl font-black text-foreground tracking-tighter">
                    {currency === "BRL"
                      ? totalBilling.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : currency === "ZAR"
                      ? totalBilling.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })
                      : totalBilling.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-muted-foreground uppercase">
                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Rendimento direto
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border/50 rounded-3xl">
                <CardContent className="p-8 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 italic">Total de Vendas</p>
                    <p className="text-3xl font-black text-foreground tracking-tighter">{directCount}</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Timeline */}
            <Card className="rounded-[2.5rem] overflow-hidden border-border/50 shadow-xl shadow-black/5 bg-card/50 backdrop-blur-sm">
              <CardHeader className="p-8 border-b border-border/50">
                <CardTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" /> Curva de Crescimento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '16px', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Receita" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorReceita)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <div className="space-y-4">
              <h3 className="text-lg font-black italic uppercase tracking-tighter text-muted-foreground px-2">Últimas Transações</h3>
              <div className="grid gap-3">
                {transactions.map((t) => (
                  <Card key={t.id} className="border-border/50 hover:border-primary/30 transition-all rounded-2xl group bg-card">
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground leading-none mb-1">{t.product_name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-0 py-0 px-2 bg-primary/5 text-primary">
                              Venda Realizada
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase">
                              {new Date(t.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xl font-black tracking-tighter text-foreground">
                          {currency === "BRL" 
                            ? t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : currency === "ZAR"
                            ? t.amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })
                            : `${t.amount.toFixed(2)} MT`}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center justify-end gap-1">
                          {t.payment_method || (currency === 'BRL' ? 'Pix' : currency === 'ZAR' ? 'PayFast' : 'M-PESA')} <ArrowUpRight className="w-3 h-3" />
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Sales;

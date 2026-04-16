import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, TrendingUp, DollarSign, Smartphone } from "lucide-react";
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";

interface Order {
  id: string;
  price: number;
  payment_method: string;
  created_at: string;
}

const Sales = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSales = async () => {
      // Get all PAID orders
      const { data, error } = await supabase
        .from("orders")
        .select("id, price, payment_method, created_at, products!inner(user_id)")
        .eq("products.user_id", user.id)
        .eq("status", "paid")
        .order("created_at", { ascending: true }); // ascending for charts
        
      if (!error && data) {
        setOrders(data as unknown as Order[]);
      }
      setLoading(false);
    };

    fetchSales();
  }, [user]);

  // Derived metrics
  const totalSales = orders.length;
  const netRevenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  const mpesaOrders = orders.filter(o => o.payment_method?.toLowerCase().includes("m-pesa") || o.payment_method?.toLowerCase() === "mpesa");
  const mpesaRevenue = mpesaOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  const emolaOrders = orders.filter(o => o.payment_method?.toLowerCase().includes("e-mola") || o.payment_method?.toLowerCase() === "emola");
  const emolaRevenue = emolaOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  // Time-series Chart Data
  const timelineData = useMemo(() => {
    const map = new Map<string, { date: string; Receita: number; Vendas: number }>();
    
    orders.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const current = map.get(date) || { date, Receita: 0, Vendas: 0 };
      current.Receita += o.price || 0;
      current.Vendas += 1;
      map.set(date, current);
    });

    return Array.from(map.values());
  }, [orders]);

  const methodComparisonData = [
    { name: "M-Pesa", Receita: mpesaRevenue, fill: "hsl(var(--primary))" },
    { name: "E-Mola", Receita: emolaRevenue, fill: "hsl(var(--secondary))" }
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Minhas Vendas</h2>
          <p className="text-muted-foreground text-sm">Resumo da sua faturação em tempo real.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando painel financeiro...</div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed bg-card/50">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground text-lg mb-2">Sem dados para exibir</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Sua plataforma está pronta. Divulgue o seu link de checkout e acompanhe aqui os seus ganhos assim que realizar a primeira venda concluída!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* TOP KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Vendas Concluídas</p>
                    <p className="text-3xl font-bold text-foreground">{totalSales}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Valor Líquido</p>
                    <p className="text-3xl font-bold text-primary">{netRevenue.toFixed(2)} MT</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Via M-Pesa</p>
                    <p className="text-xl font-bold text-foreground">{mpesaRevenue.toFixed(2)} MT</p>
                    <p className="text-xs text-muted-foreground mt-1">{mpesaOrders.length} transações</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#E51B24]/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-[#E51B24]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Via E-Mola</p>
                    <p className="text-xl font-bold text-foreground">{emolaRevenue.toFixed(2)} MT</p>
                    <p className="text-xs text-muted-foreground mt-1">{emolaOrders.length} transações</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#00A1E0]/10 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-[#00A1E0]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Timeline */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Histórico de Receitas</CardTitle>
                <CardDescription>Acompanhe a sua evolução dia a dia</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
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
                        tickFormatter={(value) => `${value}`}
                      />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Receita" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorReceita)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Methods */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Receita por Método</CardTitle>
                <CardDescription>M-Pesa vs E-Mola</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={methodComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
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
                        tickFormatter={(value) => `${value > 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                      />
                      <RechartsTooltip 
                        cursor={{fill: 'hsl(var(--muted))', opacity: 0.2}}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      />
                      <Bar 
                        dataKey="Receita" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Sales;

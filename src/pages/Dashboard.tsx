import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Copy, Package, DollarSign, Clock, Smartphone, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, paid: 0, revenue: 0, availableBalance: 0, methodStats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: prods }, { data: orders }, { data: withdrawals }] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*, products!inner(user_id)").eq("products.user_id", user.id),
        supabase.from("withdrawals").select("amount, status").eq("user_id", user.id),
      ]);
      setProducts(prods || []);
      const allOrders = orders || [];
      const allWithdrawals = withdrawals || [];
      
      const methodStats = allOrders.reduce((acc: any, order: any) => {
        const method = order.payment_method || 'Outro';
        if (!acc[method]) acc[method] = { totalOrders: 0, paidOrders: 0, revenue: 0, conversion: 0 };
        acc[method].totalOrders++;
        if (order.status === "paid") {
          acc[method].paidOrders++;
          acc[method].revenue += (order.price || 0);
        }
        return acc;
      }, {});

      Object.keys(methodStats).forEach(key => {
        methodStats[key].conversion = methodStats[key].totalOrders > 0 
          ? (methodStats[key].paidOrders / methodStats[key].totalOrders) * 100 
          : 0;
      });

      const revenue = allOrders.filter((o: any) => o.status === "paid").reduce((sum: number, o: any) => sum + (o.price || 0), 0);
      const totalWithdrawnAndPending = allWithdrawals
        .filter((w: any) => w.status === "completed" || w.status === "pending")
        .reduce((sum: number, w: any) => sum + Number(w.amount), 0);
        
      setStats({
        total: allOrders.length,
        pending: allOrders.filter((o: any) => o.status === "pending").length,
        paid: allOrders.filter((o: any) => o.status === "paid").length,
        revenue,
        availableBalance: revenue - totalWithdrawnAndPending,
        methodStats
      });
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const copyCheckoutLink = (productId: string) => {
    const link = `${window.location.origin}/checkout/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Olá, {user?.user_metadata?.name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || "Empreendedor"}! 👋
        </h1>
        <p className="text-muted-foreground mt-1 text-lg">Aqui está o resumo das suas vendas de hoje.</p>
      </div>

      <SellerProgress revenue={stats.revenue} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{products.length}</p>
                <p className="text-xs text-muted-foreground">Produtos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.availableBalance.toFixed(0)} MT</p>
                <p className="text-xs text-muted-foreground">Saldo Disponível</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Vendas não concluídas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.paid}</p>
                <p className="text-xs text-muted-foreground">Produtos Vendidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Stats */}
      {Object.keys(stats.methodStats).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Métricas de Pagamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(stats.methodStats).map(([method, data]) => (
              <Card 
                key={method} 
                className={`relative overflow-hidden border-0 shadow-lg transition-all hover:scale-[1.02] ${
                  method.toLowerCase() === 'mpesa' 
                    ? 'bg-gradient-to-br from-[#E51B24] to-[#8A0A12]' 
                    : method.toLowerCase() === 'emola' 
                      ? 'bg-gradient-to-br from-[#F57C00] to-[#b34700]' 
                      : 'bg-gradient-to-br from-primary to-primary/80'
                }`}
              >
                {/* Decorative circles */}
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full border border-white/20 opacity-50"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-white/10 opacity-50"></div>
                
                <CardContent className="p-6 relative z-10 flex items-center justify-between">
                  {/* Left: Logo/Icon */}
                  <div className="flex flex-col items-center justify-center">
                    <div className={`w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center shadow-lg ${
                      method.toLowerCase() === 'mpesa' 
                        ? 'text-[#DD0512]' 
                        : method.toLowerCase() === 'emola' 
                          ? 'text-[#EC7028]' 
                          : 'text-primary'
                    }`}>
                      <Smartphone className="w-7 h-7 mb-1" />
                      <span className="text-[11px] font-black tracking-tight uppercase leading-none">{method}</span>
                    </div>
                  </div>
                  
                  {/* Right: Stats */}
                  <div className="text-right text-white">
                    <p className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                      {data.revenue.toFixed(2)} <span className="text-white/90 text-2xl">MZN</span>
                    </p>
                    <p className="text-sm md:text-base font-medium text-white/90 mb-3">
                      Total Coletado: {data.revenue.toFixed(2)} MZN
                    </p>
                    
                    <div className="flex items-center justify-end gap-3 text-xs md:text-sm text-white/75 bg-black/10 px-3 py-1.5 rounded-full inline-flex">
                      <span className="font-semibold">{data.totalOrders} tentativas</span>
                      <span className="opacity-50">•</span>
                      <span className="font-semibold text-white">{data.conversion.toFixed(1)}% conversão</span>
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

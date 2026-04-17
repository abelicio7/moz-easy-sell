import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Copy, Package, DollarSign, Clock, Smartphone, TrendingUp } from "lucide-react";
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
  methodStats: Record<string, MethodStats>;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<OrderStats>({ total: 0, pending: 0, paid: 0, revenue: 0, methodStats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: prods }, { data: orders }] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("*, products!inner(user_id)").eq("products.user_id", user.id),
      ]);
      setProducts(prods || []);
      const allOrders = orders || [];
      
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

      setStats({
        total: allOrders.length,
        pending: allOrders.filter((o: any) => o.status === "pending").length,
        paid: allOrders.filter((o: any) => o.status === "paid").length,
        revenue: allOrders.filter((o: any) => o.status === "paid").reduce((sum: number, o: any) => sum + (o.price || 0), 0),
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
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.revenue.toFixed(0)} MT</p>
                <p className="text-xs text-muted-foreground">Receita</p>
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
              <Card key={method} className="border-border/50 hover:border-primary/30 transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method.toLowerCase() === 'mpesa' ? 'bg-[#DD0512]/10 text-[#DD0512]' : method.toLowerCase() === 'emola' ? 'bg-[#EC7028]/10 text-[#EC7028]' : 'bg-primary/10 text-primary'}`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground capitalize text-lg">{method}</p>
                      <p className="text-xs text-muted-foreground">{data.totalOrders} tentativas de checkout</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><DollarSign className="w-3 h-3"/> Receita Gerada</p>
                      <p className="font-bold text-foreground text-sm">{data.revenue.toFixed(2)} MT</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Conversão</p>
                      <span className="font-bold text-primary text-sm">{data.conversion.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Meus Produtos</h2>
        <Button asChild>
          <Link to="/dashboard/products/new">
            <Plus className="w-4 h-4 mr-1" /> Novo Produto
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Nenhum produto ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro produto e comece a vender!</p>
            <Button asChild>
              <Link to="/dashboard/products/new">
                <Plus className="w-4 h-4 mr-1" /> Criar Produto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-primary">{product.price.toFixed(2)} MT</span>
                    <Badge variant="secondary" className="text-xs">
                      {product.delivery_type === "link" ? "Link" : product.delivery_type === "file" ? "Arquivo" : "Mensagem"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyCheckoutLink(product.id)}>
                    <Copy className="w-3 h-3 mr-1" /> Copiar link
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/dashboard/products/${product.id}/edit`}>Editar</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;

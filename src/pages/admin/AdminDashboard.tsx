import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, Banknote, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    pendingUsers: 0,
    pendingProducts: 0,
    pendingWithdrawals: 0,
    totalApprovedUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [usersRes, productsRes, withdrawalsRes, approvedUsersRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("products").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("withdrawals").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("profiles").select("id", { count: "exact" }).eq("status", "approved"),
      ]);

      setStats({
        pendingUsers: usersRes.count || 0,
        pendingProducts: productsRes.count || 0,
        pendingWithdrawals: withdrawalsRes.count || 0,
        totalApprovedUsers: approvedUsersRes.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Visão geral do sistema e aprovações pendentes.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando painel...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-card hover:border-primary/50 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Vendedores Pendentes
                <Users className="w-4 h-4 text-orange-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground mb-2">{stats.pendingUsers}</div>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link to="/admin/users">Gerenciar Usuários</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card hover:border-primary/50 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Produtos Pendentes
                <Package className="w-4 h-4 text-blue-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground mb-2">{stats.pendingProducts}</div>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link to="/admin/products">Gerenciar Produtos</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card hover:border-primary/50 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Saques Pendentes
                <Banknote className="w-4 h-4 text-green-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground mb-2">{stats.pendingWithdrawals}</div>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link to="/admin/withdrawals">Gerenciar Saques</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card hover:border-primary/50 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Vendedores Aprovados
                <ShieldCheck className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground">{stats.totalApprovedUsers}</div>
              <p className="text-xs text-muted-foreground mt-2">Vendedores ativos na plataforma</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card hover:border-primary/50 transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Alterações de Perfil
                <Users className="w-4 h-4 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground mb-2">-</div>
              <Button size="sm" variant="outline" className="w-full" asChild>
                <Link to="/admin/requests">Ver Solicitações</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;

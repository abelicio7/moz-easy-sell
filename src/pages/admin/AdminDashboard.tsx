import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, Banknote, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
                Sistema de Alertas
                <ShieldCheck className="w-4 h-4 text-purple-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-foreground mb-2">Email</div>
              <div className="flex flex-col gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full border-dashed"
                  onClick={async () => {
                    const { data, error } = await supabase.functions.invoke("notify-admins", {
                      body: { 
                        subject: "🚀 Teste de Conectividade - EnsinaPay", 
                        htmlContent: `
                          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #16a34a;">Sistema Operacional!</h2>
                            <p>Este é um e-mail de teste para confirmar que as notificações da <strong>EnsinaPay</strong> estão configuradas corretamente.</p>
                            <p><strong>Hora do Teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #666;">Se você recebeu isto, as notificações para novos vendedores e produtos estão prontas.</p>
                          </div>
                        ` 
                      }
                    });
                    
                    if (error || data?.success === false) {
                      const msg = error?.message || data?.error || "Erro desconhecido";
                      toast.error("Erro ao testar: " + msg);
                    } else {
                      toast.success("E-mail de teste enviado!");
                    }
                  }}
                >
                  Testar Conectividade
                </Button>

                <Button 
                  size="sm" 
                  variant="default" 
                  className="w-full font-bold bg-green-600 hover:bg-green-700"
                  onClick={async () => {
                    const toastId = toast.loading("Simulando venda e enviando e-mails...");
                    try {
                      // 1. Get current user email for the mock sale
                      const { data: { user } } = await supabase.auth.getUser();
                      const myEmail = user?.email || "abeliciosimoney@gmail.com";

                      // 2. Invoke check-payment-status with a "mock" mode
                      // We'll trigger a direct call to the notification logic
                      const { data, error } = await supabase.functions.invoke("send-email-notification", {
                        body: { 
                          to: myEmail, 
                          subject: "💸 VENDA REALIZADA: Produto de Teste", 
                          htmlContent: `
                            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px; background-color: #f0fdf4; border: 1px solid #bbf7d0;">
                              <div style="text-align: center; margin-bottom: 20px;">
                                <h1 style="color: #166534; margin: 0;">Venda Realizada! (TESTE) 💰</h1>
                                <p style="color: #166534; font-weight: bold;">Este é um teste do novo sistema de notificações premium.</p>
                              </div>
                              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #dcfce7;">
                                <p style="margin: 5px 0; color: #666; font-size: 14px;">Produto:</p>
                                <p style="margin: 0 0 15px 0; font-weight: bold; font-size: 18px; color: #111827;">Ebook: Como Vender Online em Moçambique</p>
                                <div style="border-top: 1px solid #eee; padding-top: 15px;">
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Valor:</strong> 1.500,00 MT</p>
                                  <p style="margin: 5px 0; font-size: 14px;"><strong>Cliente:</strong> Cliente de Teste EnsinaPay</p>
                                </div>
                              </div>
                            </div>
                          `,
                          senderName: "EnsinaPay Vendas"
                        }
                      });

                      if (error || data?.success === false) throw new Error(error?.message || data?.error);
                      
                      toast.success("Simulação concluída! Verifique o seu e-mail.", { id: toastId });
                    } catch (err: any) {
                      toast.error("Erro na simulação: " + err.message, { id: toastId });
                    }
                  }}
                >
                  Simular Venda (Teste)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;

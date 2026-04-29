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
                    const toastId = toast.loading("Simulando venda...");
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      const myEmail = user?.email || "abeliciosimoney@gmail.com";
                      
                      const hotmartStyleHtml = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 0 0 16px 16px; overflow: hidden; color: #ffffff;">
                          <div style="background-color: #f3f4f6; padding: 30px; text-align: center;">
                            <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 40px;">
                          </div>
                          <div style="padding: 40px 30px;">
                            <p style="font-size: 18px; color: #d1d5db; margin-bottom: 10px;">Parabéns!</p>
                            <h2 style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 0 0 30px 0; line-height: 1.2;">
                              Você acabou de vender uma cópia do produto <span style="text-transform: uppercase; color: #10b981;">Ebook: Sucesso em Moçambique</span>!
                            </h2>
                            
                            <p style="font-size: 16px; color: #10b981; margin-bottom: 5px; font-weight: 600;">Você recebeu:</p>
                            <h1 style="font-size: 48px; font-weight: 900; color: #10b981; margin: 0 0 40px 0;">
                              1.500,00 MT
                            </h1>
                            
                            <div style="background-color: #1f2937; padding: 25px; border-radius: 12px; border: 1px solid #374151;">
                              <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin: 0 0 20px 0;">Dados da Transação:</h3>
                              
                              <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Nome:</span> Cliente de Teste</p>
                              <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Email:</span> <a href="#" style="color: #10b981; text-decoration: none;">cliente@teste.com</a></p>
                              <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">WhatsApp:</span> <a href="#" style="color: #10b981; text-decoration: none;">841234567</a></p>
                              <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Método:</span> <span style="font-weight: bold;">M-PESA</span></p>
                              <p style="margin: 0 0 10px 0; font-size: 15px;"><span style="color: #9ca3af;">Data:</span> ${new Date().toLocaleString('pt-MZ')}</p>
                              <p style="margin: 0 0 20px 0; font-size: 15px;"><span style="color: #9ca3af;">ID:</span> EP999999</p>
                            </div>
                            
                            <div style="text-align: center; margin-top: 40px;">
                              <a href="https://ensinapay.com/dashboard/sales" style="display: inline-block; background-color: #10b981; color: #000000; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 800; font-size: 16px; text-transform: uppercase;">Ver Minhas Vendas</a>
                            </div>
                          </div>
                        </div>
                      `;

                      const { data, error } = await supabase.functions.invoke("send-email-notification", {
                        body: { 
                          to: myEmail, 
                          subject: "💸 VENDA REALIZADA (TESTE ESTILO HOTMART)", 
                          htmlContent: hotmartStyleHtml,
                          senderName: "EnsinaPay Vendas"
                        }
                      });

                      if (error || data?.success === false) throw new Error(error?.message || data?.error || "Erro no envio");
                      toast.success("E-mail estilo Hotmart enviado!", { id: toastId });
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

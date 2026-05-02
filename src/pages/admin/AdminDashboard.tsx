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
                        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
                          <div style="background-color: #141416; padding: 30px; text-align: center; border-bottom: 1px solid #1c1c1e;">
                            <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 28px;">
                          </div>
                          <div style="padding: 40px; text-align: center;">
                            <p style="color: #10b981; font-weight: 800; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Venda Realizada! 💸</p>
                            <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 30px 0;">Acabaste de vender um produto digital</h2>
                            
                            <div style="background-color: #141416; padding: 30px; border-radius: 20px; border: 1px solid #232326; margin-bottom: 30px;">
                              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px 0;">Valor que vais receber:</p>
                              <h1 style="color: #10b981; font-size: 48px; font-weight: 900; margin: 0;">1.500,00 MT</h1>
                            </div>
                            
                            <div style="text-align: left; background-color: #0a0a0b; padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
                              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 5px 0;">Comprador (Teste):</p>
                              <p style="color: #ffffff; font-weight: 600; font-size: 15px; margin: 0;">Cliente de Demonstração</p>
                              <p style="color: #6b7280; font-size: 13px; margin: 0;">cliente@teste.com</p>
                            </div>
                          </div>
                          <div style="background-color: #141416; padding: 20px; text-align: center;">
                            <p style="color: #4b5563; font-size: 12px; margin: 0;">Este é um email de teste gerado pelo sistema EnsinaPay.</p>
                          </div>
                        </div>
                      `;

                      const { data, error } = await supabase.functions.invoke("send-email-notification", {
                        body: { 
                          to: myEmail, 
                          subject: "💸 VENDA REALIZADA (TESTE PREMIUM)", 
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
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full font-bold text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={async () => {
                    const toastId = toast.loading("Simulando e-mail do cliente...");
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      const myEmail = user?.email || "abeliciosimoney@gmail.com";
                      
                      const customerStyleHtml = `
                        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
                          <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
                            <img src="https://ensinapay.com/logo.png" alt="EnsinaPay" style="height: 32px;">
                          </div>
                          <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">Compra Confirmada! 🚀</h1>
                            <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">O teu pagamento foi processado com sucesso. O teu conteúdo já te espera.</p>
                            
                            <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; text-align: left; margin-bottom: 40px;">
                              <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">Detalhes do Pedido:</h3>
                              <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 5px 0;">Produto de Teste Premium</p>
                              <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 0;">1.500,00 MT</p>
                            </div>
                            
                            <a href="https://ensinapay.com/biblioteca" style="display: inline-block; background-color: #10b981; color: #000000; padding: 20px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">Aceder Agora</a>
                          </div>
                          <div style="background-color: #141416; padding: 30px; text-align: center; border-top: 1px solid #1c1c1e;">
                            <p style="color: #4b5563; font-size: 12px; margin: 0;">EnsinaPay - A nova era dos conteúdos digitais.</p>
                          </div>
                        </div>
                      `;

                      const { data, error } = await supabase.functions.invoke("send-email-notification", {
                        body: { 
                          to: myEmail, 
                          subject: "✅ Seu acesso chegou: Ebook Sucesso", 
                          htmlContent: customerStyleHtml,
                          senderName: "EnsinaPay"
                        }
                      });

                      if (error || data?.success === false) throw new Error(error?.message || data?.error || "Erro no envio");
                      toast.success("E-mail do cliente enviado!", { id: toastId });
                    } catch (err: any) {
                      toast.error("Erro na simulação: " + err.message, { id: toastId });
                    }
                  }}
                >
                  Simular E-mail Comprador
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full font-bold text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={async () => {
                    const toastId = toast.loading("Simulando recuperação de carrinho...");
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      const myEmail = user?.email || "abeliciosimoney@gmail.com";
                      const { data: prods } = await supabase.from("products").select("id").limit(1);
                      if (!prods || prods.length === 0) throw new Error("Nenhum produto cadastrado.");

                      await supabase.from("carts").upsert({
                        email: myEmail,
                        customer_name: "Teste Recuperação",
                        product_id: prods[0].id,
                        status: "pending",
                        created_at: new Date(Date.now() - 7200000).toISOString(),
                        contacted_at: null
                      }, { onConflict: 'email, product_id' });

                      const { error } = await supabase.functions.invoke("abandoned-cart-recovery");
                      if (error) throw error;
                      toast.success("E-mail de recuperação enviado!", { id: toastId });
                    } catch (err: any) {
                      toast.error("Erro no teste: " + err.message, { id: toastId });
                    }
                  }}
                >
                  Recuperação de Carrinho
                </Button>

                <div className="border-t border-border/50 my-2 pt-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Segurança e Acesso</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full text-xs font-bold"
                      onClick={async () => {
                        const toastId = toast.loading("Testando 2FA...");
                        try {
                          const { data, error } = await supabase.functions.invoke("handle-2fa", {
                            body: { action: "generate" }
                          });
                          if (error || data?.success === false) throw new Error(data?.error || error?.message || "Erro no 2FA");
                          toast.success("Código 2FA enviado para seu email!", { id: toastId });
                        } catch (err: any) {
                          toast.error("Falha 2FA: " + err.message, { id: toastId });
                        }
                      }}
                    >
                      Testar 2FA
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full text-xs font-bold"
                      onClick={async () => {
                        const toastId = toast.loading("Testando Biblioteca...");
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          const myEmail = user?.email || "";
                          const { data, error } = await supabase.functions.invoke("send-library-code", {
                            body: { email: myEmail }
                          });
                          if (error || data?.success === false) throw new Error(data?.error || error?.message || "Erro na Biblioteca");
                          toast.success("Código Biblioteca enviado!", { id: toastId });
                        } catch (err: any) {
                          toast.error("Falha Biblioteca: " + err.message, { id: toastId });
                        }
                      }}
                    >
                      Testar Biblioteca
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;

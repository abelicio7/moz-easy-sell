import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShoppingCart, Mail } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_whatsapp: string | null;
  status: string;
  payment_method: string;
  price: number;
  created_at: string;
  products: { name: string; delivery_type: string; delivery_content: string };
}

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, products!inner(name, user_id, delivery_type, delivery_content)")
      .eq("products.user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const paidOrders = orders.filter(o => o.status === "paid");
  const pendingOrders = orders.filter(o => ["pending", "failed"].includes(o.status));

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-foreground mb-6">Pedidos e Vendas</h2>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando pedidos...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Nenhum pedido ainda</h3>
            <p className="text-sm text-muted-foreground mb-6">Quando clientes iniciarem o checkout, os pedidos aparecerão aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="paid" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="paid">Concluídos ({paidOrders.length})</TabsTrigger>
            <TabsTrigger value="pending">Não Concluídos ({pendingOrders.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="paid" className="grid gap-3 mt-0">
            {paidOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl bg-card/30">
                Nenhum pedido concluído ainda.
              </div>
            ) : (
              paidOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="grid gap-3 mt-0">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl bg-card/30">
                Nenhum pedido abandonado detectado. Excelente!
              </div>
            ) : (
              pendingOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
};

const OrderCard = ({ order }: { order: Order }) => (
  <Card className="overflow-hidden hover:border-primary/40 transition-colors">
    <CardContent className="p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-bold text-foreground text-lg">{order.customer_name}</span>
            <Badge 
              variant={order.status === "paid" ? "default" : "secondary"} 
              className={
                order.status === "paid" ? "bg-emerald-500 hover:bg-emerald-600" : 
                order.status === "failed" ? "bg-red-500/10 text-red-500 border-red-500/20" : ""
              }
            >
              {order.status === "paid" ? "Pago e Entregue" : 
               order.status === "failed" ? "Pagamento Falhou" : "Não Concluído"}
            </Badge>
          </div>
          <div className="space-y-1 mb-3">
            <p className="text-sm text-muted-foreground">{order.customer_email}</p>
            {order.customer_whatsapp && (
              <p className="text-sm text-muted-foreground">WhatsApp: {order.customer_whatsapp}</p>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm bg-muted/40 p-2.5 rounded-lg w-fit border border-border/50">
            <span className="text-foreground font-medium">{order.products.name}</span>
            <span className="text-primary font-bold">{order.price.toFixed(2)} MT</span>
            <Badge variant="outline" className="capitalize text-xs bg-background">
              {order.payment_method}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-3 font-medium">
            Registado em: {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        
        {["pending", "failed"].includes(order.status) && (
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 md:min-w-[240px]">
            <span className="text-xs font-bold text-foreground block mb-3 uppercase tracking-wider">Recuperar Venda</span>
            <div className="flex flex-col gap-2">
              {order.customer_whatsapp && (
                <Button size="sm" variant="default" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white" asChild>
                  <a href={`https://wa.me/${order.customer_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.customer_name}, notamos que iniciou a compra de "${order.products.name}" mas não concluiu o pagamento. Posso ajudar de alguma forma?`)}`} target="_blank" rel="noreferrer">
                    Chamar no WhatsApp
                  </a>
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full bg-background gap-2"
                onClick={async () => {
                  const toastId = toast.loading("Enviando email de recuperação...");
                  try {
                    const siteUrl = window.location.origin;
                    const checkoutUrl = `${siteUrl}/checkout/${(order as any).product_id}?email=${encodeURIComponent(order.customer_email)}&name=${encodeURIComponent(order.customer_name)}`;
                    
                    const recoveryHtml = `
                      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0a0b; border-radius: 24px; overflow: hidden; border: 1px solid #1c1c1e;">
                        <div style="background-color: #141416; padding: 40px 20px; text-align: center; border-bottom: 1px solid #1c1c1e;">
                          <img src="${siteUrl}/logo.png" alt="EnsinaPay" style="height: 32px;">
                        </div>
                        <div style="padding: 50px 40px; background-color: #0a0a0b; text-align: center;">
                          <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: -1px;">Esqueceu algo? 🛒</h1>
                          <p style="color: #9ca3af; font-size: 16px; line-height: 1.5; margin: 0 0 40px 0;">Olá ${order.customer_name}, vimos que quase garantiu o seu conteúdo, mas não finalizou a compra.</p>
                          
                          <div style="background-color: #141416; padding: 25px; border-radius: 16px; border: 1px solid #232326; text-align: left; margin-bottom: 40px;">
                            <h3 style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">Item no Carrinho:</h3>
                            <p style="color: #ffffff; font-size: 18px; font-weight: 700; margin: 0 0 5px 0;">${order.products.name}</p>
                            <p style="color: #10b981; font-size: 16px; font-weight: 600; margin: 0;">${order.price.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</p>
                          </div>
                          
                          <a href="${checkoutUrl}" style="display: inline-block; background-color: #10b981; color: #000000; padding: 20px 45px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 10px 20px rgba(16,185,129,0.2);">Concluir Compra</a>
                          
                          <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">Precisa de ajuda? Basta responder a este email.</p>
                        </div>
                        <div style="background-color: #141416; padding: 30px; text-align: center; border-top: 1px solid #1c1c1e;">
                          <p style="color: #4b5563; font-size: 12px; margin: 0;">EnsinaPay - A nova era dos conteúdos em Moçambique.</p>
                        </div>
                      </div>
                    `;

                    const { error } = await supabase.functions.invoke("send-email-notification", {
                      body: {
                        to: order.customer_email,
                        subject: `🛒 Quase lá! O seu ${order.products.name} está à espera`,
                        htmlContent: recoveryHtml,
                        senderName: "EnsinaPay"
                      }
                    });

                    if (error) throw error;
                    toast.success("Email de recuperação enviado!", { id: toastId });
                  } catch (err: any) {
                    toast.error("Erro ao enviar: " + err.message, { id: toastId });
                  }
                }}
              >
                <Mail className="w-4 h-4" /> Enviar Email
              </Button>
            </div>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export default Orders;

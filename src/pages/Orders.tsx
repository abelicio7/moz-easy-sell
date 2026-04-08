import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, Clock, ShoppingCart } from "lucide-react";

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

  const confirmPayment = async (order: Order) => {
    const { error } = await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);
    if (error) {
      toast.error("Erro ao confirmar");
    } else {
      toast.success("Pagamento confirmado! O cliente receberá o produto.");
      fetchOrders();
    }
  };

  return (
    <DashboardLayout>
      <h2 className="text-xl font-semibold text-foreground mb-4">Pedidos</h2>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Nenhum pedido ainda</h3>
            <p className="text-sm text-muted-foreground">Quando clientes comprarem, os pedidos aparecerão aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{order.customer_name}</span>
                      <Badge variant={order.status === "paid" ? "default" : "secondary"} className={order.status === "paid" ? "bg-primary" : ""}>
                        {order.status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                    {order.customer_whatsapp && (
                      <p className="text-sm text-muted-foreground">WhatsApp: {order.customer_whatsapp}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-foreground font-medium">{order.products.name}</span>
                      <span className="text-primary font-medium">{order.price.toFixed(2)} MT</span>
                      <span className="text-muted-foreground">{order.payment_method}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {order.status === "pending" && (
                    <Button size="sm" onClick={() => confirmPayment(order)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar pagamento
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Orders;

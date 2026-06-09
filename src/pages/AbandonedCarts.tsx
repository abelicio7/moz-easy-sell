import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, ShoppingCart, Clock } from "lucide-react";

interface AbandonedCart {
  customer_name: string;
  email: string;
  customer_whatsapp: string | null;
  payment_phone: string | null;
  created_at: string;
  status: string;
  product_id: string;
  products: {
    name: string;
    user_id: string;
  };
}

const AbandonedCarts = () => {
  const { user } = useAuth();
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCarts = async () => {
      // Find all pending carts for products owned by this user
      const { data, error } = await supabase
        .from("carts")
        .select(`
          customer_name,
          email,
          customer_whatsapp,
          payment_phone,
          created_at,
          status,
          product_id,
          products!inner(name, user_id)
        `)
        .eq("status", "pending")
        .eq("products.user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setCarts(data as unknown as AbandonedCart[]);
      }
      setLoading(false);
    };

    fetchCarts();
  }, [user]);

  // Format phone number to standard format
  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, "");
    // Assuming mostly mozambique number format
    if (clean.length === 9) return `258${clean}`;
    return clean;
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Carrinhos Abandonados</h1>
          <p className="text-muted-foreground mt-1">Recupere vendas não finalizadas entrando em contacto com os clientes.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Potenciais Clientes</CardTitle>
          <CardDescription>
            Mostrando utilizadores que iniciaram a compra mas não a finalizaram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Procurando carrinhos...</div>
          ) : carts.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Nenhum carrinho abandonado encontrado.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left text-muted-foreground">
                <thead className="text-xs uppercase bg-muted/40 border-b border-border/50">
                  <tr>
                    <th className="px-4 py-4 font-bold text-foreground">Data/Hora</th>
                    <th className="px-4 py-4 font-bold text-foreground">Cliente</th>
                    <th className="px-4 py-4 font-bold text-foreground">Produto</th>
                    <th className="px-4 py-4 font-bold text-foreground text-right">Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {carts.map((cart, idx) => {
                    const phone = formatPhone(cart.customer_whatsapp || cart.payment_phone);
                    const isRecent = new Date().getTime() - new Date(cart.created_at).getTime() < 3600000;
                    
                    return (
                      <tr key={idx} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {new Date(cart.created_at).toLocaleString('pt-MZ')}
                            {isRecent && <Badge className="bg-orange-500 hover:bg-orange-600 text-[10px]">Recente</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-medium text-foreground">
                          {cart.customer_name}
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {cart.email}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-foreground">
                          {cart.products?.name}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {phone ? (
                            <Button 
                              size="sm" 
                              className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg shadow-sm font-bold"
                              onClick={() => {
                                const msg = encodeURIComponent(`Olá ${cart.customer_name.split(' ')[0]}, notei que estava a tentar adquirir o produto "${cart.products?.name}". Teve alguma dificuldade com o pagamento? Estou aqui para ajudar!`);
                                window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                              }}
                            >
                              <MessageCircle className="w-4 h-4 mr-1" />
                              Chamar no Whats
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Sem telefone</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AbandonedCarts;

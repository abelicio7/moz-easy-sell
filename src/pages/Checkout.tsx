import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap, ShieldCheck, CheckCircle2, MessageCircle } from "lucide-react";

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForPin, setWaitingForPin] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    customer_whatsapp: "",
    payment_method: "mpesa",
    payment_phone: "",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error || !data) {
        toast.error("Produto não encontrado.");
        navigate("/");
        return;
      }

      setProduct(data);
      setLoading(false);
    };

    if (productId) fetchProduct();
  }, [productId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || submitting) return;

    if (!form.name || !form.email || !form.payment_phone) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setSubmitting(true);

    try {
      const orderId = crypto.randomUUID();

      // 1. Criar Pedido
      const { error: insertError } = await supabase.from("orders").insert({
        id: orderId,
        product_id: product.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_whatsapp: form.customer_whatsapp,
        payment_method: form.payment_method,
        price: product.price,
        status: "pending"
      });

      if (insertError) throw insertError;

      // 2. Iniciar Pagamento
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('process-payment', {
        body: {
          order_id: orderId,
          payment_method: form.payment_method,
          amount: product.price,
          phone: form.payment_phone,
          product_name: product.name,
        }
      });

      if (paymentError) throw paymentError;

      setWaitingForPin(true);

      // 3. Escutar Confirmação (Realtime + Polling)
      const channel = supabase
        .channel(`order-${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
        (payload) => {
          if (payload.new.status === 'paid') {
            finishOrder(orderId);
          }
        })
        .subscribe();

      const polling = setInterval(async () => {
        const { data: statusData } = await supabase.functions.invoke('check-payment-status', {
          body: { order_id: orderId, debito_reference: paymentData.debito_reference }
        });
        if (statusData?.order_status === 'paid') {
          clearInterval(polling);
          finishOrder(orderId);
        }
      }, 5000);

      const finishOrder = (id: string) => {
        clearInterval(polling);
        supabase.removeChannel(channel);
        toast.success("Pagamento confirmado!");
        navigate(`/thank-you?order_id=${id}&product_id=${product.id}&amount=${product.price}`);
      };

    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar. Tente novamente.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] text-white italic font-black text-2xl animate-pulse">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 pt-10">
        
        {/* Info do Produto */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
            <Zap className="w-3 h-3 fill-current" /> Envio Imediato
          </div>
          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none">
            {product.name}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">{product.description}</p>
          <div className="p-6 rounded-3xl bg-[#141416] border border-[#232326] space-y-2">
            <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Preço Total</span>
            <div className="text-5xl font-black italic tracking-tighter text-primary">
              {product.price} <span className="text-xl not-italic">MT</span>
            </div>
          </div>
        </div>

        {/* Formulário / Aguardando PIN */}
        <Card className="bg-[#141416] border-[#232326] rounded-[40px] overflow-hidden shadow-2xl shadow-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-center font-black italic uppercase tracking-widest text-sm opacity-50">Checkout Seguro</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {!waitingForPin ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input 
                  placeholder="Seu Nome Completo" 
                  className="h-14 bg-black/50 border-[#232326] rounded-2xl font-bold"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <Input 
                  placeholder="Seu Melhor E-mail" 
                  type="email"
                  className="h-14 bg-black/50 border-[#232326] rounded-2xl font-bold"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    type="button"
                    variant={form.payment_method === 'mpesa' ? 'default' : 'outline'}
                    className="h-14 rounded-2xl font-black uppercase italic"
                    onClick={() => setForm({ ...form, payment_method: 'mpesa' })}
                  >M-Pesa</Button>
                  <Button 
                    type="button"
                    variant={form.payment_method === 'emola' ? 'default' : 'outline'}
                    className="h-14 rounded-2xl font-black uppercase italic"
                    onClick={() => setForm({ ...form, payment_method: 'emola' })}
                  >E-Mola</Button>
                </div>
                <Input 
                  placeholder="Número de Telefone" 
                  className="h-14 bg-black/50 border-[#232326] rounded-2xl font-bold"
                  value={form.payment_phone}
                  onChange={(e) => setForm({ ...form, payment_phone: e.target.value })}
                />
                <Button 
                  disabled={submitting}
                  className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black italic text-xl rounded-2xl uppercase tracking-tighter"
                >
                  {submitting ? "Processando..." : "Pagar Agora"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-8 py-10 animate-in fade-in zoom-in duration-500">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                  <Zap className="w-20 h-20 text-primary relative animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter">Aguardando PIN</h2>
                  <p className="text-muted-foreground font-medium">Introduza o PIN no telemóvel para confirmar o pagamento de <b>{product.price} MT</b>.</p>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-progress-fast" style={{ width: '60%' }} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Sincronizando com a rede...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;

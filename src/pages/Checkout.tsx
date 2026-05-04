import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap, ShieldCheck, CheckCircle2, MessageCircle, ArrowRight, Lock, Sparkles, Phone } from "lucide-react";

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
      toast.error("Por favor, preencha todos os campos obrigatórios.");
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
        toast.success("Pagamento confirmado com sucesso!");
        navigate(`/thank-you?order_id=${id}&product_id=${product.id}&amount=${product.price}`);
      };

    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar o pagamento. Tente novamente.");
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white space-y-4">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <span className="font-black italic uppercase tracking-widest text-sm animate-pulse">Carregando Experiência...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary selection:text-black font-sans antialiased overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full opacity-50" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-12 md:py-20 grid lg:grid-cols-[1fr,450px] gap-16 items-start">
        
        {/* Left Side: Branding & Product Info */}
        <div className="space-y-12 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl">
              <Zap className="w-6 h-6 text-black fill-current" />
            </div>
            <span className="text-2xl font-black italic tracking-tighter uppercase">EnsinaPay</span>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Oferta Exclusiva Ativa</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40">
              {product.name}
            </h1>
            
            <p className="text-xl text-white/50 leading-relaxed max-w-xl font-medium">
              {product.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Entrega</span>
              <div className="text-xl font-bold flex items-center gap-2 italic">
                <CheckCircle2 className="w-5 h-5 text-primary" /> Imediata
              </div>
            </div>
            <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Segurança</span>
              <div className="text-xl font-bold flex items-center gap-2 italic">
                <ShieldCheck className="w-5 h-5 text-primary" /> SSL 256-bit
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-white/40 text-sm font-medium">
            <Lock className="w-4 h-4" />
            Pagamento Processado com Segurança pela Débito Pay
          </div>
        </div>

        {/* Right Side: Checkout Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-br from-primary to-secondary rounded-[42px] blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
          
          <Card className="relative bg-[#0d0d0f] border-white/5 rounded-[40px] shadow-3xl overflow-hidden backdrop-blur-2xl">
            <CardHeader className="bg-white/5 border-b border-white/5 py-8">
              <div className="flex justify-between items-end px-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Total a Pagar</span>
                  <div className="text-5xl font-black italic tracking-tighter text-white">
                    {product.price}<span className="text-xl not-italic text-primary ml-1">MT</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Checkout Ativo</span>
                  <div className="flex gap-1 mt-1 justify-end">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                    <div className="w-1.5 h-1.5 bg-primary/20 rounded-full" />
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              {!waitingForPin ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="group relative">
                      <Input 
                        placeholder="Nome Completo" 
                        className="h-16 bg-white/5 border-white/10 rounded-2xl font-bold px-6 focus:bg-white/10 transition-all placeholder:text-white/20"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="group relative">
                      <Input 
                        placeholder="E-mail para Receber o Produto" 
                        type="email"
                        className="h-16 bg-white/5 border-white/10 rounded-2xl font-bold px-6 focus:bg-white/10 transition-all placeholder:text-white/20"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 block ml-2">Método de Pagamento</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        className={`h-16 rounded-2xl font-black uppercase italic text-xs tracking-widest border transition-all flex items-center justify-center gap-2 ${
                          form.payment_method === 'mpesa' 
                            ? 'bg-primary text-black border-primary shadow-lg shadow-primary/20' 
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                        onClick={() => setForm({ ...form, payment_method: 'mpesa' })}
                      >
                        M-Pesa
                      </button>
                      <button 
                        type="button"
                        className={`h-16 rounded-2xl font-black uppercase italic text-xs tracking-widest border transition-all flex items-center justify-center gap-2 ${
                          form.payment_method === 'emola' 
                            ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20' 
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                        onClick={() => setForm({ ...form, payment_method: 'emola' })}
                      >
                        E-Mola
                      </button>
                    </div>
                  </div>

                  <div className="group relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <Input 
                      placeholder="Número de Telefone" 
                      className="h-16 bg-white/5 border-white/10 rounded-2xl font-bold pl-14 pr-6 focus:bg-white/10 transition-all placeholder:text-white/20"
                      value={form.payment_phone}
                      onChange={(e) => setForm({ ...form, payment_phone: e.target.value })}
                    />
                  </div>

                  <Button 
                    disabled={submitting}
                    className="w-full h-20 bg-primary hover:bg-primary/90 text-black font-black italic text-2xl rounded-2xl uppercase tracking-tighter shadow-xl shadow-primary/20 transition-transform active:scale-95 group/btn overflow-hidden relative"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {submitting ? "Sincronizando..." : "Finalizar Compra"}
                      {!submitting && <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-10 py-8 animate-in fade-in zoom-in duration-700">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/30 blur-[60px] rounded-full animate-pulse" />
                    <div className="relative w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center overflow-hidden">
                      <Zap className="w-16 h-16 text-primary fill-current animate-bounce" />
                      <div className="absolute inset-0 border-t-4 border-primary animate-spin" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 px-4">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Confirme o PIN</h2>
                    <p className="text-white/50 font-medium leading-relaxed">
                      Enviamos um pedido de pagamento para <span className="text-white font-bold">{form.payment_phone}</span>.<br />
                      Introduza o seu PIN para libertar o acesso.
                    </p>
                  </div>

                  <div className="space-y-3 px-8">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-progress-fast" style={{ width: '70%' }} />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse italic">
                      <ShieldCheck className="w-3 h-3" /> Transação Criptografada
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => window.open('https://wa.me/5547999530835?text=Olá, preciso de ajuda com o meu pagamento no EnsinaPay.', '_blank')}
                    className="flex items-center gap-2 mx-auto text-xs font-bold uppercase tracking-widest text-white/30 hover:text-primary transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Precisa de Ajuda?
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Support Link */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => window.open('https://wa.me/5547999530835', '_blank')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <MessageCircle className="w-5 h-5 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest italic">Suporte Especializado EnsinaPay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

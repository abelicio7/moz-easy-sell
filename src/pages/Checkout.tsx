import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Zap, ShieldCheck, ArrowLeft, ArrowRight, Smartphone, Star, CheckCircle2, MessageCircle, Lock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
        .select("*, profiles(full_name, avatar_url)")
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
        toast.success("Pagamento confirmado com sucesso!");
        navigate(`/thank-you?order_id=${id}&product_id=${product.id}&amount=${product.price}`);
      };

    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar o pagamento. Tente novamente.");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary italic font-black text-2xl animate-pulse">Carregando...</div>;

  return (
    <>
        <div className="min-h-screen bg-background flex flex-col lg:flex-row font-sans">
          {/* Lado Esquerdo: Info do Produto */}
          <div className="lg:w-[45%] bg-muted/30 p-6 sm:p-12 lg:p-20 flex flex-col justify-between relative overflow-hidden">
            {/* Elementos Decorativos */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 space-y-12">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar
              </Link>

              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                  <Zap className="w-3 h-3 fill-current" /> Envio Imediato via E-mail
                </div>
                
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none text-foreground">
                  {product.name}
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed max-w-lg font-medium">
                  {product.description}
                </p>
              </div>

              {/* Prova Social / Trust Indicators */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-background border border-border shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tighter">Acesso Vitalício</p>
                    <p className="text-[10px] text-muted-foreground">Assista quando quiser</p>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-background border border-border shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tighter">4.9/5 Estrelas</p>
                    <p className="text-[10px] text-muted-foreground">+2.4k Alunos</p>
                  </div>
                </div>
              </div>

              {/* Perfil do Vendedor (Se houver) */}
              {product.profiles && (
                <div className="flex items-center gap-4 pt-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-background overflow-hidden">
                    {product.profiles.avatar_url ? (
                      <img src={product.profiles.avatar_url} alt={product.profiles.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary font-black uppercase text-xl italic">
                        {product.profiles.full_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Vendido por</p>
                    <p className="text-lg font-black italic uppercase tracking-tighter text-foreground">{product.profiles.full_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="relative z-10 pt-12 flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-60">
              <ShieldCheck className="w-4 h-4" /> Pagamento 100% Seguro
            </div>
          </div>

          {/* Lado Direito: Checkout */}
          <div className="lg:w-[55%] p-6 sm:p-12 lg:p-20 flex flex-col items-center justify-center">
            <Card className="w-full max-w-xl bg-card border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden border-t-4 border-primary">
              <CardHeader className="bg-muted/30 border-b border-border/50 py-8 px-10">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-primary italic">Resumo da Compra</CardTitle>
                    <div className="text-5xl font-black italic tracking-tighter text-foreground">
                      {product.price.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} <span className="text-xl not-italic text-muted-foreground ml-1">MT</span>
                    </div>
                  </div>
                  <div className="text-right pb-1">
                    <div className="flex -space-x-2 justify-end mb-2">
                      {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-black italic text-muted-foreground">{i}</div>)}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Etapas Seguras</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-10 space-y-8">
                {/* Campos de Identificação */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground italic">Dados do Comprador</span>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-widest font-black ml-1 text-muted-foreground">Nome Completo</Label>
                      <Input
                        placeholder="Ex: Salomão Chamusse"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="h-12 bg-muted/20 border-border/50 rounded-xl font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-widest font-black ml-1 text-muted-foreground">E-mail para Entrega</Label>
                      <Input
                        type="email"
                        placeholder="Ex: seu@email.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        className="h-12 bg-muted/20 border-border/50 rounded-xl font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Seleção de Pagamento */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground italic">Método de Pagamento</span>
                  </div>

                  <RadioGroup
                    value={form.payment_method}
                    onValueChange={(value) => setForm({ ...form, payment_method: value })}
                    className="grid grid-cols-2 gap-4"
                  >
                    <label
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                        form.payment_method === 'mpesa' 
                          ? 'border-[#E51B24] bg-[#E51B24]/5' 
                          : 'border-border bg-muted/20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                      }`}
                    >
                      <RadioGroupItem value="mpesa" className="sr-only" />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E51B24] flex items-center justify-center text-white font-black italic text-lg shadow-lg">M</div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black uppercase tracking-tighter">M-Pesa</p>
                          <p className="text-[8px] text-white/70 leading-none">Vodacom</p>
                        </div>
                      </div>
                    </label>

                    <label
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                        form.payment_method === 'emola' 
                          ? 'border-[#F57C00] bg-[#F57C00]/5' 
                          : 'border-border bg-muted/20 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                      }`}
                    >
                      <RadioGroupItem value="emola" className="sr-only" />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F57C00] flex items-center justify-center text-white font-black italic text-lg shadow-lg">E</div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-black uppercase tracking-tighter">E-Mola</p>
                          <p className="text-[8px] text-white/70 leading-none">Movitel</p>
                        </div>
                      </div>
                    </label>
                  </RadioGroup>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center justify-between uppercase tracking-wider font-bold">
                        <span className="flex items-center gap-1 font-bold text-foreground">Número de Pagamento *</span>
                        <span className="text-[10px] text-primary font-bold">
                          {form.payment_method === 'mpesa' ? 'Vodacom (84/85)' : 'Movitel (86/87)'}
                        </span>
                      </Label>
                      <Input
                        type="tel"
                        placeholder={form.payment_method === 'mpesa' ? "Ex: 840000000" : "Ex: 860000000"}
                        value={form.payment_phone}
                        onChange={(e) => setForm({ ...form, payment_phone: e.target.value })}
                        required
                        className="h-14 bg-background/50 border-border rounded-xl text-xl font-black text-center"
                      />
                      <p className="text-[10px] text-muted-foreground italic text-center">
                        Irás receber um pedido de confirmação (PIN) neste número via {form.payment_method === "mpesa" ? "M-Pesa" : "E-Mola"}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-500">Envio automático após o pagamento</p>
                      <p className="text-[11px] text-emerald-500/70">O acesso ao seu produto será enviado para o seu e-mail imediatamente.</p>
                    </div>
                  </div>

                  <Button 
                    className={`w-full h-16 text-white font-black text-xl rounded-xl transition-all duration-500 hover:scale-[1.01] active:scale-[0.98] group relative overflow-hidden shadow-2xl ${
                      form.payment_method === 'mpesa' 
                        ? 'bg-gradient-to-r from-[#E51B24] to-[#8A0A12] hover:shadow-[#E51B24]/40' 
                        : 'bg-gradient-to-r from-[#F57C00] to-[#b34700] hover:shadow-[#F57C00]/40'
                    }`}
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>PAGAR AGORA — {product.price.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT</span>
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>

                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-60">
                      <ShieldCheck className="w-3 h-3" /> Pague com segurança via EnsinaPay
                    </div>
                    <div className="flex items-center gap-4 opacity-60 grayscale hover:grayscale-0 transition-all">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#E51B24] flex items-center justify-center text-white text-[8px] font-black">M</div>
                        <span className="text-[10px] font-black text-foreground/70">M-Pesa</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#F57C00] flex items-center justify-center text-white text-[8px] font-black">E</div>
                        <span className="text-[10px] font-black text-foreground/70">E-Mola</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-medium uppercase tracking-widest py-8">
              <Link to="/terms" className="hover:text-primary transition-colors">Termos</Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
              <span>•</span>
              <span>&copy; {new Date().getFullYear()} EnsinaPay</span>
            </div>
          </div>
        </div>

        {/* --- OVERLAY: AGUARDANDO PIN --- */}
        {waitingForPin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/80 animate-in fade-in duration-300">
            <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl shadow-primary/10 rounded-[2.5rem] overflow-hidden border-2">
              <CardContent className="p-10 text-center space-y-8">
                {/* Ícone Animado */}
                <div className="relative mx-auto w-24 h-24">
                  <div className={`absolute inset-0 rounded-3xl animate-ping opacity-20 ${
                    form.payment_method === 'mpesa' ? 'bg-[#E51B24]' : 'bg-[#F57C00]'
                  }`} />
                  <div className={`relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl ${
                    form.payment_method === 'mpesa' ? 'bg-[#E51B24]' : 'bg-[#F57C00]'
                  }`}>
                    <Smartphone className="w-10 h-10 text-white animate-bounce" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-foreground">
                    Aguardando PIN
                  </h2>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    Enviamos um pedido de pagamento para o número <span className="text-foreground font-bold">{form.payment_phone}</span>. 
                    Por favor, introduza o seu PIN no telemóvel para confirmar.
                  </p>
                </div>

                {/* Progress Loader */}
                <div className="space-y-4 pt-4">
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-progress-fast" style={{ width: '60%' }} />
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                    <Zap className="w-3 h-3 fill-current" /> Sincronizando com a rede...
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <button 
                    onClick={() => window.open('https://wa.me/5547999530835?text=Olá, preciso de ajuda com o meu pagamento no EnsinaPay.', '_blank')}
                    className="flex items-center gap-2 mx-auto text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Suporte via WhatsApp
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
  );
};

export default Checkout;

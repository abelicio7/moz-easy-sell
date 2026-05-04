import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Smartphone, ShoppingBag, User, Mail, Phone, MessageCircle, ShieldCheck, Zap, ArrowRight, Package } from "lucide-react";
import Logo from "@/components/Logo";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  user_id?: string;
}

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForPin, setWaitingForPin] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    customer_whatsapp: "",
    payment_phone: "",
    payment_method: "mpesa",
  });

  useEffect(() => {
    const initPage = async () => {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`id, name, description, price, image_url, user_id, status`)
        .eq("id", productId)
        .maybeSingle();
      
      if (productError || !productData) {
        toast.error("Produto não encontrado.");
        navigate("/");
        return;
      }

      setProduct(productData as any);
      setLoading(false);
    };

    initPage();
  }, [productId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || submitting) return;
    if (!form.name || !form.email || !form.customer_whatsapp || !form.payment_phone) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setSubmitting(true);

    try {
      const orderId = crypto.randomUUID();

      const { error } = await supabase.from("orders").insert({
        id: orderId,
        product_id: product.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_whatsapp: form.customer_whatsapp,
        payment_method: form.payment_method,
        price: product.price,
        status: "pending"
      });

      if (error) throw error;

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
      console.error("Checkout Error:", err);
      const errorMessage = err?.context?.message || err?.message || "Erro ao processar pagamento.";
      toast.error(errorMessage);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
          <Package className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Produto Indisponível</h1>
        <Button variant="outline" className="mt-8 rounded-xl" onClick={() => navigate('/')}>
          Voltar para Início
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Checkout seguro
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6 pt-8 px-4">
          <Card className="border-border/50 bg-card overflow-hidden shadow-2xl">
            <div className="bg-muted/10 border-b border-border/50">
              {product.image_url && (
                <div className="aspect-video w-full overflow-hidden">
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 space-y-3">
                <h2 className="text-2xl font-black text-foreground uppercase leading-tight tracking-tight">
                  {product.name}
                </h2>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  {product.description || "Aprenda, execute e comece a vender ainda hoje com cursos, ferramentas e materiais prontos."}
                </p>
                <p className="text-3xl font-bold text-primary tracking-tight">
                  {product.price.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                </p>
              </div>
            </div>
            
            <CardContent className="pt-8 space-y-8">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-primary" />
                  Seus dados
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Nome completo *</Label>
                    <Input
                      placeholder="Digite seu nome completo"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="bg-background/50 border-border h-11"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email *
                      </Label>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        className="bg-background/50 border-border h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-emerald-500" /> WhatsApp *
                      </Label>
                      <Input
                        placeholder="Ex: 840000000"
                        value={form.customer_whatsapp}
                        onChange={(e) => setForm({ ...form, customer_whatsapp: e.target.value })}
                        required
                        className="bg-background/50 border-border h-11"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />

              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Smartphone className="w-4 h-4 text-primary" />
                  Método de pagamento
                </h2>
                <RadioGroup
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v })}
                  className="grid grid-cols-2 gap-2"
                >
                  <label
                    htmlFor="mpesa"
                    className={`relative overflow-hidden flex items-center gap-2 rounded-xl p-3 cursor-pointer transition-all bg-gradient-to-br from-[#E51B24] to-[#8A0A12] text-white hover:scale-[1.01] ${
                      form.payment_method === "mpesa"
                        ? "shadow-lg ring-2 ring-primary/20 opacity-100"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <RadioGroupItem value="mpesa" id="mpesa" className="w-3 h-3 border-white text-white fill-white" />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-7 h-7 rounded-full flex flex-col items-center justify-center bg-white text-[#DD0512]">
                        <span className="font-black text-[9px] uppercase">M</span>
                      </div>
                      <div>
                        <p className="font-bold text-white text-[11px] leading-tight">M-Pesa</p>
                        <p className="text-[8px] text-white/70 leading-none">Vodacom</p>
                      </div>
                    </div>
                  </label>
                  
                  <label
                    htmlFor="emola"
                    className={`relative overflow-hidden flex items-center gap-2 rounded-xl p-3 cursor-pointer transition-all bg-gradient-to-br from-[#F57C00] to-[#b34700] text-white hover:scale-[1.01] ${
                      form.payment_method === "emola"
                        ? "shadow-lg ring-2 ring-primary/20 opacity-100"
                        : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <RadioGroupItem value="emola" id="emola" className="w-3 h-3 border-white text-white fill-white" />
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-7 h-7 rounded-full flex flex-col items-center justify-center bg-white text-[#F57C00]">
                        <span className="font-black text-[9px] uppercase">E</span>
                      </div>
                      <div>
                        <p className="font-bold text-white text-[11px] leading-tight">E-Mola</p>
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

      {waitingForPin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-black/80 animate-in fade-in duration-300">
          <Card className="w-full max-w-md bg-card border-primary/20 shadow-2xl shadow-primary/10 rounded-[2.5rem] overflow-hidden border-2">
            <CardContent className="p-10 text-center space-y-8">
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

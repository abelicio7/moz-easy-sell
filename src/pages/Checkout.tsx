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
import { Shield, Smartphone, ShoppingBag, User, Mail, Phone, MessageCircle, ShieldCheck, Zap, ArrowRight } from "lucide-react";
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
  const [debugError, setDebugError] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [waitingForPin, setWaitingForPin] = useState(false);
  const [debitoRef, setDebitoRef] = useState("");
  const [showSupport, setShowSupport] = useState(false);
  const [timerId, setTimerId] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    customer_whatsapp: "",
    payment_phone: "",
    payment_method: "mpesa",
  });

  useEffect(() => {
    const initPage = async () => {
      // 1. Process URL Params & Affiliate
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const nameParam = params.get("name");

      if (emailParam || nameParam) {
        setForm(prev => ({
          ...prev,
          email: emailParam || prev.email,
          name: nameParam || prev.name
        }));
      }



      // 2. Fetch Product Data
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`
          id, 
          name, 
          description, 
          price, 
          image_url, 
          user_id,
          status
        `)
        .eq("id", productId)
        .maybeSingle();
      
      if (productError || !productData || productData.status !== 'approved') {
        if (productError) setDebugError(`Erro BD: ${productError.message}`);
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct(productData as any);

      // 3. Setup Facebook Pixel
      const pixelsToFire: string[] = [];
      try {
        // Seller Pixel
        if (productData.user_id) {
          const { data: sellerPixel } = await supabase
            .from("seller_integrations")
            .select("config")
            .eq("user_id", productData.user_id)
            .eq("integration_type", "facebook_pixel")
            .eq("is_active", true)
            .maybeSingle();
          
          if (sellerPixel?.config?.pixelId) pixelsToFire.push(sellerPixel.config.pixelId);
        }

        if (pixelsToFire.length > 0) {
          const win = window as any;
          if (!win.fbq) {
            !function(f:any,b:any,e:any,v:any,n?:any,t?:any,s?:any)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(win, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
          }
          
          pixelsToFire.forEach(pixelId => win.fbq('init', pixelId));
          win.fbq('track', 'PageView');
          win.fbq('track', 'InitiateCheckout', {
            content_name: productData.name,
            value: productData.price,
            currency: 'MZN'
          });
        }
      } catch (e) {
        console.error("Erro ao carregar pixels:", e);
      }

      setLoading(false);
    };

    initPage();
  }, [productId]);

  const handleCaptureCart = async () => {
    if (!product || !form.email || !form.email.includes("@")) return;
    
    try {
      await supabase.from("carts").upsert({
        email: form.email.toLowerCase().trim(),
        customer_name: form.name,
        product_id: product.id,
        status: "pending"
      }, { onConflict: 'email, product_id' });
    } catch (e) {
      console.error("Cart capture error:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!form.name || !form.email || !form.customer_whatsapp || !form.payment_phone) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    
    // Validate phone prefix based on operator to prevent API errors
    const cleanPhone = form.payment_phone.replace(/\D/g, "").replace(/^258/, "").replace(/^\+258/, "");
    const prefix = cleanPhone.substring(0, 2);
    
    if (form.payment_method === "mpesa" && !["84", "85"].includes(prefix)) {
      toast.error("Para pagar com M-Pesa, o número deve começar com 84 ou 85.");
      return;
    }
    
    if (form.payment_method === "emola" && !["86", "87"].includes(prefix)) {
      toast.error("Para pagar com E-Mola, o número deve começar com 86 ou 87.");
      return;
    }

    setSubmitting(true);

    try {
      // Use crypto.randomUUID() if available, otherwise fallback to manual generation
      const orderId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
      
      console.log("Iniciando criação do pedido:", orderId);

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

      if (error) {
        console.error("Erro Supabase Insert:", error);
        toast.error("Erro ao registrar pedido. Por favor, tente novamente.");
        setSubmitting(false);
        return;
      }
      
      console.log("Pedido criado com sucesso. Chamando process-payment...");

      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          order_id: orderId,
          payment_method: form.payment_method,
          amount: product.price,
          phone: form.payment_phone,
          product_name: product.name,
        })
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok || paymentData.error) {
        throw new Error(paymentData.error || "Erro no pagamento");
      }

      // Ativar o modo de espera para o PIN
      setWaitingForPin(true);
      setDebitoRef(paymentData.debito_reference);

      // --- SUPABASE REALTIME: Escuta a confirmação do pagamento ---
      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
          },
          (payload) => {
            console.log('[Realtime] Order update received:', payload.new.status);
            if (payload.new.status === 'paid') {
              if (timerId) clearTimeout(timerId);
              supabase.removeChannel(channel);
              toast.success("Pagamento confirmado com sucesso!");
              navigate(`/thank-you?order_id=${orderId}&product_id=${productId}&amount=${product.price}`);
            }
          }

        )
        .subscribe();

      // --- TIMEOUT DE 15 SEGUNDOS PARA SUPORTE ---
      const timeout = setTimeout(() => {
        supabase.removeChannel(channel);
        setShowSupport(true);
      }, 15000);
      
      setTimerId(timeout);


    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar pagamento.");
    } finally {
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
        <p className="text-muted-foreground max-w-xs mx-auto">
          Este produto não está mais disponível para compra ou ainda está aguardando aprovação.
        </p>
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
              {product && (
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
                    <p className="text-3xl font-bold text-[#4fd1c5] tracking-tight">
                      {product.price.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT
                    </p>
                  </div>
                </div>
              )}
              
              <CardContent className="pt-8 space-y-8">
                {/* Secção 1: Dados Pessoais */}
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
                        onBlur={handleCaptureCart}
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
                          onBlur={handleCaptureCart}
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

                {/* Secção 2: Pagamento */}
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

                {/* Secção de Finalização (Antes estava no card lateral) */}
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
                    {showSupport ? "Precisa de Ajuda?" : "Aguardando PIN"}
                  </h2>
                  <p className="text-muted-foreground font-medium leading-relaxed">
                    {showSupport 
                      ? "O sistema está a levar mais tempo do que o esperado para confirmar o seu PIN. Se já confirmou no telemóvel, clique no botão abaixo para suporte imediato."
                      : `Enviamos um pedido de pagamento para o número ${form.payment_phone}. Por favor, introduza o seu PIN no telemóvel para confirmar.`
                    }
                  </p>
                </div>

                {showSupport ? (
                  <div className="pt-4 animate-in zoom-in-95 duration-500">
                    <Button 
                      className="w-full h-16 bg-[#25D366] hover:bg-[#128C7E] text-white font-black text-lg rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-green-500/20"
                      onClick={() => window.open(`https://wa.me/5547999530835?text=Olá, o meu pagamento para o produto ${product?.name} ainda não foi confirmado. ID do pedido: ${orderId}`, '_blank')}
                    >
                      <MessageCircle className="w-6 h-6 fill-current" />
                      Falar com Suporte
                    </Button>
                  </div>
                ) : (
                  /* Progress Loader */
                  <div className="space-y-4 pt-4">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-progress-fast" style={{ width: '60%' }} />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                      <Zap className="w-3 h-3 fill-current" /> Sincronizando com a rede...
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    variant="ghost" 
                    className="text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                    onClick={() => {
                      setShowSupport(false);
                      setWaitingForPin(false);
                      if (timerId) clearTimeout(timerId);
                    }}
                  >
                    Cancelar e tentar novamente
                  </Button>
                </div>

              </CardContent>
            </Card>
          </div>
        )}
      </>
  );
};

export default Checkout;

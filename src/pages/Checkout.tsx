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
import { Shield, Smartphone, ShoppingBag, User, Mail, Phone, MessageCircle, ShieldCheck, Zap, ArrowRight, Package, Copy } from "lucide-react";
import Logo from "@/components/Logo";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  user_id?: string;
  currency?: string;
}

const Checkout = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForPin, setWaitingForPin] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);

  const [form, setForm] = useState({
    name: "",
    email: "",
    customer_whatsapp: "",
    payment_phone: "",
    payment_method: "mpesa",
    cpf: "",
  });

  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCopiaCola, setPixCopiaCola] = useState<string | null>(null);

  const [trackingParams, setTrackingParams] = useState<any>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tracking: any = {};
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src"];
    keys.forEach(key => {
      const val = params.get(key);
      if (val) tracking[key] = val;
    });

    if (Object.keys(tracking).length > 0) {
      setTrackingParams(tracking);
      sessionStorage.setItem("utm_tracking", JSON.stringify(tracking));
    } else {
      const saved = sessionStorage.getItem("utm_tracking");
      if (saved) {
        try {
          setTrackingParams(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved tracking parameters", e);
        }
      }
    }
  }, []);

  useEffect(() => {
    const initPage = async () => {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`id, name, description, price, image_url, user_id, status, currency`)
        .eq("id", productId)
        .maybeSingle();
      
      if (productError || !productData) {
        toast.error("Produto não encontrado.");
        navigate("/");
        return;
      }

      setProduct(productData as any);
      if (productData.currency === "BRL") {
        setForm(prev => ({ ...prev, payment_method: "pix" }));
      }
      setLoading(false);

      // --- INTEGRATIONS START ---
      const { data: pixelId, error: pixelError } = await supabase.rpc('get_product_pixel', { p_product_id: productId });
      
      console.log("Pixel RPC debug:", { pixelId, pixelError });

      if (pixelId) {
        console.log(`Injecting Meta Pixel: ${pixelId}`);
        
        if (!document.getElementById(`fb-pixel-${pixelId}`)) {
          // Standard Meta Pixel Code
          const code = `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
            fbq('track', 'InitiateCheckout', {
              content_name: '${productData.name.replace(/'/g, "\\'")}',
              content_ids: ['${productData.id}'],
              content_type: 'product',
              value: ${productData.price},
              currency: 'MZN'
            });
          `;
          
          const script = document.createElement("script");
          script.id = `fb-pixel-${pixelId}`;
          script.type = "text/javascript";
          try {
            script.appendChild(document.createTextNode(code));
          } catch (e) {
            script.text = code;
          }
          document.head.appendChild(script);

          const noscript = document.createElement("noscript");
          noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
          document.head.appendChild(noscript);
        }
      }
      // --- INTEGRATIONS END ---
    };

    initPage();
  }, [productId, navigate]);

  useEffect(() => {
    const saveCart = async () => {
      if (form.email && form.email.includes('@') && product && (form.name || form.customer_whatsapp)) {
        try {
          await supabase.from("carts").upsert({
            email: form.email,
            customer_name: form.name || 'Em preenchimento',
            customer_whatsapp: form.customer_whatsapp || null,
            payment_phone: form.payment_phone || null,
            product_id: product.id,
            status: "pending",
            contacted_at: null
          }, { onConflict: 'email, product_id' });
        } catch (e) {
          console.error("Error saving cart:", e);
        }
      }
    };

    const timer = setTimeout(saveCart, 2000); // Debounce to avoid too many writes
    return () => clearTimeout(timer);
  }, [form.email, form.name, form.customer_whatsapp, form.payment_phone, product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || submitting) return;
    const isBrl = product.currency === "BRL";
    if (!form.name || !form.email || !form.customer_whatsapp || (!isBrl && !form.payment_phone) || (isBrl && !form.cpf)) {
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
        status: "pending",
        tracking_parameters: trackingParams,
        currency: product.currency || "MZN"
      });

      if (error) throw error;

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('process-payment', {
        body: {
          order_id: orderId,
          payment_method: form.payment_method,
          amount: product.price,
          phone: form.payment_phone,
          product_name: product.name,
          name: form.name,
          email: form.email,
          cpf: form.cpf,
        }
      });

      if (paymentError) throw paymentError;
      if (paymentData?.success === false) {
        throw new Error(paymentData.error || paymentData.message || "Falha ao processar pagamento");
      }

      if (form.payment_method === 'pix') {
        setPixQrCode(paymentData.pix_qr_code);
        setPixCopiaCola(paymentData.pix_copia_cola);
      }

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
        console.log("Polling payment status for order:", orderId);
        try {
          const { data: statusData, error: invokeError } = await supabase.functions.invoke('check-payment-status', {
            body: { order_id: orderId, debito_reference: paymentData.debito_reference }
          });
          
          if (invokeError) {
            console.error("Polling error:", invokeError);
            return;
          }

          console.log("Polling response:", statusData);
          if (statusData?.order_status === 'paid' || statusData?.order_status === 'delivered') {
            clearInterval(polling);
            finishOrder(orderId);
          }
        } catch (pollErr) {
          console.error("Polling fetch error:", pollErr);
        }
      }, 5000);

      const finishOrder = async (id: string) => {
        clearInterval(polling);
        supabase.removeChannel(channel);
        
        // Mark cart as completed if it exists
        if (form.email && product) {
          await supabase.from("carts")
            .update({ status: "completed" })
            .eq("email", form.email)
            .eq("product_id", product.id);
        }

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
            <div className="p-6 bg-card border-b border-border/50">
              <div className="flex flex-row gap-4 sm:gap-6 items-center text-left">
                {product.image_url ? (
                  <div className="w-24 h-24 sm:w-40 sm:h-40 shrink-0 rounded-2xl overflow-hidden shadow-xl border border-border/50">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-40 sm:h-40 shrink-0 rounded-2xl bg-muted flex items-center justify-center border border-border/50">
                    <Package className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground/20" />
                  </div>
                )}
                
                <div className="flex flex-col flex-1 justify-center py-1">
                  <div className="space-y-0.5 sm:space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-foreground uppercase leading-tight tracking-tight">
                      {product.name}
                    </h2>
                    <p className="text-[11px] sm:text-sm text-muted-foreground font-medium leading-tight max-w-md">
                      {product.description || "Aprenda, execute e comece a vender ainda hoje com cursos, ferramentas e materiais prontos."}
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-primary tracking-tighter pt-1 sm:pt-2">
                      {product.currency === "BRL" 
                        ? product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : `${product.price.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <CardContent className="pt-8 space-y-8">
              {/* Stepper progress indicator */}
              <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    checkoutStep === 1 ? "bg-primary text-white animate-pulse" : "bg-emerald-500/25 text-emerald-600 font-bold"
                  }`}>
                    {checkoutStep === 2 ? "✓" : "1"}
                  </div>
                  <span className={`text-xs font-bold transition-all ${
                    checkoutStep === 1 ? "text-foreground" : "text-muted-foreground"
                  }`}>Identificação</span>
                </div>
                <div className="h-0.5 bg-border flex-1 mx-2" />
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    checkoutStep === 2 ? "bg-primary text-white animate-pulse" : "bg-muted text-muted-foreground"
                  }`}>
                    2
                  </div>
                  <span className={`text-xs font-bold transition-all ${
                    checkoutStep === 2 ? "text-foreground" : "text-muted-foreground"
                  }`}>Pagamento</span>
                </div>
              </div>

              {checkoutStep === 1 ? (
                /* Step 1: Identification */
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
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
                  
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (!form.name.trim() || !form.email.trim() || !form.customer_whatsapp.trim()) {
                        toast.error("Por favor, preencha todos os campos obrigatórios.");
                        return;
                      }
                      if (!form.email.includes("@")) {
                        toast.error("Por favor, insira um e-mail válido.");
                        return;
                      }
                      setCheckoutStep(2);
                    }}
                    className="w-full h-14 bg-primary hover:bg-primary/95 text-white font-black text-base rounded-xl transition-all duration-300 active:scale-[0.98] mt-6 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>AVANÇAR PARA PAGAMENTO</span>
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                /* Step 2: Payment */
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
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
                      {product?.currency === "BRL" ? (
                        <label
                          htmlFor="pix"
                          className={`relative overflow-hidden col-span-2 flex items-center gap-2 rounded-xl p-3 cursor-pointer transition-all bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-white hover:scale-[1.01] shadow-lg ring-2 ring-primary/20 opacity-100`}
                        >
                          <RadioGroupItem value="pix" id="pix" className="w-3 h-3 border-white text-white fill-white" />
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-12 h-8 rounded-lg flex items-center justify-center bg-white p-1.5 shadow-sm border border-slate-100 shrink-0">
                              <img 
                                src="/pix_checkout_logo.png" 
                                alt="Pix" 
                                className="max-w-full max-h-full object-contain block filter contrast-[1.1] brightness-[1.02]" 
                              />
                            </div>
                            <div>
                              <p className="font-bold text-white text-[12px] leading-tight">Pix</p>
                              <p className="text-[9px] text-white/80 leading-none">Pagamento Instantâneo</p>
                            </div>
                          </div>
                        </label>
                      ) : (
                        <>
                          <label
                            htmlFor="mpesa"
                            className={`relative overflow-hidden flex items-center gap-2 rounded-xl p-3 cursor-pointer transition-all bg-gradient-to-br from-[#E51B24] to-[#8A0A12] text-white hover:scale-[1.01] ${
                              form.payment_method === "mpesa"
                                ? "shadow-lg ring-2 ring-primary/20 opacity-100"
                                : "opacity-80 hover:opacity-100"
                            }`}
                          >
                            <RadioGroupItem value="mpesa" id="mpesa" className="w-3 h-3 border-white text-white fill-white" />
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-8 rounded-lg flex items-center justify-center bg-white p-1.5 shadow-sm border border-slate-100 shrink-0">
                                <img 
                                  src="/mpesa_logo.png" 
                                  alt="M-Pesa" 
                                  className="max-w-full max-h-full object-contain block" 
                                />
                              </div>
                              <div>
                                <p className="font-bold text-white text-[12px] leading-tight">M-Pesa</p>
                                <p className="text-[9px] text-white/80 leading-none">Vodacom</p>
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
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-8 rounded-lg flex items-center justify-center bg-white p-1.5 shadow-sm border border-slate-100 shrink-0">
                                <img 
                                  src="/emola_logo.png" 
                                  alt="E-Mola" 
                                  className="max-w-full max-h-full object-contain block" 
                                />
                              </div>
                              <div>
                                <p className="font-bold text-white text-[12px] leading-tight">E-Mola</p>
                                <p className="text-[9px] text-white/80 leading-none">Movitel</p>
                              </div>
                            </div>
                          </label>
                        </>
                      )}
                    </RadioGroup>

                    <div className="mt-6 space-y-4">
                      {product?.currency === "BRL" ? (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground flex items-center justify-between uppercase tracking-wider font-bold">
                            <span className="flex items-center gap-1 font-bold text-foreground">CPF do Comprador *</span>
                            <span className="text-[10px] text-primary font-bold">Cadastro de Pessoas Físicas</span>
                          </Label>
                          <Input
                            type="text"
                            placeholder="Ex: 000.000.000-00"
                            value={form.cpf}
                            onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                            required
                            className="h-14 bg-background/50 border-border rounded-xl text-xl font-black text-center"
                          />
                          <p className="text-[10px] text-muted-foreground italic text-center">
                            Necessário para emissão e confirmação do Pix no Banco Central.
                          </p>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <Button 
                      className={`w-full h-16 text-white font-black text-xl rounded-xl transition-all duration-500 hover:scale-[1.01] active:scale-[0.98] group relative overflow-hidden shadow-2xl ${
                        form.payment_method === 'pix'
                          ? 'bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] hover:shadow-[#3b82f6]/40'
                          : form.payment_method === 'mpesa' 
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
                          <span>FINALIZAR PEDIDO</span>
                          <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setCheckoutStep(1)}
                      className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mx-auto block mt-2"
                    >
                      ← Voltar para Dados Pessoais
                    </button>

                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest opacity-60">
                        <ShieldCheck className="w-3 h-3" /> Pague com segurança via EnsinaPay
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
            {form.payment_method === 'pix' ? (
              <CardContent className="p-8 text-center space-y-6">
                <div className="flex justify-center mb-2">
                  <div className="bg-white p-2 rounded-xl border border-slate-100 w-24 h-12 flex items-center justify-center shadow-sm">
                    <img src="/pix_checkout_logo.png" alt="Pix" className="max-w-full max-h-full object-contain" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black italic uppercase tracking-tight text-foreground">
                    Pagamento via Pix
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Escaneie o QR Code abaixo ou copie o código Pix Copia e Cola para pagar.
                  </p>
                </div>

                {pixQrCode && (
                  <div className="mx-auto w-48 h-48 bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg border border-border">
                    <img src={`data:image/png;base64,${pixQrCode}`} alt="Pix QR Code" className="w-full h-full object-contain" />
                  </div>
                )}

                {pixCopiaCola && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(pixCopiaCola);
                        toast.success("Código Pix copiado!");
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/95 transition-colors shadow-md active:scale-95"
                    >
                      <Copy className="w-4 h-4" /> Copiar Código Pix
                    </button>
                    <p className="text-[10px] text-muted-foreground/80 leading-normal max-w-xs mx-auto truncate">
                      {pixCopiaCola}
                    </p>
                  </div>
                )}

                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                    Aguardando confirmação do pagamento...
                  </div>
                </div>

                <div className="text-center">
                  <button 
                    onClick={() => window.open('https://wa.me/5547999530835?text=Olá, preciso de ajuda com o meu pagamento Pix no EnsinaPay.', '_blank')}
                    className="flex items-center gap-2 mx-auto text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" /> Suporte via WhatsApp
                  </button>
                </div>
              </CardContent>
            ) : (
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
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default Checkout;

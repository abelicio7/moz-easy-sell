import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Smartphone, ShoppingBag, User, Mail, Phone, MessageCircle } from "lucide-react";
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
      const affCode = params.get("aff");

      if (emailParam || nameParam) {
        setForm(prev => ({
          ...prev,
          email: emailParam || prev.email,
          name: nameParam || prev.name
        }));
      }

      let currentAffId = localStorage.getItem("ensina_aff_id");
      const affExpiry = localStorage.getItem("ensina_aff_expiry");
      
      if (!affExpiry || parseInt(affExpiry) < Date.now()) {
        currentAffId = null;
        localStorage.removeItem("ensina_aff_id");
        localStorage.removeItem("ensina_aff_expiry");
      }

      if (affCode) {
        try {
          const { data } = await supabase
            .from("affiliate_links")
            .select("user_id")
            .eq("code", affCode)
            .maybeSingle();
          
          if (data) {
            currentAffId = data.user_id;
            localStorage.setItem("ensina_aff_id", data.user_id);
            localStorage.setItem("ensina_aff_expiry", (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
            await supabase.rpc('increment_affiliate_clicks', { aff_code: affCode });
          }
        } catch (e) {
          console.error("Affiliate tracking error:", e);
        }
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

        // Affiliate Pixel
        if (currentAffId) {
          const { data: affPixel } = await supabase
            .from("seller_integrations")
            .select("config")
            .eq("user_id", currentAffId)
            .eq("integration_type", "facebook_pixel")
            .eq("is_active", true)
            .maybeSingle();
          
          if (affPixel?.config?.pixelId) pixelsToFire.push(affPixel.config.pixelId);
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
      const orderId = crypto.randomUUID();
      
      // Get affiliate from storage
      const affId = localStorage.getItem("ensina_aff_id");
      const affExpiry = localStorage.getItem("ensina_aff_expiry");
      const isAffValid = affId && affExpiry && parseInt(affExpiry) > Date.now();

      const { error } = await supabase.from("orders").insert({
        id: orderId,
        product_id: product.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_whatsapp: form.customer_whatsapp,
        payment_method: form.payment_method,
        price: product.price,
        status: "pending",
        affiliate_id: isAffValid ? affId : null
      });

      if (error) {
        toast.error(error.message || "Erro ao criar pedido");
        setSubmitting(false);
        return;
      }
      
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

      // Salvar a referência da Débito Pay na encomenda para que o sistema a consiga confirmar depois
      if (paymentData.debito_reference) {
        await supabase.from("orders")
          .update({ debito_reference: paymentData.debito_reference })
          .eq("id", orderId);
      }

      navigate(
        `/checkout/${productId}/payment?order_id=${orderId}&debito_reference=${paymentData.debito_reference}&method=${form.payment_method}&amount=${product.price}`
      );
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="lg:hidden">
              <ProductCard product={product} />
            </div>

            <Card className="border-border/50 bg-card">
              <CardContent className="pt-6 space-y-8">
                {/* Secção 1: Dados Pessoais */}
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-primary" />
                    Seus dados
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nome completo *</Label>
                      <Input
                        placeholder="Digite seu nome completo"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        onBlur={handleCaptureCart}
                        required
                        className="bg-background/50 border-border"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Email *
                        </Label>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          onBlur={handleCaptureCart}
                          required
                          className="bg-background/50 border-border"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-emerald-500" /> WhatsApp *
                        </Label>
                        <Input
                          placeholder="Ex: 840000000"
                          value={form.customer_whatsapp}
                          onChange={(e) => setForm({ ...form, customer_whatsapp: e.target.value })}
                          required
                          className="bg-background/50 border-border"
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
                      className={`relative overflow-hidden flex items-center gap-2 rounded-lg p-2 cursor-pointer transition-all bg-gradient-to-br from-[#E51B24] to-[#8A0A12] text-white hover:scale-[1.01] ${
                        form.payment_method === "mpesa"
                          ? "shadow-lg ring-2 ring-primary/20 opacity-100"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      <RadioGroupItem 
                        value="mpesa" 
                        id="mpesa" 
                        className="w-3 h-3 border-white text-white fill-white"
                      />
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
                      className={`relative overflow-hidden flex items-center gap-2 rounded-lg p-2 cursor-pointer transition-all bg-gradient-to-br from-[#F57C00] to-[#b34700] text-white hover:scale-[1.01] ${
                        form.payment_method === "emola"
                          ? "shadow-lg ring-2 ring-primary/20 opacity-100"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      <RadioGroupItem 
                        value="emola" 
                        id="emola" 
                        className="w-3 h-3 border-white text-white fill-white"
                      />
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
                      <Label className="text-xs text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1 font-bold text-foreground"><Smartphone className="w-3.5 h-3.5 text-primary" /> Número de Pagamento *</span>
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
                        className="h-12 bg-background/50 border-border rounded-xl text-lg font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                        Irás receber um pedido de confirmação (PIN) neste número via {form.payment_method === "mpesa" ? "M-Pesa" : "E-Mola"}.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:hidden pt-4">
              <OrderSummary product={product} submitting={submitting} onSubmit={handleSubmit} 
                disabled={submitting || !form.name || !form.email || !form.customer_whatsapp || !form.payment_phone} />
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-20 space-y-4">
              <ProductCard product={product} />
              <OrderSummary product={product} submitting={submitting} onSubmit={handleSubmit} 
                disabled={submitting || !form.name || !form.email || !form.customer_whatsapp || !form.payment_phone} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const OrderSummary = ({ product, submitting, onSubmit, disabled }: { product: Product, submitting: boolean, onSubmit: any, disabled: boolean }) => (
  <Card className="border-border/50 bg-card shadow-lg overflow-hidden rounded-[1.5rem]">
    <CardContent className="pt-8 pb-8 px-6">
      <h3 className="text-base font-bold text-foreground flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4 text-primary" />
        </div>
        Resumo do pedido
      </h3>
      
      <div className="space-y-4 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Produto</span>
          <span className="text-foreground font-bold">{product.price.toFixed(2)} MT</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground font-medium">Taxa de serviço</span>
          <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Grátis</span>
        </div>
        
        <Separator className="bg-border my-6" />
        
        <div className="flex justify-between items-center">
          <span className="text-foreground font-black text-lg">Total</span>
          <span className="text-primary font-black text-2xl tracking-tight">
            {product.price.toFixed(2)} <span className="text-sm font-bold">MT</span>
          </span>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 w-fit mx-auto lg:mx-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Envio automático após o pagamento</span>
        </div>

        <Button
          onClick={onSubmit}
          className="w-full h-16 text-lg font-black bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 rounded-2xl shadow-xl shadow-primary/10 active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
          disabled={disabled}
        >
          {submitting ? "Processando..." : `Finalizar Pagamento`}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground font-medium text-center mt-6 uppercase tracking-wider flex items-center justify-center gap-2">
        Pague com segurança via EnsinaPay
      </p>
    </CardContent>
  </Card>
);

const ProductCard = ({ product }: { product: Product }) => (
  <Card className="border-border/50 overflow-hidden bg-card">
    {product.image_url && (
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
    )}
    <CardContent className={product.image_url ? "pt-4" : "pt-6"}>
      <h2 className="text-lg font-bold text-foreground">{product.name}</h2>
      {product.description && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
      )}
      <p className="text-2xl font-bold text-primary mt-3">{product.price.toFixed(2)} MT</p>
    </CardContent>
  </Card>
);

export default Checkout;

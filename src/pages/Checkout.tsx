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
import { Shield, Smartphone, ShoppingBag, User, Mail, Phone } from "lucide-react";
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
    whatsapp: "",
    payment_method: "mpesa",
  });

  useEffect(() => {
    const fetchProductAndPixel = async () => {
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
      
      if (productError) {
        console.error("Product error:", productError);
        setDebugError(`Erro BD: ${productError.message}`);
        setProduct(null);
        setLoading(false);
        return;
      }
      if (!productData) {
        setDebugError(`Produto com ID ${productId} não existe no BD.`);
        setProduct(null);
        setLoading(false);
        return;
      }
      if (productData.status !== "approved") {
        setDebugError(`Produto não está aprovado (Status: ${productData.status}).`);
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct(productData as any);

      if (productData?.user_id) {
        try {
          const { data: pixelData } = await supabase
            .from("seller_integrations")
            .select("config")
            .eq("user_id", productData.user_id)
            .eq("integration_type", "facebook_pixel")
            .eq("is_active", true)
            .maybeSingle();

          if (pixelData?.config?.pixelId) {
            const pixelId = pixelData.config.pixelId;
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
            win.fbq('init', pixelId);
            win.fbq('track', 'PageView');
            win.fbq('track', 'InitiateCheckout', {
              content_name: productData.name,
              value: productData.price,
              currency: 'MZN'
            });
          }
        } catch (e) {
          console.error("Erro ao carregar pixel:", e);
        }
      }
      setLoading(false);
    };
    fetchProductAndPixel();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!form.name || !form.email || !form.whatsapp) {
      toast.error("Preencha todos os campos obrigatórios, incluindo o número de telefone");
      return;
    }
    
    // Validate phone prefix based on operator to prevent API errors
    const cleanPhone = form.whatsapp.replace(/\D/g, "").replace(/^258/, "").replace(/^\+258/, "");
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
      // 1. Create order ID locally to bypass RLS SELECT restriction for anonymous buyers
      const orderId = crypto.randomUUID();

      const { error } = await supabase.from("orders").insert({
        id: orderId,
        product_id: product.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_whatsapp: form.whatsapp || null,
        payment_method: form.payment_method,
        price: product.price,
        status: "pending",
      }); // Do not use .select() here, as anonymous users only have INSERT permission, not SELECT.

      if (error) {
        toast.error(error.message || "Erro ao criar pedido");
        setSubmitting(false);
        return;
      }
      
      const order = { id: orderId };

      // 2. Call payment edge function via direct fetch to reveal true operator error codes
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          order_id: order.id,
          payment_method: form.payment_method,
          amount: product.price,
          phone: form.whatsapp,
          product_name: product.name,
        })
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok || paymentData.error) {
        console.error("Payment failed:", paymentData);
        const detailedError = paymentData.details ? JSON.stringify(paymentData.details) : "";
        throw new Error(paymentData.error || paymentData.message || `Erro da operadora: ${detailedError}`);
      }

      if (paymentData.error) {
         toast.error(`${paymentData.error} ${paymentData.details ? JSON.stringify(paymentData.details) : ""}`);
         setSubmitting(false);
         return;
      }

      // 3. Navigate to payment status page
      navigate(
        `/checkout/${productId}/payment?order_id=${order.id}&debito_reference=${paymentData.debito_reference}&method=${form.payment_method}&amount=${product.price}`
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro de conexão com o servidor de pagamento. Tente novamente.");
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
        <p className="text-muted-foreground text-3xl font-black text-red-600 mb-2">PRODUTO NÃO ENCONTRADO - CÓDIGO NOVO</p>
        {debugError ? (
          <p className="text-xs text-red-500 bg-red-50 p-2 rounded-md border border-red-100 max-w-md break-all">
            Debug Info: {debugError}
          </p>
        ) : (
          <p className="text-xs text-orange-500">Nenhum erro de debug capturado.</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

            <Card className="border-border/50">
              <CardContent className="pt-6">
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
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email *
                    </Label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Número pagante *</span>
                      <span className="text-[10px] text-primary">
                        {form.payment_method === 'mpesa' ? 'Deve ser 84/85' : 'Deve ser 86/87'}
                      </span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder={form.payment_method === 'mpesa' ? "Ex: 840000000" : "Ex: 860000000"}
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      required
                      className="bg-background/50"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      O pagamento será enviado para este número via {form.payment_method === "mpesa" ? "M-Pesa" : "E-Mola"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Smartphone className="w-4 h-4 text-primary" />
                  Método de pagamento
                </h2>
                <RadioGroup
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v })}
                  className="space-y-3"
                >
                  <label
                    htmlFor="mpesa"
                    className={`relative overflow-hidden flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all bg-gradient-to-br from-[#E51B24] to-[#8A0A12] text-white hover:scale-[1.02] ${
                      form.payment_method === "mpesa"
                        ? "border-0 shadow-2xl ring-4 ring-white/30 opacity-100"
                        : "border-0 shadow-md opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full border border-white/20 opacity-50"></div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/10 opacity-50"></div>
                    <div className="relative z-10 flex items-center gap-4 w-full">
                      <RadioGroupItem 
                        value="mpesa" 
                        id="mpesa" 
                        className={form.payment_method === "mpesa" ? "border-white text-[#DD0512] bg-white fill-[#DD0512]" : "border-white/50 text-white fill-white"}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-sm bg-white text-[#DD0512]">
                          <span className="font-black text-sm uppercase">M</span>
                        </div>
                        <div>
                          <p className="font-bold text-white">M-Pesa</p>
                          <p className="text-xs text-white/80">Vodacom Moçambique</p>
                        </div>
                      </div>
                    </div>
                  </label>
                  <label
                    htmlFor="emola"
                    className={`relative overflow-hidden flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-all bg-gradient-to-br from-[#F57C00] to-[#b34700] text-white hover:scale-[1.02] ${
                      form.payment_method === "emola"
                        ? "border-0 shadow-2xl ring-4 ring-white/30 opacity-100"
                        : "border-0 shadow-md opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full border border-white/20 opacity-50"></div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/10 opacity-50"></div>
                    <div className="relative z-10 flex items-center gap-4 w-full">
                      <RadioGroupItem 
                        value="emola" 
                        id="emola" 
                        className={form.payment_method === "emola" ? "border-white text-[#EC7028] bg-white fill-[#EC7028]" : "border-white/50 text-white fill-white"}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-sm bg-white text-[#EC7028]">
                          <span className="font-black text-sm uppercase">E</span>
                        </div>
                        <div>
                          <p className="font-bold text-white">E-Mola</p>
                          <p className="text-xs text-white/80">Movitel Moçambique</p>
                        </div>
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="lg:hidden">
              <Button
                onClick={handleSubmit}
                className="w-full h-12 text-base font-semibold"
                disabled={submitting || !form.name || !form.email || !form.whatsapp}
              >
                {submitting ? "Processando pagamento..." : `Pagar ${product.price.toFixed(2)} MT`}
              </Button>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-2">
            <div className="sticky top-20 space-y-4">
              <ProductCard product={product} />
              <Card className="border-border/50">
                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    Resumo do pedido
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Produto</span>
                      <span>{product.price.toFixed(2)} MT</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxa de serviço</span>
                      <span className="text-primary">Grátis</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-foreground text-base">
                      <span>Total</span>
                      <span className="text-primary">{product.price.toFixed(2)} MT</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className="w-full h-12 text-base font-semibold mt-6"
                    disabled={submitting || !form.name || !form.email || !form.whatsapp}
                  >
                    {submitting ? "Processando pagamento..." : `Pagar ${product.price.toFixed(2)} MT`}
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center mt-3">
                    Ao clicar em Pagar, você concorda com os nossos Termos de Uso
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => (
  <Card className="border-border/50 overflow-hidden">
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
        <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{product.description}</p>
      )}
      <p className="text-2xl font-bold text-primary mt-3">{product.price.toFixed(2)} MT</p>
    </CardContent>
  </Card>
);

export default Checkout;

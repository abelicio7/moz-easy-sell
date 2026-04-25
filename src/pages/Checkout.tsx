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
import { motion, AnimatePresence } from "framer-motion";

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
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    payment_phone: "", // Dedicated field for M-Pesa/E-Mola
    payment_method: "mpesa",
  });

  useEffect(() => {
    const fetchProductAndPixel = async () => {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`id, name, description, price, image_url, user_id, status`)
        .eq("id", productId)
        .maybeSingle();
      
      if (productError || !productData) {
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
    if (!form.name || !form.email || !form.whatsapp || !form.payment_phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    // Validate phone prefix
    const cleanPhone = form.payment_phone.replace(/\D/g, "").replace(/^258/, "");
    const prefix = cleanPhone.substring(0, 2);
    
    if (form.payment_method === "mpesa" && !["84", "85"].includes(prefix)) {
      toast.error("Número M-Pesa inválido. Deve começar com 84 ou 85.");
      return;
    }
    
    if (form.payment_method === "emola" && !["86", "87"].includes(prefix)) {
      toast.error("Número E-Mola inválido. Deve começar com 86 ou 87.");
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
        customer_whatsapp: form.whatsapp,
        payment_method: form.payment_method,
        price: product.price,
        status: "pending",
      });

      if (error) throw error;
      
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
        throw new Error(paymentData.error || "Falha no processamento do pagamento.");
      }

      navigate(
        `/checkout/${productId}/payment?order_id=${orderId}&debito_reference=${paymentData.debito_reference}&method=${form.payment_method}&amount=${product.price}`
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar checkout.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-background"><p>Produto não encontrado</p></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="border-b border-border bg-white dark:bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-slate-100 dark:bg-muted px-3 py-1.5 rounded-full">
            <Shield className="w-3 h-3 text-emerald-500" />
            Checkout 100% Seguro
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Form Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="lg:hidden mb-6">
              <ProductSummaryCard product={product} />
            </div>

            {/* STEP 1: CONTACT DATA */}
            <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="pt-8 pb-8 px-6 md:px-8">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                     <User className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-lg font-black text-foreground tracking-tight">Os seus dados</h2>
                     <p className="text-xs text-muted-foreground">Onde enviaremos o seu acesso</p>
                   </div>
                </div>

                <div className="space-y-5">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome Completo</Label>
                    <Input
                      placeholder="Ex: João Manuel"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 dark:bg-background border-slate-200 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-mail Principal</Label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 dark:bg-background border-slate-200 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-2">
                       <MessageCircle className="w-3 h-3 text-emerald-500" /> WhatsApp para Suporte
                    </Label>
                    <Input
                      type="tel"
                      placeholder="Ex: 840000000"
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 dark:bg-background border-slate-200 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* STEP 2: PAYMENT METHODS */}
            <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="pt-8 pb-8 px-6 md:px-8">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                     <Smartphone className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-lg font-black text-foreground tracking-tight">Método de pagamento</h2>
                     <p className="text-xs text-muted-foreground">Escolha como deseja pagar</p>
                   </div>
                </div>

                <RadioGroup
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v })}
                  className="space-y-4"
                >
                  {/* MPESA */}
                  <div className="relative">
                    <RadioGroupItem value="mpesa" id="mpesa" className="sr-only" />
                    <Label
                      htmlFor="mpesa"
                      className={`block rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                        form.payment_method === "mpesa"
                          ? "border-red-500 bg-red-50/30 dark:bg-red-500/5 ring-1 ring-red-500"
                          : "border-slate-100 dark:border-muted hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-sm">M</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">M-Pesa</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Vodacom Moçambique</p>
                          </div>
                        </div>
                        {form.payment_method === "mpesa" && (
                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {form.payment_method === "mpesa" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 border-t border-red-100 dark:border-red-500/20 space-y-3">
                               <Label className="text-xs font-bold text-red-600 uppercase">Número M-Pesa (84/85)</Label>
                               <Input 
                                 placeholder="84xxxxxxx"
                                 value={form.payment_phone}
                                 onChange={(e) => setForm({...form, payment_phone: e.target.value})}
                                 className="h-12 rounded-xl bg-white dark:bg-background border-red-200 focus:ring-red-500"
                               />
                               <p className="text-[10px] text-red-500/70 italic">Receberá um pedido de PIN no seu telemóvel.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Label>
                  </div>

                  {/* EMOLA */}
                  <div className="relative">
                    <RadioGroupItem value="emola" id="emola" className="sr-only" />
                    <Label
                      htmlFor="emola"
                      className={`block rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                        form.payment_method === "emola"
                          ? "border-orange-500 bg-orange-50/30 dark:bg-orange-500/5 ring-1 ring-orange-500"
                          : "border-slate-100 dark:border-muted hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-sm">E</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">E-Mola</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Movitel Moçambique</p>
                          </div>
                        </div>
                        {form.payment_method === "emola" && (
                          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>

                      <AnimatePresence>
                        {form.payment_method === "emola" && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 border-t border-orange-100 dark:border-orange-500/20 space-y-3">
                               <Label className="text-xs font-bold text-orange-600 uppercase">Número E-Mola (86/87)</Label>
                               <Input 
                                 placeholder="86xxxxxxx"
                                 value={form.payment_phone}
                                 onChange={(e) => setForm({...form, payment_phone: e.target.value})}
                                 className="h-12 rounded-xl bg-white dark:bg-background border-orange-200 focus:ring-orange-500"
                               />
                               <p className="text-[10px] text-orange-500/70 italic">Receberá um pedido de PIN no seu telemóvel.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* ORDER SUMMARY (Desktop) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-6">
              <div className="hidden lg:block">
                 <ProductSummaryCard product={product} />
              </div>

              <Card className="border-border/50 shadow-xl rounded-3xl bg-slate-900 text-white overflow-hidden">
                <CardContent className="pt-8 pb-8 px-8">
                  <h3 className="text-xs font-black uppercase tracking-[2px] text-slate-400 mb-6 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-blue-400" /> Resumo do pedido
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="font-bold">{product.price.toFixed(2)} MT</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Taxas e Entrega</span>
                      <span className="text-emerald-400 font-bold tracking-widest uppercase text-[10px]">Grátis</span>
                    </div>
                    
                    <Separator className="bg-slate-800" />
                    
                    <div className="flex justify-between items-center py-2">
                      <span className="text-lg font-black tracking-tight">Total</span>
                      <span className="text-3xl font-black text-blue-400 tracking-tighter">
                        {product.price.toFixed(2)} <span className="text-sm">MT</span>
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !form.name || !form.email || !form.whatsapp || !form.payment_phone}
                    className="w-full h-16 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 mt-8 transition-all active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Processando...
                      </>
                    ) : (
                      `Pagar Agora`
                    )}
                  </Button>

                  <div className="mt-6 flex items-center justify-center gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/ba/M-Pesa_logo.png" className="h-4 object-contain" alt="M-Pesa" />
                    <div className="h-4 w-[1px] bg-slate-700" />
                    <span className="text-[10px] font-black tracking-widest">E-MOLA</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground opacity-60">
                 <Shield className="w-3 h-3" />
                 Sua transação está protegida por encriptação 256-bit
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductSummaryCard = ({ product }: { product: Product }) => (
  <Card className="border-border/50 overflow-hidden rounded-3xl bg-white dark:bg-card shadow-sm">
    <div className="flex items-center gap-4 p-4">
      {product.image_url ? (
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
          <ShoppingBag className="w-8 h-8" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-bold text-foreground truncate">{product.name}</h2>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.description || 'Produto Digital'}</p>
        <div className="mt-1 flex items-center gap-2">
           <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-blue-100 text-blue-600 bg-blue-50/30">Entrega Instantânea</Badge>
        </div>
      </div>
    </div>
  </Card>
);

export default Checkout;

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
import { Shield, Smartphone, ShoppingBag, User, Mail, MessageCircle, Loader2, ArrowRight } from "lucide-react";
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
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    payment_phone: "",
    payment_method: "mpesa",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle();
        
        if (error || !data) {
          toast.error("Produto não encontrado.");
          setLoading(false);
          return;
        }
        setProduct(data as any);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (productId) fetchProduct();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    if (!form.name || !form.email || !form.whatsapp || !form.payment_phone) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }
    
    // Simple validation
    const cleanPhone = form.payment_phone.replace(/\D/g, "").replace(/^258/, "");
    const prefix = cleanPhone.substring(0, 2);
    
    if (form.payment_method === "mpesa" && !["84", "85"].includes(prefix)) {
      toast.error("M-Pesa: Número deve começar com 84 ou 85.");
      return;
    }
    if (form.payment_method === "emola" && !["86", "87"].includes(prefix)) {
      toast.error("E-Mola: Número deve começar com 86 ou 87.");
      return;
    }

    setSubmitting(true);

    try {
      const orderId = crypto.randomUUID();
      const { error: orderError } = await supabase.from("orders").insert({
        id: orderId,
        product_id: product.id,
        customer_name: form.name,
        customer_email: form.email,
        customer_whatsapp: form.whatsapp,
        payment_method: form.payment_method,
        price: product.price,
        status: "pending",
      });

      if (orderError) throw orderError;
      
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
        throw new Error(paymentData.error || "Erro no pagamento.");
      }

      navigate(`/checkout/${productId}/payment?order_id=${orderId}&debito_reference=${paymentData.debito_reference}&method=${form.payment_method}&amount=${product.price}`);
    } catch (err: any) {
      toast.error(err?.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center bg-background"><p>Produto não disponível.</p></div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="bg-white dark:bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
            <Shield className="w-3 h-3" /> Checkout Seguro
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-3xl border-slate-200 dark:border-muted shadow-sm overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                     <User className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Dados de contacto</h2>
                     <p className="text-xs text-slate-500">Onde receberá o seu produto</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome Completo</Label>
                    <Input
                      placeholder="Como se chama?"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 dark:bg-muted/30 border-slate-200 dark:border-muted"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-mail para entrega</Label>
                    <Input
                      type="email"
                      placeholder="exemplo@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 dark:bg-muted/30 border-slate-200 dark:border-muted"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">WhatsApp de Suporte</Label>
                    <Input
                      type="tel"
                      placeholder="Ex: 840000000"
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      className="h-12 rounded-xl bg-slate-50 dark:bg-muted/30 border-slate-200 dark:border-muted"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200 dark:border-muted shadow-sm overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600">
                     <Smartphone className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Pagamento</h2>
                     <p className="text-xs text-slate-500">Selecione o seu método favorito</p>
                   </div>
                </div>

                <RadioGroup
                  value={form.payment_method}
                  onValueChange={(v) => setForm({ ...form, payment_method: v })}
                  className="space-y-4"
                >
                  {/* MPESA */}
                  <div 
                    className={`rounded-2xl border-2 p-5 transition-all cursor-pointer ${
                      form.payment_method === "mpesa" 
                        ? "border-red-500 bg-red-50/20 dark:bg-red-500/5 ring-1 ring-red-500" 
                        : "border-slate-100 dark:border-muted hover:border-slate-200"
                    }`}
                    onClick={() => setForm({...form, payment_method: 'mpesa'})}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                          <span className="text-white font-black text-xs uppercase">M</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">M-Pesa</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vodacom Moçambique</p>
                        </div>
                      </div>
                      <RadioGroupItem value="mpesa" id="mpesa" className={form.payment_method === 'mpesa' ? 'border-red-500 text-red-500' : ''} />
                    </div>

                    {form.payment_method === "mpesa" && (
                      <div className="pt-4 border-t border-red-100 dark:border-red-500/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                         <Label className="text-xs font-bold text-red-600 uppercase tracking-wider">Número M-Pesa (84/85)</Label>
                         <Input 
                           placeholder="840000000"
                           value={form.payment_phone}
                           onChange={(e) => setForm({...form, payment_phone: e.target.value})}
                           className="h-12 rounded-xl bg-white dark:bg-background border-red-200"
                         />
                         <p className="text-[10px] text-red-400 italic">Confirme o pagamento no seu telemóvel.</p>
                      </div>
                    )}
                  </div>

                  {/* EMOLA */}
                  <div 
                    className={`rounded-2xl border-2 p-5 transition-all cursor-pointer ${
                      form.payment_method === "emola" 
                        ? "border-orange-500 bg-orange-50/20 dark:bg-orange-500/5 ring-1 ring-orange-500" 
                        : "border-slate-100 dark:border-muted hover:border-slate-200"
                    }`}
                    onClick={() => setForm({...form, payment_method: 'emola'})}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                          <span className="text-white font-black text-xs uppercase">E</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">E-Mola</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Movitel Moçambique</p>
                        </div>
                      </div>
                      <RadioGroupItem value="emola" id="emola" className={form.payment_method === 'emola' ? 'border-orange-500 text-orange-500' : ''} />
                    </div>

                    {form.payment_method === "emola" && (
                      <div className="pt-4 border-t border-orange-100 dark:border-orange-500/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                         <Label className="text-xs font-bold text-orange-600 uppercase tracking-wider">Número E-Mola (86/87)</Label>
                         <Input 
                           placeholder="860000000"
                           value={form.payment_phone}
                           onChange={(e) => setForm({...form, payment_phone: e.target.value})}
                           className="h-12 rounded-xl bg-white dark:bg-background border-orange-200"
                         />
                         <p className="text-[10px] text-orange-400 italic">Confirme o pagamento no seu telemóvel.</p>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-3xl border-slate-200 dark:border-muted overflow-hidden shadow-sm bg-white dark:bg-card">
              <div className="p-6 flex items-center gap-4">
                {product.image_url ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-muted flex items-center justify-center text-slate-400 shrink-0">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-white truncate">{product.name}</h3>
                  <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mt-1">Acesso Imediato</p>
                </div>
              </div>
              <div className="px-6 pb-6 space-y-3">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Valor do Produto</span>
                    <span className="font-bold text-slate-800 dark:text-white">{product.price.toFixed(2)} MT</span>
                 </div>
                 <Separator className="dark:bg-muted" />
                 <div className="flex justify-between items-center">
                    <span className="text-base font-black text-slate-800 dark:text-white">Total a pagar</span>
                    <span className="text-2xl font-black text-blue-600 tracking-tighter">{product.price.toFixed(2)} MT</span>
                 </div>
                 <Button 
                   onClick={handleSubmit} 
                   disabled={submitting || !form.name || !form.email || !form.whatsapp || !form.payment_phone}
                   className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-lg font-black mt-4 shadow-xl shadow-blue-500/20"
                 >
                   {submitting ? <Loader2 className="animate-spin mr-2" /> : 'Finalizar Pagamento'}
                   {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
                 </Button>
              </div>
            </Card>

            <div className="text-center space-y-4 px-6">
               <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-widest font-bold">
                 Ambiente seguro e encriptado<br/>EnsinaPay &copy; 2026
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, Shield, Smartphone } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
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
    payment_method: "mpesa",
  });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("products").select("id, name, description, price").eq("id", productId).single();
      setProduct(data);
      setLoading(false);
    };
    fetch();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      product_id: product.id,
      customer_name: form.name,
      customer_email: form.email,
      customer_whatsapp: form.whatsapp || null,
      payment_method: form.payment_method,
      price: product.price,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao processar pedido");
    } else {
      navigate(`/checkout/${productId}/payment?method=${form.payment_method}&amount=${product.price}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Produto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">EnsinaPay</span>
        </div>

        {/* Product info */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-foreground">{product.name}</h2>
            {product.description && <p className="text-sm text-muted-foreground mt-1">{product.description}</p>}
            <p className="text-2xl font-bold text-primary mt-3">{product.price.toFixed(2)} MT</p>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do comprador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <Input placeholder="Seu nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="seu@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp (opcional)</Label>
                <Input placeholder="+258 84 xxx xxxx" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>

              <div className="space-y-3">
                <Label>Método de pagamento *</Label>
                <RadioGroup value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <div className="flex items-center space-x-3 border border-border rounded-lg p-3 cursor-pointer hover:bg-accent/50">
                    <RadioGroupItem value="mpesa" id="mpesa" />
                    <Label htmlFor="mpesa" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Smartphone className="w-4 h-4 text-primary" />
                      M-Pesa
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 border border-border rounded-lg p-3 cursor-pointer hover:bg-accent/50">
                    <RadioGroupItem value="emola" id="emola" />
                    <Label htmlFor="emola" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Smartphone className="w-4 h-4 text-primary" />
                      E-Mola
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Processando..." : `Pagar ${product.price.toFixed(2)} MT`}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          Pagamento seguro via EnsinaPay
        </div>
      </div>
    </div>
  );
};

export default Checkout;

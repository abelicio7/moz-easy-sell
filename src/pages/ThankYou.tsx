import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, Download, ExternalLink, Loader2, Package } from "lucide-react";

interface DeliveryData {
  order_id: string;
  customer_name: string;
  product_name: string;
  product_description: string | null;
  product_image: string | null;
  delivery_type: string;
  delivery_content: string;
}

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchDelivery = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/deliver-product?order_id=${orderId}`,
          {
            headers: {
              "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setDelivery(data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full space-y-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">EnsinaPay</span>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Obrigado pela compra{delivery?.customer_name ? `, ${delivery.customer_name.split(" ")[0]}` : ""}!
            </h2>
            <p className="text-muted-foreground text-sm">
              Seu pagamento foi confirmado com sucesso.
            </p>
          </CardContent>
        </Card>

        {delivery && (
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Seu produto</h3>
              </div>

              {delivery.product_image && (
                <div className="rounded-lg overflow-hidden mb-4 bg-muted">
                  <img
                    src={delivery.product_image}
                    alt={delivery.product_name}
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}

              <h4 className="font-bold text-foreground mb-1">{delivery.product_name}</h4>
              {delivery.product_description && (
                <p className="text-sm text-muted-foreground mb-4">{delivery.product_description}</p>
              )}

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
                  {delivery.delivery_type === "link" ? "Link de acesso" : "Conteúdo do produto"}
                </p>

                {delivery.delivery_type === "link" ? (
                  <Button asChild className="w-full" size="lg">
                    <a href={delivery.delivery_content} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar produto
                    </a>
                  </Button>
                ) : (
                  <div className="bg-background rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap break-words">
                    {delivery.delivery_content}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {error && !delivery && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Verifique seu email para acessar o produto.
              </p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Uma cópia também será enviada para o seu email.
        </p>
      </div>
    </div>
  );
};

export default ThankYou;

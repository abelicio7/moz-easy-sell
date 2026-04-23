import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Loader2, Package, MessageCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

interface DeliveryData {
  order_id: string;
  customer_name: string;
  product_name: string;
  product_description: string | null;
  product_image: string | null;
  delivery_type: string;
  delivery_content: string;
  support_whatsapp: string | null;
}

const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const amount = searchParams.get("amount");
  const productId = searchParams.get("product_id");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (productId && amount) {
      const trackPurchase = async () => {
        try {
          const { data: productData } = await supabase
            .from("products")
            .select("user_id, name")
            .eq("id", productId)
            .single();
            
          if (productData?.user_id) {
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
              win.fbq('track', 'Purchase', {
                content_name: productData.name,
                value: Number(amount),
                currency: 'MZN'
              });
            }
          }
        } catch (e) {
          console.error("Erro ao rastrear Purchase:", e);
        }
      };
      trackPurchase();
    }
  }, [productId, amount]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchDelivery = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          `deliver-product?order_id=${orderId}`,
          { method: 'GET' }
        );

        if (error || !data) {
          setError(true);
        } else {
          setDelivery(data);
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
          <Logo size="sm" />
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

              {delivery.support_whatsapp && (
                <div className="mt-6 border-t border-border pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3">
                    Problemas com a sua compra?
                  </h4>
                  <Button variant="outline" className="w-full text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10 border-[#25D366]/50 bg-[#25D366]/5" asChild>
                    <a 
                      href={`https://wa.me/${delivery.support_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Gostaria de falar sobre a minha compra do produto "${delivery.product_name}" (ID do Pedido: ${delivery.order_id}).`)}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Falar com Vendedor no WhatsApp
                    </a>
                  </Button>
                </div>
              )}
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

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

const PaymentInstructions = () => {
  const [searchParams] = useSearchParams();
  const { productId } = useParams();
  const navigate = useNavigate();
  const method = searchParams.get("method") || "mpesa";
  const amount = searchParams.get("amount") || "0";
  const orderId = searchParams.get("order_id");
  const debitoReference = searchParams.get("debito_reference");
  const [status, setStatus] = useState<string>("PENDING");
  const [checking, setChecking] = useState(false);


  const isMpesa = method === "mpesa";

  const checkStatus = useCallback(async () => {
    if (!debitoReference || !orderId) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `check-payment-status?debito_reference=${debitoReference}&order_id=${orderId}`,
        { method: 'GET' }
      );

      if (error) {
         console.error("ERRO SUPABASE:", error);
         console.error("Conteudo do ERRO:", await error.context?.json?.().catch(() => null));
         // Don't throw just yet, let it retry, but alert the system
      }
      
      if (!data) return;
      
      console.log("PAYMENT DATA CATCHED:", data);


      setStatus(data.status || "PENDING");
      if (data.order_status === "paid") {
        navigate(`/thank-you?order_id=${orderId}&amount=${amount}&product_id=${productId}`);
      }
    } catch (e) {
      console.error("CRITICAL POLLING ERROR:", e);
    } finally {
      setChecking(false);
    }
  }, [debitoReference, orderId, navigate]);

  useEffect(() => {
    if (!debitoReference) return;
    const interval = setInterval(checkStatus, 5000);
    checkStatus();
    return () => clearInterval(interval);
  }, [checkStatus, debitoReference]);

  const isPending = status === "PENDING" || status === "PROCESSING";
  const isFailed = status === "FAILED" || status === "CANCELLED";
  const isCompleted = status === "COMPLETED" || status === "SUCCESS";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Logo size="sm" />
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              {isPending && <Loader2 className="w-7 h-7 text-primary animate-spin" />}
              {isCompleted && <CheckCircle className="w-7 h-7 text-green-500" />}
              {isFailed && <XCircle className="w-7 h-7 text-destructive" />}
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              {isPending && "Aguardando Pagamento"}
              {isCompleted && "Pagamento Confirmado!"}
              {isFailed && "Pagamento Falhou"}
            </h2>

            {isPending && (
              <>
                <p className="text-muted-foreground text-sm mb-4">
                  Você receberá uma notificação no seu celular via <strong>{isMpesa ? "M-Pesa" : "E-Mola"}</strong> para confirmar o pagamento de <strong>{parseFloat(amount).toFixed(2)} MT</strong>.
                </p>

                <div className="bg-muted rounded-lg p-4 text-left space-y-3 mb-6">
                  <p className="text-sm font-semibold text-foreground">Como confirmar:</p>
                  <p className="text-sm text-foreground"><strong>1.</strong> Verifique a notificação no seu celular</p>
                  <p className="text-sm text-foreground"><strong>2.</strong> Confirme o pagamento com seu PIN {isMpesa ? "M-Pesa" : "E-Mola"}</p>
                  <p className="text-sm text-foreground"><strong>3.</strong> O sistema confirmará automaticamente</p>
                </div>

                <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3 mb-4">
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  <p className="text-xs text-muted-foreground text-left">
                    Verificando pagamento automaticamente...
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={checkStatus}
                  disabled={checking}
                  className="w-full"
                >
                  {checking ? "Verificando..." : "Verificar pagamento agora"}
                </Button>


              </>
            )}

            {isCompleted && (
              <p className="text-muted-foreground text-sm mb-4">
                Seu pagamento foi confirmado com sucesso! Redirecionando...
              </p>
            )}

            {isFailed && (
              <>
                <p className="text-muted-foreground text-sm mb-4">
                  O pagamento não foi completado. Por favor, tente novamente.
                </p>
                <Button onClick={() => navigate(-1)} className="w-full">
                  Tentar novamente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentInstructions;

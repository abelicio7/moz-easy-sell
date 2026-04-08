import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Smartphone, Clock } from "lucide-react";

const PaymentInstructions = () => {
  const [searchParams] = useSearchParams();
  const method = searchParams.get("method") || "mpesa";
  const amount = searchParams.get("amount") || "0";

  const isMpesa = method === "mpesa";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">EnsinaPay</span>
        </div>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Instruções de Pagamento</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Siga os passos abaixo para completar o pagamento via <strong>{isMpesa ? "M-Pesa" : "E-Mola"}</strong>
            </p>

            <div className="bg-muted rounded-lg p-4 text-left space-y-3 mb-6">
              {isMpesa ? (
                <>
                  <p className="text-sm text-foreground"><strong>1.</strong> Abra o menu M-Pesa no seu celular</p>
                  <p className="text-sm text-foreground"><strong>2.</strong> Selecione "Transferir Dinheiro"</p>
                  <p className="text-sm text-foreground"><strong>3.</strong> Digite o número: <strong className="text-primary">84 XXX XXXX</strong></p>
                  <p className="text-sm text-foreground"><strong>4.</strong> Valor: <strong className="text-primary">{parseFloat(amount).toFixed(2)} MT</strong></p>
                  <p className="text-sm text-foreground"><strong>5.</strong> Confirme com seu PIN</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-foreground"><strong>1.</strong> Abra o menu E-Mola no seu celular</p>
                  <p className="text-sm text-foreground"><strong>2.</strong> Selecione "Enviar Dinheiro"</p>
                  <p className="text-sm text-foreground"><strong>3.</strong> Digite o número: <strong className="text-primary">86 XXX XXXX</strong></p>
                  <p className="text-sm text-foreground"><strong>4.</strong> Valor: <strong className="text-primary">{parseFloat(amount).toFixed(2)} MT</strong></p>
                  <p className="text-sm text-foreground"><strong>5.</strong> Confirme com seu PIN</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 bg-accent/50 rounded-lg p-3">
              <Clock className="w-5 h-5 text-warning shrink-0" />
              <p className="text-xs text-muted-foreground text-left">
                Após o pagamento, o vendedor confirmará e você receberá o produto por email automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentInstructions;

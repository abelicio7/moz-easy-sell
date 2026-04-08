import { Card, CardContent } from "@/components/ui/card";
import { Zap, CheckCircle2 } from "lucide-react";

const ThankYou = () => {
  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">EnsinaPay</span>
        </div>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Obrigado pela compra!</h2>
            <p className="text-muted-foreground text-sm">
              Seu pagamento foi confirmado. Verifique seu email para acessar o produto.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ThankYou;

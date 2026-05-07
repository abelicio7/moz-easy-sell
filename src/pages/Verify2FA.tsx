import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { ShieldCheck, Loader2 } from "lucide-react";

const Verify2FA = () => {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [userEmail, setUserEmail] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasRequestedCode = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is actually logged in to Supabase
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserEmail(session.user.email || "");
      
      // If we already have a valid device token, skip 2FA
      const deviceToken = localStorage.getItem("ensina_device_token");
      if (deviceToken) {
        navigate("/dashboard");
      } else if (!hasRequestedCode.current) {
        // Automatically generate code on first load, but only once
        hasRequestedCode.current = true;
        handleResendCode();
      }
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const handleResendCode = async () => {
    if (resending || timeLeft > 0) return;
    setResending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('handle-2fa', {
        body: { action: 'generate' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw new Error(response.error.message || "Erro ao gerar código");

      toast.success("Código enviado para o seu e-mail!");
      setTimeLeft(30); // 30 seconds cooldown for resend
      setCode(["", "", "", "", "", ""]); // clear inputs
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar o código.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      toast.error("Preencha todos os 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const response = await supabase.functions.invoke('handle-2fa', {
        body: { action: 'verify', code: fullCode },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      console.log("Debug 2FA Response:", response);

      if (response.error || !response.data?.success) {
        const backendError = response.data?.error;
        const httpError = response.error?.message;
        const errorMsg = backendError || httpError || "Código inválido ou erro de servidor";
        throw new Error(errorMsg);
      }

      // Success! Save device token
      if (response.data.device_token) {
        localStorage.setItem("ensina_device_token", response.data.device_token);
        // Expiration is handled by backend or can be checked here, but storing it is enough to pass ProtectedRoute
      }

      toast.success("Verificação concluída com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Erro na verificação 2FA:", error);
      toast.error(error.message || "Código incorreto. Tente novamente.");
      // Clear code on failure
      setCode(["", "", "", "", "", ""]);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedData = value.replace(/\D/g, "").slice(0, 6).split("");
      if (pastedData.length === 0) return;
      
      const newCode = [...code];
      pastedData.forEach((char, i) => {
        if (index + i < 6) newCode[index + i] = char;
      });
      setCode(newCode);
      
      // Focus the right input
      const nextFocus = Math.min(index + pastedData.length, 5);
      inputRefs.current[nextFocus]?.focus();
      
      // Auto submit if full
      if (newCode.join("").length === 6) {
        // We need a small delay so state updates before submitting
        setTimeout(() => {
          document.getElementById('verify-btn')?.click();
        }, 100);
      }
      return;
    }

    // Normal typing
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl border-border/50 bg-background/95 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pt-8 pb-4">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Verificação em Duas Etapas</CardTitle>
          <CardDescription className="text-base">
            Para sua segurança, enviamos um código de 6 dígitos para o e-mail:
            <br />
            <strong className="text-foreground">{userEmail}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6} // allow pasting 6 chars in one input
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 focus-visible:ring-0 focus-visible:border-primary transition-all"
                  disabled={loading}
                />
              ))}
            </div>

            <Button 
              id="verify-btn"
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={loading || code.join("").length < 6}
            >
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verificando...</> : "Confirmar Acesso"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center pb-8 border-t border-border/50 pt-6">
          <p className="text-sm text-muted-foreground mb-4">Não recebeu o código?</p>
          <Button 
            variant="outline" 
            onClick={handleResendCode} 
            disabled={resending || timeLeft > 0}
            className="w-full text-sm font-medium"
          >
            {resending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
            ) : timeLeft > 0 ? (
              `Aguarde ${timeLeft}s para reenviar`
            ) : (
              "Reenviar código de segurança"
            )}
          </Button>
          
          <div className="mt-6">
             <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-xs" onClick={() => {
               supabase.auth.signOut();
               navigate("/login");
               localStorage.removeItem("ensina_device_token");
             }}>
               Sair e usar outra conta
             </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Verify2FA;

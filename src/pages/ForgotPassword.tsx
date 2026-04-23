import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      setSuccess(true);
      toast.success("E-mail de recuperação enviado!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="flex items-center justify-center gap-2 mb-4">
            <Logo />
          </Link>
          <CardTitle>Recuperar Senha</CardTitle>
          <CardDescription>Digite o seu e-mail para receber um link de redefinição</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-500/10 text-green-600 rounded-lg border border-green-500/20">
                Enviamos um link de recuperação para <strong>{email}</strong>. Verifique a sua caixa de entrada (e a pasta de spam).
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Voltar para o Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
              
              <div className="text-center mt-4">
                <Button asChild variant="link" className="text-muted-foreground">
                  <Link to="/login" className="flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para o Login
                  </Link>
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;

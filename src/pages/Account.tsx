import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, AlertCircle, Moon, Sun } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  cpf: string | null;
  email?: string | null;
}

interface UpdateRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  requested_data: any;
  created_at: string;
}

const Account = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeRequest, setActiveRequest] = useState<UpdateRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial theme
    const theme = localStorage.getItem("theme");
    const isDark = theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData as any);
          setFullName(profileData.full_name || "");
          setCpf(profileData.cpf || "");
          setEmail(user.email || "");
        }

        // Fetch active request
        const { data: requests } = await supabase
          .from("profile_update_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (requests && requests.length > 0) {
          setActiveRequest(requests[0] as any);
        }
      } catch (error) {
        console.error("Error fetching account data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check if there is already a pending request
    if (activeRequest?.status === 'pending') {
      toast.error("Você já tem uma solicitação em análise. Aguarde a aprovação.");
      return;
    }

    const requestedData = {
      full_name: fullName,
      cpf: cpf,
      email: email
    };

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("profile_update_requests")
        .insert({
          user_id: user.id,
          requested_data: requestedData,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      setActiveRequest(data as any);

      // Notify Admins
      try {
        const adminSubject = `Solicitação de Alteração de Perfil: ${fullName}`;
        const adminHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
            <h2 style="color: #000;">Nova Solicitação de Alteração de Perfil 🛠️</h2>
            <p>O vendedor <strong>${fullName}</strong> solicitou a alteração de seus dados cadastrais.</p>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 5px 0;"><strong>Nome Solicitado:</strong> ${fullName}</p>
              <p style="margin: 5px 0;"><strong>Documento:</strong> ${cpf}</p>
              <p style="margin: 5px 0;"><strong>E-mail:</strong> ${email}</p>
            </div>
            <div style="text-align: center; margin-top: 25px;">
              <a href="${window.location.origin}/admin/requests" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Analisar Solicitação</a>
            </div>
          </div>
        `;

        const { data: admins } = await supabase.from("profiles").select("email").eq("role", "admin");
        if (admins) {
          for (const admin of admins) {
            if (admin.email) {
              await supabase.functions.invoke("send-email-notification", {
                body: { to: admin.email, subject: adminSubject, htmlContent: adminHtml, senderName: "EnsinaPay System" }
              });
            }
          }
        }
      } catch (e) {
        console.error("Erro ao notificar admins sobre alteração de perfil:", e);
      }

      toast.success("Solicitação de alteração enviada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar solicitação.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">Carregando...</div>
      </DashboardLayout>
    );
  }

  const isPending = activeRequest?.status === 'pending';

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e bancárias.</p>
      </div>

      <div className="grid gap-8 max-w-2xl">
        {activeRequest && (
          <Card className={`border ${
            isPending ? 'border-yellow-500/50 bg-yellow-500/5' : 
            activeRequest.status === 'rejected' ? 'border-red-500/50 bg-red-500/5' : 
            'border-green-500/50 bg-green-500/5'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {isPending && <Clock className="w-5 h-5 text-yellow-500" />}
                {activeRequest.status === 'approved' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {activeRequest.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
                <CardTitle className="text-lg">
                  Status da Solicitação
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isPending && (
                <p className="text-sm text-muted-foreground">
                  Você tem uma solicitação de alteração de dados em análise pelo administrador. 
                  Enquanto isso, os seus dados atuais continuarão sendo usados.
                </p>
              )}
              {activeRequest.status === 'rejected' && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Sua solicitação de alteração foi rejeitada.
                  </p>
                  <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-md border border-red-500/20">
                    Motivo: {activeRequest.rejection_reason || "Não especificado."}
                  </p>
                </div>
              )}
              {activeRequest.status === 'approved' && (
                <p className="text-sm text-muted-foreground">
                  Sua última solicitação de alteração foi aprovada e seus dados foram atualizados!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Para alterar essas informações, você precisa enviar um pedido de aprovação para a administração da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2 border-primary/20 mb-6 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold flex items-center gap-2">
                    Tema do Painel 
                    <Badge variant="outline" className="text-[10px] uppercase py-0 h-4 border-primary/30">Novo</Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground">Escolha entre modo claro ou escuro</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  onClick={toggleTheme}
                  className="rounded-full w-12 h-12 transition-all hover:scale-110 active:scale-95 border-primary/20 bg-background shadow-sm"
                >
                  {isDarkMode ? <Sun className="h-6 w-6 text-yellow-500" /> : <Moon className="h-6 w-6 text-primary" />}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  disabled={isPending}
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">Documento (CPF / BI)</Label>
                <Input 
                  id="cpf" 
                  value={cpf} 
                  onChange={(e) => setCpf(e.target.value)} 
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Cadastro</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={isPending}
                  required 
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  Se alterar o e-mail, será necessário confirmá-lo novamente.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full md:w-auto" 
                disabled={submitting || isPending}
              >
                {submitting ? "Enviando..." : "Solicitar Alteração"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Account;

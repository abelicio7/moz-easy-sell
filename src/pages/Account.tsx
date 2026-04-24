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
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

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

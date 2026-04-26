import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Clock, User, ArrowRight } from "lucide-react";

interface Request {
  id: string;
  user_id: string;
  requested_data: any;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    cpf: string | null;
  };
}

const AdminProfileRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("profile_update_requests")
        .select(`
          *,
          profiles:user_id(full_name, cpf, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data as any || []);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: Request) => {
    try {
      // 1. Update the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: request.requested_data.full_name,
          cpf: request.requested_data.cpf
        })
        .eq("id", request.user_id);

      if (profileError) throw profileError;

      // Note: Updating email requires calling the auth admin API, 
      // but for this MVP we just update the profile and request status.

      // 2. Mark request as approved
      const { error: requestError } = await supabase
        .from("profile_update_requests")
        .update({ status: 'approved' })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // 3. Log action
      await supabase.from("audit_logs").insert({
        action: "approve_profile_request",
        target_type: "profile_update_requests",
        target_id: request.id,
        details: { user_id: request.user_id }
      });
      
      // Send email notification
      const userEmail = request.requested_data.email || (request.profiles as any)?.email;
      if (userEmail) {
        const subject = "Perfil Aprovado - EnsinaPay";
        const htmlContent = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <h2 style="color: #10b981;">Perfil Aprovado!</h2>
            <p>Olá, <strong>${request.requested_data.full_name || request.profiles?.full_name}</strong>.</p>
            <p>Temos o prazer de informar que a sua solicitação de alteração/ativação de perfil foi <strong>aprovada</strong>.</p>
            <p>Agora você tem acesso total às funcionalidades de vendedor na nossa plataforma.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://www.ensinapay.com/dashboard" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir para o Dashboard</a>
            </div>
            <p style="font-size: 12px; color: #666;">Atenciosamente,<br>Equipa EnsinaPay</p>
          </div>
        `;

        try {
          await supabase.functions.invoke("send-email-notification", {
            body: { to: userEmail, subject, htmlContent, senderName: "EnsinaPay" }
          });
        } catch (emailErr) {
          console.error("Erro ao enviar email de aprovação:", emailErr);
        }
      }

      toast.success("Solicitação aprovada com sucesso!");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Erro ao aprovar");
    }
  };

  const handleReject = async (request: Request) => {
    const reason = rejectionReasons[request.id];
    if (!reason || reason.trim() === "") {
      toast.error("É necessário informar um motivo para a rejeição.");
      return;
    }

    try {
      const { error } = await supabase
        .from("profile_update_requests")
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq("id", request.id);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        action: "reject_profile_request",
        target_type: "profile_update_requests",
        target_id: request.id,
        details: { user_id: request.user_id, reason }
      });

      // Send email notification
      const userEmail = (request.profiles as any)?.email || request.requested_data.email;
      if (userEmail) {
        const subject = "Solicitação de Perfil Rejeitada - EnsinaPay";
        const htmlContent = `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
            <h2 style="color: #ef4444;">Atualização sobre o seu perfil</h2>
            <p>Olá, <strong>${request.profiles?.full_name || "Vendedor"}</strong>.</p>
            <p>A sua solicitação de alteração de perfil foi <strong>rejeitada</strong> pela nossa equipa de moderação.</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">Motivo da rejeição:</p>
              <p style="margin: 10px 0 0 0; color: #b91c1c;">${reason}</p>
            </div>
            <p>Por favor, corrija os dados solicitados e submeta uma nova solicitação no seu painel.</p>
            <p style="font-size: 12px; color: #666;">Atenciosamente,<br>Equipa EnsinaPay</p>
          </div>
        `;

        try {
          await supabase.functions.invoke("send-email-notification", {
            body: { to: userEmail, subject, htmlContent, senderName: "EnsinaPay" }
          });
        } catch (emailErr) {
          console.error("Erro ao enviar email de rejeição:", emailErr);
        }
      }

      toast.success("Solicitação rejeitada com sucesso!");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">Carregando solicitações...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alterações de Perfil</h1>
          <p className="text-muted-foreground mt-1">Aprove ou rejeite as solicitações de alteração de dados dos vendedores.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma solicitação encontrada.
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className={request.status === 'pending' ? 'border-primary/20 bg-primary/5' : ''}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-background p-2 rounded-lg border">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{request.profiles?.full_name || "Usuário"}</h3>
                          {request.status === 'pending' && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/20"><Clock className="w-3 h-3 mr-1"/> Pendente</Badge>}
                          {request.status === 'approved' && <Badge variant="secondary" className="bg-green-500/20 text-green-600 hover:bg-green-500/20"><Check className="w-3 h-3 mr-1"/> Aprovado</Badge>}
                          {request.status === 'rejected' && <Badge variant="secondary" className="bg-red-500/20 text-red-600 hover:bg-red-500/20"><X className="w-3 h-3 mr-1"/> Rejeitado</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Solicitado em {format(new Date(request.created_at), "dd/MM/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-background p-4 rounded-xl border border-border/50">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Dados Atuais</p>
                        <div className="space-y-1 text-sm">
                          <p><strong>Nome:</strong> {request.profiles?.full_name || "Não informado"}</p>
                          <p><strong>Documento:</strong> {request.profiles?.cpf || "Não informado"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 md:absolute md:left-1/2 md:-ml-3 md:mt-6 hidden md:flex text-muted-foreground">
                        <ArrowRight className="w-6 h-6" />
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-primary uppercase mb-2">Novos Dados Solicitados</p>
                        <div className="space-y-1 text-sm">
                          <p><strong>Nome:</strong> <span className={request.requested_data.full_name !== request.profiles?.full_name ? 'text-primary font-medium' : ''}>{request.requested_data.full_name || "Não informado"}</span></p>
                          <p><strong>Documento:</strong> <span className={request.requested_data.cpf !== request.profiles?.cpf ? 'text-primary font-medium' : ''}>{request.requested_data.cpf || "Não informado"}</span></p>
                          <p><strong>E-mail:</strong> {request.requested_data.email || "Não informado"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="w-full md:w-80 flex flex-col gap-3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-border/50">
                      <p className="text-sm font-medium">Ação Administrativa</p>
                      <Button onClick={() => handleApprove(request)} className="w-full bg-green-600 hover:bg-green-700">
                        Aprovar Alteração
                      </Button>
                      
                      <div className="space-y-2 mt-4">
                        <Textarea 
                          placeholder="Motivo da rejeição (obrigatório se rejeitar)" 
                          className="text-sm resize-none"
                          rows={2}
                          value={rejectionReasons[request.id] || ""}
                          onChange={(e) => setRejectionReasons({...rejectionReasons, [request.id]: e.target.value})}
                        />
                        <Button onClick={() => handleReject(request)} variant="destructive" className="w-full">
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  )}

                  {request.status === 'rejected' && (
                    <div className="w-full md:w-80 flex flex-col justify-center border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-border/50">
                       <p className="text-sm font-medium text-red-500 mb-1">Motivo da Rejeição:</p>
                       <p className="text-sm text-muted-foreground bg-background p-3 rounded-lg border border-red-500/20">{request.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminProfileRequests;

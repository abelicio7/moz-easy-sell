import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  status: string;
  identity_status: string;
  identity_document_url: string;
  cpf: string;
  email: string;
  rejection_reason: string;
  created_at: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    
    const { data, error } = await query;
    if (data) setUsers(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const handleAction = async () => {
    if (!selectedUser || !action) return;
    if (action === "reject" && !reason.trim()) {
      toast.error("É necessário informar o motivo da rejeição.");
      return;
    }

    setProcessing(true);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          identity_status: newStatus,
          rejection_reason: action === "reject" ? reason : null
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Send status update email
      if (selectedUser.email) {
        const subject = action === "approve" 
          ? "Identidade Verificada: Saques Liberados na EnsinaPay" 
          : "Atualização sobre sua Verificação de Identidade";

        const htmlContent = action === "approve"
          ? `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #16a34a;">Identidade Verificada! 🎉</h2>
              <p>Olá, <strong>${selectedUser.full_name || 'Vendedor'}</strong>.</p>
              <p>Excelente notícia! O seu documento de identidade foi analisado e **aprovado**.</p>
              <p>Agora você já tem acesso total e liberado para solicitar saques do seu saldo disponível para a sua conta M-Pesa ou E-Mola na EnsinaPay.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${window.location.origin}/finance" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver meu Financeiro</a>
              </div>
              <p style="font-size: 12px; color: #666;">Desejamos muito sucesso em suas vendas!</p>
            </div>
          `
          : `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #ef4444;">Verificação de Identidade Rejeitada</h2>
              <p>Olá, <strong>${selectedUser.full_name || 'Vendedor'}</strong>.</p>
              <p>Infelizmente, não pudemos aprovar o seu documento de identidade enviado para libertar os saques na EnsinaPay.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">Motivo:</p>
                <p style="margin: 10px 0 0 0; color: #b91c1c;">${reason}</p>
              </div>
              <p>Você pode ajustar as informações necessárias e entrar em contato com nosso suporte para uma nova análise.</p>
              <p style="font-size: 12px; color: #666;">Equipa EnsinaPay</p>
            </div>
          `;

        try {
          await supabase.functions.invoke("send-email-notification", {
            body: { 
              to: selectedUser.email, 
              subject: subject, 
              htmlContent: htmlContent,
              senderName: "EnsinaPay"
            }
          });
        } catch (e) {
          console.error("Erro ao enviar email de status:", e);
        }
      }
      
      // Log action
      await supabase.from("audit_logs").insert({
        action: action === "approve" ? "APPROVE_USER" : "REJECT_USER",
        target_type: "profile",
        target_id: selectedUser.id,
        details: { reason, previous_status: selectedUser.status }
      });

      toast.success(`Usuário ${action === "approve" ? 'aprovado' : 'rejeitado'} com sucesso.`);
      setSelectedUser(null);
      setReason("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar ação.");
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDocument = async (urlOrPath: string) => {
    let filePath = urlOrPath;
    if (filePath.includes('/object/public/kyc_documents/')) {
      filePath = filePath.split('/object/public/kyc_documents/')[1];
    }
    
    // We expect the file to be just the path string in modern implementation
    const { data, error } = await supabase.storage.from('kyc_documents').createSignedUrl(filePath, 3600);
    if (error || !data) {
      toast.error('Erro ao aceder documento: ' + (error?.message || 'Contacte suporte.'));
    } else {
      window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Identidades KYC</h1>
          <p className="text-muted-foreground mt-1">Gerencie a aprovação de documentos e saques dos vendedores.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <thead className="text-xs uppercase bg-muted/40 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-foreground">Nome</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Email</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Data Cadastro</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Status KYC</th>
                  <th className="px-6 py-4 font-semibold text-foreground text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Carregando usuários...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {user.full_name || "Sem nome"}
                      </td>
                      <td className="px-6 py-4">
                        {user.email || "Não informado"}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        {user.identity_status === 'approved' && <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Verificado</Badge>}
                        {user.identity_status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-0"><Clock className="w-3 h-3 mr-1" /> Em Análise</Badge>}
                        {user.identity_status === 'unverified' && <Badge variant="outline" className="border-0 bg-muted">Não Verificado</Badge>}
                        {user.identity_status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Dialog open={selectedUser?.id === user.id} onOpenChange={(open) => !open && setSelectedUser(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedUser(user); setAction(null); setReason(""); }}>
                              Analisar
                            </Button>
                          </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Análise de Identidade (KYC)</DialogTitle>
                                <DialogDescription>
                                  Verifique se o documento corresponde à identidade e aprove para libertar saques.
                                </DialogDescription>
                              </DialogHeader>
                            
                            <div className="py-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground block text-xs">Nome Completo</span>
                                  <span className="font-medium text-foreground">{user.full_name || "Não informado"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Email</span>
                                  <span className="font-medium text-foreground">{user.email || "Não informado"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Documento (BI ou Passaporte)</span>
                                  <span className="font-medium text-foreground">{user.cpf || "Não informado"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Status KYC</span>
                                  <span className="font-medium text-foreground uppercase">{user.identity_status}</span>
                                </div>
                                {user.identity_document_url && (
                                  <div className="col-span-2 pt-2 pb-1 border-t border-border/50">
                                    <span className="text-muted-foreground block text-xs mb-1">Documento Anexado</span>
                                    <button 
                                      onClick={() => handleViewDocument(user.identity_document_url)} 
                                      className="text-primary hover:underline text-sm font-bold truncate block bg-primary/5 p-3 rounded border border-primary/20 cursor-pointer w-full text-left"
                                    >
                                      📄 Visualizar Documento Original
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {!action ? (
                                <div className="flex gap-2 pt-4">
                                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setAction("approve")}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar Saques
                                  </Button>
                                  <Button className="flex-1" variant="destructive" onClick={() => setAction("reject")}>
                                    <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-4 pt-4 animate-in fade-in zoom-in-95">
                                  {action === "reject" && (
                                    <div className="space-y-2">
                                      <Label>Motivo da Rejeição (Será enviado ao usuário)</Label>
                                      <Textarea 
                                        placeholder="Ex: Documentação inválida..." 
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                      />
                                    </div>
                                  )}
                                  {action === "approve" && (
                                    <div className="p-3 bg-green-500/10 text-green-700 rounded-lg text-sm border border-green-500/20">
                                      O usuário será notificado por e-mail e os saques para a conta bancária dele ficarão permanentemente ativos.
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setAction(null)}>Voltar</Button>
                                    <Button 
                                      variant={action === "reject" ? "destructive" : "default"}
                                      className={action === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                      onClick={handleAction}
                                      disabled={processing}
                                    >
                                      {processing ? "Processando..." : "Confirmar"}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminUsers;

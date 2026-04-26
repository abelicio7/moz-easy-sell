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
  cpf: string;
  email: string; // Added email field
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
          status: newStatus,
          rejection_reason: action === "reject" ? reason : null
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Send status update email
      if (selectedUser.email) {
        const subject = action === "approve" 
          ? "Conta Aprovada: Bem-vindo à EnsinaPay" 
          : "Atualização sobre seu cadastro na EnsinaPay";

        const htmlContent = action === "approve"
          ? `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #16a34a;">Sua conta foi aprovada! 🎉</h2>
              <p>Olá, <strong>${selectedUser.full_name || 'Vendedor'}</strong>.</p>
              <p>Excelente notícia! Analisamos seu cadastro e sua conta de vendedor na EnsinaPay foi **aprovada**.</p>
              <p>Você já pode aceder ao seu painel, configurar seus produtos e começar a vender imediatamente.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${window.location.origin}/dashboard" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ir para o Dashboard</a>
              </div>
              <p style="font-size: 12px; color: #666;">Desejamos muito sucesso em suas vendas!</p>
            </div>
          `
          : `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #ef4444;">Atualização de Cadastro</h2>
              <p>Olá, <strong>${selectedUser.full_name || 'Vendedor'}</strong>.</p>
              <p>Infelizmente, não pudemos aprovar seu cadastro na EnsinaPay neste momento.</p>
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
              htmlContent: htmlContent 
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

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Vendedores</h1>
          <p className="text-muted-foreground mt-1">Gerencie a aprovação de contas de vendedores.</p>
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
                  <th className="px-6 py-4 font-semibold text-foreground">Função</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Data Cadastro</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Status</th>
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
                        <Badge variant="outline">{user.role}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        {user.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado</Badge>}
                        {user.status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-0"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>}
                        {user.status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>}
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
                              <DialogTitle>Análise de Vendedor</DialogTitle>
                              <DialogDescription>
                                Decida se este usuário pode vender na EnsinaPay.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="py-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground block text-xs">Nome Completo</span>
                                  <span className="font-medium text-foreground">{user.full_name || "Não informado"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs">Status Atual</span>
                                  <span className="font-medium text-foreground uppercase">{user.status}</span>
                                </div>
                              </div>
                              
                              {!action ? (
                                <div className="flex gap-2 pt-4">
                                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setAction("approve")}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar Cadastro
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
                                      O usuário será notificado por e-mail e poderá começar a vender seus produtos aprovados.
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

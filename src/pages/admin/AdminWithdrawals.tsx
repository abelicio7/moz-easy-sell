import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Banknote } from "lucide-react";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_details: string;
  rejection_reason: string;
  created_at: string;
  profiles: { full_name: string; email: string };
}

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<Withdrawal | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    let query = supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
    
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    
    const { data, error } = await query;
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((w: any) => w.user_id))].filter(Boolean);
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      
      const withdrawalsWithProfiles = data.map((w: any) => ({
        ...w,
        profiles: profilesData?.find((prof: any) => prof.id === w.user_id) || { full_name: "Desconhecido", email: "" }
      }));
      setWithdrawals(withdrawalsWithProfiles as any as Withdrawal[]);
    } else {
      setWithdrawals([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [filter]);

  const handleAction = async () => {
    if (!selectedItem || !action) return;
    if (action === "reject" && !reason.trim()) {
      toast.error("É necessário informar o motivo da rejeição.");
      return;
    }

    setProcessing(true);
    try {
      const newStatus = action === "approve" ? "completed" : "rejected";
      
      const { error } = await supabase
        .from("withdrawals")
        .update({ 
          status: newStatus,
          rejection_reason: action === "reject" ? reason : null
        })
        .eq("id", selectedItem.id);

      if (error) throw error;

      // Log action
      await supabase.from("audit_logs").insert({
        action: action === "approve" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
        target_type: "withdrawal",
        target_id: selectedItem.id,
        details: { reason, amount: selectedItem.amount, previous_status: selectedItem.status }
      });

      toast.success(`Saque ${action === "approve" ? 'concluído' : 'rejeitado'} com sucesso.`);
      setSelectedItem(null);
      setReason("");
      fetchWithdrawals();
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Saques</h1>
          <p className="text-muted-foreground mt-1">Gerencie os pedidos de transferência bancária e carteiras móveis.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
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
                  <th className="px-6 py-4 font-semibold text-foreground">Vendedor</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Valor</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Método</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 font-semibold text-foreground text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Carregando saques...</td>
                  </tr>
                ) : withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Nenhum saque encontrado.</td>
                  </tr>
                ) : (
                  withdrawals.map((item) => (
                    <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {item.profiles?.full_name || "Desconhecido"}
                        <span className="block text-xs text-muted-foreground font-normal">{item.profiles?.email}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {item.amount.toFixed(2)} MT
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{item.payment_method}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'completed' && <Badge className="bg-green-500/10 text-green-600 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>}
                        {item.status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 border-0"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>}
                        {item.status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-0"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Dialog open={selectedItem?.id === item.id} onOpenChange={(open) => !open && setSelectedItem(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedItem(item); setAction(null); setReason(""); }}>
                              Processar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Processar Pedido de Saque</DialogTitle>
                              <DialogDescription>
                                Verifique as informações para fazer a transferência manual do valor.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="py-4 space-y-4">
                              <div className="bg-muted p-4 rounded-lg space-y-3">
                                <div><span className="text-muted-foreground text-xs block">Vendedor</span><span className="font-medium text-foreground">{item.profiles?.full_name}</span></div>
                                <div><span className="text-muted-foreground text-xs block">Valor Solicitado</span><span className="font-bold text-xl text-primary">{item.amount.toFixed(2)} MT</span></div>
                                <div className="border-t border-border/50 pt-3 mt-3">
                                  <span className="text-muted-foreground text-xs block">Canal de Transferência</span>
                                  <span className="font-medium text-foreground">{item.payment_method}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block">Detalhes da Conta / Número</span>
                                  <span className="font-mono text-foreground font-semibold bg-background p-1 px-2 rounded border border-border inline-block mt-1">{item.payment_details}</span>
                                </div>
                              </div>
                              
                              {!action ? (
                                <div className="flex gap-2 pt-2">
                                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setAction("approve")}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Concluído
                                  </Button>
                                  <Button className="flex-1" variant="destructive" onClick={() => setAction("reject")}>
                                    <XCircle className="w-4 h-4 mr-2" /> Rejeitar Saque
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-4 pt-4 border-t border-border animate-in fade-in zoom-in-95">
                                  {action === "reject" && (
                                    <div className="space-y-2">
                                      <Label>Motivo da Rejeição</Label>
                                      <Textarea 
                                        placeholder="Ex: Número inválido ou titular diferente..." 
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                      />
                                    </div>
                                  )}
                                  {action === "approve" && (
                                    <div className="p-3 bg-green-500/10 text-green-700 rounded-lg text-sm border border-green-500/20 flex gap-2 items-start">
                                      <Banknote className="w-5 h-5 shrink-0" />
                                      Confirme que você já efetuou a transferência de {item.amount.toFixed(2)} MT para o vendedor através do {item.payment_method}. O status mudará para concluído.
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

export default AdminWithdrawals;

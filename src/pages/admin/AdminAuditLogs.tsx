import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldAlert, Clock, Eye, ChevronLeft, ChevronRight, User, Terminal } from "lucide-react";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
  adminEmail?: string;
  adminName?: string;
  targetName?: string;
  targetDesc?: string;
}

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const limit = 15;
  const totalPages = Math.ceil(totalItems / limit);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // 1. Fetch total count for pagination
      let countQuery = supabase.from("audit_logs").select("id", { count: "exact", head: true });
      if (actionFilter !== "all") {
        countQuery = countQuery.eq("action", actionFilter);
      }
      const { count, error: countErr } = await countQuery;
      if (countErr) throw countErr;
      setTotalItems(count || 0);

      // 2. Fetch logs range
      let logsQuery = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (actionFilter !== "all") {
        logsQuery = logsQuery.eq("action", actionFilter);
      }

      const { data: logsData, error: logsErr } = await logsQuery;
      if (logsErr) throw logsErr;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        setLoading(false);
        return;
      }

      // 3. Extract admin and target profiles to query
      const adminIds = [...new Set(logsData.map(l => l.admin_id))].filter(Boolean);
      const profileIds = [...new Set(logsData.filter(l => l.target_type === 'profile').map(l => l.target_id))].filter(Boolean);
      const detailsUserIds = logsData
        .map(l => (l.details as any)?.user_id)
        .filter(Boolean);

      const allUserIds = [...new Set([...adminIds, ...profileIds, ...detailsUserIds])];
      const productIds = [...new Set(logsData.filter(l => l.target_type === 'product').map(l => l.target_id))].filter(Boolean);
      const withdrawalIds = [...new Set(logsData.filter(l => l.target_type === 'withdrawal').map(l => l.target_id))].filter(Boolean);

      // 4. Fetch details in parallel
      const [profilesRes, productsRes, withdrawalsRes] = await Promise.all([
        allUserIds.length > 0 ? supabase.from("profiles").select("id, full_name, email").in("id", allUserIds) : Promise.resolve({ data: null }),
        productIds.length > 0 ? supabase.from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: null }),
        withdrawalIds.length > 0 ? supabase.from("withdrawals").select("id, amount, currency").in("id", withdrawalIds) : Promise.resolve({ data: null })
      ]);

      const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const productsMap = new Map(productsRes.data?.map(p => [p.id, p]) || []);
      const withdrawalsMap = new Map(withdrawalsRes.data?.map(w => [w.id, w]) || []);

      // 5. Process rich log representations
      const richLogs = logsData.map(log => {
        const adminProfile = profilesMap.get(log.admin_id);
        
        let targetName = "";
        let targetDesc = "";

        if (log.target_type === 'profile') {
          const prof = profilesMap.get(log.target_id);
          targetName = prof?.full_name || "Vendedor";
          targetDesc = prof?.email || log.target_id;
        } else if (log.target_type === 'product') {
          const prod = productsMap.get(log.target_id);
          targetName = prod?.name || "Produto";
          targetDesc = `ID: ${log.target_id}`;
        } else if (log.target_type === 'withdrawal') {
          const wd = withdrawalsMap.get(log.target_id);
          if (wd) {
            const formatted = wd.currency === 'BRL'
              ? wd.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : wd.currency === 'ZAR'
                ? wd.amount.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })
                : `${wd.amount.toFixed(2)} MT`;
            targetName = `Saque: ${formatted}`;
          } else {
            targetName = "Saque";
          }
          targetDesc = `ID: ${log.target_id}`;
        } else if (log.target_type === 'profile_update_requests') {
          const detailsUid = (log.details as any)?.user_id;
          const prof = profilesMap.get(detailsUid);
          targetName = prof?.full_name || "Solicitação KYC";
          targetDesc = prof?.email || detailsUid || log.target_id;
        } else {
          targetName = `${log.target_type} (${log.target_id})`;
        }

        return {
          ...log,
          adminEmail: adminProfile?.email || "Admin",
          adminName: adminProfile?.full_name || "Administrador",
          targetName,
          targetDesc
        };
      });

      setLogs(richLogs);
    } catch (e: any) {
      console.error("Error fetching audit logs:", e);
      toast.error("Erro ao carregar logs de auditoria: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchAuditLogs();
  }, [actionFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CHANGE_USER_STATUS':
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-0 shadow-none">Alterar Status</Badge>;
      case 'CHANGE_USER_CUSTOM_FEE':
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-0 shadow-none">Taxa Customizada</Badge>;
      case 'APPROVE_WITHDRAWAL':
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0 shadow-none">Aprovar Saque</Badge>;
      case 'REJECT_WITHDRAWAL':
        return <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-0 shadow-none">Rejeitar Saque</Badge>;
      case 'approve_profile_request':
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0 shadow-none">Aprovar KYC</Badge>;
      case 'reject_profile_request':
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0 shadow-none">Rejeitar KYC</Badge>;
      case 'APPROVE_PRODUCT':
        return <Badge className="bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 border-0 shadow-none">Aprovar Produto</Badge>;
      case 'REJECT_PRODUCT':
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0 shadow-none">Rejeitar Produto</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getActionTitle = (action: string) => {
    switch (action) {
      case 'CHANGE_USER_STATUS':
        return "Alteração de Status do Usuário";
      case 'CHANGE_USER_CUSTOM_FEE':
        return "Alteração de Taxa Administrativa";
      case 'APPROVE_WITHDRAWAL':
        return "Aprovação de Saque";
      case 'REJECT_WITHDRAWAL':
        return "Rejeição de Saque";
      case 'approve_profile_request':
        return "Aprovação de KYC / Documentos";
      case 'reject_profile_request':
        return "Rejeição de KYC / Documentos";
      case 'APPROVE_PRODUCT':
        return "Aprovação de Produto";
      case 'REJECT_PRODUCT':
        return "Rejeição de Produto";
      default:
        return action;
    }
  };

  const renderDetailsSummary = (log: AuditLog) => {
    if (!log.details) return <p className="text-muted-foreground text-sm">Nenhum detalhe disponível.</p>;

    switch (log.action) {
      case 'CHANGE_USER_STATUS':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Status Anterior</span>
                <span className="font-semibold uppercase text-foreground">{log.details.previous_status || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Novo Status</span>
                <span className="font-semibold uppercase text-primary">{log.details.new_status || "N/A"}</span>
              </div>
            </div>
          </div>
        );
      case 'CHANGE_USER_CUSTOM_FEE':
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Taxa Anterior</span>
                <span className="font-semibold text-foreground">
                  {log.details.previous_fee !== null && log.details.previous_fee !== undefined
                    ? `${log.details.previous_fee}%`
                    : "Padrão"
                  }
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Nova Taxa</span>
                <span className="font-semibold text-primary">
                  {log.details.new_fee !== null && log.details.new_fee !== undefined
                    ? `${log.details.new_fee}%`
                    : "Padrão"
                  }
                </span>
              </div>
            </div>
          </div>
        );
      case 'APPROVE_WITHDRAWAL':
      case 'REJECT_WITHDRAWAL':
        return (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground block text-xs">Valor do Saque</span>
              <span className="font-bold text-foreground">
                {log.details.amount ? `${log.details.amount.toFixed(2)}` : "N/A"}
              </span>
            </div>
            {log.details.reason && (
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-sm text-destructive mt-2">
                <strong>Motivo:</strong> {log.details.reason}
              </div>
            )}
          </div>
        );
      case 'reject_profile_request':
        return (
          <div className="space-y-2">
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-sm text-destructive">
              <strong>Motivo da Rejeição:</strong> {log.details.reason || "Não especificado"}
            </div>
          </div>
        );
      case 'REJECT_PRODUCT':
        return (
          <div className="space-y-2">
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-sm text-destructive">
              <strong>Motivo da Rejeição:</strong> {log.details.reason || "Não especificado"}
            </div>
          </div>
        );
      default:
        return (
          <div className="text-xs text-muted-foreground max-h-48 overflow-y-auto font-mono bg-muted p-2 rounded">
            {JSON.stringify(log.details, null, 2)}
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Logs de Auditoria</h1>
          <p className="text-muted-foreground mt-1">Histórico completo de ações administrativas e alterações do sistema.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Ações</SelectItem>
              <SelectItem value="CHANGE_USER_STATUS">Alterações de Status</SelectItem>
              <SelectItem value="CHANGE_USER_CUSTOM_FEE">Taxas Customizadas</SelectItem>
              <SelectItem value="approve_profile_request">Aprovações de KYC</SelectItem>
              <SelectItem value="reject_profile_request">Rejeições de KYC</SelectItem>
              <SelectItem value="APPROVE_WITHDRAWAL">Saques Concluídos</SelectItem>
              <SelectItem value="REJECT_WITHDRAWAL">Saques Recusados</SelectItem>
              <SelectItem value="APPROVE_PRODUCT">Aprovações de Produto</SelectItem>
              <SelectItem value="REJECT_PRODUCT">Rejeições de Produto</SelectItem>
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
                  <th className="px-6 py-4 font-semibold text-foreground">Data/Hora</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Administrador</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Ação</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Alvo (Vendedor / Objeto)</th>
                  <th className="px-6 py-4 font-semibold text-foreground text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Carregando logs...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Nenhum log de auditoria encontrado.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{log.adminName}</div>
                        <div className="text-xs text-muted-foreground">{log.adminEmail}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{log.targetName}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={log.targetDesc}>
                          {log.targetDesc}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Dialog open={selectedLog?.id === log.id} onOpenChange={(open) => !open && setSelectedLog(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)} className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-primary" />
                                Detalhes da Ação
                              </DialogTitle>
                              <DialogDescription>
                                Registro administrativo criado em {new Date(log.created_at).toLocaleString('pt-BR')}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                              <div className="space-y-1.5">
                                <span className="text-muted-foreground text-xs block font-semibold uppercase tracking-wider">Ação</span>
                                <div className="flex items-center gap-2">
                                  {getActionBadge(log.action)}
                                  <span className="font-bold text-sm text-foreground">{getActionTitle(log.action)}</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 border-t border-b border-border/50 py-3">
                                <div>
                                  <span className="text-muted-foreground text-xs block font-semibold uppercase tracking-wider">Administrador</span>
                                  <div className="font-medium text-sm text-foreground mt-0.5">{log.adminName}</div>
                                  <div className="text-xs text-muted-foreground">{log.adminEmail}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs block font-semibold uppercase tracking-wider">Alvo</span>
                                  <div className="font-medium text-sm text-foreground mt-0.5">{log.targetName}</div>
                                  <div className="text-xs text-muted-foreground truncate" title={log.targetDesc}>{log.targetDesc}</div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <span className="text-muted-foreground text-xs block font-semibold uppercase tracking-wider">Resumo dos Dados</span>
                                <div className="bg-muted/30 border border-border/50 p-4 rounded-xl">
                                  {renderDetailsSummary(log)}
                                </div>
                              </div>

                              {log.details && (
                                <div className="space-y-2">
                                  <span className="text-muted-foreground text-xs block font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                                    JSON Bruto
                                  </span>
                                  <pre className="text-[11px] font-mono bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto max-h-40 border border-slate-800">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>

                            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 rounded-b-lg mt-2">
                              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedLog(null)}>
                                Fechar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 p-4 bg-muted/20">
              <div className="text-xs text-muted-foreground">
                Mostrando <strong className="text-foreground">{(page - 1) * limit + 1}</strong> a{" "}
                <strong className="text-foreground">{Math.min(page * limit, totalItems)}</strong> de{" "}
                <strong className="text-foreground">{totalItems}</strong> registros
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-8 px-2.5"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <div className="text-xs font-medium text-foreground px-3">
                  Página {page} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="h-8 px-2.5"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AdminAuditLogs;

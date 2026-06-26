import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Ban, User, ArrowUpRight, ArrowDownToLine, ShoppingCart, ShieldAlert, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

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
  custom_fee?: number | null;
}

const AdminUsers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (user.full_name || "").toLowerCase().includes(query) ||
      (user.email || "").toLowerCase().includes(query) ||
      (user.cpf || "").toLowerCase().includes(query)
    );
  });
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // Seller Details States
  const [detailsUser, setDetailsUser] = useState<Profile | null>(null);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerWithdrawals, setSellerWithdrawals] = useState<any[]>([]);
  const [sellerStats, setSellerStats] = useState({ revenueMzn: 0, revenueBrl: 0, revenueZar: 0, salesCount: 0 });
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [editStatus, setEditStatus] = useState<string>("approved");
  const [editCustomFee, setEditCustomFee] = useState<string>("");
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    
    if (filter !== "all") {
      query = query.eq("identity_status", filter);
    }
    
    const { data, error } = await query;
    if (data) {
      const sorted = [...data].sort((a, b) => {
        if (a.identity_status === 'pending' && b.identity_status !== 'pending') return -1;
        if (a.identity_status !== 'pending' && b.identity_status === 'pending') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setUsers(sorted as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  useEffect(() => {
    const currentFilter = searchParams.get("filter") || "all";
    if (currentFilter !== filter) {
      setFilter(currentFilter);
    }
  }, [searchParams]);

  const fetchSellerDetails = async (sellerId: string) => {
    setLoadingDetails(true);
    try {
      // 1. Fetch products
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", sellerId);
      setSellerProducts(prods || []);

      // 2. Fetch withdrawals
      const { data: wds } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", sellerId)
        .order("created_at", { ascending: false });
      setSellerWithdrawals(wds || []);

      // 3. Fetch orders (join with products)
      const { data: ords } = await supabase
        .from("orders")
        .select("*, products!inner(*)")
        .eq("products.user_id", sellerId)
        .order("created_at", { ascending: false });
      
      const ordersList = ords || [];
      setSellerOrders(ordersList);

      // 4. Stats from paid/delivered orders
      const paidOrds = ordersList.filter(o => ["paid", "delivered"].includes(o.status));
      const revenueMzn = paidOrds.filter(o => o.currency === "MZN" || !o.currency).reduce((s, o) => s + Number(o.price), 0);
      const revenueBrl = paidOrds.filter(o => o.currency === "BRL").reduce((s, o) => s + Number(o.price), 0);
      const revenueZar = paidOrds.filter(o => o.currency === "ZAR").reduce((s, o) => s + Number(o.price), 0);
      setSellerStats({
        revenueMzn,
        revenueBrl,
        revenueZar,
        salesCount: paidOrds.length
      });
    } catch (e) {
      console.error("Error fetching seller details:", e);
      toast.error("Erro ao carregar detalhes do vendedor.");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (detailsUser) {
      fetchSellerDetails(detailsUser.id);
      setEditStatus(detailsUser.status || "approved");
      setEditCustomFee(detailsUser.custom_fee !== undefined && detailsUser.custom_fee !== null ? detailsUser.custom_fee.toString() : "");
    }
  }, [detailsUser]);

  const handleSaveConfig = async () => {
    if (!detailsUser) return;
    setSavingConfig(true);
    try {
      const fee = editCustomFee.trim() === "" ? null : Number(editCustomFee);
      if (fee !== null && (isNaN(fee) || fee < 0 || fee > 100)) {
        toast.error("Taxa de saque deve ser um número válido entre 0 e 100.");
        setSavingConfig(false);
        return;
      }

      const statusChanged = editStatus !== detailsUser.status;
      const feeChanged = fee !== detailsUser.custom_fee;

      const { error } = await supabase
        .from("profiles")
        .update({
          status: editStatus,
          custom_fee: fee
        })
        .eq("id", detailsUser.id);

      if (error) throw error;

      const actions = [];
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      if (statusChanged) {
        actions.push(
          supabase.from("audit_logs").insert({
            admin_id: adminUser?.id,
            action: `CHANGE_USER_STATUS`,
            target_type: "profile",
            target_id: detailsUser.id,
            details: { previous_status: detailsUser.status, new_status: editStatus }
          })
        );
      }

      if (feeChanged) {
        actions.push(
          supabase.from("audit_logs").insert({
            admin_id: adminUser?.id,
            action: `CHANGE_USER_CUSTOM_FEE`,
            target_type: "profile",
            target_id: detailsUser.id,
            details: { previous_fee: detailsUser.custom_fee, new_fee: fee }
          })
        );
      }

      if (actions.length > 0) {
        await Promise.all(actions);
      }

      toast.success("Configurações do vendedor salvas com sucesso!");
      fetchUsers();
      setDetailsUser(prev => prev ? { ...prev, status: editStatus, custom_fee: fee } : null);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar configurações: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

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
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar vendedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(val) => {
            setFilter(val);
            if (val === "all") {
              searchParams.delete("filter");
            } else {
              searchParams.set("filter", val);
            }
            setSearchParams(searchParams);
          }}>
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
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Nenhum usuário encontrado.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/20 ${user.identity_status === 'pending' ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''}`}>
                      <td className="px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{user.full_name || "Sem nome"}</span>
                          {user.identity_status === 'pending' && (
                            <span className="relative flex h-2 w-2" title="Novo documento de identidade enviado">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                          )}
                        </div>
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
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetailsUser(user)}>
                          Detalhes
                        </Button>
                        <Dialog open={selectedUser?.id === user.id} onOpenChange={(open) => !open && setSelectedUser(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary" onClick={() => { setSelectedUser(user); setAction(null); setReason(""); }}>
                              Analisar
                            </Button>
                          </DialogTrigger>
                            <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Análise de Identidade (KYC)</DialogTitle>
                                <DialogDescription>
                                  Verifique se o documento corresponde à identidade e aprove para libertar saques.
                                </DialogDescription>
                              </DialogHeader>
                            
                             <div className="py-4 space-y-4">
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                                   <div className="col-span-1 sm:col-span-2 pt-2 pb-1 border-t border-border/50">
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
                                 <div className="flex flex-col sm:flex-row gap-2 pt-4">
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
                                   
                                   <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                                     <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAction(null)}>Voltar</Button>
                                     <Button 
                                       variant={action === "reject" ? "destructive" : "default"}
                                       className={action === "approve" ? "bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" : "w-full sm:w-auto"}
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

      {/* Modal de Detalhes e Gerenciamento do Vendedor */}
      <Dialog open={!!detailsUser} onOpenChange={(open) => !open && setDetailsUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <User className="w-5 h-5 text-primary" />
              Detalhes do Vendedor: {detailsUser?.full_name || "Sem nome"}
            </DialogTitle>
            <DialogDescription>
              Gerencie o status da conta, configure taxas personalizadas e consulte o desempenho do vendedor.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
            {/* Coluna da Esquerda: Configurações */}
            <div className="space-y-4 border-r pr-0 lg:pr-6 border-border/50">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Configurações da Conta</h3>
              
              <div className="space-y-2">
                <Label className="text-xs">E-mail do Vendedor</Label>
                <div className="p-2.5 bg-muted/40 rounded-lg text-xs font-semibold select-all break-all border border-border/50">
                  {detailsUser?.email}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Status do Vendedor</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status da conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Aprovado (Ativo)</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="blocked">Bloqueado (Banido)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Vendedores bloqueados ou suspensos não conseguem acessar o painel e seus checkouts ficam inativos.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Taxa de Saque Personalizada (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Ex: 8.5"
                    value={editCustomFee}
                    onChange={(e) => setEditCustomFee(e.target.value)}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Deixe vazio para usar a taxa padrão da plataforma (12% MZN / 8% BRL / 10% ZAR).
                </p>
              </div>

              <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full font-bold">
                {savingConfig ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>

            {/* Coluna da Direita: Dashboards e Listas */}
            <div className="lg:col-span-2 space-y-4">
              {loadingDetails ? (
                <div className="py-12 text-center text-muted-foreground">Carregando métricas do vendedor...</div>
              ) : (
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 max-w-md h-auto p-1 bg-muted/60">
                    <TabsTrigger value="overview" className="py-1.5 text-[11px] font-bold">Resumo</TabsTrigger>
                    <TabsTrigger value="products" className="py-1.5 text-[11px] font-bold">Produtos ({sellerProducts.length})</TabsTrigger>
                    <TabsTrigger value="orders" className="py-1.5 text-[11px] font-bold">Vendas ({sellerOrders.length})</TabsTrigger>
                    <TabsTrigger value="withdrawals" className="py-1.5 text-[11px] font-bold">Saques ({sellerWithdrawals.length})</TabsTrigger>
                  </TabsList>

                  {/* Aba Resumo */}
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 bg-muted/30 border border-border/50 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Vendas Legítimas</span>
                        <div className="text-xl font-black text-foreground flex items-center gap-1">
                          <ShoppingCart className="w-4 h-4 text-emerald-500" />
                          {sellerStats.salesCount}
                        </div>
                      </div>
                      <div className="p-4 bg-muted/30 border border-border/50 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Receita MZN</span>
                        <div className="text-xl font-black text-primary truncate" title={`${sellerStats.revenueMzn.toFixed(2)} MT`}>
                          {sellerStats.revenueMzn.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })} MT
                        </div>
                      </div>
                      <div className="p-4 bg-muted/30 border border-border/50 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Receita BRL</span>
                        <div className="text-xl font-black text-primary truncate" title={`R$ ${sellerStats.revenueBrl.toFixed(2)}`}>
                          R$ {sellerStats.revenueBrl.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="p-4 bg-muted/30 border border-border/50 rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Receita ZAR</span>
                        <div className="text-xl font-black text-primary truncate" title={`R ${sellerStats.revenueZar.toFixed(2)}`}>
                          R {sellerStats.revenueZar.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-dashed rounded-xl space-y-2 text-xs">
                      <p className="font-bold uppercase tracking-wider text-muted-foreground text-[10px] mb-2">Informações Adicionais do Vendedor</p>
                      <p><strong>Cadastrado em:</strong> {detailsUser ? new Date(detailsUser.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ""}</p>
                      <p>
                        <strong>Status de KYC:</strong>{" "}
                        <span className="font-semibold uppercase text-primary">
                          {detailsUser?.identity_status}
                        </span>
                      </p>
                      <p>
                        <strong>Taxa Personalizada:</strong>{" "}
                        {detailsUser?.custom_fee !== undefined && detailsUser?.custom_fee !== null 
                          ? `${detailsUser.custom_fee}%` 
                          : "Nenhuma (taxa padrão da plataforma)"}
                      </p>
                    </div>
                  </TabsContent>

                  {/* Aba Produtos */}
                  <TabsContent value="products" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                    {sellerProducts.length === 0 ? (
                      <p className="text-center py-6 text-xs text-muted-foreground">Nenhum produto cadastrado.</p>
                    ) : (
                      sellerProducts.map(p => (
                        <div key={p.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-foreground">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{p.delivery_type}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {p.currency === "BRL" ? `R$ ${Number(p.price).toFixed(2)}` : p.currency === "ZAR" ? `R ${Number(p.price).toFixed(2)}` : `${Number(p.price).toFixed(2)} MT`}
                            </p>
                            <Badge className={p.status === "approved" ? "bg-green-500/10 text-green-600 hover:bg-green-500/10 border-0" : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 border-0"}>
                              {p.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Aba Vendas */}
                  <TabsContent value="orders" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                    {sellerOrders.length === 0 ? (
                      <p className="text-center py-6 text-xs text-muted-foreground">Nenhuma venda registrada.</p>
                    ) : (
                      sellerOrders.map(o => (
                        <div key={o.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-foreground">{o.customer_name}</p>
                            <p className="text-[10px] text-muted-foreground">{o.products?.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {o.currency === "BRL" ? `R$ ${Number(o.price).toFixed(2)}` : o.currency === "ZAR" ? `R ${Number(o.price).toFixed(2)}` : `${Number(o.price).toFixed(2)} MT`}
                            </p>
                            <Badge className={["paid", "delivered"].includes(o.status) ? "bg-green-500/10 text-green-600 hover:bg-green-500/10 border-0" : "bg-red-500/10 text-red-600 hover:bg-red-500/10 border-0"}>
                              {o.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Aba Saques */}
                  <TabsContent value="withdrawals" className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                    {sellerWithdrawals.length === 0 ? (
                      <p className="text-center py-6 text-xs text-muted-foreground">Nenhum saque solicitado.</p>
                    ) : (
                      sellerWithdrawals.map(w => (
                        <div key={w.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-foreground">Saque #{w.id.slice(0, 8)}</p>
                            <p className="text-[10px] text-muted-foreground">{w.payment_method} - {new Date(w.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">
                              {w.currency === "BRL" ? `R$ ${Number(w.amount).toFixed(2)}` : w.currency === "ZAR" ? `R ${Number(w.amount).toFixed(2)}` : `${Number(w.amount).toFixed(2)} MT`}
                            </p>
                            <Badge className={w.status === "completed" ? "bg-green-500/10 text-green-600 hover:bg-green-500/10 border-0" : w.status === "pending" ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 border-0" : "bg-red-500/10 text-red-600 hover:bg-red-500/10 border-0"}>
                              {w.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-border/50 pt-4 mt-2">
            <Button variant="outline" onClick={() => setDetailsUser(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminUsers;

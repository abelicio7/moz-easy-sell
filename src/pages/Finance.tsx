import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, ArrowUpRight, ArrowDownToLine, Clock, CheckCircle2, XCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Withdrawal {
  id: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  payment_method: string;
  payment_details: string;
  created_at: string;
}

interface SavedMethod {
  id: string;
  method_type: string;
  account_name: string;
  account_number: string;
  is_default: boolean;
}

const Finance = () => {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [accountName, setAccountName] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("new");
  const [saveMethod, setSaveMethod] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const WITHDRAWAL_FEE_PERCENT = 0.10; // 10%

  useEffect(() => {
    if (!user) return;
    fetchFinancialData();
    fetchSavedMethods();
  }, [user]);

  const fetchFinancialData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all commissions for this user (both as seller and affiliate)
    const { data: commissionData, error: commError } = await supabase
      .from("commissions")
      .select("amount")
      .eq("user_id", user.id);

    if (commError) {
      console.error("Error fetching commissions:", commError);
    }

    const revenue = (commissionData || []).reduce((sum, comm) => sum + Number(comm.amount), 0);
    setTotalRevenue(revenue);

    // Fetch withdrawals safely handling missing table structure if migration not run yet
    try {
      const { data: wData, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (!error && wData) {
        setWithdrawals(wData as Withdrawal[]);
      }
    } catch(err) {
      console.error("Migration missing or error:", err);
    }
    
    setLoading(false);
  };

  const fetchSavedMethods = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("withdrawal_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { descending: true });
      
      if (!error && data) {
        setSavedMethods(data as SavedMethod[]);
        // If there are methods, select the first one by default
        if (data.length > 0) {
          handleMethodSelect(data[0].id, data);
        }
      }
    } catch (err) {
      console.error("Error fetching saved methods:", err);
    }
  };

  const handleMethodSelect = (id: string, methodsList = savedMethods) => {
    setSelectedMethodId(id);
    if (id === "new") {
      setPaymentMethod("");
      setPaymentDetails("");
      setAccountName("");
    } else {
      const method = methodsList.find(m => m.id === id);
      if (method) {
        setPaymentMethod(method.method_type);
        setPaymentDetails(method.account_number);
        setAccountName(method.account_name);
      }
    }
  };

  // Compute metrics
  const totalWithdrawnAndPending = withdrawals
    .filter(w => w.status === 'completed' || w.status === 'pending')
    .reduce((sum, w) => sum + Number(w.amount), 0);
    
  const availableBalance = totalRevenue - totalWithdrawnAndPending;

  const numAmount = Number(amount) || 0;
  const feeAmount = numAmount * WITHDRAWAL_FEE_PERCENT;
  const netAmount = numAmount - feeAmount;

  const handleWithdrawalRequest = async () => {
    if (!user) return;
    
    if (!numAmount || numAmount <= 0) {
      toast.error("Insira um valor válido.");
      return;
    }
    if (numAmount > availableBalance) {
      toast.error("Valor solicitado excede o saldo disponível.");
      return;
    }
    if (!paymentMethod) {
      toast.error("Selecione um método de pagamento.");
      return;
    }
    if (!paymentDetails || paymentDetails.length < 5) {
      toast.error("Insira os detalhes corretos para o recebimento.");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Save method if requested
      if (selectedMethodId === "new" && saveMethod) {
        await supabase.from("withdrawal_methods").insert({
          user_id: user.id,
          method_type: paymentMethod,
          account_name: accountName,
          account_number: paymentDetails
        });
      }

      // 2. Register withdrawal
      const { error } = await supabase
        .from("withdrawals")
        .insert({
          user_id: user.id,
          amount: numAmount,
          fee_amount: feeAmount,
          net_amount: netAmount,
          payment_method: paymentMethod,
          payment_details: `${paymentDetails} (${accountName})`,
          status: 'pending'
        });

      if (error) throw error;

      toast.success("Solicitação de saque enviada com sucesso!");
      
      // Notify Admins about the withdrawal request
      try {
        await supabase.functions.invoke("notify-admins", {
          body: { 
            subject: `💰 NOVO PEDIDO DE SAQUE: ${numAmount} MT`, 
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #111827;">Novo Pedido de Saque 💰</h2>
                <p>Um vendedor solicitou um levantamento de fundos:</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                  <p><strong>Vendedor:</strong> ${user.user_metadata?.full_name || user.email}</p>
                  <p><strong>Valor Bruto:</strong> ${numAmount} MT</p>
                  <p><strong>Valor Líquido (após taxas):</strong> ${netAmount} MT</p>
                  <p><strong>Método:</strong> ${paymentMethod}</p>
                  <p><strong>Dados:</strong> ${paymentDetails} (${accountName})</p>
                </div>
                <a href="${window.location.origin}/admin/withdrawals" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Aceder Painel de Saques</a>
              </div>
            `
          }
        });
      } catch (notifErr) {
        console.error("Error notifying admin about withdrawal:", notifErr);
      }

      setModalOpen(false);
      setAmount("");
      fetchFinancialData();
      fetchSavedMethods();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao solicitar saque.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground mt-1 text-lg">Acompanhe seu saldo e solicite saques.</p>
        </div>
        
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="font-bold flex items-center gap-2" disabled={availableBalance <= 0 || loading}>
              <ArrowDownToLine className="w-4 h-4" />
              Solicitar Saque
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Solicitação de Saque</DialogTitle>
              <DialogDescription>
                Disponível para saque: <strong className="text-primary">{availableBalance.toFixed(2)} MT</strong>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>Valor do Saque (MT)</Label>
                <div className="relative">
                   <Input 
                    type="number"
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-16 text-lg font-bold"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">MT</div>
                </div>
                {numAmount > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1 border border-border/50 animate-in fade-in slide-in-from-top-1">
                    <div className="flex justify-between text-xs">
                      <span>Subtotal:</span>
                      <span>{numAmount.toFixed(2)} MT</span>
                    </div>
                    <div className="flex justify-between text-xs text-destructive">
                      <span>Taxa EnsinaPay (10%):</span>
                      <span>- {feeAmount.toFixed(2)} MT</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1 mt-1 text-foreground">
                      <span>Você Receberá:</span>
                      <span className="text-primary">{netAmount.toFixed(2)} MT</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Método de Saque</Label>
                  <Select value={selectedMethodId} onValueChange={handleMethodSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ Usar novo método</SelectItem>
                      {savedMethods.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.method_type}: {m.account_number} ({m.account_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMethodId === "new" && (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50 animate-in fade-in zoom-in-95">
                    <div className="space-y-2">
                      <Label className="text-xs">Tipo de Carteira</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                          <SelectItem value="E-Mola">E-Mola</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Número</Label>
                        <Input 
                          placeholder="84/85..." 
                          value={paymentDetails}
                          onChange={(e) => setPaymentDetails(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Titular da Conta</Label>
                        <Input 
                          placeholder="Nome completo" 
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <input 
                        type="checkbox" 
                        id="save_method" 
                        checked={saveMethod} 
                        onChange={(e) => setSaveMethod(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <label htmlFor="save_method" className="text-xs text-muted-foreground cursor-pointer">
                        Salvar este método para saques futuros
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-6 rounded-b-lg mt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleWithdrawalRequest} disabled={submitting || numAmount <= 0} className="px-8">
                {submitting ? "Processando..." : "Confirmar Saque"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Calculando finanças...</div>
      ) : (
        <div className="space-y-8">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border/50 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Disponível</p>
                </div>
                <p className="text-3xl font-black text-foreground">{availableBalance.toFixed(2)} MZN</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Saques Pendentes</p>
                </div>
                <p className="text-3xl font-black text-foreground">
                  {withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + Number(w.amount), 0).toFixed(2)} MZN
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Ganhos Totais (Vitalício)</p>
                </div>
                <p className="text-3xl font-black text-foreground">{totalRevenue.toFixed(2)} MZN</p>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal Information */}
          <Card className="bg-muted/30 border-muted">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Banknote className="w-4 h-4 text-primary" />
                Informações sobre Saques
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-foreground/80">Processamento:</strong> 1-2 dias úteis, das 7:30h até 17:30h</li>
                <li><strong className="text-foreground/80">Taxa Administrativa:</strong> 10% fixo por saque</li>
                <li><strong className="text-foreground/80">Canais suportados:</strong> M-Pesa e E-Mola</li>
              </ul>
              <div className="space-y-1 pt-2 border-t border-border/50">
                <p className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span>Não nos responsabilizamos por informações incorretas fornecidas pelo usuário.</span>
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>É responsabilidade do usuário manter seus dados atualizados e verificar todas as informações antes de confirmar transações.</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawals History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Saques</CardTitle>
              <CardDescription>Acompanhe aqui o andamento de todos os seus pedidos de transferência.</CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <Banknote className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum saque solicitado ainda.</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs uppercase bg-muted/40 border-b border-border/50">
                      <tr>
                        <th className="px-4 py-4 font-bold text-foreground">Data</th>
                        <th className="px-4 py-4 font-bold text-foreground">Destino</th>
                        <th className="px-4 py-4 font-bold text-foreground">Valor Bruto</th>
                        <th className="px-4 py-4 font-bold text-foreground">Taxa (10%)</th>
                        <th className="px-4 py-4 font-bold text-foreground">Líquido</th>
                        <th className="px-4 py-4 font-bold text-foreground text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                            {new Date(w.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-4 font-medium text-foreground">
                            {w.payment_method}
                            <span className="block text-[10px] font-normal text-muted-foreground truncate max-w-[150px]">
                              {w.payment_details}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-semibold text-foreground">
                            {Number(w.amount).toFixed(2)} MT
                          </td>
                          <td className="px-4 py-4 text-destructive/80">
                            - {(Number(w.fee_amount) || 0).toFixed(2)} MT
                          </td>
                          <td className="px-4 py-4 font-black text-primary">
                            {(Number(w.net_amount) || Number(w.amount)).toFixed(2)} MT
                          </td>
                          <td className="px-4 py-4 text-right">
                            {w.status === 'completed' && <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0 shadow-none"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>}
                            {w.status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-0 shadow-none"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>}
                            {w.status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0 shadow-none"><XCircle className="w-3 h-3 mr-1" /> Recusado</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Finance;

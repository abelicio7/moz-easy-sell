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
  status: string;
  payment_method: string;
  payment_details: string;
  created_at: string;
}

const Finance = () => {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchFinancialData();
  }, [user]);

  const fetchFinancialData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all paid orders for this user to calculate total generated revenue
    const { data: orders } = await supabase
      .from("orders")
      .select("price, products!inner(user_id)")
      .eq("products.user_id", user.id)
      .eq("status", "paid");

    const revenue = (orders || []).reduce((sum, order) => sum + (order.price || 0), 0);
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

  // Compute metrics
  const totalWithdrawnAndPending = withdrawals
    .filter(w => w.status === 'completed' || w.status === 'pending')
    .reduce((sum, w) => sum + Number(w.amount), 0);
    
  const availableBalance = totalRevenue - totalWithdrawnAndPending;

  const handleWithdrawalRequest = async () => {
    if (!user) return;
    
    const numAmount = Number(amount);
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
      const { data, error } = await supabase
        .from("withdrawals")
        .insert({
          user_id: user.id,
          amount: numAmount,
          payment_method: paymentMethod,
          payment_details: paymentDetails,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Solicitação de saque enviada com sucesso!");
      setModalOpen(false);
      setAmount("");
      setPaymentDetails("");
      fetchFinancialData(); // Refresh list and balance
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitação de Saque</DialogTitle>
              <DialogDescription>
                Transfira o seu saldo disponível para a sua conta. Valor disponível: <strong className="text-primary">{availableBalance.toFixed(2)} MZN</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Valor a sacar (MZN)</Label>
                <Input 
                  type="number"
                  placeholder="Ex: 500.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={availableBalance}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Método de Recebimento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                    <SelectItem value="E-Mola">E-Mola</SelectItem>
                    <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Detalhes (Número ou Conta)</Label>
                <Input 
                  placeholder={paymentMethod === 'Transferência Bancária' ? "O seu NIB/IBAN, Titular e Banco" : "Número de telefone"}
                  value={paymentDetails}
                  onChange={(e) => setPaymentDetails(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Este é o destino onde a nossa equipe fará o depósito.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleWithdrawalRequest} disabled={submitting}>
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
                        <th className="px-4 py-3 font-semibold text-foreground">Data</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Método</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Destino (Conta)</th>
                        <th className="px-4 py-3 font-semibold text-foreground">Valor</th>
                        <th className="px-4 py-3 font-semibold text-foreground text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            {new Date(w.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {w.payment_method}
                          </td>
                          <td className="px-4 py-3">
                            {w.payment_details}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground">
                            {Number(w.amount).toFixed(2)} MZN
                          </td>
                          <td className="px-4 py-3 text-right">
                            {w.status === 'completed' && <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Concluído</Badge>}
                            {w.status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-0"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>}
                            {w.status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0"><XCircle className="w-3 h-3 mr-1" /> Recusado</Badge>}
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

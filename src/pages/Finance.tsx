import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, ArrowUpRight, ArrowDownToLine, Clock, CheckCircle2, XCircle, Banknote, Trash2 } from "lucide-react";
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
  currency?: string;
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
  const [currency, setCurrency] = useState<"MZN" | "BRL" | "ZAR">("MZN");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [orders, setOrders] = useState<{ price: number; currency: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [identityStatus, setIdentityStatus] = useState<string>("unverified");
  
  // KYC Modal state
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [accountName, setAccountName] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("new");
  const [saveMethod, setSaveMethod] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customFee, setCustomFee] = useState<number | null>(null);

  const WITHDRAWAL_FEE_PERCENT = customFee !== null ? customFee / 100 : (currency === "BRL" ? 0.08 : currency === "ZAR" ? 0.10 : 0.12);

  useEffect(() => {
    if (!user) return;
    fetchFinancialData();
    fetchSavedMethods();
  }, [user]);

  const fetchFinancialData = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all paid/delivered orders for this user's products
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("price, currency, products!inner(user_id)")
      .in("status", ["paid", "delivered"])
      .eq("products.user_id", user.id);

    if (orderError) {
      console.error("Error fetching orders for revenue:", orderError);
    }

    if (orderData) {
      setOrders(orderData.map(o => ({ price: Number(o.price), currency: o.currency })));
    }

    // Fetch profile identity status & custom fee
    const { data: profile } = await supabase
      .from("profiles")
      .select("identity_status, custom_fee")
      .eq("id", user.id)
      .single();
      
    if (profile) {
      setIdentityStatus(profile.identity_status || 'unverified');
      setCustomFee(profile.custom_fee !== undefined ? profile.custom_fee : null);
    }

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

  const deleteSavedMethod = async (id: string) => {
    if (!confirm("Tem a certeza que deseja remover este método de saque?")) return;
    try {
      const { error } = await supabase
        .from("withdrawal_methods")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Método de saque removido com sucesso!");
      fetchSavedMethods();
    } catch (err: any) {
      console.error("Error deleting saved method:", err);
      toast.error("Erro ao remover método de saque: " + err.message);
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

  // Auto-select saved method based on selected currency
  useEffect(() => {
    const filtered = savedMethods.filter(m => {
      if (currency === "BRL") {
        return m.method_type === "Pix" || m.method_type === "Transferência Bancária";
      } else if (currency === "ZAR") {
        return m.method_type === "EFT";
      } else {
        return m.method_type === "M-Pesa" || m.method_type === "E-Mola";
      }
    });
    if (filtered.length > 0) {
      handleMethodSelect(filtered[0].id, savedMethods);
    } else {
      handleMethodSelect("new", savedMethods);
    }
  }, [currency, savedMethods]);

  // Compute metrics
  const totalRevenue = useMemo(() => {
    return orders
      .filter(o => (o.currency || 'MZN') === currency)
      .reduce((sum, o) => sum + Number(o.price), 0);
  }, [orders, currency]);

  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => (w.currency || 'MZN') === currency);
  }, [withdrawals, currency]);

  const totalWithdrawnAndPending = useMemo(() => {
    return filteredWithdrawals
      .filter(w => w.status === 'completed' || w.status === 'pending')
      .reduce((sum, w) => sum + Number(w.amount), 0);
  }, [filteredWithdrawals]);
    
  const availableBalance = totalRevenue - totalWithdrawnAndPending;

  const numAmount = Number(amount) || 0;
  const feeAmount = numAmount * WITHDRAWAL_FEE_PERCENT;
  const netAmount = numAmount - feeAmount;

  const formatCurrency = (val: number) => {
    if (currency === "BRL") {
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else if (currency === "ZAR") {
      return val.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
    }
    return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
  };

  const formatWithdrawalCurrency = (val: number, wCurrency?: string) => {
    const curr = wCurrency || "MZN";
    if (curr === "BRL") {
      return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else if (curr === "ZAR") {
      return val.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' });
    }
    return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`;
  };

  const handleKycUpload = async () => {
    if (!user || !docFile) return;
    
    // Check file size (max 5MB)
    if (docFile.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB.");
      return;
    }
    
    try {
      setUploadingDoc(true);
      
      const fileExt = docFile.name.split('.').pop();
      const fileName = `${user.id}_${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc_documents')
        .upload(filePath, docFile, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: publicUrlData } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(filePath);
        
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          identity_status: 'pending',
          identity_document_url: publicUrlData.publicUrl
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      toast.success("Documento enviado com sucesso! Aguarde a análise da nossa equipa (1-2 dias).");
      setIdentityStatus('pending');
      setKycModalOpen(false);
      
      // Notificar admins
      try {
        const adminHtmlContent = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Alerta de Administração: Novo KYC</h2>
            </div>
            <div style="padding: 32px; line-height: 1.6; color: #334155;">
              <p style="font-size: 16px; margin-top: 0; margin-bottom: 20px;">Olá, Administrador.</p>
              <p style="font-size: 15px; margin-bottom: 20px;">Um novo vendedor enviou um documento de identidade para análise de verificação KYC. Detalhes do vendedor:</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Nome:</strong> ${user.user_metadata?.full_name || 'Vendedor'}</p>
                <p style="margin: 0; font-size: 14px;"><strong>E-mail:</strong> ${user.email}</p>
              </div>
              <div style="text-align: center;">
                <a href="${window.location.origin}/admin/users?filter=pending" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Aceder Painel de KYC</a>
              </div>
            </div>
          </div>
        `;

        await supabase.functions.invoke("notify-admins", {
          body: { 
            subject: `🪪 NOVO DOCUMENTO KYC: ${user.user_metadata?.full_name || user.email}`, 
            htmlContent: adminHtmlContent
          }
        });
      } catch (adminErr) {
        console.error("Erro ao notificar admins sobre KYC:", adminErr);
      }

      // Notificar vendedor por e-mail
      try {
        const sellerHtmlContent = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="background-color: #0f172a; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Verificação de Identidade Recebida</h1>
            </div>
            <div style="padding: 40px 32px; line-height: 1.6; color: #334155;">
              <p style="font-size: 16px; margin-top: 0; margin-bottom: 24px;">Olá, <strong>${user.user_metadata?.full_name || 'Vendedor'}</strong>.</p>
              
              <p style="font-size: 15px; margin-bottom: 24px;">Confirmamos com sucesso a receção do seu documento de identificação para análise do processo de KYC (Know Your Customer).</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="margin-top: 0; margin-bottom: 8px; color: #1e3a8a; font-size: 15px;">🔍 O que acontece a seguir?</h3>
                <p style="margin: 0; font-size: 14px; color: #475569;">A nossa equipa de conformidade está a analisar o seu documento. Este processo serve para garantir a segurança dos seus saques e cumprir as regulamentações financeiras.</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Prazo Estimado de Análise</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">12 a 24 horas úteis</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Notificação</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #0f172a; text-align: right;">Enviaremos um e-mail assim que for aprovado ou se necessitarmos de novo documento</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">Saques</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600; color: #10b981; text-align: right;">Liberados imediatamente após aprovação</td>
                </tr>
              </table>
              
              <p style="font-size: 15px; margin-bottom: 32px;">Se tiver alguma dúvida sobre o processo de verificação ou precisar de ajuda, sinta-se à vontade para entrar em contacto com a nossa equipa de suporte técnico.</p>
              
              <div style="text-align: center; margin-bottom: 16px;">
                <a href="${window.location.origin}/dashboard" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Ir para o Painel</a>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} EnsinaPay. Todos os direitos reservados.</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Este é um e-mail automático do sistema. Por favor, não responda diretamente.</p>
            </div>
          </div>
        `;

        await supabase.functions.invoke("send-email-notification", {
          body: { 
            to: user.email, 
            subject: "🪪 Documento de Identificação Recebido - EnsinaPay", 
            htmlContent: sellerHtmlContent,
            senderName: "EnsinaPay"
          }
        });
      } catch (sellerErr) {
        console.error("Erro ao enviar e-mail de confirmação de KYC ao vendedor:", sellerErr);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao fazer upload do documento.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleWithdrawalRequest = async () => {
    if (!user) return;
    
    const minAmount = currency === "BRL" ? 50 : currency === "ZAR" ? 150 : 500;
    const currencySymbol = currency === "BRL" ? "R$" : currency === "ZAR" ? "R" : "MT";

    if (!numAmount || numAmount < minAmount) {
      toast.error(`O valor mínimo para saque é de ${currencySymbol} ${minAmount}.`);
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
          status: 'pending',
          currency: currency
        });

      if (error) throw error;

      toast.success("Solicitação de saque enviada com sucesso!");
      
      const formattedAmount = formatCurrency(numAmount);
      const formattedNetAmount = formatCurrency(netAmount);

      // Notify Seller about the withdrawal processing
      try {
        await supabase.functions.invoke("send-email-notification", {
          body: { 
            to: user.email, 
            subject: "Pedido de Saque em Processamento - EnsinaPay", 
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #f59e0b;">Saque em Processamento ⏳</h2>
                <p>Olá, <strong>${user.user_metadata?.full_name || 'Vendedor(a)'}</strong>.</p>
                <p>Confirmamos a receção do seu pedido de saque no valor bruto de <strong>${formattedAmount}</strong>.</p>
                <p>A nossa equipa financeira está neste momento a validar e processar a transferência para o método selecionado.</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Valor Líquido a Receber:</strong> <span style="color: #10b981; font-weight: bold;">${formattedNetAmount}</span></p>
                  <p style="margin: 5px 0;"><strong>Método de Recebimento:</strong> ${paymentMethod} (${paymentDetails} - ${accountName})</p>
                  <p style="margin: 5px 0;"><strong>Prazo Estimado:</strong> 1-2 dias úteis</p>
                </div>
                <p>Receberá um novo aviso assim que a transferência for concluída (ou rejeitada caso haja dados incorretos).</p>
                <p style="font-size: 12px; color: #666; margin-top: 30px;">Obrigado por utilizar a EnsinaPay!</p>
              </div>
            `,
            senderName: "EnsinaPay Financeiro"
          }
        });
      } catch (sellerNotifErr) {
        console.error("Error notifying seller about withdrawal:", sellerNotifErr);
      }

      // Notify Admins about the withdrawal request
      try {
        await supabase.functions.invoke("notify-admins", {
          body: { 
            subject: `💰 NOVO PEDIDO DE SAQUE: ${formattedAmount}`, 
            htmlContent: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #111827;">Novo Pedido de Saque 💰</h2>
                <p>Um vendedor solicitou um levantamento de fundos:</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                  <p><strong>Vendedor:</strong> ${user.user_metadata?.full_name || user.email}</p>
                  <p><strong>Valor Bruto:</strong> ${formattedAmount}</p>
                  <p><strong>Valor Líquido (após taxas):</strong> ${formattedNetAmount}</p>
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
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          {/* Currency Switcher */}
          <div className="flex bg-muted/65 p-1.5 rounded-2xl border border-border/50 shrink-0 gap-1">
            <button
              onClick={() => setCurrency("MZN")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                currency === "MZN"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Moçambique (MZN)
            </button>
            <button
              onClick={() => setCurrency("BRL")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                currency === "BRL"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Brasil (BRL)
            </button>
            <button
              onClick={() => setCurrency("ZAR")}
              className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                currency === "ZAR"
                  ? "bg-primary text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              África do Sul (ZAR)
            </button>
          </div>

          <Dialog open={modalOpen} onOpenChange={(open) => {
            if (open) {
              const minVal = currency === "BRL" ? 50 : currency === "ZAR" ? 150 : 500;
              const unitSymbol = currency === "BRL" ? "R$" : currency === "ZAR" ? "R" : "MT";
              if (totalRevenue === 0) {
                toast.error("🔒 Faça pelo menos uma venda para poder registar as suas informações de saque.");
                return;
              }
              if (availableBalance < minVal) {
                toast.error(`O valor mínimo para realizar um saque e guardar os seus dados é de ${unitSymbol} ${minVal}.`);
                return;
              }
              if (identityStatus === 'unverified' || identityStatus === 'rejected') {
                setKycModalOpen(true);
                return;
              } else if (identityStatus === 'pending') {
                toast.info("A aguardar verificação de identidade. Por favor, aguarde a aprovação do seu documento para solicitar saques.");
                return;
              }
            }
            setModalOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="font-bold flex items-center gap-2 w-full sm:w-auto justify-center" disabled={loading}>
                <ArrowDownToLine className="w-4 h-4" />
                Solicitar Saque
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Solicitação de Saque</DialogTitle>
                <DialogDescription>
                  Disponível para saque: <strong className="text-primary">{formatCurrency(availableBalance)}</strong>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Valor do Saque ({currency === "BRL" ? "R$" : currency === "ZAR" ? "R" : "MT"})</Label>
                  <div className="relative">
                     <Input 
                      type="number"
                      placeholder={currency === "BRL" ? "Min: R$ 50" : currency === "ZAR" ? "Min: R 150" : "Min: 500 MT"} 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-16 text-lg font-bold"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      {currency === "BRL" ? "R$" : currency === "ZAR" ? "R" : "MT"}
                    </div>
                  </div>
                  {numAmount > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-1 border border-border/50 animate-in fade-in slide-in-from-top-1">
                      <div className="flex justify-between text-xs">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(numAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-destructive">
                        <span>Taxa EnsinaPay ({(WITHDRAWAL_FEE_PERCENT * 100).toFixed(0)}%):</span>
                        <span>- {formatCurrency(feeAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1 mt-1 text-foreground">
                        <span>Você Receberá:</span>
                        <span className="text-primary">{formatCurrency(netAmount)}</span>
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
                        {savedMethods
                          .filter(m => {
                            if (currency === "BRL") {
                              return m.method_type === "Pix" || m.method_type === "Transferência Bancária";
                            } else if (currency === "ZAR") {
                              return m.method_type === "EFT";
                            } else {
                              return m.method_type === "M-Pesa" || m.method_type === "E-Mola";
                            }
                          })
                          .map(m => (
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
                        <Label className="text-xs">Tipo de Carteira / Método</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {currency === "BRL" ? (
                              <>
                                <SelectItem value="Pix">Pix</SelectItem>
                                <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                              </>
                            ) : currency === "ZAR" ? (
                              <>
                                <SelectItem value="EFT">EFT (Transferência Bancária)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                                <SelectItem value="E-Mola">E-Mola</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">
                            {currency === "BRL" 
                              ? (paymentMethod === "Pix" ? "Chave Pix" : "Agência / Conta")
                              : currency === "ZAR"
                                ? "Dados Bancários"
                                : "Número"
                            }
                          </Label>
                          <Input 
                            placeholder={currency === "BRL" 
                              ? (paymentMethod === "Pix" ? "CPF, E-mail, Celular..." : "Agência e Conta")
                              : currency === "ZAR"
                                ? "Banco, Agência e Conta"
                                : "84/85..."
                            } 
                            value={paymentDetails}
                            onChange={(e) => setPaymentDetails(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">
                            {currency === "BRL" ? "Nome do Beneficiário" : currency === "ZAR" ? "Titular da Conta" : "Titular da Conta"}
                          </Label>
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

        {/* KYC Verification Modal */}
        <Dialog open={kycModalOpen} onOpenChange={setKycModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verificação de Identidade Obrigatória</DialogTitle>
              <DialogDescription>
                Para garantir a segurança dos seus fundos, novos vendedores ou contas não verificadas precisam enviar um <strong>Documento de Identidade</strong> (BI ou Passaporte) antes de realizar o primeiro saque.
                <br/><br/>
                <span className="text-destructive font-semibold">
                  Atenção: O nome no documento deve coincidir com o nome do titular da conta de destino ({currency === "BRL" ? "Pix ou Conta Bancária" : currency === "ZAR" ? "EFT" : "M-Pesa ou E-Mola"}) escolhida para o saque.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
               {identityStatus === 'rejected' && (
                 <div className="p-3 bg-destructive/10 text-destructive text-sm rounded border border-destructive/20 mb-4">
                   O seu documento anterior foi rejeitado. Por favor, envie uma imagem clara e legível do seu BI ou passaporte.
                 </div>
               )}
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anexar Imagem do Documento (BI ou Passaporte)</Label>
                  <div className="relative border-2 border-dashed border-primary/20 hover:border-primary/50 rounded-2xl p-6 text-center hover:bg-muted/10 transition-all overflow-hidden group">
                    {/* Neon scanner laser animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite] pointer-events-none" />
                    
                    <style>{`
                      @keyframes scan {
                        0%, 100% { top: 0%; opacity: 0.1; }
                        50% { top: 100%; opacity: 0.9; }
                      }
                    `}</style>
                    
                    <input 
                      type="file" 
                      accept="image/*,.heic,.heif,.pdf,.docx,.doc" 
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">🪪</span>
                      <p className="text-xs font-bold text-foreground">
                        {docFile ? docFile.name : "Clique para selecionar ou arraste o arquivo"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Máx: 5MB • Formatos aceitos: PNG, JPG, HEIC, PDF, DOC/DOCX</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic text-center">O processo de aprovação do seu documento levará em média 12 a 24 horas.</p>
                </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setKycModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleKycUpload} disabled={!docFile || uploadingDoc}>
                {uploadingDoc ? "Enviando..." : "Enviar para Verificação"}
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
                <p className="text-3xl font-black text-foreground">{formatCurrency(availableBalance)}</p>
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
                  {formatCurrency(filteredWithdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + Number(w.amount), 0))}
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
                <p className="text-3xl font-black text-foreground">{formatCurrency(totalRevenue)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left side: Info & Payout Cards (Col span 5) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Meus Métodos Salvos */}
              <Card className="border-border/50 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    Métodos de Recebimento Salvos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {savedMethods.filter(m => {
                    if (currency === "BRL") {
                      return m.method_type === "Pix" || m.method_type === "Transferência Bancária";
                    } else if (currency === "ZAR") {
                      return m.method_type === "EFT";
                    } else {
                      return m.method_type === "M-Pesa" || m.method_type === "E-Mola";
                    }
                  }).length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
                      <p className="text-xs text-muted-foreground max-w-[220px] mx-auto leading-normal">
                        Nenhum método de saque salvo para {currency === "BRL" ? "Brasil" : currency === "ZAR" ? "África do Sul" : "Moçambique"}. Adicione um método ao solicitar seu próximo saque.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedMethods
                        .filter(m => {
                          if (currency === "BRL") {
                            return m.method_type === "Pix" || m.method_type === "Transferência Bancária";
                          } else if (currency === "ZAR") {
                            return m.method_type === "EFT";
                          } else {
                            return m.method_type === "M-Pesa" || m.method_type === "E-Mola";
                          }
                        })
                        .map(m => {
                          const isMpesa = m.method_type.toLowerCase().includes("pesa");
                          const isEmola = m.method_type.toLowerCase().includes("mola");
                          const isPix = m.method_type.toLowerCase().includes("pix");
                          const isEft = m.method_type.toLowerCase().includes("eft");
                          
                          return (
                            <div 
                              key={m.id}
                              className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md border-0 transition-transform hover:scale-[1.01] ${
                                isMpesa 
                                  ? 'bg-gradient-to-br from-[#E51B24] to-[#8A0A12]' 
                                  : isEmola
                                    ? 'bg-gradient-to-br from-[#F57C00] to-[#b34700]'
                                    : isPix
                                      ? 'bg-gradient-to-br from-[#00bfa5] to-[#00796b]'
                                      : isEft
                                        ? 'bg-gradient-to-br from-[#005c53] to-[#042940]'
                                        : 'bg-gradient-to-br from-slate-700 to-slate-800'
                              }`}
                            >
                              {/* Virtual chip decoration */}
                              <div className="absolute right-6 top-6 w-8 h-6 bg-yellow-400/20 border border-yellow-400/30 rounded-md flex items-center justify-center opacity-70">
                                <div className="grid grid-cols-3 gap-0.5 w-6 h-4">
                                  <div className="border-[0.5px] border-yellow-400/50 rounded-sm"></div>
                                  <div className="border-[0.5px] border-yellow-400/50 rounded-sm"></div>
                                  <div className="border-[0.5px] border-yellow-400/50 rounded-sm"></div>
                                  <div className="border-[0.5px] border-yellow-400/50 rounded-sm"></div>
                                  <div className="border-[0.5px] border-yellow-400/50 rounded-sm"></div>
                                  <div className="border-[0.5px] border-yellow-400/50 rounded-sm"></div>
                                </div>
                              </div>
                              
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">{m.method_type}</p>
                              <h4 className="text-lg font-black tracking-wider mt-4 mb-2">
                                {m.account_number.length > 8 
                                  ? `${m.account_number.slice(0, 3)} •••• ${m.account_number.slice(-3)}` 
                                  : m.account_number}
                              </h4>
                              <div className="flex items-center justify-between mt-4">
                                <div>
                                  <p className="text-[8px] font-semibold uppercase tracking-wider text-white/50">Titular</p>
                                  <p className="text-xs font-bold truncate max-w-[180px]">{m.account_name.toUpperCase()}</p>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => deleteSavedMethod(m.id)}
                                  className="h-7 w-7 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                                  title="Remover método"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>

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
                    <li><strong className="text-foreground/80">Taxa Administrativa:</strong> {(WITHDRAWAL_FEE_PERCENT * 100).toFixed(0)}% fixo por saque</li>
                    <li>
                      <strong className="text-foreground/80">Canais suportados:</strong>{" "}
                      {currency === "BRL" ? "Pix e Transferência Bancária" : currency === "ZAR" ? "EFT (Transferência Bancária)" : "M-Pesa e E-Mola"}
                    </li>
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
            </div>

            {/* Right side: History (Col span 7) */}
            <div className="lg:col-span-7">
              {/* Withdrawals History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico de Saques</CardTitle>
                  <CardDescription>Acompanhe aqui o andamento de todos os seus pedidos de transferência.</CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredWithdrawals.length === 0 ? (
                    <div className="py-12 text-center flex flex-col items-center justify-center">
                      <Banknote className="w-10 h-10 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Nenhum saque solicitado ainda para esta moeda.</p>
                    </div>
                  ) : (
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm text-left text-muted-foreground">
                        <thead className="text-xs uppercase bg-muted/40 border-b border-border/50">
                          <tr>
                            <th className="px-4 py-4 font-bold text-foreground">Data</th>
                            <th className="px-4 py-4 font-bold text-foreground">Destino</th>
                            <th className="px-4 py-4 font-bold text-foreground">Valor Bruto</th>
                            <th className="px-4 py-4 font-bold text-foreground">Taxa ({(WITHDRAWAL_FEE_PERCENT * 100).toFixed(0)}%)</th>
                            <th className="px-4 py-4 font-bold text-foreground">Líquido</th>
                            <th className="px-4 py-4 font-bold text-foreground text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWithdrawals.map((w) => (
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
                                {formatWithdrawalCurrency(Number(w.amount), w.currency)}
                              </td>
                              <td className="px-4 py-4 text-destructive/80">
                                - {formatWithdrawalCurrency(Number(w.fee_amount) || 0, w.currency)}
                              </td>
                              <td className="px-4 py-4 font-black text-primary">
                                {formatWithdrawalCurrency(Number(w.net_amount) || Number(w.amount), w.currency)}
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
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Finance;

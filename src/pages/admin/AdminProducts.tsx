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
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  delivery_type: string;
  image_url: string;
  status: string;
  rejection_reason: string;
  created_at: string;
  profiles: { full_name: string; email: string };
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  
  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from("products").select("*").order("created_at", { ascending: false });
    
    if (filter !== "all") {
      query = query.eq("status", filter);
    }
    
    const { data, error } = await query;
    console.error(">>> ADMIN PRODUCTS FETCH:", { data, error, filter });
    
    if (data && data.length > 0) {
      // Fetch profiles separately
      const userIds = [...new Set(data.map((p: any) => p.user_id))].filter(Boolean);
      let profilesData: any[] | null = null;
      
      if (userIds.length > 0) {
        const { data: pData, error: pErr } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
        console.error(">>> PROFILES FETCH:", { pData, pErr });
        profilesData = pData;
      }
      
      const productsWithProfiles = data.map((p: any) => ({
        ...p,
        profiles: profilesData?.find((prof: any) => prof.id === p.user_id) || { full_name: "Desconhecido" }
      }));
      setProducts(productsWithProfiles as any as Product[]);
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [filter]);

  const handleAction = async () => {
    if (!selectedProduct || !action) return;
    if (action === "reject" && !reason.trim()) {
      toast.error("É necessário informar o motivo da rejeição.");
      return;
    }

    setProcessing(true);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";
      
      const { error } = await supabase
        .from("products")
        .update({ 
          status: newStatus,
          rejection_reason: action === "reject" ? reason : null
        })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      // Log action
      await supabase.from("audit_logs").insert({
        action: action === "approve" ? "APPROVE_PRODUCT" : "REJECT_PRODUCT",
        target_type: "product",
        target_id: selectedProduct.id,
        details: { reason, previous_status: selectedProduct.status }
      });

      // Send email notification
      if (selectedProduct.profiles?.email) {
        const subject = action === "approve" 
          ? `Produto Aprovado: ${selectedProduct.name}`
          : `Produto Rejeitado: ${selectedProduct.name}`;
        
        const htmlContent = action === "approve"
          ? `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
              <h2 style="color: #10b981;">Boas notícias!</h2>
              <p>Olá, <strong>${selectedProduct.profiles.full_name}</strong>.</p>
              <p>O seu produto <strong>"${selectedProduct.name}"</strong> foi analisado e aprovado pela nossa equipa.</p>
              <p>Ele já está disponível para venda e você já pode partilhar o link de checkout com os seus clientes.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="https://www.ensinapay.com/checkout/${selectedProduct.id}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Checkout</a>
              </div>
              <p style="font-size: 12px; color: #666;">Atenciosamente,<br>Equipa Moz Easy Sell</p>
            </div>
          `
          : `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; padding: 20px;">
              <h2 style="color: #ef4444;">Atualização sobre o seu produto</h2>
              <p>Olá, <strong>${selectedProduct.profiles.full_name}</strong>.</p>
              <p>Infelizmente, o seu produto <strong>"${selectedProduct.name}"</strong> não foi aprovado para venda na nossa plataforma neste momento.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #991b1b;">Motivo da rejeição:</p>
                <p style="margin: 10px 0 0 0; color: #b91c1c;">${reason}</p>
              </div>
              <p>Pode ajustar o produto no seu painel e submetê-lo novamente para análise.</p>
              <p style="font-size: 12px; color: #666;">Atenciosamente,<br>Equipa Moz Easy Sell</p>
            </div>
          `;

        try {
          await supabase.functions.invoke("send-email-notification", {
            body: {
              to: selectedProduct.profiles.email,
              subject: subject,
              htmlContent: htmlContent
            }
          });
          console.log("Notificação enviada por email com sucesso.");
        } catch (emailErr) {
          console.error("Falha ao enviar email:", emailErr);
          // Don't stop the flow if email fails, but log it
        }
      }

      toast.success(`Produto ${action === "approve" ? 'aprovado' : 'rejeitado'} com sucesso.`);
      setSelectedProduct(null);
      setReason("");
      fetchProducts();
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie a aprovação de produtos na plataforma.</p>
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
                  <th className="px-6 py-4 font-semibold text-foreground">Produto</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Vendedor</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Preço</th>
                  <th className="px-6 py-4 font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 font-semibold text-foreground text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Carregando produtos...</td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">Nenhum produto encontrado.</td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">📦</div>
                        )}
                        <span className="truncate max-w-[200px]">{product.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {product.profiles?.full_name || "Desconhecido"}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {product.price.toFixed(2)} MT
                      </td>
                      <td className="px-6 py-4">
                        {product.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado</Badge>}
                        {product.status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 border-0"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>}
                        {product.status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-0"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button size="icon" variant="ghost" asChild>
                          <Link to={`/checkout/${product.id}`} target="_blank">
                            <ExternalLink className="w-4 h-4 text-primary" />
                          </Link>
                        </Button>
                        <Dialog open={selectedProduct?.id === product.id} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => { setSelectedProduct(product); setAction(null); setReason(""); }}>
                              Analisar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-xl">
                            <DialogHeader>
                              <DialogTitle>Análise de Produto</DialogTitle>
                              <DialogDescription>
                                Verifique o conteúdo do produto antes de aprová-lo para vendas.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="py-4 space-y-6">
                              <div className="flex gap-4">
                                {product.image_url && <img src={product.image_url} alt="" className="w-24 h-24 rounded-lg object-cover" />}
                                <div>
                                  <h3 className="font-bold text-lg text-foreground">{product.name}</h3>
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                                  <div className="flex gap-4 mt-3 text-sm">
                                    <div><span className="text-muted-foreground text-xs block">Preço</span><span className="font-bold text-primary">{product.price.toFixed(2)} MT</span></div>
                                    <div><span className="text-muted-foreground text-xs block">Entrega</span><span className="font-medium capitalize">{product.delivery_type}</span></div>
                                    <div><span className="text-muted-foreground text-xs block">Vendedor</span><span className="font-medium">{product.profiles?.full_name}</span></div>
                                  </div>
                                </div>
                              </div>
                              
                              {!action ? (
                                <div className="flex gap-2 pt-4 border-t border-border">
                                  <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setAction("approve")}>
                                    <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar Produto
                                  </Button>
                                  <Button className="flex-1" variant="destructive" onClick={() => setAction("reject")}>
                                    <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-4 pt-4 border-t border-border animate-in fade-in zoom-in-95">
                                  {action === "reject" && (
                                    <div className="space-y-2">
                                      <Label>Motivo da Rejeição (Será enviado ao vendedor)</Label>
                                      <Textarea 
                                        placeholder="Ex: Conteúdo viola as políticas da plataforma..." 
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                      />
                                    </div>
                                  )}
                                  {action === "approve" && (
                                    <div className="p-3 bg-green-500/10 text-green-700 rounded-lg text-sm border border-green-500/20">
                                      O vendedor será notificado por e-mail e este produto estará disponível publicamente para compra imediatamente.
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

export default AdminProducts;

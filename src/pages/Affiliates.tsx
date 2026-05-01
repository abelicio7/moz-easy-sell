import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, ShoppingBag, MousePointer2, Copy, ExternalLink, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Affiliates = () => {
  const { user } = useAuth();
  const [myLinks, setMyLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    setLoading(true);
    try {
      const { data: links } = await supabase
        .from("affiliate_links")
        .select(`
          *,
          products (name, price)
        `)
        .eq("user_id", user?.id);
      
      setMyLinks(links || []);
    } catch (error) {
      console.error("Error fetching affiliate data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado para a área de transferência!");
  };

  const handleCancelAffiliation = async (linkId: string) => {
    if (!window.confirm("Tem certeza que deseja cancelar esta afiliação? O seu link deixará de funcionar imediatamente.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("affiliate_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      toast.success("Afiliação cancelada com sucesso!");
      setMyLinks(myLinks.filter(l => l.id !== linkId));
    } catch (error: any) {
      toast.error("Erro ao cancelar afiliação: " + error.message);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-card border border-border/50 rounded-[2.5rem] shadow-xl shadow-black/5">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Gestão de Parceiro</h1>
            <p className="text-muted-foreground font-medium">
              Crie links, acompanhe cliques e gerencie seus produtos afiliados.
            </p>
          </div>
          <Button className="rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90 h-12 px-6" onClick={() => window.location.href='/dashboard/marketplace'}>
            <ShoppingBag className="w-4 h-4" /> Encontrar Novo Produto <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-primary/5 border-primary/20 rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <LinkIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-black text-primary uppercase tracking-widest leading-none mb-1">Links Ativos</p>
                <p className="text-3xl font-black text-foreground tracking-tighter">{myLinks.length}</p>
              </div>
            </div>
          </Card>
          <Card className="bg-muted/50 border-border/50 rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center">
                <MousePointer2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total de Cliques</p>
                <p className="text-3xl font-black text-foreground tracking-tighter">
                  {myLinks.reduce((sum, l) => sum + Number(l.clicks_count || 0), 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-muted-foreground px-2">Seus Links de Divulgação</h2>
          
          {myLinks.map((link) => {
            const fullLink = `${window.location.origin}/checkout/${link.product_id}?aff=${link.code}`;
            return (
              <Card key={link.id} className="border-border/50 overflow-hidden hover:border-primary/30 transition-all rounded-3xl group bg-card">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{link.products.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5"><MousePointer2 className="w-3 h-3" /> {link.clicks_count} cliques</span>
                        <span className="flex items-center gap-1.5"><ShoppingBag className="w-3 h-3" /> {Number(link.products.price).toFixed(2)} MT</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <Input value={fullLink} readOnly className="bg-muted/30 font-mono text-xs border-dashed" />
                        <Button size="icon" variant="outline" className="rounded-xl shrink-0" onClick={() => copyToClipboard(fullLink)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-black italic uppercase text-[10px] gap-2 tracking-widest" onClick={() => window.open(fullLink, '_blank')}>
                        <ExternalLink className="w-4 h-4" /> Checkout <ArrowRight className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 shrink-0" onClick={() => handleCancelAffiliation(link.id)} title="Cancelar Afiliação">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {myLinks.length === 0 && !loading && (
            <div className="text-center py-24 bg-card rounded-[3rem] border-2 border-dashed border-border/50">
              <LinkIcon className="w-16 h-16 text-muted-foreground/10 mx-auto mb-6" />
              <h3 className="font-bold text-xl italic uppercase tracking-tighter mb-2 text-muted-foreground">Você ainda não possui links</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mb-8">
                Explore o mercado de produtos para encontrar ofertas e começar a ganhar comissões.
              </p>
              <Button className="rounded-xl font-bold h-12 px-8" onClick={() => window.location.href='/dashboard/marketplace'}>
                Ir para o Mercado
              </Button>
            </div>
          )}
        </div>

        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
          <p className="text-xs text-primary/80 font-bold uppercase tracking-widest text-center italic">
            💡 Os seus ganhos de comissão são unificados automaticamente no seu <a href="/dashboard" className="underline underline-offset-4 decoration-primary/30">Dashboard</a> e na página de <a href="/dashboard/sales" className="underline underline-offset-4 decoration-primary/30">Vendas</a>.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Affiliates;

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, Link as LinkIcon, ShoppingBag, MousePointer2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Affiliates = () => {
  const { user } = useAuth();
  const [myLinks, setMyLinks] = useState<any[]>([]);
  const [stats, setStats] = useState({ clicks: 0, sales: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    setLoading(true);
    try {
      // 1. Fetch my existing links
      const { data: links } = await supabase
        .from("affiliate_links")
        .select(`
          *,
          products (name, price)
        `)
        .eq("user_id", user?.id);
      
      setMyLinks(links || []);

      // 2. Fetch Stats (Clicks from links, sales from commissions)
      const totalClicks = (links || []).reduce((sum, link) => sum + Number(link.clicks_count || 0), 0);
      
      const { data: commissions } = await supabase
        .from("commissions")
        .select("amount")
        .eq("user_id", user?.id)
        .eq("user_type", "affiliate");

      const totalRevenue = (commissions || []).reduce((sum, comm) => sum + Number(comm.amount), 0);
      
      setStats({
        clicks: totalClicks,
        sales: commissions?.length || 0,
        revenue: totalRevenue
      });

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

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minhas Afiliações</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus links de divulgação e acompanhe seus ganhos como parceiro.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl font-bold gap-2" onClick={() => window.location.href='/dashboard/marketplace'}>
            <ShoppingBag className="w-4 h-4" /> Explorar Novo Produto
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-primary" /> Cliques Totais
              </CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.clicks}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-500" /> Conversões
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-500">{stats.sales}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-primary border-primary">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-primary-foreground/70 font-medium">
                <TrendingUp className="w-4 h-4" /> Comissões Acumuladas
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-primary-foreground">
                {stats.revenue.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" /> Seus Links de Venda
          </h2>
          
          {myLinks.map((link) => {
            const fullLink = `${window.location.origin}/checkout/${link.product_id}?aff=${link.code}`;
            return (
              <Card key={link.id} className="border-border/50 overflow-hidden hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">{link.products.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Cliques: <strong>{link.clicks_count}</strong></span>
                        <span>Preço: <strong>{Number(link.products.price).toFixed(2)} MT</strong></span>
                      </div>
                    </div>
                    
                    <div className="flex-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <Input value={fullLink} readOnly className="bg-muted/30 font-mono text-xs" />
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(fullLink)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 font-bold gap-2" onClick={() => window.open(fullLink, '_blank')}>
                        <ExternalLink className="w-4 h-4" /> Testar Checkout
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {myLinks.length === 0 && !loading && (
            <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
              <LinkIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground">Você ainda não possui links de afiliado.</p>
              <Button variant="link" onClick={() => window.location.href='/dashboard/marketplace'}>Ir para o Mercado</Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Affiliates;

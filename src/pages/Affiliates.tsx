import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, Link as LinkIcon, ShoppingBag, MousePointer2, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Affiliates = () => {
  const { user } = useAuth();
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
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
      // 1. Fetch available offers (Marketplace)
      const { data: offers } = await supabase
        .from("affiliate_offers")
        .select(`
          *,
          products (id, name, price, description, image_url)
        `)
        .eq("is_active", true);
      
      setActiveOffers(offers || []);

      // 2. Fetch my existing links
      const { data: links } = await supabase
        .from("affiliate_links")
        .select(`
          *,
          products (name, price)
        `)
        .eq("user_id", user?.id);
      
      setMyLinks(links || []);

      // 3. Fetch Stats (Clicks from links, sales from commissions)
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

  const handleBecomeAffiliate = async (productId: string) => {
    if (!user) return;
    
    // Check if already an affiliate
    if (myLinks.some(link => link.product_id === productId)) {
      toast.info("Você já é afiliado deste produto.");
      return;
    }

    const code = `${user.id.substring(0, 4)}-${Math.random().toString(36).substring(7)}`;
    
    const { error } = await supabase
      .from("affiliate_links")
      .insert({
        user_id: user.id,
        product_id: productId,
        code: code
      });

    if (error) {
      toast.error("Erro ao solicitar afiliação: " + error.message);
    } else {
      toast.success("Afiliação concluída! Seu link já está disponível.");
      fetchAffiliateData();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Programa de Afiliados</h1>
          <p className="text-muted-foreground mt-2">
            Promova produtos e ganhe comissões por cada venda realizada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-primary" /> Cliques Gerados
              </CardDescription>
              <CardTitle className="text-3xl font-bold">{stats.clicks}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-500" /> Vendas Realizadas
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-500">{stats.sales}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-primary border-primary">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-primary-foreground/70 font-medium">
                <TrendingUp className="w-4 h-4" /> Comissões Totais
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-primary-foreground">
                {stats.revenue.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="marketplace" className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="marketplace" className="rounded-lg px-8">Mercado</TabsTrigger>
            <TabsTrigger value="my-links" className="rounded-lg px-8">Meus Links</TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeOffers.map((offer) => (
                <Card key={offer.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-all group">
                  {offer.products.image_url && (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img src={offer.products.image_url} alt={offer.products.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{offer.products.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{offer.products.description}</p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 py-1 font-bold">
                        {Number(offer.commission_percent)}% COMISSÃO
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Preço</p>
                        <p className="font-bold text-foreground">{Number(offer.products.price).toFixed(2)} MT</p>
                      </div>
                      <Button 
                        onClick={() => handleBecomeAffiliate(offer.products.id)}
                        disabled={myLinks.some(link => link.product_id === offer.products.id)}
                        className={myLinks.some(link => link.product_id === offer.products.id) ? "bg-emerald-500/10 text-emerald-500" : ""}
                      >
                        {myLinks.some(link => link.product_id === offer.products.id) ? (
                          <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Afiliado</span>
                        ) : "Afiliar-se Agora"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {activeOffers.length === 0 && !loading && (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-muted-foreground">Nenhuma oferta disponível no momento.</h3>
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-links" className="space-y-4">
            {myLinks.map((link) => {
              const fullLink = `${window.location.origin}/checkout/${link.product_id}?aff=${link.code}`;
              return (
                <Card key={link.id} className="border-border/50 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg">{link.products.name}</h3>
                        <p className="text-sm text-muted-foreground">Cliques: <strong>{link.clicks_count}</strong></p>
                      </div>
                      
                      <div className="flex-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <Input value={fullLink} readOnly className="bg-muted/30 font-mono text-xs" />
                          <Button size="icon" variant="outline" onClick={() => copyToClipboard(fullLink)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <Button variant="ghost" className="text-primary hover:text-primary/80 font-bold gap-2" onClick={() => window.open(fullLink, '_blank')}>
                        <LinkIcon className="w-4 h-4" /> Abrir Checkout
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {myLinks.length === 0 && !loading && (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
                <p className="text-muted-foreground">Você ainda não se afiliou a nenhum produto.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Affiliates;

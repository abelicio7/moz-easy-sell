import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingBag, Star, Package, CheckCircle2, Handshake, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const Marketplace = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [myLinks, setMyLinks] = useState<any[]>([]);
  const [affiliateOffers, setAffiliateOffers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMarketplaceData();
    }
  }, [user]);

  const fetchMarketplaceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all approved products
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      
      setProducts(prods || []);

      // 2. Fetch all affiliate offers
      const { data: offers } = await supabase
        .from("affiliate_offers")
        .select("*")
        .eq("is_active", true);
      
      setAffiliateOffers(offers || []);

      // 3. Fetch my existing links to check affiliation status
      const { data: links } = await supabase
        .from("affiliate_links")
        .select("product_id")
        .eq("user_id", user?.id);
      
      setMyLinks(links || []);

    } catch (error) {
      console.error("Error fetching marketplace data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeAffiliate = async (productId: string) => {
    if (!user) return;
    
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
      toast.success("Afiliação concluída! Veja seus links na aba Afiliados.");
      fetchMarketplaceData();
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const hasOffer = affiliateOffers.some(o => o.product_id === p.id);
    return matchesSearch && hasOffer;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-foreground">Mercado de <span className="text-primary">Oportunidades</span></h1>
            <p className="text-muted-foreground font-medium">
              Escolha produtos para promover como afiliado ou adquira para seu próprio conhecimento.
            </p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar produtos..." 
              className="h-14 pl-12 pr-4 rounded-2xl border-primary/20 bg-background shadow-lg shadow-primary/5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => {
            const offer = affiliateOffers.find(o => o.product_id === product.id);
            const isAffiliate = myLinks.some(link => link.product_id === product.id);

            return (
              <Card key={product.id} className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 rounded-[2rem] bg-card flex flex-col">
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted relative">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 italic font-black text-4xl uppercase tracking-tighter">
                      EnsinaPay
                    </div>
                  )}
                  {offer && (
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-emerald-500 text-white border-none px-3 py-1 font-bold shadow-lg shadow-emerald-500/20">
                        {Number(offer.commission_percent)}% COMISSÃO
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{product.description}</p>
                  </div>
                  
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between mb-4">
                       <p className="text-2xl font-black text-foreground tracking-tight">
                        {Number(product.price).toFixed(2)} <span className="text-sm">MT</span>
                      </p>
                      <Link to={`/checkout/${product.id}`} target="_blank">
                        <Button variant="ghost" className="text-primary hover:text-primary/80 font-bold gap-2">
                           Comprar <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>

                    {offer ? (
                      <Button 
                        onClick={() => handleBecomeAffiliate(product.id)}
                        disabled={isAffiliate}
                        className={`w-full h-12 rounded-xl font-bold gap-2 transition-all ${
                          isAffiliate 
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                            : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        }`}
                      >
                        {isAffiliate ? (
                          <><CheckCircle2 className="w-5 h-5" /> Já sou Afiliado</>
                        ) : (
                          <><Handshake className="w-5 h-5" /> Afiliar-se Agora</>
                        )}
                      </Button>
                    ) : (
                      <Button disabled className="w-full h-12 rounded-xl font-bold bg-muted text-muted-foreground">
                        Afiliação Indisponível
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-24 bg-card/50 rounded-[3rem] border-2 border-dashed border-border/50">
            <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground">Nenhum produto disponível no mercado.</h3>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Marketplace;

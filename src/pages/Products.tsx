import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Copy, Package } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  delivery_type: string;
  created_at: string;
  status: string;
}

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      setProducts(data as Product[] || []);
      setLoading(false);
    };
    fetchProducts();
  }, [user]);

  const copyCheckoutLink = (productId: string) => {
    const link = `${window.location.origin}/checkout/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de checkout copiado!");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Meus Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os seus produtos e copie os links de venda.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/products/new">
            <Plus className="w-4 h-4 mr-2" /> Criar Produto
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando produtos...</div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Nenhum produto ainda</h3>
            <p className="text-sm text-muted-foreground mb-6">Crie seu primeiro produto para começar a vender!</p>
            <Button asChild>
              <Link to="/dashboard/products/new">
                <Plus className="w-4 h-4 mr-2" /> Criar Meu Primeiro Produto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:border-primary/50 transition-colors">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground mb-1">{product.name}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-primary">{product.price.toFixed(2)} MT</span>
                      <span className="text-border">|</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {product.delivery_type === "link" ? "Link Externo" : product.delivery_type === "file" ? "Arquivo (URL)" : "Mensagem Automática"}
                      </Badge>
                      
                      {product.status === 'pending' && <Badge className="bg-orange-500/10 text-orange-600 border-0 text-xs font-normal">Pendente (Em análise)</Badge>}
                      {product.status === 'approved' && <Badge className="bg-green-500/10 text-green-600 border-0 text-xs font-normal">Ativo</Badge>}
                      {product.status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-0 text-xs font-normal">Rejeitado</Badge>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      className="flex-1 md:flex-none bg-background hover:bg-muted"
                      onClick={() => copyCheckoutLink(product.id)}
                      disabled={product.status !== 'approved'}
                      title={product.status !== 'approved' ? "Aguarde a aprovação para vender" : ""}
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copiar Link
                    </Button>
                    <Button variant="secondary" className="flex-1 md:flex-none" asChild>
                      <Link to={`/dashboard/products/${product.id}/edit`}>Editar</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Products;

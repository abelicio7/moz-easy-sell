import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Copy, Package, Trash2, Edit2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
      
    setProducts(data as Product[] || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const copyCheckoutLink = (productId: string) => {
    const link = `${window.location.origin}/checkout/${productId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de checkout copiado!");
  };

  const handleDelete = async (productId: string) => {
    try {
      setIsDeleting(productId);
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast.success("Produto eliminado com sucesso!");
      setProducts(products.filter(p => p.id !== productId));
    } catch (error: any) {
      toast.error("Erro ao eliminar produto: " + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Meus Produtos</h1>
          <p className="text-muted-foreground mt-1">Gerencie os seus produtos e copie os links de venda.</p>
        </div>
        <Button asChild className="rounded-xl shadow-lg shadow-primary/10">
          <Link to="/dashboard/products/new">
            <Plus className="w-4 h-4 mr-2" /> Criar Produto
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Carregando produtos...</p>
        </div>
      ) : products.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Nenhum produto ainda</h3>
            <p className="text-sm text-muted-foreground mb-6">Crie seu primeiro produto para começar a vender!</p>
            <Button asChild className="rounded-xl">
              <Link to="/dashboard/products/new">
                <Plus className="w-4 h-4 mr-2" /> Criar Meu Primeiro Produto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden border-slate-100 hover:border-primary/30 hover:shadow-md transition-all duration-300 rounded-2xl">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground leading-tight mb-1">{product.name}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-primary">{product.price.toFixed(2)} MT</span>
                        <span className="text-slate-300">•</span>
                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border-0">
                          {product.delivery_type === "link" ? "Link" : product.delivery_type === "file" ? "Arquivo" : "Mensagem"}
                        </Badge>
                        
                        {product.status === 'pending' && <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px] font-bold uppercase tracking-wider">Pendente</Badge>}
                        {product.status === 'approved' && <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-bold uppercase tracking-wider">Ativo</Badge>}
                        {product.status === 'rejected' && <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-0 text-[10px] font-bold uppercase tracking-wider">Rejeitado</Badge>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button 
                      variant="outline" 
                      className="flex-1 md:flex-none bg-white hover:bg-slate-50 rounded-xl border-slate-200"
                      onClick={() => copyCheckoutLink(product.id)}
                      disabled={product.status !== 'approved'}
                    >
                      <Copy className="w-4 h-4 mr-2 text-slate-400" /> <span className="text-xs font-bold">Checkout</span>
                    </Button>
                    
                    <Button variant="secondary" className="flex-1 md:flex-none rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700" asChild>
                      <Link to={`/dashboard/products/${product.id}/edit`}>
                        <Edit2 className="w-4 h-4 mr-2" /> <span className="text-xs font-bold">Editar</span>
                      </Link>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl" disabled={isDeleting === product.id}>
                          {isDeleting === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border-slate-100">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar Produto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isto irá remover permanentemente o produto <strong>{product.name}</strong> e todos os seus links de checkout deixarão de funcionar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700 rounded-xl"
                            onClick={() => handleDelete(product.id)}
                          >
                            Eliminar Permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, BarChart2, Edit, Trash2, ExternalLink, Link2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Flow {
  id: string;
  name: string;
  slug: string;
  status: 'draft'|'active'|'inactive';
  created_at: string;
}

const QuizDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchFlows = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) setFlows(data as any);
    } catch (err) {
      toast.error("Erro ao carregar funis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    try {
      setIsCreating(true);
      const { data, error } = await supabase.from('flows').insert({
        user_id: user.id,
        name: 'Novo Funil ' + Math.floor(Math.random() * 1000),
        slug: 'fluxo-' + Date.now(),
        status: 'draft'
      }).select().single();
      
      if (error) throw error;
      
      toast.success("Funil criado! Abrindo o editor...");
      navigate(`/dashboard/quizzes/${data.id}/edit`);
    } catch (err: any) {
      toast.error("Erro ao criar funil: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = (slug: string) => {
    const link = `${window.location.origin}/quiz/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Link do funil copiado!");
  };

  const deleteFlow = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este funil?")) return;
    const { error } = await supabase.from("flows").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Excluído com sucesso");
      fetchFlows();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">Funis Profissionais</h2>
          <p className="text-muted-foreground text-sm">Crie fluxos interativos e automatizados para captar leads qualificados.</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating} className="shadow-lg shadow-primary/20 gap-2">
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Novo Funil Visual
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground animate-pulse">
           <Loader2 className="w-8 h-8 animate-spin mb-4" />
           <p>A carregar os seus funis...</p>
        </div>
      ) : flows.length === 0 ? (
        <Card className="border-dashed bg-card/50 border-2 rounded-3xl">
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-xl mb-2">Ainda não tens nenhum funil</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-8">
              Transforma visitantes em clientes com questionários interativos e caminhos lógicos personalizados.
            </p>
            <Button onClick={handleCreate} disabled={isCreating} size="lg" className="rounded-xl px-8">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar meu primeiro Funil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow) => (
            <Card key={flow.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 group rounded-2xl">
              <div className="h-2 bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardContent className="p-6">
                 <div className="flex justify-between items-start mb-4">
                    <Badge variant={flow.status === 'active' ? 'default' : flow.status === 'draft' ? 'secondary' : 'destructive'} className="rounded-md uppercase text-[9px] font-black tracking-widest px-2">
                      {flow.status}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteFlow(flow.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                 </div>
                 
                 <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1">{flow.name}</h3>
                 <p className="text-xs text-muted-foreground flex items-center gap-1 mb-6">
                    <Link2 className="w-3 h-3" /> /quiz/{flow.slug}
                 </p>

                 <div className="grid grid-cols-2 gap-3 mt-auto">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => copyLink(flow.slug)}>
                      <ExternalLink className="w-3 h-3 mr-2" /> Link
                    </Button>
                    <Button variant="secondary" size="sm" className="rounded-xl text-xs font-bold bg-secondary/10 text-secondary hover:bg-secondary/20" asChild>
                      <Link to={`/dashboard/quizzes/${flow.id}/edit`}>
                        <Edit className="w-3 h-3 mr-2" /> Editar
                      </Link>
                    </Button>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default QuizDashboard;

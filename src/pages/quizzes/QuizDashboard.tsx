import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, Link2, Loader2, ClipboardList, Copy, Eye } from "lucide-react";
import { toast } from "sonner";

interface Quiz {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'active' | 'inactive';
  created_at: string;
}

const QuizDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const fetchQuizzes = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, slug, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setQuizzes(data as Quiz[]);
    setLoading(false);
  };

  useEffect(() => { fetchQuizzes(); }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    setIsCreating(true);
    const slug = 'quiz-' + Date.now();
    const { data, error } = await supabase
      .from('quizzes')
      .insert({ user_id: user.id, title: 'Novo Quiz', slug, status: 'draft' })
      .select()
      .single();

    if (error) { toast.error("Erro ao criar quiz: " + error.message); setIsCreating(false); return; }
    toast.success("Quiz criado! A abrir o editor...");
    navigate(`/dashboard/quizzes/${data.id}/edit`);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tens a certeza que queres apagar este quiz?")) return;
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (error) toast.error("Erro ao apagar: " + error.message);
    else { toast.success("Quiz apagado."); fetchQuizzes(); }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${slug}`);
    toast.success("Link copiado!");
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Meus Quizzes</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie questionários para captar e qualificar os seus leads.</p>
        </div>
        <Button onClick={handleCreate} disabled={isCreating} className="gap-2 shadow-lg shadow-primary/20">
          {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Criar Novo Quiz
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="border-dashed border-2 rounded-3xl bg-card/50">
          <CardContent className="py-20 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-xl mb-2">Ainda não tens nenhum quiz</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
              Cria o teu primeiro quiz interativo e começa a captar leads qualificados para os teus produtos.
            </p>
            <Button onClick={handleCreate} disabled={isCreating} size="lg" className="rounded-2xl px-10">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Meu Primeiro Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="group rounded-2xl border-border/50 hover:shadow-lg transition-all duration-300 bg-card overflow-hidden">
              <div className={`h-1.5 ${quiz.status === 'active' ? 'bg-emerald-500' : quiz.status === 'draft' ? 'bg-amber-400' : 'bg-slate-300'}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-widest rounded-md px-2 border-0 ${
                    quiz.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                    quiz.status === 'draft' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                    'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}>
                    {quiz.status === 'active' ? 'Publicado' : quiz.status === 'draft' ? 'Rascunho' : 'Inativo'}
                  </Badge>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(quiz.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <h3 className="font-bold text-lg text-foreground mb-1 leading-tight">{quiz.title}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-6">
                  <Link2 className="w-3 h-3" /> /quiz/{quiz.slug}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" onClick={() => copyLink(quiz.slug)}>
                    <Copy className="w-3 h-3 mr-1.5" /> Link
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold" asChild>
                    <a href={`/quiz/${quiz.slug}`} target="_blank" rel="noreferrer">
                      <Eye className="w-3 h-3 mr-1.5" /> Ver
                    </a>
                  </Button>
                  <Button size="sm" className="rounded-xl text-xs font-bold" asChild>
                    <Link to={`/dashboard/quizzes/${quiz.id}/edit`}>
                      <Edit className="w-3 h-3 mr-1.5" /> Editar
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, BarChart2, Edit, Trash2, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";

interface Quiz {
  id: string;
  title: string;
  slug: string;
  status: 'draft'|'active'|'inactive';
  created_at: string;
}

const QuizDashboard = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setQuizzes(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
  }, [user]);

  const handleCreate = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('quizzes').insert({
      user_id: user.id,
      title: 'Meu Novo Quiz ' + Math.floor(Math.random() * 1000),
      slug: 'quiz-' + Date.now(),
      status: 'draft'
    }).select().single();
    
    if (error) {
      toast.error("Erro ao criar quiz");
      return;
    }
    toast.success("Quiz criado!");
    fetchQuizzes();
  };

  const copyLink = (slug: string) => {
    const link = `${window.location.origin}/quiz/${slug}`;
    navigator.clipboard.writeText(link);
    toast.success("Link do quiz copiado!");
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Excluído com sucesso");
      fetchQuizzes();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Funis de Captação (Quizzes)</h2>
          <p className="text-muted-foreground text-sm">Crie testes interativos para captar leads e engajar sua audiência.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Quiz
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : quizzes.length === 0 ? (
        <Card className="border-dashed bg-card/50">
          <CardContent className="py-16 text-center">
            <BarChart2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground text-lg mb-2">Nenhum funil criado</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Comece agora criando seu primeiro questionário interativo e dispare a sua captação de potenciais clientes.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Criar meu primeiro Quiz
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                    <Badge variant={quiz.status === 'active' ? 'default' : quiz.status === 'draft' ? 'secondary' : 'destructive'} className="text-[10px]">
                      {quiz.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> /quiz/{quiz.slug}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(quiz.slug)}>
                    <ExternalLink className="w-3 h-3 mr-1" /> Copiar Link
                  </Button>
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={`/dashboard/quizzes/${quiz.id}/edit`}>
                      <Edit className="w-3 h-3 mr-1" /> Editar
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteQuiz(quiz.id)}>
                    <Trash2 className="w-3 h-3" />
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

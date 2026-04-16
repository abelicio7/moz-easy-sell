import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, GripVertical, Save } from "lucide-react";

const EditQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // States
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    // 1. Fetch Quiz
    const { data: quizData } = await supabase.from("quizzes").select("*").eq("id", id).single();
    if (!quizData) {
      toast.error("Quiz não encontrado");
      navigate("/dashboard/quizzes");
      return;
    }
    setQuiz(quizData);

    // 2. Fetch Questions & Options
    const { data: questionsData } = await supabase.from("quiz_questions").select("*, quiz_options(*)").eq("quiz_id", id).order("order_index", { ascending: true });
    setQuestions(questionsData || []);

    // 3. Fetch Results
    const { data: resultsData } = await supabase.from("quiz_results").select("*").eq("quiz_id", id).order("min_score", { ascending: true });
    setResults(resultsData || []);
    
    setLoading(false);
  };

  // ---- SALVAR GERAL ----
  const saveGeneral = async () => {
    const { error } = await supabase.from("quizzes").update({
      title: quiz.title,
      description: quiz.description,
      slug: quiz.slug,
      status: quiz.status,
      call_to_action_text: quiz.call_to_action_text,
      call_to_action_url: quiz.call_to_action_url
    }).eq("id", quiz.id);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas!");
  };

  // ---- PERGUNTAS ----
  const addQuestion = async () => {
    const { data, error } = await supabase.from("quiz_questions").insert({
      quiz_id: id,
      title: "Nova Pergunta",
      order_index: questions.length
    }).select().single();
    if (data) setQuestions([...questions, { ...data, quiz_options: [] }]);
  };

  const updateQuestion = async (qId: string, updates: any) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, ...updates } : q));
    await supabase.from("quiz_questions").update(updates).eq("id", qId);
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Excluir pergunta?")) return;
    await supabase.from("quiz_questions").delete().eq("id", qId);
    setQuestions(questions.filter(q => q.id !== qId));
  };

  const addOption = async (qId: string) => {
    const qIndex = questions.findIndex(q => q.id === qId);
    const q = questions[qIndex];
    const { data, error } = await supabase.from("quiz_options").insert({
      question_id: qId,
      option_text: "Nova Opção",
      score: 0,
      order_index: q.quiz_options.length
    }).select().single();
    
    if (data) {
      const newQuestions = [...questions];
      newQuestions[qIndex].quiz_options.push(data);
      setQuestions(newQuestions);
    }
  };

  const updateOption = async (qId: string, optId: string, updates: any) => {
    const newQuestions = questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          quiz_options: q.quiz_options.map((opt: any) => opt.id === optId ? { ...opt, ...updates } : opt)
        };
      }
      return q;
    });
    setQuestions(newQuestions);
    await supabase.from("quiz_options").update(updates).eq("id", optId);
  };

  const deleteOption = async (qId: string, optId: string) => {
    await supabase.from("quiz_options").delete().eq("id", optId);
    const newQuestions = questions.map(q => {
      if (q.id === qId) {
        return { ...q, quiz_options: q.quiz_options.filter((opt: any) => opt.id !== optId) };
      }
      return q;
    });
    setQuestions(newQuestions);
  };

  // ---- RESULTADOS ----
  const addResult = async () => {
    const { data, error } = await supabase.from("quiz_results").insert({
      quiz_id: id,
      title: "Novo Resultado",
      min_score: 0,
      max_score: 10
    }).select().single();
    if (data) setResults([...results, data]);
  };

  const updateResult = async (rId: string, updates: any) => {
    setResults(results.map(r => r.id === rId ? { ...r, ...updates } : r));
    await supabase.from("quiz_results").update(updates).eq("id", rId);
  };

  const deleteResult = async (rId: string) => {
    if (!confirm("Excluir resultado?")) return;
    await supabase.from("quiz_results").delete().eq("id", rId);
    setResults(results.filter(r => r.id !== rId));
  };


  if (loading || !quiz) return <DashboardLayout><div className="py-12 text-center text-muted-foreground">Carregando editor...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/quizzes"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Editar Quiz</h2>
          <p className="text-muted-foreground text-sm">Configure o funil, as perguntas e lógicas de resultado.</p>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="perguntas">Perguntas ({questions.length})</TabsTrigger>
          <TabsTrigger value="resultados">Resultados ({results.length})</TabsTrigger>
        </TabsList>

        {/* --- ABA GERAL --- */}
        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Principais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título do Quiz *</Label>
                <Input value={quiz.title || ""} onChange={(e) => setQuiz({...quiz, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={quiz.description || ""} onChange={(e) => setQuiz({...quiz, description: e.target.value})} rows={3} placeholder="Instruções para o utilizador..." />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Identificador do Link (Slug) *</Label>
                  <Input value={quiz.slug || ""} onChange={(e) => setQuiz({...quiz, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} />
                  <p className="text-xs text-muted-foreground">O quiz ficará acessível em: /quiz/{quiz.slug}</p>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={quiz.status} onValueChange={(val) => setQuiz({...quiz, status: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho (Privado)</SelectItem>
                      <SelectItem value="active">Ativo (Público)</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-4">Botão de Oferta Global (Opcional)</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input placeholder="Ex: Descubra como resolver" value={quiz.call_to_action_text || ""} onChange={(e) => setQuiz({...quiz, call_to_action_text: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL da Oferta</Label>
                    <Input placeholder="https://..." value={quiz.call_to_action_url || ""} onChange={(e) => setQuiz({...quiz, call_to_action_url: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button onClick={saveGeneral}><Save className="w-4 h-4 mr-2" /> Salvar Configurações</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- ABA PERGUNTAS --- */}
        <TabsContent value="perguntas">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Gerir Perguntas</h3>
            <Button onClick={addQuestion}><Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta</Button>
          </div>
          
          <div className="space-y-6">
            {questions.map((q, index) => (
              <Card key={q.id} className="border-border">
                <CardHeader className="py-4 bg-muted/30 border-b border-border flex flex-row items-start justify-between">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-primary/20 text-primary font-bold w-6 h-6 rounded flex items-center justify-center text-xs">{index + 1}</span>
                      <Input value={q.title} onChange={(e) => updateQuestion(q.id, { title: e.target.value })} className="font-semibold" placeholder="Escreva a pergunta..." />
                    </div>
                    <Textarea value={q.description || ""} onChange={(e) => updateQuestion(q.id, { description: e.target.value })} placeholder="Descrição curta (opcional)" className="text-sm min-h-[60px]" />
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteQuestion(q.id)}><Trash2 className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="py-4">
                  <div className="space-y-3">
                    {q.quiz_options?.sort((a:any,b:any) => a.order_index - b.order_index).map((opt: any) => (
                      <div key={opt.id} className="flex flex-col sm:flex-row items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground hidden sm:block" />
                        <Input className="flex-1" value={opt.option_text} onChange={(e) => updateOption(q.id, opt.id, { option_text: e.target.value })} placeholder="Texto da opção" />
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Label className="whitespace-nowrap text-xs text-muted-foreground">Pontos:</Label>
                          <Input type="number" className="w-20" value={opt.score} onChange={(e) => updateOption(q.id, opt.id, { score: parseInt(e.target.value)||0 })} />
                          <Button variant="ghost" size="icon" onClick={() => deleteOption(q.id, opt.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => addOption(q.id)}>
                    <Plus className="w-3 h-3 mr-2" /> Adicionar Opção
                  </Button>
                </CardContent>
              </Card>
            ))}
            {questions.length === 0 && (
              <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground">
                Nenhuma pergunta criada. <button onClick={addQuestion} className="text-primary underline">Criar a primeira</button>.
              </div>
            )}
          </div>
        </TabsContent>

        {/* --- ABA RESULTADOS --- */}
        <TabsContent value="resultados">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Possíveis Resultados</h3>
            <Button onClick={addResult}><Plus className="w-4 h-4 mr-2" /> Adicionar Resultado</Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((r) => (
              <Card key={r.id}>
                <CardHeader className="py-4 border-b border-border flex flex-row items-center justify-between">
                  <CardTitle className="text-base text-primary">Resultado Final</CardTitle>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteResult(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Pontos Mínimos</Label>
                      <Input type="number" value={r.min_score || 0} onChange={(e) => updateResult(r.id, { min_score: parseInt(e.target.value)||0 })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pontos Máximos</Label>
                      <Input type="number" value={r.max_score || 0} onChange={(e) => updateResult(r.id, { max_score: parseInt(e.target.value)||0 })} />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">Título do Resultado</Label>
                    <Input placeholder="Ex: Você é um mestre!" value={r.title} onChange={(e) => updateResult(r.id, { title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descrição (Feedback)</Label>
                    <Textarea placeholder="Explique o que significa esse resultado..." value={r.description || ""} onChange={(e) => updateResult(r.id, { description: e.target.value })} rows={3} />
                  </div>

                  <div className="pt-2 border-t border-border space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Oferta Específica</p>
                    <div className="space-y-1">
                      <Label className="text-xs">Texto do Botão (CTA)</Label>
                      <Input placeholder="Ex: Comprar ebook avançado" value={r.cta_text || ""} onChange={(e) => updateResult(r.id, { cta_text: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Link da Oferta (Checkout)</Label>
                      <Input placeholder="https://..." value={r.recommended_product_url || ""} onChange={(e) => updateResult(r.id, { recommended_product_url: e.target.value })} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {results.length === 0 && (
            <div className="text-center py-10 border border-dashed rounded-lg text-muted-foreground">
              Define os resultados baseados nos pontos acumulados. <button onClick={addResult} className="text-primary underline">Criar Resultado</button>.
            </div>
          )}
        </TabsContent>
      </Tabs>
      
    </DashboardLayout>
  );
};

export default EditQuiz;

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, Save, ArrowLeft, ChevronDown, ChevronUp,
  Link2, Eye, Loader2, CheckCircle2, Settings, HelpCircle
} from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { Switch } from "@/components/ui/switch";


interface Option { id: string; option_text: string; score: number; order_index: number; }
interface Question {
  id: string; title: string; description: string; image_url: string;
  order_index: number; options: Option[]; isOpen: boolean;
  question_type: 'multiple_choice' | 'message';
  button_text: string; button_url: string; is_external_link: boolean;
}
interface QuizResult { id: string; title: string; description: string; min_score: number; max_score: number; recommended_product_url: string; cta_text: string; result_image?: string; }
interface QuizData {
  id: string; title: string; description: string; slug: string;
  status: string; cover_image: string; call_to_action_url: string; call_to_action_text: string;
}

const newOptionTemplate = (): Option => ({ id: crypto.randomUUID(), option_text: '', score: 0, order_index: 0 });
const newQuestionTemplate = (order: number): Question => ({
  id: crypto.randomUUID(), title: '', description: '', image_url: '',
  order_index: order, options: [newOptionTemplate(), newOptionTemplate()], isOpen: true,
  question_type: 'multiple_choice', button_text: 'Continuar', button_url: '', is_external_link: false
});

const EditQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'result' | 'settings'>('questions');

  useEffect(() => { if (id) loadQuiz(); }, [id]);

  const loadQuiz = async () => {
    setLoading(true);
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (!quizData) { toast.error("Quiz não encontrado"); navigate('/dashboard/quizzes'); return; }
    setQuiz(quizData as QuizData);

    const { data: qData } = await supabase.from('quiz_questions').select('*, quiz_options(*)').eq('quiz_id', id).order('order_index');
    if (qData) {
      setQuestions(qData.map((q: any) => ({
        id: q.id, title: q.title, description: q.description || '', image_url: q.image_url || '',
        order_index: q.order_index, isOpen: false,
        question_type: q.question_type || 'multiple_choice',
        button_text: q.button_text || 'Continuar',
        button_url: q.button_url || '',
        is_external_link: q.is_external_link || false,
        options: (q.quiz_options || []).sort((a: any, b: any) => a.order_index - b.order_index).map((o: any) => ({
          id: o.id, option_text: o.option_text, score: o.score || 0, order_index: o.order_index
        }))
      })));
    }

    const { data: rData } = await supabase.from('quiz_results').select('*').eq('quiz_id', id);
    if (rData && rData.length > 0) {
      setResults(rData as QuizResult[]);
    } else {
      setResults([{ id: crypto.randomUUID(), title: '', description: '', min_score: 0, max_score: 100, recommended_product_url: '', cta_text: 'Garantir Agora' }]);
    }
    setLoading(false);
  };

  const saveAll = async () => {
    if (!quiz || !id) return;
    setSaving(true);
    try {
      // 1. Save quiz metadata
      await supabase.from('quizzes').update({
        title: quiz.title, description: quiz.description, slug: quiz.slug,
        status: quiz.status, cover_image: quiz.cover_image,
        call_to_action_url: quiz.call_to_action_url, call_to_action_text: quiz.call_to_action_text,
        updated_at: new Date().toISOString()
      }).eq('id', id);

      // 2. Delete and re-insert questions + options
      await supabase.from('quiz_questions').delete().eq('quiz_id', id);

      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        const { data: savedQ } = await supabase.from('quiz_questions').insert({
          quiz_id: id, title: q.title, description: q.description,
          image_url: q.image_url || null,
          order_index: qi, 
          question_type: q.question_type,
          button_text: q.button_text,
          button_url: q.button_url,
          is_external_link: q.is_external_link
        }).select().single();
        if (!savedQ) continue;

        for (let oi = 0; oi < q.options.length; oi++) {
          const o = q.options[oi];
          await supabase.from('quiz_options').insert({
            question_id: savedQ.id, option_text: o.option_text,
            score: o.score || 0, order_index: oi
          });
        }
      }

      // 3. Save results
      await supabase.from('quiz_results').delete().eq('quiz_id', id);
      for (const r of results) {
        await supabase.from('quiz_results').insert({
          quiz_id: id, title: r.title, description: r.description,
          min_score: r.min_score || 0, max_score: r.max_score || 999,
          recommended_product_url: r.recommended_product_url, 
          cta_text: r.cta_text || 'Ver Oferta',
          result_image: r.result_image || null
        });
      }

      toast.success("Quiz guardado com sucesso! ✅");
    } catch (err: any) {
      toast.error("Erro ao guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setQuestions(prev => [...prev.map(q => ({ ...q, isOpen: false })), newQuestionTemplate(prev.length)]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const addOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: [...q.options, newOptionTemplate()] } : q));
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? {
      ...q, options: q.options.map((o, j) => j === oIdx ? { ...o, [field]: value } : o)
    } : q));
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate('/dashboard/quizzes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">{quiz?.title || 'Editor de Quiz'}</h1>
            <p className="text-xs text-muted-foreground">/quiz/{quiz?.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-xl gap-2" asChild>
            <a href={`/quiz/${quiz?.slug}`} target="_blank" rel="noreferrer">
              <Eye className="w-4 h-4" /> Pré-visualizar
            </a>
          </Button>
          <Button onClick={saveAll} disabled={saving} className="rounded-xl gap-2 shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-2xl mb-8 w-fit border border-border">
        {([['questions', 'Perguntas', HelpCircle], ['result', 'Resultado', CheckCircle2], ['settings', 'Definições', Settings]] as any).map(([tab, label, Icon]: any) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div className="space-y-4 max-w-3xl">
          {questions.length === 0 && (
            <Card className="border-dashed border-2 rounded-3xl">
              <CardContent className="py-16 text-center">
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-semibold mb-6">Ainda não adicionaste nenhuma pergunta.</p>
                <Button onClick={addQuestion} className="rounded-2xl gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Primeira Pergunta
                </Button>
              </CardContent>
            </Card>
          )}

          {questions.map((q, qIdx) => (
            <Card key={q.id} className="rounded-3xl border-border/70 shadow-sm overflow-hidden">
              {/* Question Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => updateQuestion(qIdx, 'isOpen', !q.isOpen)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                      {qIdx + 1}
                    </div>
                    {q.image_url && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-lg border-2 border-background overflow-hidden shadow-sm">
                        <img src={q.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm leading-tight">
                      {q.title || <span className="text-muted-foreground italic">Pergunta sem título...</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider h-4">
                        {q.question_type === 'message' ? 'Mensagem' : 'Múltipla Escolha'}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground">{q.options.length} opções</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); removeQuestion(qIdx); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {q.isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Question Body */}
              {q.isOpen && (
                <CardContent className="pt-0 pb-6 px-5 space-y-5 border-t border-border/50">
                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Tipo de Slide</Label>
                    <Select value={q.question_type} onValueChange={v => updateQuestion(qIdx, 'question_type', v)}>
                      <SelectTrigger className="h-12 rounded-xl bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Pergunta (Opções)</SelectItem>
                        <SelectItem value="message">Mensagem / Info</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Título / Pergunta</Label>
                    <Input
                      placeholder="Ex: Qual o seu principal objetivo?"
                      value={q.title}
                      onChange={e => updateQuestion(qIdx, 'title', e.target.value)}
                      className="h-12 rounded-xl bg-background border-border font-semibold"
                    />
                  </div>
                </div>

                {q.question_type === 'message' && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Descrição / Texto</Label>
                      <Textarea
                        placeholder="Escreve aqui a mensagem que queres mostrar..."
                        value={q.description}
                        onChange={e => updateQuestion(qIdx, 'description', e.target.value)}
                        className="rounded-xl min-h-[100px] resize-none"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Texto do Botão</Label>
                        <Input value={q.button_text} onChange={e => updateQuestion(qIdx, 'button_text', e.target.value)} className="h-11 rounded-xl bg-background" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">URL do Link (Opcional)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://..."
                            value={q.button_url}
                            onChange={e => updateQuestion(qIdx, 'button_url', e.target.value)}
                            disabled={!q.is_external_link}
                            className="h-11 rounded-xl bg-background flex-1"
                          />
                          <div className="flex flex-col items-center justify-center px-2">
                            <Label className="text-[8px] font-black uppercase mb-1">Link Ext.</Label>
                            <Switch
                              checked={q.is_external_link}
                              onCheckedChange={v => updateQuestion(qIdx, 'is_external_link', v)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Imagem do Slide (Opcional)</Label>
                  <ImageUpload
                    value={q.image_url}
                    onChange={(url) => updateQuestion(qIdx, 'image_url', url || '')}
                    folder="questions"
                    label="Carregar imagem para este slide"
                    aspectRatio="aspect-[4/3]"
                  />
                </div>

                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Opções de Resposta</Label>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-black text-xs shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <Input
                            placeholder={`Opção ${String.fromCharCode(65 + oIdx)}`}
                            value={opt.option_text}
                            onChange={e => updateOption(qIdx, oIdx, 'option_text', e.target.value)}
                            className="flex-1 h-11 rounded-xl bg-background border-border"
                          />
                          <Input
                            type="number"
                            placeholder="Pts"
                            value={opt.score}
                            onChange={e => updateOption(qIdx, oIdx, 'score', parseInt(e.target.value) || 0)}
                            className="w-16 h-11 rounded-xl bg-background border-border text-center text-sm"
                            title="Pontuação"
                          />
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
                            onClick={() => removeOption(qIdx, oIdx)}
                            disabled={q.options.length <= 2}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl gap-2 w-full border-dashed"
                      onClick={() => addOption(qIdx)}>
                      <Plus className="w-4 h-4" /> Adicionar Opção
                    </Button>
                  </div>
                )}
                </CardContent>
              )}
            </Card>
          ))}

          <Button variant="outline" onClick={addQuestion}
            className="w-full h-14 rounded-3xl border-2 border-dashed gap-2 text-sm font-bold hover:border-primary hover:text-primary transition-colors">
            <Plus className="w-5 h-5" /> Adicionar Pergunta
          </Button>
        </div>
      )}

      {/* RESULT TAB */}
      {activeTab === 'result' && (
        <div className="max-w-3xl space-y-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-3">
             <HelpCircle className="w-5 h-5 shrink-0" />
             <div>
                <strong>Como funcionam os resultados inteligentes:</strong> Podes criar vários resultados. O sistema mostrará o resultado que corresponder à pontuação total do cliente.
                <p className="mt-1 text-xs opacity-70">Dica: Define as pontuações em cada opção de resposta na aba "Perguntas".</p>
             </div>
          </div>

          {results.map((r, rIdx) => (
            <Card key={r.id} className="rounded-3xl border-border/70 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-black text-foreground">Resultado #{rIdx + 1}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setResults(prev => prev.filter((_, i) => i !== rIdx))}
                  disabled={results.length === 1}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Score Range */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pontuação Mínima</Label>
                      <Input type="number" value={r.min_score} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, min_score: parseInt(e.target.value) || 0 } : res))} className="h-11 rounded-xl bg-background" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pontuação Máxima</Label>
                      <Input type="number" value={r.max_score} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, max_score: parseInt(e.target.value) || 0 } : res))} className="h-11 rounded-xl bg-background" />
                   </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Imagem do Resultado (Opcional)</Label>
                  <ImageUpload
                    value={r.result_image}
                    onChange={(url) => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, result_image: url || '' } : res))}
                    folder="results"
                    label="Carregar imagem para este resultado"
                    aspectRatio="aspect-video"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Título do Resultado</Label>
                  <Input placeholder="Ex: Tu és um Especialista! 🏆"
                    value={r.title} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, title: e.target.value } : res))}
                    className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Descrição Personalizada</Label>
                  <Textarea placeholder="Ex: Parabéns, o teu perfil indica que já tens conhecimentos avançados..."
                    value={r.description} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, description: e.target.value } : res))}
                    className="rounded-xl min-h-[100px] resize-none" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2"><Link2 className="w-3 h-3" /> URL do Produto para este Perfil</Label>
                    <Input placeholder="https://ensinapay.com/checkout/..."
                      value={r.recommended_product_url} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, recommended_product_url: e.target.value } : res))}
                      className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Texto do Botão</Label>
                    <Input placeholder="Ex: Garantir Vaga"
                      value={r.cta_text} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, cta_text: e.target.value } : res))}
                      className="h-12 rounded-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full h-14 rounded-3xl border-2 border-dashed gap-2"
            onClick={() => setResults(prev => [...prev, { id: crypto.randomUUID(), title: '', description: '', min_score: 0, max_score: 100, recommended_product_url: '', cta_text: 'Garantir Agora' }])}>
            <Plus className="w-5 h-5" /> Adicionar Outro Resultado Sugerido
          </Button>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && quiz && (
        <div className="max-w-3xl space-y-6">
          <Card className="rounded-3xl border-border/70 shadow-sm">
            <CardHeader><CardTitle className="text-base font-black">Configurações Gerais</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Título do Quiz</Label>
                <Input value={quiz.title} onChange={e => setQuiz({ ...quiz, title: e.target.value })} className="h-12 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Descrição</Label>
                <Textarea value={quiz.description || ''} onChange={e => setQuiz({ ...quiz, description: e.target.value })} className="rounded-xl min-h-[80px] resize-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Imagem de Capa (Ecrã Inicial)</Label>
                <ImageUpload
                  value={quiz.cover_image}
                  onChange={(url) => setQuiz({ ...quiz, cover_image: url || '' })}
                  folder="covers"
                  label="Carregar imagem de capa do quiz"
                  aspectRatio="aspect-video"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Slug (URL)</Label>
                  <Input value={quiz.slug} onChange={e => setQuiz({ ...quiz, slug: e.target.value })} className="h-12 rounded-xl font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Estado</Label>
                  <Select value={quiz.status} onValueChange={v => setQuiz({ ...quiz, status: v })}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Publicado</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SAVE BUTTON at bottom */}
      <div className="mt-10 max-w-3xl">
        <Button onClick={saveAll} disabled={saving} size="lg" className="w-full h-14 rounded-2xl text-base font-black shadow-xl shadow-primary/20 gap-3">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'A guardar...' : 'Guardar Quiz'}
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default EditQuiz;

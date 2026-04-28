
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Trash2, Save, ArrowLeft, Eye, Loader2, 
  Settings2, Palette, Type, Image as ImageIcon, 
  Smartphone, List, CheckCircle, HelpCircle, 
  LayoutGrid, Share2, MousePointer2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ImageUpload from "@/components/ImageUpload";

interface Option { id: string; option_text: string; score: number; order_index: number; image_url?: string; }
interface Question {
  id: string; title: string; description: string; image_url: string;
  order_index: number; options: Option[]; 
  question_type: 'multiple_choice' | 'message' | 'range';
  button_text: string; button_url: string; is_external_link: boolean;
}
interface QuizResult { id: string; title: string; description: string; min_score: number; max_score: number; recommended_product_url: string; cta_text: string; result_image?: string; }
interface QuizData {
  id: string; title: string; description: string; slug: string;
  status: string; cover_image: string;
}

const ELEMENT_TYPES = [
  { id: 'text', label: 'Texto', icon: Type, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'image', label: 'Imagem', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-50' },
  { id: 'button', label: 'Botão', icon: MousePointer2, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'benefits', label: 'Benefícios', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'accordion', label: 'Dúvidas', icon: List, color: 'text-slate-500', bg: 'bg-slate-50' },
  { id: 'carousel', label: 'Galeria', icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

const EditQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => { if (id) loadQuiz(); }, [id]);

  const loadQuiz = async () => {
    setLoading(true);
    const { data: quizData } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (!quizData) { toast.error("Quiz não encontrado"); navigate('/dashboard/quizzes'); return; }
    setQuiz(quizData as QuizData);

    const { data: qData } = await supabase.from('quiz_questions').select('*, quiz_options(*)').eq('quiz_id', id).order('order_index');
    if (qData) {
      const loadedQuestions = qData.map((q: any) => ({
        id: q.id, title: q.title, description: q.description || '', image_url: q.image_url || '',
        order_index: q.order_index,
        question_type: q.question_type || 'multiple_choice',
        button_text: q.button_text || 'Continuar',
        button_url: q.button_url || '',
        is_external_link: q.is_external_link || false,
        options: (q.quiz_options || []).sort((a: any, b: any) => a.order_index - b.order_index).map((o: any) => ({
          id: o.id, option_text: o.option_text, score: o.score || 0, order_index: o.order_index, image_url: o.image_url || ''
        }))
      }));
      setQuestions(loadedQuestions);
      if (loadedQuestions.length > 0) setSelectedQuestionId(loadedQuestions[0].id);
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
      await supabase.from('quizzes').update({
        title: quiz.title, description: quiz.description, slug: quiz.slug,
        status: quiz.status, cover_image: quiz.cover_image,
      }).eq('id', id);

      for (const q of questions) {
        const { data: savedQ } = await supabase.from('quiz_questions').upsert({
          id: q.id.includes('-') ? q.id : undefined,
          quiz_id: id, title: q.title, description: q.description,
          image_url: q.image_url, order_index: q.order_index, question_type: q.question_type,
          button_text: q.button_text, button_url: q.button_url, is_external_link: q.is_external_link
        }).select().single();

        if (savedQ) {
          await supabase.from('quiz_options').delete().eq('question_id', savedQ.id);
          if (q.options.length > 0) {
            await supabase.from('quiz_options').insert(
              q.options.map(o => ({
                question_id: savedQ.id, option_text: o.option_text,
                score: o.score, order_index: o.order_index, image_url: o.image_url
              }))
            );
          }
        }
      }

      await supabase.from('quiz_results').delete().eq('quiz_id', id);
      await supabase.from('quiz_results').insert(
        results.map(r => ({
          quiz_id: id, title: r.title, description: r.description,
          min_score: r.min_score, max_score: r.max_score,
          recommended_product_url: r.recommended_product_url, cta_text: r.cta_text,
          result_image: r.result_image
        }))
      );

      toast.success("Quiz guardado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar o quiz");
    } finally {
      setSaving(false);
    }
  };

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[600px]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] bg-[#F8FAFC] overflow-hidden rounded-3xl border shadow-2xl mt-[-2rem] mb-[-2rem] mx-[-1rem]">
        
        {/* LEFT: STEPS (QUESTIONS) SIDEBAR */}
        <div className="w-64 bg-white border-r flex flex-col shrink-0">
          <div className="p-5 border-b bg-slate-50/50">
             <h3 className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Estrutura do Quiz</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setSelectedQuestionId(q.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all group ${
                  selectedQuestionId === q.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                  selectedQuestionId === q.id ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Pergunta {idx + 1}</span>
                  <span className="text-xs font-bold truncate w-full">{q.title || 'Sem título'}</span>
                </div>
              </button>
            ))}
            <Button 
              variant="ghost" 
              onClick={() => {
                const newQ = { id: crypto.randomUUID(), title: 'Nova Pergunta', description: '', image_url: '', order_index: questions.length, options: [], question_type: 'multiple_choice' as const, button_text: 'Continuar', button_url: '', is_external_link: false };
                setQuestions([...questions, newQ]);
                setSelectedQuestionId(newQ.id);
              }}
              className="w-full mt-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl h-14 hover:border-primary/50 hover:text-primary transition-all font-bold"
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
            </Button>
          </div>
        </div>

        {/* MIDDLE: PALETTE */}
        <div className="w-64 bg-white border-r flex flex-col shrink-0 shadow-sm z-10">
          <div className="p-5 border-b">
            <h3 className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Elementos</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 content-start">
            {ELEMENT_TYPES.map((type) => (
              <button
                key={type.id}
                className="flex flex-col items-center justify-center aspect-square rounded-3xl border border-slate-100 bg-white hover:border-primary hover:shadow-xl transition-all group active:scale-95"
              >
                <div className={`w-12 h-12 rounded-2xl ${type.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <type.icon className={`w-6 h-6 ${type.color}`} />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{type.label}</span>
              </button>
            ))}
          </div>
          <div className="p-4 border-t bg-slate-50">
             <Button onClick={saveAll} disabled={saving} className="w-full bg-primary hover:bg-primary/90 rounded-xl font-bold shadow-lg shadow-primary/20 h-12">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar Quiz
             </Button>
          </div>
        </div>

        {/* CENTER: CANVAS */}
        <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-y-auto bg-slate-50 relative">
          {/* Top toolbar */}
          <div className="absolute top-6 flex items-center gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-100 z-20 scale-90">
             <Button variant="ghost" size="sm" className="rounded-xl font-bold"><Share2 className="w-4 h-4 mr-2" /> Compartilhar</Button>
             <div className="w-px h-4 bg-slate-200 mx-2" />
             <Button variant="ghost" size="sm" className="rounded-xl font-bold" onClick={() => window.open(`/quiz/${quiz?.slug}`, '_blank')}><Eye className="w-4 h-4 mr-2" /> Ver Quiz</Button>
          </div>

          <div className="w-[360px] h-[720px] bg-white rounded-[3.5rem] border-[12px] border-slate-900 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col scale-90 lg:scale-100 transition-transform">
            <div className="h-7 w-40 bg-slate-900 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-[1.5rem] z-30" />
            
            <div className="flex-1 overflow-y-auto scrollbar-hide bg-white relative pt-12 p-6 space-y-6">
              {selectedQuestion ? (
                <>
                  <div className="space-y-4">
                    <h2 className="text-xl font-black text-center text-slate-800 leading-tight">
                      {selectedQuestion.title || 'Título da Pergunta'}
                    </h2>
                    <p className="text-xs text-center text-slate-500 font-medium leading-relaxed">
                      {selectedQuestion.description || 'Descrição da pergunta aparece aqui...'}
                    </p>
                  </div>

                  {selectedQuestion.image_url && (
                    <div className="w-full aspect-video rounded-3xl overflow-hidden border-4 border-slate-50 shadow-inner">
                       <img src={selectedQuestion.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                  )}

                  <div className="space-y-3">
                    {selectedQuestion.options.map((opt, i) => (
                      <div key={i} className="p-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 flex items-center justify-between group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                        <span className="text-xs">{opt.option_text || `Opção ${i + 1}`}</span>
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-primary group-hover:bg-primary" />
                      </div>
                    ))}
                    {selectedQuestion.options.length === 0 && (
                      <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl text-center space-y-2 opacity-50">
                        <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-[10px] font-bold uppercase tracking-wider">Sem opções configuradas</p>
                      </div>
                    )}
                  </div>

                  <Button className="w-full h-14 bg-primary rounded-2xl shadow-xl shadow-primary/20 font-black text-sm uppercase tracking-widest mt-4">
                    {selectedQuestion.button_text}
                  </Button>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-40">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center"><HelpCircle className="w-10 h-10 text-slate-400" /></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Selecione uma pergunta para começar a editar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: PROPERTIES PANEL */}
        <div className="w-80 bg-white border-l flex flex-col shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="p-4 border-b">
              <TabsList className="w-full bg-slate-100 rounded-xl p-1">
                <TabsTrigger value="config" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Settings2 className="w-4 h-4 mr-2" /> Conteúdo
                </TabsTrigger>
                <TabsTrigger value="design" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Palette className="w-4 h-4 mr-2" /> Quiz
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'config' && selectedQuestion && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Título da Pergunta</Label>
                    <Input 
                      value={selectedQuestion.title} 
                      onChange={e => setQuestions(qs => qs.map(q => q.id === selectedQuestion.id ? { ...q, title: e.target.value } : q))}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição</Label>
                    <Textarea 
                      value={selectedQuestion.description} 
                      onChange={e => setQuestions(qs => qs.map(q => q.id === selectedQuestion.id ? { ...q, description: e.target.value } : q))}
                      className="rounded-xl min-h-[100px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Imagem Principal</Label>
                    <ImageUpload 
                      value={selectedQuestion.image_url}
                      onChange={url => setQuestions(qs => qs.map(q => q.id === selectedQuestion.id ? { ...q, image_url: url || '' } : q))}
                      folder="quiz"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Opções de Resposta</Label>
                      <Button variant="ghost" size="sm" onClick={() => {
                        const newOpt = { id: crypto.randomUUID(), option_text: 'Nova Opção', score: 0, order_index: selectedQuestion.options.length };
                        setQuestions(qs => qs.map(q => q.id === selectedQuestion.id ? { ...q, options: [...q.options, newOpt] } : q));
                      }}>
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedQuestion.options.map((opt, oIdx) => (
                        <div key={opt.id} className="flex gap-2 items-center">
                          <Input 
                            value={opt.option_text} 
                            onChange={e => {
                              const newOpts = [...selectedQuestion.options];
                              newOpts[oIdx].option_text = e.target.value;
                              setQuestions(qs => qs.map(q => q.id === selectedQuestion.id ? { ...q, options: newOpts } : q));
                            }}
                            className="rounded-xl h-10 text-xs"
                          />
                          <Input 
                            type="number"
                            value={opt.score} 
                            onChange={e => {
                              const newOpts = [...selectedQuestion.options];
                              newOpts[oIdx].score = parseInt(e.target.value) || 0;
                              setQuestions(qs => qs.map(q => q.id === selectedQuestion.id ? { ...q, options: newOpts } : q));
                            }}
                            className="rounded-xl h-10 w-16 text-xs text-center"
                          />
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                            setQuestions(qs => qs.map(q => q.id === selectedQuestion.id ? { ...q, options: q.options.filter((_, i) => i !== oIdx) } : q));
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'design' && quiz && (
                <div className="space-y-6">
                   <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome do Quiz</Label>
                    <Input value={quiz.title} onChange={e => setQuiz({...quiz, title: e.target.value})} className="rounded-xl h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">URL do Quiz (Slug)</Label>
                    <Input value={quiz.slug} onChange={e => setQuiz({...quiz, slug: e.target.value})} className="rounded-xl h-11 font-mono text-xs" />
                  </div>
                  <div className="space-y-4">
                     <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Resultados Sugeridos</Label>
                     {results.map((r, rIdx) => (
                       <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                          <Input value={r.title} placeholder="Título do Resultado" onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, title: e.target.value } : res))} className="bg-white rounded-xl h-10 text-xs font-bold" />
                          <div className="flex gap-2">
                             <Input type="number" value={r.min_score} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, min_score: parseInt(e.target.value) || 0 } : res))} className="bg-white rounded-xl h-10 text-center text-xs" placeholder="Min" />
                             <Input type="number" value={r.max_score} onChange={e => setResults(prev => prev.map((res, i) => i === rIdx ? { ...res, max_score: parseInt(e.target.value) || 0 } : res))} className="bg-white rounded-xl h-10 text-center text-xs" placeholder="Max" />
                          </div>
                       </div>
                     ))}
                     <Button variant="outline" className="w-full rounded-xl border-dashed" onClick={() => setResults([...results, { id: crypto.randomUUID(), title: 'Novo Resultado', description: '', min_score: 0, max_score: 100, recommended_product_url: '', cta_text: 'Comprar' }])}>
                       <Plus className="w-4 h-4 mr-2" /> Adicionar Resultado
                     </Button>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditQuiz;

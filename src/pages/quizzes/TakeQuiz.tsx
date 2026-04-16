import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";

type QuizState = 'welcome' | 'questions' | 'lead-form' | 'result';

const TakeQuiz = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  
  // Data
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  
  // State Machine
  const [step, setStep] = useState<QuizState>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Answers Data
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  
  // Lead Form
  const [lead, setLead] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  
  // Final Result
  const [finalResult, setFinalResult] = useState<any>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data: quizData } = await supabase.from('quizzes').select('*').eq('slug', slug).eq('status', 'active').single();
      if (!quizData) {
        setLoading(false);
        return;
      }
      setQuiz(quizData);

      const { data: qData } = await supabase.from('quiz_questions').select('*, quiz_options(*)').eq('quiz_id', quizData.id).order('order_index', { ascending: true });
      // sort options too
      const formattedQ = (qData || []).map(q => {
        return { ...q, quiz_options: q.quiz_options.sort((a:any, b:any) => a.order_index - b.order_index) }
      });
      setQuestions(formattedQ);

      const { data: rData } = await supabase.from('quiz_results').select('*').eq('quiz_id', quizData.id);
      setResults(rData || []);
      
      setLoading(false);
    };
    fetchQuiz();
  }, [slug]);

  const handleOptionSelect = (option: any) => {
    const q = questions[currentQuestionIndex];
    setAnswers([...answers, { question: q.title, option: option.option_text, score: option.score }]);
    setScore(score + (option.score || 0));

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setStep('lead-form');
    }
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.email) return;

    setSubmitting(true);
    
    // Find matching result
    const match = results.find(r => score >= (r.min_score || 0) && score <= (r.max_score || 999999)) || results[0];
    setFinalResult(match);

    await supabase.from('quiz_leads').insert({
      quiz_id: quiz.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      answers_json: answers,
      total_score: score,
      result_title: match?.title || "Sem Resultado Mapeado"
    });

    setStep('result');
    setSubmitting(false);
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center bg-muted/30"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  if (!quiz) return <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 text-center px-4"><Logo size="sm"/><p className="mt-6 text-muted-foreground">Quiz não encontrado ou indisponível.</p></div>;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-xl mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="w-full justify-center flex">
        {/* WELCOME */}
        {step === 'welcome' && (
          <div className="w-full max-w-xl animate-fade-in text-center space-y-6">
            <h1 className="text-3xl md:text-5xl font-black text-foreground">{quiz.title}</h1>
            {quiz.description && <p className="text-lg text-muted-foreground">{quiz.description}</p>}
            <Button size="lg" className="h-14 px-10 text-lg w-full sm:w-auto" onClick={() => setStep('questions')}>
              Começar Agora
            </Button>
          </div>
        )}

        {/* QUESTIONS */}
        {step === 'questions' && (
          <Card className="w-full max-w-xl animate-fade-in shadow-lg border-border relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1 bg-muted w-full">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
              />
            </div>
            <CardContent className="pt-10 pb-8 px-6 sm:px-10">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block">
                Pergunta {currentQuestionIndex + 1} de {questions.length}
              </span>
              <h2 className="text-2xl font-bold text-foreground mb-2 leading-tight">
                {questions[currentQuestionIndex].title}
              </h2>
              {questions[currentQuestionIndex].description && (
                <p className="text-muted-foreground mb-6">{questions[currentQuestionIndex].description}</p>
              )}
              
              <div className="mt-8 space-y-3">
                {questions[currentQuestionIndex].quiz_options.map((opt: any) => (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt)}
                    className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all outline-none font-medium text-foreground relative overflow-hidden group"
                  >
                    {opt.option_text}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* LEAD CAPTURE FORM */}
        {step === 'lead-form' && (
          <Card className="w-full max-w-xl animate-fade-in shadow-lg border-border">
            <CardContent className="pt-10 pb-8 px-6 sm:px-10 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Quase lá!</h2>
              <p className="text-muted-foreground mb-8">
                Estamos a calcular o seu resultado. Para onde devemos enviar os detalhes?
              </p>
              
              <form onSubmit={submitLead} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label>Seu nome *</Label>
                  <Input placeholder="Como gostaria de ser chamado?" value={lead.name} onChange={(e) => setLead({...lead, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Seu melhor e-mail *</Label>
                  <Input type="email" placeholder="email@exemplo.com" value={lead.email} onChange={(e) => setLead({...lead, email: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (Opcional)</Label>
                  <Input type="tel" placeholder="+258 84 000 0000" value={lead.phone} onChange={(e) => setLead({...lead, phone: e.target.value})} />
                </div>
                
                <Button type="submit" size="lg" className="w-full mt-4 h-14" disabled={submitting}>
                  {submitting ? 'A analisar...' : 'Ver meu Resultado'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* RESULT */}
        {step === 'result' && (
          <Card className="w-full max-w-xl animate-fade-in shadow-lg border-primary/20 bg-card overflow-hidden text-center relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            <CardContent className="pt-12 pb-10 px-6 sm:px-10">
              {finalResult ? (
                <>
                  <p className="text-sm font-bold text-primary uppercase tracking-widest mb-4">Seu Perfil / Resultado</p>
                  <h2 className="text-3xl font-black text-foreground mb-4 leading-tight">{finalResult.title}</h2>
                  {finalResult.description && (
                    <p className="text-lg text-muted-foreground mb-8 text-balance">{finalResult.description}</p>
                  )}
                  
                  {(finalResult.recommended_product_url || quiz.call_to_action_url) && (
                    <Button size="lg" className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20" asChild>
                      <a href={finalResult.recommended_product_url || quiz.call_to_action_url}>
                        {finalResult.cta_text || quiz.call_to_action_text || "Acessar Recomendação"}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Obrigado por participar!</h2>
                  <p className="text-muted-foreground mb-8">Nossas análises foram concluídas e entraremos em contato.</p>
                  {quiz.call_to_action_url && (
                    <Button size="lg" className="w-full h-14 font-bold" asChild>
                      <a href={quiz.call_to_action_url}>{quiz.call_to_action_text || "Acessar site"}</a>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TakeQuiz;

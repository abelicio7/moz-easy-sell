import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ChevronRight, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Option { id: string; option_text: string; score: number; order_index: number; }
interface Question { 
  id: string; title: string; description?: string; image_url?: string; 
  options: Option[]; question_type: 'multiple_choice' | 'message';
  button_text?: string; button_url?: string; is_external_link?: boolean;
}
interface QuizResult { title: string; description: string; recommended_product_url: string; cta_text: string; result_image?: string; min_score?: number; max_score?: number; }
interface QuizData { id: string; title: string; description: string; cover_image: string; }

const TakeQuiz = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Navigation
  const [step, setStep] = useState<'intro' | 'question' | 'lead' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; answer: string; score: number }[]>([]);
  const [direction, setDirection] = useState(1);

  // Lead form
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data: quizData } = await supabase
        .from('quizzes').select('*').eq('slug', slug).eq('status', 'active').maybeSingle();

      if (!quizData) { setLoading(false); return; }
      setQuiz(quizData as QuizData);

      const { data: qData } = await supabase
        .from('quiz_questions')
        .select('id, title, description, image_url, question_type, button_text, button_url, is_external_link, quiz_options(id, option_text, score, order_index)')
        .eq('quiz_id', quizData.id)
        .order('order_index');

      if (qData) {
        setQuestions(qData.map((q: any) => ({
          id: q.id, title: q.title, description: q.description || '',
          image_url: q.image_url || null,
          question_type: q.question_type || 'multiple_choice',
          button_text: q.button_text || 'Continuar',
          button_url: q.button_url || '',
          is_external_link: q.is_external_link || false,
          options: (q.quiz_options || []).sort((a: any, b: any) => a.order_index - b.order_index)
        })));
      }

      const { data: rData } = await supabase
        .from('quiz_results').select('*').eq('quiz_id', quizData.id);
      if (rData) setAllResults(rData as QuizResult[]);

      setLoading(false);
    };
    fetchQuiz();
  }, [slug]);

  const handleAnswer = (option: Option) => {
    setDirection(1);
    const newScore = totalScore + option.score;
    setTotalScore(newScore);
    setAnswers(prev => [...prev, { questionId: questions[currentQ].id, answer: option.option_text, score: option.score }]);

    if (currentQ + 1 < questions.length) {
      setCurrentQ(prev => prev + 1);
    } else {
      setStep('lead');
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;
    setSubmittingLead(true);
    try {
      // Find the best matching result based on score
      const finalResult = allResults.find(r => 
        totalScore >= (r.min_score || 0) && totalScore <= (r.max_score || 999)
      ) || allResults[0]; // Fallback to first result if no range matches

      setResult(finalResult);

      await supabase.from('quiz_leads').insert({
        quiz_id: quiz.id,
        name: leadName,
        email: leadEmail,
        phone: leadPhone || null,
        answers_json: answers,
        total_score: totalScore,
        result_title: finalResult?.title || ''
      });
      setStep('result');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingLead(false);
    }
  };

  const progress = step === 'intro' ? 0
    : step === 'question' ? Math.round((currentQ / questions.length) * 100)
    : step === 'lead' ? 90 : 100;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
    </div>
  );

  if (!quiz) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-6">
      <h1 className="text-2xl font-black text-slate-800 mb-2">Quiz não encontrado</h1>
      <p className="text-slate-500">Este link pode estar inativo ou expirado.</p>
    </div>
  );

  const q = questions[currentQ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-100 z-50">
        <motion.div
          className="h-full bg-blue-600"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Step counter */}
      {step === 'question' && (
        <div className="fixed top-1.5 left-0 w-full flex justify-center pt-3 z-40">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1 rounded-full shadow-sm border border-slate-100">
            {currentQ + 1} / {questions.length}
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-20 w-full max-w-lg mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          {/* INTRO */}
          {step === 'intro' && (
            <motion.div key="intro"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.35 }}
              className="w-full text-center space-y-8"
            >
              {quiz.cover_image && (
                <div className="w-full aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-100">
                  <img src={quiz.cover_image} alt={quiz.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-4">
                <h1 className="text-4xl font-black text-slate-900 leading-tight tracking-tight">
                  {quiz.title}
                </h1>
                {quiz.description && (
                  <p className="text-lg text-slate-500 leading-relaxed">{quiz.description}</p>
                )}
              </div>
              <Button
                size="lg"
                className="w-full h-16 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                onClick={() => { setStep('question'); setCurrentQ(0); }}
              >
                Começar Agora <ChevronRight className="w-6 h-6 ml-1" />
              </Button>
              <p className="text-xs text-slate-300 font-black uppercase tracking-widest">
                {questions.length} perguntas · Rápido e gratuito
              </p>
            </motion.div>
          )}

          {/* QUESTION OR MESSAGE */}
          {step === 'question' && q && (
            <motion.div key={`q-${currentQ}`}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.3 }}
              className="w-full space-y-6"
            >
              {q.image_url && (
                <div className="w-full aspect-[4/3] rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/80 border-4 border-white">
                  <img src={q.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              
              <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight text-center px-2">
                {q.title}
              </h2>

              {q.question_type === 'message' ? (
                <div className="space-y-8">
                  {q.description && (
                    <p className="text-lg text-slate-500 leading-relaxed text-center whitespace-pre-wrap px-4">
                      {q.description}
                    </p>
                  )}
                  <Button
                    size="lg"
                    className="w-full h-16 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                    onClick={() => {
                      if (q.is_external_link && q.button_url) {
                        window.open(q.button_url, '_blank');
                      } else {
                        if (currentQ + 1 < questions.length) {
                          setCurrentQ(prev => prev + 1);
                        } else {
                          setStep('lead');
                        }
                      }
                    }}
                  >
                    {q.button_text || 'Continuar'} <ChevronRight className="w-6 h-6 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {q.options.map((opt, i) => (
                    <button key={opt.id}
                      onClick={() => handleAnswer(opt)}
                      className="group w-full flex items-center gap-4 p-5 rounded-[1.5rem] border-2 border-slate-100 bg-white hover:border-blue-500 hover:bg-blue-50/30 active:scale-[0.98] transition-all duration-200 text-left shadow-sm hover:shadow-md"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center font-black text-sm text-slate-400 group-hover:text-white transition-all shrink-0">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-base font-bold text-slate-700 group-hover:text-slate-900 flex-1">
                        {opt.option_text}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* LEAD CAPTURE */}
          {step === 'lead' && (
            <motion.div key="lead"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.35 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                  Quase lá! 🎉
                </h2>
                <p className="text-slate-500 text-lg">
                  Deixa os teus dados para receber o resultado personalizado.
                </p>
              </div>

              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">O teu nome</Label>
                  <Input
                    required value={leadName} onChange={e => setLeadName(e.target.value)}
                    placeholder="Como te chamas?"
                    className="h-16 rounded-2xl border-2 border-slate-100 text-lg px-6 bg-white shadow-sm focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</Label>
                  <Input
                    required type="email" value={leadEmail} onChange={e => setLeadEmail(e.target.value)}
                    placeholder="teu@email.com"
                    className="h-16 rounded-2xl border-2 border-slate-100 text-lg px-6 bg-white shadow-sm focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp</Label>
                  <Input
                    type="tel" value={leadPhone} onChange={e => setLeadPhone(e.target.value)}
                    placeholder="Ex: 840000000"
                    className="h-16 rounded-2xl border-2 border-slate-100 text-lg px-6 bg-white shadow-sm focus:border-blue-500"
                  />
                </div>
                <Button type="submit" disabled={submittingLead}
                  className="w-full h-16 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 mt-4">
                  {submittingLead ? <Loader2 className="animate-spin mr-2" /> : null}
                  {submittingLead ? 'A processar...' : 'Ver o Meu Resultado'}
                </Button>
              </form>
            </motion.div>
          )}

          {/* RESULT */}
          {step === 'result' && result && (
            <motion.div key="result"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full text-center space-y-8"
            >
              {result.result_image && (
                <div className="w-full aspect-video rounded-[2rem] overflow-hidden shadow-2xl shadow-emerald-100">
                  <img src={result.result_image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-2">
                {!result.result_image && (
                  <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                )}
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {result.title || 'O teu resultado está pronto!'}
                </h1>
                {result.description && (
                  <p className="text-lg text-slate-500 leading-relaxed pt-2 whitespace-pre-wrap">
                    {result.description}
                  </p>
                )}
              </div>

              {result.recommended_product_url && (
                <Button size="lg" asChild
                  className="w-full h-16 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20">
                  <a href={result.recommended_product_url} target="_blank" rel="noopener noreferrer">
                    {result.cta_text || 'Garantir Agora'} <ArrowRight className="w-5 h-5 ml-2" />
                  </a>
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="py-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-200">Powered by EnsinaPay</p>
      </div>
    </div>
  );
};

export default TakeQuiz;

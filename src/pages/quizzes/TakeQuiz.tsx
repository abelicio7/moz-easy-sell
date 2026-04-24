import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, CheckCircle2, MessageSquare, HelpCircle, UserPlus, Flag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "@/components/Logo";

const TakeQuiz = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  
  // Data
  const [flow, setFlow] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  
  // Navigation State
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [score, setScore] = useState(0);
  
  // Form State
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Flow
        const { data: flowData, error: flowErr } = await supabase
          .from('flows')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'active')
          .single();

        if (flowErr || !flowData) {
          setLoading(false);
          return;
        }
        setFlow(flowData);

        // 2. Fetch Nodes & Edges
        const { data: nodesData } = await supabase.from('flow_nodes').select('*').eq('flow_id', flowData.id);
        const { data: edgesData } = await supabase.from('flow_edges').select('*').eq('flow_id', flowData.id);

        setNodes(nodesData || []);
        setEdges(edgesData || []);

        // 3. Find Start Node
        const startNode = nodesData?.find(n => n.type === 'start');
        if (startNode) {
          setCurrentNodeId(startNode.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlowData();
  }, [slug]);

  const currentNode = nodes.find(n => n.id === currentNodeId);

  const goToNextNode = useCallback((nextNodeId: string, additionalData?: any) => {
    setPath(prev => [...prev, currentNodeId!]);
    if (additionalData) {
      if (additionalData.answer) {
        setAnswers(prev => ({ ...prev, [currentNodeId!]: additionalData.answer }));
      }
      if (additionalData.score) {
        setScore(prev => prev + additionalData.score);
      }
    }
    setCurrentNodeId(nextNodeId);
  }, [currentNodeId]);

  const handleNext = () => {
    const edge = edges.find(e => e.source_node_id === currentNodeId);
    if (edge) {
      goToNextNode(edge.target_node_id);
    }
  };

  const handleOptionSelect = (option: any) => {
    // Find edge connected to this specific handle (option.id)
    const edge = edges.find(e => e.source_node_id === currentNodeId && e.source_handle === option.id);
    
    // If no specific edge, find general edge from this node
    const fallbackEdge = edges.find(e => e.source_node_id === currentNodeId);
    
    const targetId = edge?.target_node_id || fallbackEdge?.target_node_id;
    
    if (targetId) {
      goToNextNode(targetId, { answer: option.label, score: option.score || 0 });
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save lead to database
      await supabase.from('flow_leads').insert({
        flow_id: flow.id,
        contact_data: formData,
        answers: answers,
        path: path,
        score: score
      });

      // Go to next node
      handleNext();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Iniciando Experiência...</p>
      </div>
    );
  }

  if (!flow || !currentNode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-6">
        <Logo size="sm" />
        <h1 className="text-2xl font-black text-slate-800 mt-8 mb-2">Funil não encontrado</h1>
        <p className="text-slate-500 max-w-xs">Este link pode estar expirado ou o funil ainda não foi publicado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-slate-50 flex flex-col items-center overflow-x-hidden">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-100 z-50">
        <motion.div 
          className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${(path.length / (nodes.length || 1)) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center py-12 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNodeId}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="w-full"
          >
            {/* START NODE */}
            {currentNode.type === 'start' && (
              <div className="text-center space-y-8 py-10">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
                  <Logo size="sm" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight tracking-tighter">
                    {currentNode.data.label}
                  </h1>
                  <p className="text-lg md:text-xl text-slate-500 max-w-md mx-auto leading-relaxed">
                    Clique no botão abaixo para iniciar a sua jornada personalizada.
                  </p>
                </div>
                <Button 
                  size="lg" 
                  className="h-16 px-12 rounded-full text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 w-full md:w-auto"
                  onClick={handleNext}
                >
                  Começar Agora <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}

            {/* MESSAGE NODE */}
            {currentNode.type === 'message' && (
              <div className="space-y-8 py-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                     <MessageSquare className="w-6 h-6" />
                   </div>
                   <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Informação</span>
                </div>
                <div className="space-y-6">
                   <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tighter">
                    {currentNode.data.label}
                   </h2>
                   <div className="text-lg md:text-2xl text-slate-600 leading-relaxed text-balance">
                    {currentNode.data.content}
                   </div>
                </div>
                <Button 
                  size="lg" 
                  className="h-16 px-12 rounded-full text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 w-full md:w-auto mt-8"
                  onClick={handleNext}
                >
                  Continuar <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}

            {/* QUESTION NODE */}
            {currentNode.type === 'question' && (
              <div className="space-y-8 py-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                     <HelpCircle className="w-6 h-6" />
                   </div>
                   <span className="text-xs font-black text-amber-600 uppercase tracking-widest">Pergunta</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tighter">
                  {currentNode.data.question || currentNode.data.label}
                </h2>
                
                <div className="grid gap-3 pt-4">
                  {(currentNode.data.options || []).map((opt: any, i: number) => (
                    <button
                      key={opt.id || i}
                      onClick={() => handleOptionSelect(opt)}
                      className="group flex items-center justify-between p-6 rounded-3xl border-2 border-slate-100 bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-300 text-left outline-none"
                    >
                      <span className="text-lg font-bold text-slate-700 group-hover:text-blue-700 transition-colors">
                        {opt.label || `Opção ${i+1}`}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-500 group-hover:text-white transition-all">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* INPUT / LEAD NODE */}
            {currentNode.type === 'input' && (
              <div className="space-y-8 py-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                     <UserPlus className="w-6 h-6" />
                   </div>
                   <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Inscrição</span>
                </div>
                <div className="space-y-4 text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tighter">
                    {currentNode.data.title || 'Complete seus dados'}
                  </h2>
                  <p className="text-lg text-slate-500">Estamos quase terminando! Deixe seus dados para prosseguir.</p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-4 pt-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">Seu Nome</Label>
                      <Input 
                        className="h-14 rounded-2xl border-2 focus-visible:ring-blue-500 text-lg px-6" 
                        placeholder="Como gostaria de ser chamado?" 
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">E-mail Principal</Label>
                      <Input 
                        type="email" 
                        className="h-14 rounded-2xl border-2 focus-visible:ring-blue-500 text-lg px-6" 
                        placeholder="seu@email.com" 
                        required
                        value={formData.email || ''}
                        onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700">WhatsApp (com DDD)</Label>
                      <Input 
                        type="tel" 
                        className="h-14 rounded-2xl border-2 focus-visible:ring-blue-500 text-lg px-6" 
                        placeholder="+258 84 000 0000" 
                        value={formData.phone || ''}
                        onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="h-16 w-full rounded-full text-lg font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 mt-4"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Finalizar e Ver Resultado'}
                  </Button>
                </form>
              </div>
            )}

            {/* RESULT NODE */}
            {currentNode.type === 'result' && (
              <div className="text-center space-y-8 py-10">
                <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight tracking-tighter">
                    {currentNode.data.label}
                  </h1>
                  <div className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-lg mx-auto">
                    {currentNode.data.description || 'Obrigado por completar este funil! Recebemos suas respostas com sucesso.'}
                  </div>
                </div>
                
                {currentNode.data.buttonUrl && (
                  <Button 
                    size="lg" 
                    className="h-16 px-12 rounded-full text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 w-full md:w-auto"
                    asChild
                  >
                    <a href={currentNode.data.buttonUrl} target="_blank" rel="noopener noreferrer">
                      {currentNode.data.buttonText || 'Acessar Agora'} <ArrowRight className="w-5 h-5 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="py-8 opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2">
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Powered by</span>
         <Logo size="sm" />
      </div>
    </div>
  );
};

export default TakeQuiz;

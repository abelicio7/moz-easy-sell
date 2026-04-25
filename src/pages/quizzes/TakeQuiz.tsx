import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowRight, CheckCircle2, MessageSquare, HelpCircle, UserPlus, Flag, ChevronRight } from "lucide-react";
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
  const [leadId, setLeadId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchFlowData = async () => {
      try {
        setLoading(true);
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

        const { data: nodesData } = await supabase.from('flow_nodes').select('*').eq('flow_id', flowData.id);
        const { data: edgesData } = await supabase.from('flow_edges').select('*').eq('flow_id', flowData.id);

        setNodes(nodesData || []);
        setEdges(edgesData || []);

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

  // Initial Lead Creation
  const initializeLead = async (startNodeId: string) => {
    try {
      const { data, error } = await supabase.from('flow_leads').insert({
        flow_id: flow.id,
        status: 'in_progress',
        current_node_id: startNodeId,
        path: [startNodeId]
      }).select().single();
      
      if (data) setLeadId(data.id);
    } catch (err) {
      console.error("Failed to init lead tracking", err);
    }
  };

  const updateLeadTracking = async (nodeId: string, updatedPath: string[], updatedAnswers: any, updatedScore: number, isFinal = false) => {
    if (!leadId) return;
    try {
      await supabase.from('flow_leads').update({
        current_node_id: nodeId,
        path: updatedPath,
        answers: updatedAnswers,
        score: updatedScore,
        status: isFinal ? 'completed' : 'in_progress'
      }).eq('id', leadId);
    } catch (err) {
      console.error("Failed to update lead tracking", err);
    }
  };

  const goToNextNode = useCallback((nextNodeId: string, additionalData?: any) => {
    const newPath = [...path, currentNodeId!];
    const newAnswers = additionalData?.answer ? { ...answers, [currentNodeId!]: additionalData.answer } : answers;
    const newScore = score + (additionalData?.score || 0);

    setPath(newPath);
    setAnswers(newAnswers);
    setScore(newScore);
    setCurrentNodeId(nextNodeId);

    const targetNode = nodes.find(n => n.id === nextNodeId);
    updateLeadTracking(nextNodeId, newPath, newAnswers, newScore, targetNode?.type === 'result');
  }, [currentNodeId, path, answers, score, leadId, nodes]);

  const handleNext = () => {
    const edge = edges.find(e => e.source_node_id === currentNodeId);
    if (edge) {
      if (!leadId && currentNode?.type === 'start') {
        initializeLead(edge.target_node_id).then(() => goToNextNode(edge.target_node_id));
      } else {
        goToNextNode(edge.target_node_id);
      }
    }
  };

  const handleOptionSelect = (option: any) => {
    const edge = edges.find(e => e.source_node_id === currentNodeId && e.source_handle === option.id);
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
      if (leadId) {
        await supabase.from('flow_leads').update({ contact_data: formData }).eq('id', leadId);
      }
      handleNext();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentNode = nodes.find(n => n.id === currentNodeId);
  const totalSteps = useMemo(() => {
    // Estimativa simples de passos baseada em profundidade ou contagem de nós relevantes
    return nodes.filter(n => ['question', 'message', 'input'].includes(n.type)).length + 1;
  }, [nodes]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Preparando Experiência...</p>
      </div>
    );
  }

  if (!flow || !currentNode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center px-6">
        <Logo size="sm" />
        <h1 className="text-2xl font-black text-slate-800 dark:text-white mt-8 mb-2">Funil Indisponível</h1>
        <p className="text-slate-500 max-w-xs">Este conteúdo não está acessível no momento.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center selection:bg-blue-100 overflow-x-hidden">
      {/* Progress Header */}
      <div className="fixed top-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 border-b border-slate-100 dark:border-slate-800">
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
            initial={{ width: 0 }}
            animate={{ width: `${(path.length / (totalSteps || 1)) * 100}%` }}
          />
        </div>
        <div className="max-w-xl mx-auto px-6 h-12 flex items-center justify-between">
           <Logo size="sm" />
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passo {path.length + 1} de {totalSteps}</span>
           </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl flex-1 flex flex-col pt-24 pb-12 px-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNodeId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            {/* IMAGE HEADER (XQuiz Style) */}
            {currentNode.data.image_url && (
              <div className="w-full aspect-[16/10] rounded-[2.5rem] overflow-hidden mb-8 shadow-2xl shadow-blue-500/10 border-4 border-white dark:border-slate-800">
                <img 
                  src={currentNode.data.image_url} 
                  alt="Destaque" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* START NODE */}
            {currentNode.type === 'start' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
                {!currentNode.data.image_url && (
                  <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl shadow-blue-500/40 rotate-3">
                    <Logo size="sm" />
                  </div>
                )}
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-6 text-balance">
                  {currentNode.data.label}
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 leading-relaxed px-4">
                  Descubra o caminho ideal preparado especialmente para si. Comece em menos de 1 minuto.
                </p>
                <Button 
                  size="lg" 
                  className="h-16 px-12 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 w-full"
                  onClick={handleNext}
                >
                  Continuar <ChevronRight className="w-6 h-6 ml-1" />
                </Button>
              </div>
            )}

            {/* MESSAGE NODE */}
            {currentNode.type === 'message' && (
              <div className="flex-1 flex flex-col py-2">
                <div className="space-y-6 text-center md:text-left">
                   <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                    {currentNode.data.label}
                   </h2>
                   <div className="text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {currentNode.data.content}
                   </div>
                </div>
                <div className="mt-auto pt-10">
                  <Button 
                    size="lg" 
                    className="h-16 px-12 rounded-2xl text-lg font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 w-full"
                    onClick={handleNext}
                  >
                    Próximo <ChevronRight className="w-6 h-6 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* QUESTION NODE */}
            {currentNode.type === 'question' && (
              <div className="flex-1 flex flex-col py-2">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight mb-8 text-center md:text-left">
                  {currentNode.data.question || currentNode.data.label}
                </h2>
                
                <div className="grid gap-4">
                  {(currentNode.data.options || []).map((opt: any, i: number) => (
                    <button
                      key={opt.id || i}
                      onClick={() => handleOptionSelect(opt)}
                      className="group relative flex items-center p-6 rounded-[1.8rem] border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 text-left outline-none"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all mr-4 shrink-0 font-black text-xs">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-lg font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors flex-1">
                        {opt.label || `Opção ${i+1}`}
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* INPUT NODE */}
            {currentNode.type === 'input' && (
              <div className="flex-1 flex flex-col py-2">
                <div className="space-y-4 text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                    {currentNode.data.title || 'Complete seus dados'}
                  </h2>
                  <p className="text-lg text-slate-500">Iremos enviar o seu resultado agora mesmo.</p>
                </div>

                <form onSubmit={handleLeadSubmit} className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">Nome</Label>
                      <Input 
                        className="h-16 rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-blue-500 text-lg px-6 shadow-sm" 
                        placeholder="Seu nome" 
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">E-mail</Label>
                      <Input 
                        type="email" 
                        className="h-16 rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-blue-500 text-lg px-6 shadow-sm" 
                        placeholder="seu@email.com" 
                        required
                        value={formData.email || ''}
                        onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400 ml-1">WhatsApp</Label>
                      <Input 
                        type="tel" 
                        className="h-16 rounded-2xl border-2 border-white dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-blue-500 text-lg px-6 shadow-sm" 
                        placeholder="840000000" 
                        value={formData.phone || ''}
                        onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="h-18 w-full rounded-2xl text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 mt-6 py-8"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'Ver Resultado'}
                  </Button>
                </form>
              </div>
            )}

            {/* RESULT NODE */}
            {currentNode.type === 'result' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30 rotate-6">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight mb-6">
                  {currentNode.data.label}
                </h1>
                <div className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-12 px-4 whitespace-pre-wrap">
                  {currentNode.data.description || 'Perfil analisado com sucesso! Clique abaixo para aceder à sua oferta personalizada.'}
                </div>
                
                {currentNode.data.buttonUrl && (
                  <Button 
                    size="lg" 
                    className="h-18 px-12 rounded-2xl text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-2xl shadow-blue-500/20 w-full py-8"
                    asChild
                  >
                    <a href={currentNode.data.buttonUrl} target="_blank" rel="noopener noreferrer">
                      {currentNode.data.buttonText || 'Garantir Agora'} <ArrowRight className="w-6 h-6 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="py-8 opacity-20 hover:opacity-100 transition-opacity flex items-center gap-2">
         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Powered by</span>
         <Logo size="sm" />
      </div>
    </div>
  );
};

export default TakeQuiz;

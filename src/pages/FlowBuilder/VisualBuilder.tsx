import React, { useState, useEffect } from 'react';
import { 
  Type, Music, Timer, LayoutGrid, CreditCard, Image as ImageIcon, 
  Video, MoveVertical, List, CheckCircle, DollarSign, MousePointer2,
  HelpCircle, BarChart, UserPlus, MessageSquare, PieChart, TrendingUp,
  Plus, Save, Eye, ChevronLeft, Settings2, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { v4 as uuidv4 } from 'uuid';

interface VisualBuilderProps {
  nodes: any[];
  setNodes: React.Dispatch<React.SetStateAction<any[]>>;
}

const ELEMENT_TYPES = [
  { id: 'text', label: 'Texto', icon: Type, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'audio', label: 'Áudio', icon: Music, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'timer', label: 'Timer', icon: Timer, color: 'text-orange-500', bg: 'bg-orange-50' },
  { id: 'carousel', label: 'Carrossel', icon: LayoutGrid, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'stripe', label: 'Stripe', icon: CreditCard, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { id: 'image', label: 'Imagem', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-50' },
  { id: 'video', label: 'Vídeo', icon: Video, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'spacer', label: 'Espaçador', icon: MoveVertical, color: 'text-slate-500', bg: 'bg-slate-50' },
  { id: 'accordion', label: 'Accordion', icon: List, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'benefits', label: 'Benefícios', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'price', label: 'Preço', icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'button', label: 'Botão', icon: MousePointer2, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'quiz', label: 'Questionário', icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'progress', label: 'Progresso', icon: BarChart, color: 'text-cyan-500', bg: 'bg-cyan-50' },
  { id: 'form', label: 'Formulário', icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'text-pink-600', bg: 'bg-pink-50' },
  { id: 'circular', label: 'Circular', icon: PieChart, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'chart', label: 'Gráfico', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const VisualBuilder = ({ nodes, setNodes }: VisualBuilderProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(nodes[0]?.id || null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('config');

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const elements = selectedNode?.data?.elements || [];
  const selectedElement = elements.find((e: any) => e.id === selectedElementId);

  useEffect(() => {
    if (!selectedNodeId && nodes.length > 0) {
      setSelectedNodeId(nodes[0].id);
    }
  }, [nodes, selectedNodeId]);

  const addStep = () => {
    const newNode = {
      id: uuidv4(),
      type: 'message',
      position: { x: 500, y: 150 },
      data: { 
        label: `Nova Etapa ${nodes.length + 1}`,
        elements: [] 
      },
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const addElement = (type: string) => {
    if (!selectedNodeId) return;

    const newElement = {
      id: uuidv4(),
      type,
      content: type === 'text' ? 'Novo Texto' : (type === 'button' ? 'Quero Meu Desconto' : ''),
      styles: {
        textAlign: 'center',
        fontWeight: 'normal',
      }
    };

    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            elements: [...(node.data.elements || []), newElement]
          }
        };
      }
      return node;
    }));

    setSelectedElementId(newElement.id);
  };

  const updateElement = (elementId: string, newData: any) => {
    setNodes(nds => nds.map(node => {
      if (node.id === selectedNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            elements: node.data.elements.map((el: any) => 
              el.id === elementId ? { ...el, ...newData } : el
            )
          }
        };
      }
      return node;
    }));
  };

  return (
    <div className="flex h-full bg-[#F8FAFC] overflow-hidden">
      {/* LEFT: STEPS SIDEBAR */}
      <div className="w-64 bg-white border-r flex flex-col shrink-0">
        <div className="p-5 border-b bg-slate-50/50">
          <h3 className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Estrutura do Funil</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {nodes.filter(n => ['start', 'message', 'question', 'input', 'result'].includes(n.type)).map((node, idx) => (
            <button
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all group ${
                selectedNodeId === node.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                selectedNodeId === node.id ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {idx + 1}
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-wider opacity-60">Página {idx + 1}</span>
                <span className="text-xs font-bold truncate w-full">{node.data.label || 'Nova Etapa'}</span>
              </div>
            </button>
          ))}
          <Button 
            variant="ghost" 
            onClick={addStep}
            className="w-full mt-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-2xl h-14 hover:border-primary/50 hover:text-primary transition-all font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Etapa
          </Button>
        </div>
      </div>

      {/* INNER LEFT: ELEMENT PALETTE */}
      <div className="w-64 bg-white border-r flex flex-col shrink-0 shadow-sm z-10">
        <div className="p-5 border-b">
          <h3 className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Elementos</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 content-start">
          {ELEMENT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => addElement(type.id)}
              className="flex flex-col items-center justify-center aspect-square rounded-3xl border border-slate-100 bg-white hover:border-primary hover:shadow-xl transition-all group active:scale-95"
            >
              <div className={`w-12 h-12 rounded-2xl ${type.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                <type.icon className={`w-6 h-6 ${type.color}`} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER: MOBILE CANVAS */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-y-auto bg-slate-50 relative">
        <div className="w-[360px] h-[720px] bg-white rounded-[3.5rem] border-[12px] border-slate-900 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col scale-90 lg:scale-100 transition-transform">
          {/* Mobile Notch/Speaker */}
          <div className="h-7 w-40 bg-slate-900 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-[1.5rem] z-30" />
          
          <div className="flex-1 overflow-y-auto scrollbar-hide bg-white relative">
            {/* Header Mockup */}
            <div className="p-6 flex flex-col items-center border-b border-slate-50 pt-12">
               <div className="w-32 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-orange-500" />
                    <div className="w-4 h-4 rounded-full bg-orange-600 -ml-2" />
                    <span className="text-[10px] font-black text-slate-800 tracking-tighter">Ponto do Lanche</span>
                  </div>
               </div>
               <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                 <div className="w-1/3 h-full bg-orange-500" />
               </div>
            </div>

            <div className="p-6 space-y-6">
            {elements.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <MousePointer2 className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Arraste ou clique em um elemento para começar</p>
              </div>
            ) : (
              elements.map((el: any) => (
                <div
                  key={el.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                  }}
                  className={`relative p-2 rounded-xl transition-all cursor-pointer ${
                    selectedElementId === el.id 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {el.type === 'text' && (
                    <div className="text-slate-800 leading-relaxed" style={{ textAlign: el.styles?.textAlign || 'center' }}>
                      {el.content}
                    </div>
                  )}
                  {el.type === 'button' && (
                    <div className="w-full py-3 px-6 bg-primary text-white rounded-xl font-bold text-center shadow-lg shadow-primary/20">
                      {el.content || 'Quero Meu Desconto'}
                    </div>
                  )}
                  {el.type === 'image' && (
                    <div className="w-full aspect-video rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                      <img src={el.url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=300'} className="w-full h-full object-cover" alt="" />
                    </div>
                  )}
                  {el.type === 'timer' && (
                    <div className="flex justify-center gap-3 py-4">
                      {['00', '15', '42'].map((unit, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-lg">{unit}</div>
                          <span className="text-[8px] font-black uppercase text-slate-400 mt-1">{['HOR', 'MIN', 'SEG'][i]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {el.type === 'audio' && (
                    <div className="w-full bg-slate-50 border rounded-full p-2 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white"><Music className="w-4 h-4" /></div>
                      <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-primary" /></div>
                      <span className="text-[10px] font-bold text-slate-400 mr-2">01:45</span>
                    </div>
                  )}
                  {el.type === 'carousel' && (
                    <div className="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
                      <LayoutGrid className="w-8 h-8 text-slate-300" />
                      <div className="absolute bottom-4 flex gap-1">
                        {[1, 2, 3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-primary' : 'bg-slate-200'}`} />)}
                      </div>
                    </div>
                  )}
                  {el.type === 'stripe' && (
                    <div className="w-full p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <CreditCard className="w-5 h-5 text-indigo-600" />
                         <span className="text-xs font-bold text-indigo-900">Pagamento Seguro</span>
                       </div>
                       <div className="flex gap-1">
                         <div className="w-6 h-4 bg-white border rounded-sm" />
                         <div className="w-6 h-4 bg-white border rounded-sm" />
                       </div>
                    </div>
                  )}
                  {el.type === 'video' && (
                    <div className="w-full aspect-video rounded-xl bg-slate-900 flex items-center justify-center relative overflow-hidden shadow-2xl">
                       <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 z-10">
                          <Video className="w-6 h-6 text-white fill-white" />
                       </div>
                       <img src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=400" className="absolute inset-0 w-full h-full object-cover opacity-40" alt="" />
                    </div>
                  )}
                  {el.type === 'spacer' && <div className="h-8 w-full border-y border-dashed border-slate-100" />}
                  {el.type === 'accordion' && (
                    <div className="w-full border rounded-xl divide-y overflow-hidden bg-white">
                       <div className="p-3 flex items-center justify-between font-bold text-xs">Pergunta Frequente <Plus className="w-3 h-3 text-slate-400" /></div>
                       <div className="p-3 flex items-center justify-between font-bold text-xs bg-slate-50 text-primary">Informações <Plus className="w-3 h-3 rotate-45" /></div>
                    </div>
                  )}
                  {el.type === 'benefits' && (
                    <div className="space-y-2">
                       {[1, 2].map(i => (
                         <div key={i} className="flex items-center gap-3">
                           <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                           <div className="h-2 w-full bg-slate-100 rounded-full" />
                         </div>
                       ))}
                    </div>
                  )}
                  {el.type === 'price' && (
                    <div className="text-center py-4">
                       <span className="text-[10px] font-black uppercase text-slate-400 line-through mr-2">99.00 MT</span>
                       <div className="text-3xl font-black text-slate-900">49.00 <span className="text-sm">MT</span></div>
                    </div>
                  )}
                  {el.type === 'form' && (
                    <div className="space-y-3 bg-white p-4 rounded-2xl border shadow-sm">
                       <div className="h-10 w-full bg-slate-50 border border-slate-100 rounded-xl" />
                       <div className="h-10 w-full bg-slate-50 border border-slate-100 rounded-xl" />
                       <div className="h-12 w-full bg-primary rounded-xl" />
                    </div>
                  )}
                  {el.type === 'progress' && (
                    <div className="space-y-2 w-full">
                       <div className="flex justify-between text-[10px] font-black uppercase text-slate-500"><span>Progresso</span><span>65%</span></div>
                       <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50"><div className="w-[65%] h-full bg-cyan-500" /></div>
                    </div>
                  )}
                  {el.type === 'circular' && (
                    <div className="flex justify-center">
                       <div className="w-24 h-24 rounded-full border-[8px] border-amber-100 flex items-center justify-center relative">
                          <div className="w-24 h-24 rounded-full border-[8px] border-amber-500 absolute -top-[8px] -left-[8px] border-r-transparent border-b-transparent -rotate-45" />
                          <span className="text-xs font-black text-amber-600">75%</span>
                       </div>
                    </div>
                  )}
                  {el.type === 'chart' && (
                    <div className="w-full h-24 flex items-end gap-1 px-4">
                       {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                         <div key={i} className="flex-1 bg-emerald-500/20 rounded-t-sm relative group overflow-hidden">
                            <div className="absolute bottom-0 w-full bg-emerald-500" style={{ height: `${h}%` }} />
                         </div>
                       ))}
                    </div>
                  )}
                  {el.type === 'quiz' && (
                    <div className="space-y-2">
                       {[1, 2, 3].map(i => (
                         <div key={i} className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${i === 1 ? 'border-primary bg-primary/5 text-primary' : 'bg-white text-slate-600'}`}>
                           Opção {i} {i === 1 && <CheckCircle className="w-4 h-4" />}
                         </div>
                       ))}
                    </div>
                  )}
                  {el.type === 'feedback' && (
                    <div className="p-4 bg-pink-50 border border-pink-100 rounded-2xl flex gap-3 items-start">
                       <div className="w-8 h-8 rounded-full bg-pink-200 shrink-0" />
                       <div className="space-y-1">
                          <div className="h-2 w-24 bg-pink-300 rounded-full" />
                          <div className="h-3 w-full bg-pink-200 rounded-full" />
                       </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Floating Controls */}
        <div className="absolute bottom-8 right-8 flex gap-3">
           <Button className="rounded-full bg-slate-900 hover:bg-black px-6 font-bold shadow-xl">
             <Eye className="w-4 h-4 mr-2" /> Pré-visualizar
           </Button>
        </div>
      </div>

      {/* RIGHT: PROPERTIES PANEL */}
      <div className="w-80 bg-white border-l flex flex-col shrink-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="p-4 border-b">
            <TabsList className="w-full bg-slate-100 rounded-xl p-1">
              <TabsTrigger value="config" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Settings2 className="w-4 h-4 mr-2" /> Configurações
              </TabsTrigger>
              <TabsTrigger value="design" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Palette className="w-4 h-4 mr-2" /> Design
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedElement ? (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Editando: {selectedElement.type}</h3>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                    setNodes(nds => nds.map(node => {
                      if (node.id === selectedNodeId) {
                        return { ...node, data: { ...node.data, elements: node.data.elements.filter((e: any) => e.id !== selectedElementId) } };
                      }
                      return node;
                    }));
                    setSelectedElementId(null);
                  }}>
                    <Plus className="w-4 h-4 rotate-45" />
                  </Button>
                </div>

                <Separator />

                {selectedElement.type === 'text' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Conteúdo do Texto</Label>
                      <Textarea 
                        value={selectedElement.content}
                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                        className="min-h-[150px] rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                )}

                {selectedElement.type === 'button' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Texto do Botão</Label>
                      <Input 
                        value={selectedElement.content}
                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                        className="rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Desativar alinhamento padrão</Label>
                      <Switch />
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                  <MousePointer2 className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Selecione um elemento no celular para editar suas propriedades
                </p>
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default VisualBuilder;

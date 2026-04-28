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
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-50' },
  { id: 'emola', label: 'E-Mola', icon: Smartphone, color: 'text-yellow-600', bg: 'bg-yellow-50' },
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
                    <div className="text-slate-800 leading-relaxed" style={{ textAlign: el.styles?.textAlign || 'center' }}>{el.content}</div>
                  )}
                  {el.type === 'button' && (
                    <div className="w-full py-3 px-6 bg-primary text-white rounded-xl font-bold text-center shadow-lg shadow-primary/20">{el.content || 'Botão de Ação'}</div>
                  )}
                  {el.type === 'mpesa' && (
                    <div className="w-full py-3 px-6 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                      <Smartphone className="w-4 h-4" /> Pagar com M-Pesa
                    </div>
                  )}
                  {el.type === 'emola' && (
                    <div className="w-full py-3 px-6 bg-yellow-500 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20">
                      <Smartphone className="w-4 h-4" /> Pagar com E-Mola
                    </div>
                  )}
                  {el.type === 'image' && (
                    <div className="w-full aspect-video rounded-2xl bg-slate-100 overflow-hidden border border-slate-100">
                      <img src={el.url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=300'} className="w-full h-full object-cover" alt="" />
                    </div>
                  )}
                  {el.type === 'video' && (
                    <div className="w-full aspect-video rounded-2xl bg-slate-900 flex items-center justify-center relative overflow-hidden group">
                      <Video className="w-12 h-12 text-white/20 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Plus className="w-6 h-6 text-white fill-white" /></div></div>
                    </div>
                  )}
                  {el.type === 'timer' && (
                    <div className="flex justify-center gap-2">
                       {['00', '15', '45'].map((n, i) => (
                         <div key={i} className="flex flex-col items-center">
                           <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl font-black">{n}</div>
                           <span className="text-[8px] font-bold uppercase mt-1 text-slate-400">{i === 0 ? 'Hor' : i === 1 ? 'Min' : 'Seg'}</span>
                         </div>
                       ))}
                    </div>
                  )}
                  {el.type === 'benefits' && (
                    <div className="space-y-2">
                       {[1,2,3].map(i => (
                         <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                           <span className="text-xs font-medium text-slate-600">Benefício incrível número {i}</span>
                         </div>
                       ))}
                    </div>
                  )}
                  {el.type === 'progress' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase text-slate-400">Progresso</span><span className="text-xs font-bold text-primary">65%</span></div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div className="w-[65%] h-full bg-primary" /></div>
                    </div>
                  )}
                  {el.type === 'price' && (
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-center space-y-4 shadow-xl">
                       <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Plano Anual</span>
                       <div className="text-4xl font-black text-white">997 <span className="text-lg opacity-50">MT</span></div>
                       <Button className="w-full rounded-xl bg-white text-black font-bold hover:bg-slate-100">Selecionar</Button>
                    </div>
                  )}
                  {el.type === 'spacer' && <div className="h-10 border-x border-dashed border-slate-200 mx-auto w-1" />}
                  {el.type === 'audio' && (
                    <div className="w-full p-4 bg-slate-100 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white"><Music className="w-5 h-5" /></div>
                      <div className="flex-1 h-1 bg-slate-300 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-primary" /></div>
                      <span className="text-[10px] font-bold text-slate-500">2:45</span>
                    </div>
                  )}
                  {el.type === 'carousel' && (
                    <div className="w-full aspect-[4/5] rounded-3xl bg-slate-100 flex items-center justify-center relative overflow-hidden group border-2 border-dashed border-slate-200">
                      <LayoutGrid className="w-12 h-12 text-slate-300" />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                        {[1,2,3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i===1?'bg-primary':'bg-slate-300'}`} />)}
                      </div>
                    </div>
                  )}
                  {el.type === 'accordion' && (
                    <div className="space-y-2">
                       {[1,2].map(i => (
                         <div key={i} className="p-4 bg-white rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                           <span className="text-xs font-bold text-slate-700">Dúvida Frequente {i}</span>
                           <Plus className="w-4 h-4 text-slate-400" />
                         </div>
                       ))}
                    </div>
                  )}
                  {el.type === 'quiz' && (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-xs font-bold text-slate-800 text-center">Pergunta do Quiz?</p>
                       <div className="space-y-2">
                         {[1,2].map(i => <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-medium text-center hover:border-primary transition-colors">Opção {i}</div>)}
                       </div>
                    </div>
                  )}
                  {el.type === 'form' && (
                    <div className="space-y-3 p-2">
                       <Input placeholder="Seu Nome" className="rounded-xl h-12 bg-slate-50 border-slate-100" readOnly />
                       <Input placeholder="Seu WhatsApp" className="rounded-xl h-12 bg-slate-50 border-slate-100" readOnly />
                       <Button className="w-full h-12 rounded-xl font-bold bg-primary">Enviar Dados</Button>
                    </div>
                  )}
                  {el.type === 'feedback' && (
                    <div className="flex flex-col items-center gap-3 py-4">
                       <div className="flex gap-1">
                         {[1,2,3,4,5].map(i => <MessageSquare key={i} className={`w-6 h-6 ${i<5 ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avaliação dos Clientes</p>
                    </div>
                  )}
                  {el.type === 'circular' && (
                    <div className="flex flex-col items-center py-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                       <div className="w-32 h-32 rounded-full border-[12px] border-slate-100 relative flex items-center justify-center">
                          <div className="w-full h-full rounded-full border-[12px] border-primary border-t-transparent border-r-transparent absolute -rotate-45" />
                          <span className="text-2xl font-black text-slate-800">75%</span>
                       </div>
                    </div>
                  )}
                  {el.type === 'chart' && (
                    <div className="h-40 w-full bg-white rounded-3xl border border-slate-100 p-6 flex items-end justify-between gap-2 shadow-sm">
                       {[40, 70, 45, 90, 60].map((h, i) => (
                         <div key={i} className="flex-1 bg-primary/10 rounded-t-lg relative group">
                            <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all" style={{ height: `${h}%` }} />
                         </div>
                       ))}
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
           <Button className="rounded-full bg-primary hover:bg-primary/90 px-8 font-bold shadow-xl">
             <Save className="w-4 h-4 mr-2" /> Salvar Funil
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
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      {React.createElement(ELEMENT_TYPES.find(t => t.id === selectedElement.type)?.icon || Settings2, { className: "w-4 h-4 text-slate-600" })}
                    </div>
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Editando: {selectedElement.type}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                    setNodes(nds => nds.map(node => {
                      if (node.id === selectedNodeId) {
                        return { ...node, data: { ...node.data, elements: node.data.elements.filter((e: any) => e.id !== selectedElementId) } };
                      }
                      return node;
                    }));
                    setSelectedElementId(null);
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <Separator />

                {/* Shared Content Field */}
                {['text', 'button', 'mpesa', 'emola', 'price'].includes(selectedElement.type) && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Conteúdo do {selectedElement.type}</Label>
                      {selectedElement.type === 'text' ? (
                        <Textarea 
                          value={selectedElement.content}
                          onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          className="min-h-[150px] rounded-xl border-slate-200"
                        />
                      ) : (
                        <Input 
                          value={selectedElement.content}
                          onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                          className="rounded-xl border-slate-200"
                        />
                      )}
                    </div>
                  </div>
                )}

                {['image', 'video', 'audio'].includes(selectedElement.type) && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500">URL do Arquivo</Label>
                      <Input 
                        placeholder="https://..."
                        value={selectedElement.url || ''}
                        onChange={(e) => updateElement(selectedElement.id, { url: e.target.value })}
                        className="rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                )}

                {selectedElement.type === 'timer' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Tempo em Minutos</Label>
                      <Input 
                        type="number"
                        value={selectedElement.duration || 15}
                        onChange={(e) => updateElement(selectedElement.id, { duration: e.target.value })}
                        className="rounded-xl border-slate-200"
                      />
                    </div>
                  </div>
                )}

                <Separator />
                
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Margem Superior</Label>
                      <Input className="w-16 h-8 text-xs" type="number" defaultValue="20" />
                   </div>
                   <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black uppercase text-slate-500">Animar ao Rolar</Label>
                      <Switch defaultChecked />
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

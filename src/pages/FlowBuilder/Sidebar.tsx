import React from 'react';
import { 
  MessageSquare, HelpCircle, FormInput, Flag, Split, Zap, Globe, 
  ArrowLeft, Plus, Trash2, Settings2, Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  selectedNode: any | null;
  setNodes: React.Dispatch<React.SetStateAction<any[]>>;
  isMobileVisible?: boolean;
}

const Sidebar = ({ selectedNode, setNodes, isMobileVisible }: SidebarProps) => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const updateNodeData = (newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
        }
        return node;
      })
    );
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData({ label: e.target.value });
  };

  // If a node is selected, show the properties panel
  if (selectedNode) {
    const nodeType = selectedNode.type || 'default';
    
    return (
      <aside className={`w-full md:w-80 bg-card border-l flex flex-col h-full z-10 animate-in slide-in-from-right duration-300 absolute inset-y-0 right-0 md:relative shadow-2xl md:shadow-none ${isMobileVisible ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Configurações</h3>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Base Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Bloco</Label>
              <Input 
                value={selectedNode.data.label || ''} 
                onChange={handleLabelChange}
                placeholder="Ex: Saudação Inicial"
                className="bg-background"
              />
            </div>
          </div>

          <Separator />

          {/* Specific Node Type Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-sm">TIPO: {selectedNode.type?.toUpperCase() || 'INTERAÇÃO'}</Badge>
            </div>

            {/* Message Node Settings */}
            {(selectedNode.type === 'message') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Conteúdo da Mensagem</Label>
                  <Textarea 
                    placeholder="Olá! Como posso ajudar?"
                    className="min-h-[120px] resize-none"
                    value={selectedNode.data.content || ''}
                    onChange={(e) => updateNodeData({ content: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Dica: Use @nome para personalizar com o nome do lead.</p>
                </div>
              </div>
            )}

            {/* Question Node Settings */}
            {(selectedNode.type === 'question') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pergunta</Label>
                  <Input 
                    placeholder="Qual o seu interesse?"
                    value={selectedNode.data.question || ''}
                    onChange={(e) => updateNodeData({ question: e.target.value })}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Opções de Resposta</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2 text-primary"
                      onClick={() => {
                        const newOption = { id: `opt-${Date.now()}`, label: 'Nova Opção', value: '', score: 0 };
                        const currentOptions = selectedNode.data.options || [];
                        updateNodeData({ options: [...currentOptions, newOption] });
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(selectedNode.data.options || []).map((opt: any, index: number) => (
                      <div key={opt.id} className="flex gap-2">
                        <Input 
                          placeholder={`Opção ${index + 1}`} 
                          className="h-8 text-sm" 
                          value={opt.label}
                          onChange={(e) => {
                            const newOptions = [...selectedNode.data.options];
                            newOptions[index].label = e.target.value;
                            updateNodeData({ options: newOptions });
                          }}
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            const newOptions = selectedNode.data.options.filter((o: any) => o.id !== opt.id);
                            updateNodeData({ options: newOptions });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Condition Node Settings */}
            {(selectedNode.type === 'condition') && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Variável a Comparar</Label>
                  <Select defaultValue="score">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Pontuação (Score)</SelectItem>
                      <SelectItem value="email">Email Preenchido</SelectItem>
                      <SelectItem value="tag">Tag do Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Operador</Label>
                  <Select defaultValue="greater">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Igual a</SelectItem>
                      <SelectItem value="greater">Maior que</SelectItem>
                      <SelectItem value="less">Menor que</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input placeholder="Ex: 50" defaultValue="50" />
                </div>
              </div>
            )}

            {/* Lead Capture Node */}
            {(selectedNode.type === 'input') && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex gap-3">
                   <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     Este bloco captura dados do utilizador e guarda-os automaticamente no CRM do funil.
                   </p>
                </div>
                <div className="space-y-2">
                  <Label>Título da Captura</Label>
                  <Input 
                    placeholder="Deixe os seus dados"
                    value={selectedNode.data.title || ''}
                    onChange={(e) => updateNodeData({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-2 pt-2">
                   <Label className="text-xs font-bold">Campos a solicitar:</Label>
                   <div className="space-y-2">
                      {['Nome', 'WhatsApp', 'Email'].map((field) => (
                        <div key={field} className="flex items-center justify-between p-2 rounded border bg-background text-sm">
                           <span>{field}</span>
                           <Badge variant="secondary">Obrigatório</Badge>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t bg-muted/30">
          <Button variant="destructive" className="w-full gap-2 h-10 font-bold">
            <Trash2 className="w-4 h-4" /> Eliminar Bloco
          </Button>
        </div>
      </aside>
    );
  }

  // Default Palette View
  return (
    <aside className={`w-full md:w-64 bg-card border-l flex flex-col h-full z-10 overflow-hidden absolute inset-y-0 right-0 md:relative transition-transform md:shadow-none shadow-2xl ${isMobileVisible ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-bold text-xs uppercase tracking-[2px] text-muted-foreground">Biblioteca</h3>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        
        {/* Interaction Nodes */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Interação</p>
          <div 
            className="group flex items-center gap-3 p-3 rounded-xl border bg-background hover:border-primary hover:shadow-md cursor-grab transition-all active:scale-95"
            onDragStart={(e) => onDragStart(e, 'message')} 
            draggable
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Mensagem</span>
              <span className="text-[10px] text-muted-foreground">Texto simples</span>
            </div>
          </div>
          
          <div 
            className="group flex items-center gap-3 p-3 rounded-xl border bg-background hover:border-primary hover:shadow-md cursor-grab transition-all active:scale-95"
            onDragStart={(e) => onDragStart(e, 'question')} 
            draggable
          >
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
              <HelpCircle className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Pergunta</span>
              <span className="text-[10px] text-muted-foreground">Múltipla escolha</span>
            </div>
          </div>

          <div 
            className="group flex items-center gap-3 p-3 rounded-xl border bg-background hover:border-primary hover:shadow-md cursor-grab transition-all active:scale-95"
            onDragStart={(e) => onDragStart(e, 'input')} 
            draggable
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
              <FormInput className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Captura Lead</span>
              <span className="text-[10px] text-muted-foreground">Coleta dados</span>
            </div>
          </div>
        </div>

        {/* Logic Nodes */}
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Lógica</p>
          <div 
            className="group flex items-center gap-3 p-3 rounded-xl border bg-background hover:border-primary hover:shadow-md cursor-grab transition-all active:scale-95"
            onDragStart={(e) => onDragStart(e, 'condition')} 
            draggable
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Split className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Condição</span>
              <span className="text-[10px] text-muted-foreground">Se / Então</span>
            </div>
          </div>
          
          <div 
            className="group flex items-center gap-3 p-3 rounded-xl border bg-background hover:border-primary hover:shadow-md cursor-grab transition-all active:scale-95"
            onDragStart={(e) => onDragStart(e, 'result')} 
            draggable
          >
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <Flag className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Fim</span>
              <span className="text-[10px] text-muted-foreground">Conclusão</span>
            </div>
          </div>
        </div>

      </div>
      <div className="p-4 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Arraste os blocos para o canvas.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;

import React from 'react';
import { MessageSquare, HelpCircle, FormInput, Flag, Split, Zap, Globe } from 'lucide-react';

const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-card border-l flex flex-col h-full z-10">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Adicionar Blocos</h3>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        
        {/* Interaction Nodes */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Interação</p>
          <div 
            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:border-primary hover:text-primary cursor-grab transition-colors"
            onDragStart={(e) => onDragStart(e, 'message')} 
            draggable
          >
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium">Mensagem</span>
          </div>
          <div 
            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:border-primary hover:text-primary cursor-grab transition-colors"
            onDragStart={(e) => onDragStart(e, 'question')} 
            draggable
          >
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium">Pergunta</span>
          </div>
          <div 
            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:border-primary hover:text-primary cursor-grab transition-colors"
            onDragStart={(e) => onDragStart(e, 'input')} 
            draggable
          >
            <FormInput className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">Captura (Lead)</span>
          </div>
        </div>

        {/* Logic Nodes */}
        <div className="space-y-2 pt-4">
          <p className="text-xs font-semibold text-muted-foreground">Lógica e Controle</p>
          <div 
            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:border-primary hover:text-primary cursor-grab transition-colors"
            onDragStart={(e) => onDragStart(e, 'condition')} 
            draggable
          >
            <Split className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium">Condição</span>
          </div>
          <div 
            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:border-primary hover:text-primary cursor-grab transition-colors"
            onDragStart={(e) => onDragStart(e, 'result')} 
            draggable
          >
            <Flag className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium">Resultado final</span>
          </div>
        </div>

        {/* Action Nodes */}
        <div className="space-y-2 pt-4">
          <p className="text-xs font-semibold text-muted-foreground">Ações Invisíveis</p>
          <div 
            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:border-primary hover:text-primary cursor-grab transition-colors"
            onDragStart={(e) => onDragStart(e, 'webhook')} 
            draggable
          >
            <Globe className="w-5 h-5 text-teal-500" />
            <span className="text-sm font-medium">Webhook API</span>
          </div>
          <div 
            className="flex items-center gap-3 p-3 rounded-md border bg-background hover:border-primary hover:text-primary cursor-grab transition-colors"
            onDragStart={(e) => onDragStart(e, 'pixel')} 
            draggable
          >
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium">Pixel Event</span>
          </div>
        </div>

      </div>
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground text-center">
          Arraste e solte os blocos no canvas para construir o funil.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;

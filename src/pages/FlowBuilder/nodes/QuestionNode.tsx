import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, ChevronRight } from 'lucide-react';

const QuestionNode = ({ data, selected }: NodeProps) => {
  const options = data.options || [];

  return (
    <div className={`px-0 py-0 shadow-xl rounded-2xl bg-white border-2 transition-all min-w-[240px] overflow-hidden ${selected ? 'border-primary ring-4 ring-primary/10' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary border-2 border-white" />
      
      {/* Header */}
      <div className="bg-orange-500/5 p-4 border-b border-orange-500/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <HelpCircle className="w-6 h-6 text-orange-500" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Pergunta</span>
          <span className="text-sm font-black text-foreground truncate">{data.label}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <p className="text-sm font-bold text-foreground leading-tight">
          {data.question || 'Clique para definir a pergunta...'}
        </p>
        
        {/* Branching Options */}
        <div className="space-y-3 pt-2">
          {options.length > 0 ? options.map((opt: any, i: number) => (
            <div key={opt.id || i} className="relative group">
              <div className="flex items-center justify-between text-xs bg-muted/30 hover:bg-muted/60 p-3 rounded-xl border border-border/50 transition-colors">
                <span className="font-medium truncate pr-4">{opt.label || `Opção ${i+1}`}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
              {/* Output Handle for EACH option */}
              <Handle 
                type="source" 
                position={Position.Right} 
                id={opt.id || `opt-${i}`}
                style={{ top: '50%', right: '-8px' }}
                className="w-4 h-4 bg-orange-500 border-2 border-white hover:scale-125 transition-transform" 
              />
            </div>
          )) : (
            <div className="text-[10px] text-muted-foreground italic p-4 border-2 border-dashed rounded-xl text-center bg-muted/10">
              Crie opções no painel lateral para ramificar o fluxo.
            </div>
          )}
        </div>
      </div>

      {/* Fallback output if no options or for general flow */}
      {options.length === 0 && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary border-2 border-white" />
      )}
    </div>
  );
};

export default memo(QuestionNode);

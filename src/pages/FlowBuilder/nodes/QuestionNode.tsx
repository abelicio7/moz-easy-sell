import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, ChevronRight } from 'lucide-react';

const QuestionNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border-2 transition-all min-w-[200px] ${selected ? 'border-primary' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-orange-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Pergunta</span>
          <span className="text-sm font-black text-foreground truncate max-w-[120px]">{data.label}</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-bold text-foreground mb-2">{data.question || 'Qual a pergunta?'}</p>
        
        {/* Visual representation of options */}
        <div className="space-y-1">
          {(data.options && data.options.length > 0) ? data.options.slice(0, 3).map((opt: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-[10px] bg-muted/50 p-1.5 rounded border border-border/50">
              <span className="truncate">{opt.label || `Opção ${i+1}`}</span>
              <ChevronRight className="w-2 h-2 text-muted-foreground" />
            </div>
          )) : (
            <div className="text-[10px] text-muted-foreground italic p-2 border border-dashed rounded text-center">
              Adicione opções no painel lateral
            </div>
          )}
          {data.options?.length > 3 && <p className="text-[9px] text-center text-muted-foreground">+{data.options.length - 3} mais...</p>}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
    </div>
  );
};

export default memo(QuestionNode);

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

const MessageNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border-2 transition-all min-w-[200px] ${selected ? 'border-primary' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Mensagem</span>
          <span className="text-sm font-black text-foreground truncate max-w-[120px]">{data.label}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-2 rounded-md italic">
        {data.content || 'Nenhuma mensagem definida...'}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
    </div>
  );
};

export default memo(MessageNode);

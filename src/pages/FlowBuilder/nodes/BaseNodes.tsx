import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, Flag } from 'lucide-react';

export const StartNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`px-6 py-4 shadow-xl rounded-full bg-primary text-white border-4 transition-all ${selected ? 'border-secondary ring-4 ring-primary/20' : 'border-white'}`}>
      <div className="flex items-center gap-3">
        <Play className="w-5 h-5 fill-current" />
        <span className="font-black tracking-tight">{data.label || 'INÍCIO'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-white border-2 border-primary" />
    </div>
  );
});

export const ResultNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border-2 transition-all min-w-[180px] ${selected ? 'border-primary' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
          <Flag className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Resultado</span>
          <span className="text-sm font-black text-foreground">{data.label}</span>
        </div>
      </div>

      <div className="text-[10px] text-center p-2 rounded bg-red-50 text-red-600 font-bold border border-red-100">
        FIM DO FLUXO
      </div>
    </div>
  );
});

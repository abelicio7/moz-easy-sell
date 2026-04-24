import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Split, ChevronRight } from 'lucide-react';

const ConditionNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`px-0 py-0 shadow-xl rounded-2xl bg-white border-2 transition-all min-w-[220px] overflow-hidden ${selected ? 'border-primary ring-4 ring-primary/10' : 'border-border'}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary border-2 border-white" />
      
      {/* Header */}
      <div className="bg-purple-500/5 p-4 border-b border-purple-500/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
          <Split className="w-6 h-6 text-purple-500" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none mb-1">Lógica</span>
          <span className="text-sm font-black text-foreground truncate">{data.label}</span>
        </div>
      </div>

      {/* Logic Content */}
      <div className="p-4 space-y-4">
        <div className="space-y-3">
           {/* TRUE Path */}
           <div className="relative group">
              <div className="flex items-center justify-between text-xs bg-green-50/50 p-3 rounded-xl border border-green-100 transition-colors">
                <span className="font-bold text-green-700">VERDADEIRO</span>
                <ChevronRight className="w-4 h-4 text-green-400" />
              </div>
              <Handle 
                type="source" 
                position={Position.Right} 
                id="true"
                style={{ top: '50%', right: '-8px' }}
                className="w-4 h-4 bg-green-500 border-2 border-white" 
              />
           </div>

           {/* FALSE Path */}
           <div className="relative group">
              <div className="flex items-center justify-between text-xs bg-red-50/50 p-3 rounded-xl border border-red-100 transition-colors">
                <span className="font-bold text-red-700">FALSO</span>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </div>
              <Handle 
                type="source" 
                position={Position.Right} 
                id="false"
                style={{ top: '50%', right: '-8px' }}
                className="w-4 h-4 bg-red-500 border-2 border-white" 
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ConditionNode);

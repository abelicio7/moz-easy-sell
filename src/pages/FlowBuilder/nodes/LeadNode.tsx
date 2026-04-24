import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FormInput, UserCheck } from 'lucide-react';

const LeadNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-white border-2 transition-all min-w-[200px] ${selected ? 'border-primary' : 'border-border'}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-primary" />
      
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
          <FormInput className="w-4 h-4 text-green-500" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Captura</span>
          <span className="text-sm font-black text-foreground truncate max-w-[120px]">{data.label}</span>
        </div>
      </div>

      <div className="bg-green-50/50 p-2 rounded-lg border border-green-100 space-y-2">
         <p className="text-[11px] font-bold text-green-800">{data.title || 'Coleta de dados'}</p>
         <div className="flex flex-wrap gap-1">
            {['Nome', 'WhatsApp', 'Email'].map(field => (
              <span key={field} className="text-[8px] bg-white px-1.5 py-0.5 rounded border border-green-200 text-green-600 font-bold uppercase">
                {field}
              </span>
            ))}
         </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
    </div>
  );
};

export default memo(LeadNode);

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FormInput, CheckCircle2 } from 'lucide-react';

const LeadNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative min-w-[260px] bg-white rounded-3xl border transition-all duration-300
      ${selected ? 'border-emerald-500 ring-8 ring-emerald-500/5 shadow-2xl scale-[1.02]' : 'border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-emerald-500 border-[3px] border-white !-top-2" />
      
      {/* Header Strip */}
      <div className="h-2 bg-emerald-500 rounded-t-3xl w-full" />
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
              <FormInput className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] leading-none mb-1">Módulo</span>
              <span className="text-sm font-black text-slate-800">{data.label}</span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-2xl space-y-3">
           <p className="text-xs font-bold text-emerald-800">{data.title || 'Coleta de dados'}</p>
           <div className="flex flex-wrap gap-2">
              {['Nome', 'WhatsApp', 'Email'].map(field => (
                <div key={field} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-emerald-100 shadow-sm">
                   <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                    {field}
                   </span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-emerald-500 border-[3px] border-white !-bottom-2" />
    </div>
  );
};

export default memo(LeadNode);

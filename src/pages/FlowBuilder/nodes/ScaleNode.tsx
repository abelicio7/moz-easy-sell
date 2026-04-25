import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Ruler, Settings2 } from 'lucide-react';

const ScaleNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative min-w-[280px] bg-white rounded-3xl border transition-all duration-300
      ${selected ? 'border-emerald-500 ring-8 ring-emerald-500/5 shadow-2xl scale-[1.02]' : 'border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-emerald-500 border-[3px] border-white !-top-2" />
      
      {/* Header Strip */}
      <div className="h-2 bg-emerald-500 rounded-t-3xl w-full" />
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
              <Ruler className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] leading-none mb-1">Interação</span>
              <span className="text-sm font-black text-slate-800">{data.label || 'Escala/Régua'}</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
            <Settings2 className="w-4 h-4" />
          </div>
        </div>

        <p className="text-sm font-bold text-slate-700 leading-snug mb-5 px-1">
          {data.question || 'Defina a pergunta da escala...'}
        </p>
        
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
           <div className="flex items-baseline gap-1">
             <span className="text-2xl font-black text-slate-800">{data.min_value || 100} - {data.max_value || 220}</span>
             <span className="text-xs font-bold text-slate-400 uppercase">{data.unit || 'cm'}</span>
           </div>
           <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
             <div className="w-1/2 h-full bg-emerald-500 rounded-full" />
           </div>
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Componente Interativo</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-emerald-500 border-[3px] border-white !-bottom-2" />
    </div>
  );
};

export default memo(ScaleNode);

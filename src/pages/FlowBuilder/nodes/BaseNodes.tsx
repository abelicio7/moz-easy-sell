import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, Flag, Star } from 'lucide-react';

export const StartNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative px-8 py-5 shadow-2xl rounded-full bg-blue-600 text-white border-[6px] transition-all duration-500 group
      ${selected ? 'border-white ring-[12px] ring-blue-500/10 scale-110' : 'border-white hover:scale-105 shadow-blue-500/20'}
    `}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
          <Play className="w-6 h-6 fill-current" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-100 uppercase tracking-[3px] leading-none mb-1">Gatilho</span>
          <span className="text-lg font-black tracking-tighter">{data.label || 'INÍCIO'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-6 !h-6 !bg-blue-600 border-[4px] border-white !-bottom-3 shadow-lg" />
    </div>
  );
});

export const ResultNode = memo(({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative min-w-[220px] bg-white rounded-3xl border transition-all duration-300
      ${selected ? 'border-rose-500 ring-8 ring-rose-500/5 shadow-2xl scale-[1.02]' : 'border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-rose-500 border-[3px] border-white !-top-2" />
      
      {/* Header Strip */}
      <div className="h-2 bg-rose-500 rounded-t-3xl w-full" />
      
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
            <Flag className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] leading-none mb-1">Resultado</span>
            <span className="text-sm font-black text-slate-800">{data.label}</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 bg-rose-50/50 rounded-2xl border border-rose-100 border-dashed">
           <Star className="w-8 h-8 text-rose-300 mb-2 fill-rose-100" />
           <p className="text-[11px] font-black text-rose-800 tracking-widest uppercase">Fluxo Finalizado</p>
        </div>
      </div>
    </div>
  );
});

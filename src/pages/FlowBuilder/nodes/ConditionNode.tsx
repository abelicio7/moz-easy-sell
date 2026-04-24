import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Split, ChevronRight, Zap } from 'lucide-react';

const ConditionNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative min-w-[240px] bg-white rounded-3xl border transition-all duration-300
      ${selected ? 'border-purple-500 ring-8 ring-purple-500/5 shadow-2xl scale-[1.02]' : 'border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl'}
    `}>
      <Handle type="target" position={Position.Left} className="!w-4 !h-4 !bg-purple-500 border-[3px] border-white !-left-2" />
      
      {/* Header Strip */}
      <div className="h-2 bg-purple-500 rounded-t-3xl w-full" />
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-sm border border-purple-100">
              <Split className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] leading-none mb-1">Lógica</span>
              <span className="text-sm font-black text-slate-800">{data.label}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
           {/* TRUE Path */}
           <div className="relative group">
              <div className="flex items-center justify-between text-[11px] bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 transition-all font-black text-emerald-700">
                <span className="tracking-widest uppercase">Verdadeiro</span>
                <Zap className="w-3 h-3 text-emerald-400" />
              </div>
              <Handle 
                type="source" 
                position={Position.Right} 
                id="true"
                style={{ top: '50%', right: '-12px' }}
                className="!w-6 !h-6 !bg-emerald-500 border-[4px] border-white shadow-md hover:scale-110 transition-transform" 
              />
           </div>

           {/* FALSE Path */}
           <div className="relative group">
              <div className="flex items-center justify-between text-[11px] bg-rose-50/50 p-4 rounded-2xl border border-rose-100 transition-all font-black text-rose-700">
                <span className="tracking-widest uppercase">Falso</span>
                <ChevronRight className="w-3 h-3 text-rose-400" />
              </div>
              <Handle 
                type="source" 
                position={Position.Right} 
                id="false"
                style={{ top: '50%', right: '-12px' }}
                className="!w-6 !h-6 !bg-rose-500 border-[4px] border-white shadow-md hover:scale-110 transition-transform" 
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ConditionNode);

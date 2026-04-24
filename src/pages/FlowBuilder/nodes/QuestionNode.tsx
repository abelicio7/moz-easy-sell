import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, ChevronRight, Settings2 } from 'lucide-react';

const QuestionNode = ({ data, selected }: NodeProps) => {
  const options = data.options || [];

  return (
    <div className={`
      relative min-w-[280px] bg-white rounded-3xl border transition-all duration-300
      ${selected ? 'border-amber-500 ring-8 ring-amber-500/5 shadow-2xl scale-[1.02]' : 'border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-amber-500 border-[3px] border-white !-top-2" />
      
      {/* Header Strip */}
      <div className="h-2 bg-amber-500 rounded-t-3xl w-full" />
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] leading-none mb-1">Módulo</span>
              <span className="text-sm font-black text-slate-800">{data.label}</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100">
            <Settings2 className="w-4 h-4" />
          </div>
        </div>

        <p className="text-sm font-bold text-slate-700 leading-snug mb-5 px-1">
          {data.question || 'Clique no bloco para definir a pergunta...'}
        </p>
        
        {/* Branching Options */}
        <div className="space-y-2">
          {options.length > 0 ? options.map((opt: any, i: number) => (
            <div key={opt.id || i} className="relative group">
              <div className="flex items-center justify-between text-[11px] bg-slate-50/80 group-hover:bg-slate-100/80 p-3 rounded-2xl border border-slate-100 transition-all font-bold text-slate-600">
                <span className="truncate pr-4">{opt.label || `Opção ${i+1}`}</span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              {/* Branch Handle */}
              <Handle 
                type="source" 
                position={Position.Right} 
                id={opt.id || `opt-${i}`}
                style={{ right: '-12px', top: '50%' }}
                className="!w-6 !h-6 !bg-amber-500 border-[4px] border-white shadow-md hover:scale-110 transition-transform !cursor-crosshair" 
              />
            </div>
          )) : (
            <div className="text-[10px] text-slate-400 italic p-6 border-2 border-dashed border-slate-100 rounded-2xl text-center bg-slate-50/30">
              Crie opções no painel lateral para ramificar o fluxo.
            </div>
          )}
        </div>
      </div>

      {options.length === 0 && (
        <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-amber-500 border-[3px] border-white !-bottom-2" />
      )}
    </div>
  );
};

export default memo(QuestionNode);

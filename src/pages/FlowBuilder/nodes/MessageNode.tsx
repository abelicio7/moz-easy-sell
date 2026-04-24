import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, MoreHorizontal } from 'lucide-react';

const MessageNode = ({ data, selected }: NodeProps) => {
  return (
    <div className={`
      relative min-w-[240px] bg-white rounded-3xl border transition-all duration-300
      ${selected ? 'border-blue-500 ring-8 ring-blue-500/5 shadow-2xl scale-[1.02]' : 'border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl'}
    `}>
      <Handle type="target" position={Position.Top} className="!w-4 !h-4 !bg-blue-500 border-[3px] border-white !-top-2" />
      
      {/* Header Strip */}
      <div className="h-2 bg-blue-500 rounded-t-3xl w-full" />
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px] leading-none mb-1">Módulo</span>
              <span className="text-sm font-black text-slate-800">{data.label}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl text-[11px] leading-relaxed text-slate-600 italic">
          {data.content || 'Defina a mensagem que o cliente irá receber no painel lateral...'}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-4 !h-4 !bg-blue-500 border-[3px] border-white !-bottom-2 hover:scale-125 transition-transform" />
    </div>
  );
};

// Internal Button component for the node to avoid imports
const Button = ({ children, variant, size, className, ...props }: any) => (
  <button className={`flex items-center justify-center rounded-lg transition-colors ${className}`} {...props}>
    {children}
  </button>
);

export default memo(MessageNode);

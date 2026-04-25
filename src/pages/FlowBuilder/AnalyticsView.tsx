import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingDown, Users, Target, MousePointer2 } from 'lucide-react';

interface AnalyticsViewProps {
  flowId: string;
}

const AnalyticsView = ({ flowId }: AnalyticsViewProps) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStarted, setTotalStarted] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // 1. Get all nodes for this flow to have the labels
        const { data: nodes } = await supabase
          .from('flow_nodes')
          .select('id, data, type')
          .eq('flow_id', flowId);

        // 2. Get all leads (in_progress and completed)
        const { data: leads } = await supabase
          .from('flow_leads')
          .select('path, status')
          .eq('flow_id', flowId);

        if (nodes && leads) {
          const stats = nodes.map(node => {
            // Count how many leads have this node ID in their path
            const count = leads.filter(lead => 
              Array.isArray(lead.path) && lead.path.includes(node.id)
            ).length;

            return {
              name: node.data.label || node.type,
              visits: count,
              type: node.type
            };
          });

          // Sort by visits (descending) to show the funnel flow
          // Actually, better to sort by the order they appear in the flow, 
          // but for now visits is a good proxy for funnel steps.
          const sortedStats = stats.sort((a, b) => b.visits - a.visits);
          setData(sortedStats);

          setTotalStarted(leads.length);
          setTotalCompleted(leads.filter(l => l.status === 'completed').length);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (flowId) fetchStats();
  }, [flowId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Gerando Relatório de Abandono...</p>
      </div>
    );
  }

  const completionRate = totalStarted > 0 ? ((totalCompleted / totalStarted) * 100).toFixed(1) : 0;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-700">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Iniciaram o Fluxo</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-800">{totalStarted}</p>
            <p className="text-xs text-slate-400 mt-2">Visitantes únicos totais</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Concluíram (Leads)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-800">{totalCompleted}</p>
            <p className="text-xs text-emerald-600 font-bold mt-2">{completionRate}% de conversão</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">Taxa de Abandono</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-4xl font-black text-slate-800">{100 - Number(completionRate)}%</p>
            <p className="text-xs text-rose-600 font-bold mt-2">Pessoas que saíram antes do fim</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="rounded-3xl border-slate-100 shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50">
          <div className="flex items-center gap-3 mb-2">
            <MousePointer2 className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Funil de Retenção por Bloco</CardTitle>
          </div>
          <CardDescription>Acompanhe onde os seus potenciais clientes estão a abandonar o fluxo.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120} 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="visits" radius={[0, 10, 10, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.visits === totalStarted ? '#2563eb' : entry.visits === totalCompleted ? '#10b981' : '#94a3b8'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 grid gap-4">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Análise de Performance</h4>
             {data.slice(0, 3).map((item, i) => (
               <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold shadow-sm">{i+1}</span>
                    <span className="font-bold text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-sm font-black text-slate-900">{item.visits} views</span>
                     <Badge className="bg-blue-50 text-blue-600 border-0">
                        {totalStarted > 0 ? ((item.visits / totalStarted) * 100).toFixed(0) : 0}% retenção
                     </Badge>
                  </div>
               </div>
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsView;

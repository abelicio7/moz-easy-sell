import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  MessageCircle, 
  Download, 
  Search, 
  Calendar,
  ChevronRight,
  Eye,
  MoreVertical
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface LeadsViewProps {
  flowId: string;
}

const LeadsView = ({ flowId }: LeadsViewProps) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('flow_leads')
          .select('*')
          .eq('flow_id', flowId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLeads(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar leads");
      } finally {
        setLoading(false);
      }
    };

    if (flowId) fetchLeads();
  }, [flowId]);

  const filteredLeads = leads.filter(lead => 
    lead.contact_data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.contact_data?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatWhatsApp = (phone: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    return `https://wa.me/${clean}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Users className="w-12 h-12 text-slate-200 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando Leads...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white rounded-3xl border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Leads</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800">{leads.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Conversão</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800">-- %</p>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-3xl border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Score Médio</span>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-800">
              {leads.length > 0 ? (leads.reduce((acc, l) => acc + (l.score || 0), 0) / leads.length).toFixed(1) : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white rounded-3xl border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              Histórico de Captação
              <Badge variant="secondary" className="rounded-full bg-slate-200 text-slate-600 font-bold px-2 py-0">
                {filteredLeads.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Pesquisar leads..." 
                  className="pl-10 rounded-full bg-white border-slate-200 h-10 text-sm focus-visible:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="rounded-full shrink-0 border-slate-200 text-slate-600">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-6 h-12">Contacto</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Score</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Data</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest h-12">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                <TableRow key={lead.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100">
                        {lead.contact_data?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 leading-none mb-1">{lead.contact_data?.name}</span>
                        <span className="text-xs text-slate-400">{lead.contact_data?.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-full px-3 py-0.5 font-bold ${
                      (lead.score || 0) > 50 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {lead.score || 0} pts
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-medium">
                    {new Date(lead.created_at).toLocaleDateString('pt-PT')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {lead.contact_data?.phone && (
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100" asChild>
                            <a href={formatWhatsApp(lead.contact_data.phone)} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-4 h-4" />
                            </a>
                         </Button>
                       )}
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:bg-slate-100">
                          <Eye className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic text-sm">
                    Nenhum lead encontrado para este funil ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsView;

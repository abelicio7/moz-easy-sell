import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Users, Download, MessageCircle,
  Mail, Phone, Loader2, Trophy, Calendar
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  total_score: number | null;
  result_title: string | null;
  answers_json: any;
  created_at: string;
}

interface QuizInfo {
  title: string;
  slug: string;
}

const QuizLeads = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: quizData } = await supabase
        .from('quizzes').select('title, slug').eq('id', id).single();
      if (quizData) setQuiz(quizData);

      const { data: leadsData } = await supabase
        .from('quiz_leads')
        .select('*')
        .eq('quiz_id', id)
        .order('created_at', { ascending: false });

      if (leadsData) {
        setLeads(leadsData as Lead[]);
        setFiltered(leadsData as Lead[]);
      }
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (!search) { setFiltered(leads); return; }
    const q = search.toLowerCase();
    setFiltered(leads.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.includes(q)
    ));
  }, [search, leads]);

  const exportCSV = () => {
    if (!leads.length) return;
    const headers = ['Nome', 'Email', 'WhatsApp', 'Pontuação', 'Resultado', 'Data'];
    const rows = leads.map(l => [
      l.name, l.email, l.phone || '', l.total_score || 0,
      l.result_title || '', new Date(l.created_at).toLocaleString('pt-PT')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${quiz?.slug || 'quiz'}.csv`;
    a.click();
    toast.success("CSV exportado!");
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl"
            onClick={() => navigate('/dashboard/quizzes')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Leads do Quiz</h1>
            <p className="text-xs text-muted-foreground">{quiz?.title}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl gap-2" asChild>
            <Link to={`/dashboard/quizzes/${id}/edit`}>
              Editar Quiz
            </Link>
          </Button>
          <Button onClick={exportCSV} className="rounded-xl gap-2 shadow-lg shadow-primary/20">
            <Download className="w-4 h-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Leads</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-foreground">{leads.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pontuação Média</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-foreground">
              {leads.length ? Math.round(leads.reduce((a, l) => a + (l.total_score || 0), 0) / leads.length) : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 col-span-2 md:col-span-1">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Com WhatsApp</span>
              <MessageCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-foreground">
              {leads.filter(l => l.phone).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por nome, email ou número..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-muted/30 border-border"
        />
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2">
          <CardContent className="py-20 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold text-foreground text-lg mb-2">
              {leads.length === 0 ? 'Ainda não há leads' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {leads.length === 0
                ? 'Partilha o link do quiz para começar a captar contactos.'
                : 'Tenta uma pesquisa diferente.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <Card key={lead.id} className="rounded-2xl border-border/50 hover:shadow-md transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-primary font-black text-lg">
                        {lead.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base leading-tight">{lead.name}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" /> {lead.email}
                        </span>
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    {lead.total_score !== null && (
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-sm font-black text-foreground">{lead.total_score} pts</span>
                      </div>
                    )}
                    {lead.result_title && (
                      <Badge variant="secondary" className="rounded-lg text-[10px] font-bold max-w-[160px] truncate">
                        {lead.result_title}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <Calendar className="w-3 h-3" /> {formatDate(lead.created_at)}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {lead.phone && (
                        <Button size="sm" variant="outline"
                          className="h-9 w-9 p-0 rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                          asChild title="Enviar WhatsApp">
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${lead.name}! Obrigado por responder ao nosso quiz. Temos uma oferta especial para si!`)}`}
                            target="_blank" rel="noreferrer"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="outline"
                        className="h-9 w-9 p-0 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                        asChild title="Enviar Email">
                        <a href={`mailto:${lead.email}`}>
                          <Mail className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default QuizLeads;

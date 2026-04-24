import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Target, Crown } from "lucide-react";

interface SellerProgressProps {
  revenue: number;
}

const MILESTONES = [
  { value: 0, label: "Iniciante", badge: "🌱", icon: Target, color: "text-slate-400", bgColor: "bg-slate-400" },
  { value: 100000, label: "100K", badge: "🥉", icon: Star, color: "text-amber-700", bgColor: "bg-amber-700" },
  { value: 500000, label: "500K", badge: "🥈", icon: Star, color: "text-slate-400", bgColor: "bg-slate-400" },
  { value: 1000000, label: "1 Milhão", badge: "🥇", icon: Trophy, color: "text-yellow-500", bgColor: "bg-yellow-500" },
  { value: 5000000, label: "5 Milhões", badge: "🏆", icon: Crown, color: "text-indigo-500", bgColor: "bg-indigo-500" },
  { value: 10000000, label: "10 Milhões+", badge: "💎", icon: Crown, color: "text-cyan-400", bgColor: "bg-cyan-400" },
];

export const SellerProgress = ({ revenue }: SellerProgressProps) => {
  const currentTier = [...MILESTONES].reverse().find(m => revenue >= m.value) || MILESTONES[0];
  const currentTierIndex = MILESTONES.findIndex(m => m.value === currentTier.value);
  const nextTier = MILESTONES[currentTierIndex + 1];
  
  const progressPercent = nextTier 
    ? Math.min(100, Math.max(0, ((revenue - currentTier.value) / (nextTier.value - currentTier.value)) * 100))
    : 100;

  const CurrentIcon = currentTier.icon;

  return (
    <Card className="mb-8 border border-border/50 shadow-lg bg-gradient-to-br from-card to-muted/30 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className={`absolute top-0 right-0 w-64 h-64 opacity-5 rounded-full blur-3xl -mr-10 -mt-10 ${currentTier.bgColor}`}></div>
      
      <CardContent className="pt-6 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${currentTier.bgColor} bg-opacity-10 border border-${currentTier.bgColor.replace('bg-', '')}/20`}>
              <CurrentIcon className={`w-8 h-8 ${currentTier.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Nível Atual</p>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <span className="text-3xl">{currentTier.badge}</span> {currentTier.label}
              </h2>
            </div>
          </div>
          
          <div className="text-left md:text-right bg-background/50 p-4 rounded-xl border border-border/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Faturamento Total</p>
            <p className="text-3xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {revenue.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
            </p>
          </div>
        </div>

        {nextTier ? (
          <div className="space-y-4 bg-background/50 p-5 rounded-xl border border-border/50">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Progresso para o próximo nível</p>
                <p className="text-2xl font-bold text-foreground">{progressPercent.toFixed(1)}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground mb-1">Próxima Conquista</p>
                <p className="font-bold flex items-center gap-1.5 text-foreground">
                  <span>{nextTier.badge}</span> {nextTier.label}
                </p>
              </div>
            </div>
            
            <div className="relative pt-2">
              <Progress value={progressPercent} className="h-4 bg-muted/50 border border-border/50 shadow-inner" />
              {/* Markers */}
              <div className="absolute top-0 left-0 w-full h-full flex justify-between px-1 items-center pointer-events-none">
                <div className="w-1 h-2 bg-background/50 rounded-full"></div>
                <div className="w-1 h-2 bg-background/50 rounded-full"></div>
                <div className="w-1 h-2 bg-background/50 rounded-full"></div>
                <div className="w-1 h-2 bg-background/50 rounded-full"></div>
                <div className="w-1 h-2 bg-background/50 rounded-full"></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="font-semibold text-muted-foreground">{currentTier.value.toLocaleString('pt-MZ')} MT</span>
              <span className="font-medium text-primary">Faltam {(nextTier.value - revenue).toLocaleString('pt-MZ')} MT</span>
              <span className="font-semibold text-muted-foreground">{nextTier.value.toLocaleString('pt-MZ')} MT</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-6 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,107,255,0.1)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-[shimmer_2s_infinite] pointer-events-none"></div>
            <h3 className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mb-2">Nível Máximo Atingido! 💎</h3>
            <p className="text-muted-foreground text-lg">Você está no topo do ranking da EnsinaPay. Uma lenda do empreendedorismo digital!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

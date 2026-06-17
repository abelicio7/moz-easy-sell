import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import {
  ArrowRight, XCircle, CheckCircle2, Package, Link2, CreditCard, Send,
  Rocket, Smartphone, Mail, BarChart3, Shield, Globe, Users, BookOpen, Briefcase, GraduationCap,
  Zap, MousePointer2, ShieldCheck, Sparkles, TrendingUp
} from "lucide-react";
import Logo from "@/components/Logo";

const problems = [
  "Plataformas estrangeiras não aceitam M-Pesa/E-Mola e bloqueiam contas",
  "Dificuldade de vender para o Brasil por falta de integração com o Pix",
  "Falta de confiança dos clientes em checkouts lentos ou amadores",
  "Processo manual de envio de infoprodutos via WhatsApp",
];

const solutions = [
  "Checkouts otimizados que convertem até 3x mais",
  "Integração nativa com M-Pesa, E-Mola e Pix",
  "Vendas internacionais simplificadas para o mercado brasileiro",
  "Entrega de arquivos e acessos 100% automática por e-mail",
];

const steps = [
  { 
    icon: Package, 
    title: "Crie seu produto", 
    desc: "Em menos de 2 minutos, configure o seu curso, ebook ou mentoria e escolha a moeda (MT ou R$).",
    color: "bg-blue-500/10 text-blue-600"
  },
  { 
    icon: Link2, 
    title: "Gere seu link", 
    desc: "Um link único e profissional pronto para ser partilhado nas redes sociais ou WhatsApp.",
    color: "bg-purple-500/10 text-purple-600"
  },
  { 
    icon: CreditCard, 
    title: "Venda local ou internacional", 
    desc: "Moçambicanos pagam via M-Pesa/E-Mola. Brasileiros pagam via Pix. O sistema valida na hora.",
    color: "bg-red-500/10 text-red-600"
  },
  { 
    icon: Send, 
    title: "Entrega automática", 
    desc: "O cliente recebe o produto por e-mail no mesmo segundo e você saca seus lucros direto na sua conta.",
    color: "bg-green-500/10 text-green-600"
  },
];

const features = [
  {
    icon: Globe,
    title: "Moçambique 🇲🇿 para Brasil 🇧🇷",
    desc: "Venda seus infoprodutos para o Brasil estando em Moçambique. Receba pagamentos via Pix direto na plataforma."
  },
  {
    icon: Zap,
    title: "Alta Conversão",
    desc: "Páginas de checkout desenhadas para mobile, garantindo que você não perca vendas por lentidão."
  },
  {
    icon: ShieldCheck,
    title: "Saques Simplificados",
    desc: "Saque suas vendas em Meticais direto para M-Pesa/E-Mola ou suas vendas em Reais para sua conta Pix."
  },
  {
    icon: BarChart3,
    title: "Gestão Multimoeda",
    desc: "Acompanhe seus lucros, taxas e vendas separadamente por Metical (MZN) e Real (BRL) no dashboard."
  }
];

const Index = () => {
  const [previewCurrency, setPreviewCurrency] = useState<'MZN' | 'BRL'>('MZN');

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-background overflow-x-hidden">
      <LandingNav />

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-24 md:pt-32 md:pb-48 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px]" />
        </div>

        <div className="container px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider animate-fade-in text-center">
              <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
              NOVIDADE: Venda para o Brasil 🇧🇷 e receba em Moçambique 🇲🇿
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-foreground leading-[0.95] animate-fade-in-up">
              Venda seus infoprodutos <br />
              sem <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary to-purple-600">fronteiras.</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Crie seu checkout profissional em minutos. Aceite pagamentos locais via <span className="text-foreground font-bold">M-Pesa e E-Mola</span> em Moçambique, e venda para o Brasil inteiro recebendo via <span className="text-emerald-500 font-bold">Pix</span>. Tudo de forma automática e integrada.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Link to="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-2xl bg-secondary hover:bg-secondary/90 shadow-xl shadow-secondary/20 group">
                  Vender agora
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
              Sem mensalidades ou taxas de manutenção. Você só paga quando vende.
            </p>
          </div>
        </div>
      </section>

      {/* DASHBOARD & NOTIFICATION PREVIEW SHOWCASE */}
      <section className="container px-4 -mt-8 sm:-mt-16 relative">
        <div className="relative max-w-6xl mx-auto rounded-[24px] sm:rounded-3xl border border-border/50 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4 sm:p-6 md:p-8 shadow-2xl animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-purple-500/10 rounded-full blur-[100px] -z-10" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-secondary/15 rounded-full blur-[100px] -z-10" />
          
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Dashboard Mockup (Col span 7) */}
            <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-slate-50 dark:bg-slate-950/80 shadow-inner overflow-hidden p-4 sm:p-6 flex flex-col justify-between min-h-[350px] sm:min-h-[420px]">
              <div>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-border pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-white font-black text-sm">E</div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">Dashboard EnsinaPay</h4>
                      <p className="text-[10px] text-muted-foreground">Painel de Vendas</p>
                    </div>
                  </div>
                  {/* Simulated currency tabs */}
                  <div className="flex gap-1 bg-muted dark:bg-slate-800 p-1 rounded-xl text-xs w-full sm:w-auto justify-center sm:justify-start">
                    <button 
                      onClick={() => setPreviewCurrency('MZN')}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                        previewCurrency === 'MZN' 
                          ? 'bg-white dark:bg-slate-900 text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>🇲🇿</span> MT
                    </button>
                    <button 
                      onClick={() => setPreviewCurrency('BRL')}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                        previewCurrency === 'BRL' 
                          ? 'bg-white dark:bg-slate-900 text-foreground' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>🇧🇷</span> R$
                    </button>
                  </div>
                </div>

                {/* Grid cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white dark:bg-slate-900 border border-border p-4 rounded-xl space-y-2 shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">Saldo Disponível</p>
                    <h3 className="text-xl sm:text-2xl font-black text-foreground">
                      {previewCurrency === 'MZN' ? '24.850,00 MT' : 'R$ 1.840,00'}
                    </h3>
                    <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <span>↑ 18.4%</span> esta semana
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-border p-4 rounded-xl space-y-2 shadow-sm">
                    <p className="text-xs text-muted-foreground font-medium">
                      {previewCurrency === 'MZN' ? 'Saques Processados' : 'Vendas via Pix (BRL)'}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-black text-secondary">
                      {previewCurrency === 'MZN' ? '9.450,00 MT' : 'R$ 540,00'}
                    </h3>
                    <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      {previewCurrency === 'MZN' ? (
                        <span>Enviado via E-Mola/M-Pesa</span>
                      ) : (
                        <span>Vendas internacionais ativas ⚡</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent actions / list */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Últimas Atividades ({previewCurrency})</h5>
                <div className="space-y-2 text-xs">
                  {previewCurrency === 'MZN' ? (
                    <>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div>
                            <p className="font-bold text-foreground">Venda via M-Pesa</p>
                            <p className="text-[10px] text-muted-foreground">Curso de Design Gráfico</p>
                          </div>
                        </div>
                        <span className="font-bold text-foreground text-right shrink-0">+ 447,00 MT</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div>
                            <p className="font-bold text-foreground">Venda via E-Mola</p>
                            <p className="text-[10px] text-muted-foreground">Ebook: Escalando no Digital</p>
                          </div>
                        </div>
                        <span className="font-bold text-foreground text-right shrink-0">+ 147,00 MT</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <div>
                            <p className="font-bold text-foreground">Saque Processado (E-Mola)</p>
                            <p className="text-[10px] text-muted-foreground">Transferência realizada com sucesso</p>
                          </div>
                        </div>
                        <span className="font-bold text-red-500 text-right shrink-0">- 1.970,00 MT</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div>
                            <p className="font-bold text-foreground">Venda via Pix (Brasil)</p>
                            <p className="text-[10px] text-muted-foreground">Mentoria Express</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-500 text-right shrink-0">+ R$ 55,00</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <div>
                            <p className="font-bold text-foreground">Venda via Pix (Brasil)</p>
                            <p className="text-[10px] text-muted-foreground">Curso Avançado de Vendas</p>
                          </div>
                        </div>
                        <span className="font-bold text-emerald-500 text-right shrink-0">+ R$ 120,00</span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-slate-900 border border-border/50 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                          <div>
                            <p className="font-bold text-foreground">Saque Pix Processado</p>
                            <p className="text-[10px] text-muted-foreground">Transferência Pix internacional</p>
                          </div>
                        </div>
                        <span className="font-bold text-red-500 text-right shrink-0">- R$ 50,00</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications Showcase (Col span 5) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6 mt-4 lg:mt-0">
              <div className="space-y-2">
                <span className="text-xs font-black uppercase text-secondary tracking-widest">Prova Social Real</span>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground">Notificações Reais</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Veja capturas reais de notificações recebidas pelos vendedores da EnsinaPay tanto em Meticais quanto em Reais. Clique nas abas ao lado para ver como cada transação se destaca!
                </p>
              </div>

              {/* iOS notification container */}
              <div className="space-y-4 p-3 sm:p-4 rounded-2xl bg-slate-950/5 dark:bg-slate-950/40 border border-border/40 backdrop-blur-sm max-h-[300px] sm:max-h-[350px] overflow-y-auto custom-scrollbar flex-1">
                {/* 1. BRL Sale */}
                <div 
                  className={`rounded-2xl overflow-hidden shadow-lg border border-white/10 transition-all duration-300 ${
                    previewCurrency === 'BRL' 
                      ? 'ring-2 ring-emerald-500 scale-[1.02] opacity-100' 
                      : 'opacity-50 hover:opacity-100 scale-100'
                  }`}
                >
                  <img 
                    src="/notifications/notification_brl_55.png" 
                    alt="Notificação Venda R$ 55,00" 
                    className="w-full h-auto object-contain block"
                  />
                </div>
                {/* 2. MZN 447 Sale */}
                <div 
                  className={`rounded-2xl overflow-hidden shadow-lg border border-white/10 transition-all duration-300 ${
                    previewCurrency === 'MZN' 
                      ? 'ring-2 ring-secondary scale-[1.02] opacity-100' 
                      : 'opacity-50 hover:opacity-100 scale-100'
                  }`}
                >
                  <img 
                    src="/notifications/notification_mzn_447.png" 
                    alt="Notificação Venda 447 MT" 
                    className="w-full h-auto object-contain block"
                  />
                </div>
                {/* 3. BRL Withdrawal */}
                <div 
                  className={`rounded-2xl overflow-hidden shadow-lg border border-white/10 transition-all duration-300 ${
                    previewCurrency === 'BRL' 
                      ? 'ring-2 ring-emerald-500 scale-[1.02] opacity-100' 
                      : 'opacity-50 hover:opacity-100 scale-100'
                  }`}
                >
                  <img 
                    src="/notifications/withdrawal_brl_50.png" 
                    alt="Notificação Saque R$ 50,00" 
                    className="w-full h-auto object-contain block"
                  />
                </div>
                {/* 4. MZN 147 Sale */}
                <div 
                  className={`rounded-2xl overflow-hidden shadow-lg border border-white/10 transition-all duration-300 ${
                    previewCurrency === 'MZN' 
                      ? 'ring-2 ring-secondary scale-[1.02] opacity-100' 
                      : 'opacity-50 hover:opacity-100 scale-100'
                  }`}
                >
                  <img 
                    src="/notifications/notification_mzn_147.png" 
                    alt="Notificação Venda 147 MT" 
                    className="w-full h-auto object-contain block"
                  />
                </div>
                {/* 5. MZN Withdrawal */}
                <div 
                  className={`rounded-2xl overflow-hidden shadow-lg border border-white/10 transition-all duration-300 ${
                    previewCurrency === 'MZN' 
                      ? 'ring-2 ring-secondary scale-[1.02] opacity-100' 
                      : 'opacity-50 hover:opacity-100 scale-100'
                  }`}
                >
                  <img 
                    src="/notifications/withdrawal_mzn_1970.png" 
                    alt="Notificação Saque 1970 MT" 
                    className="w-full h-auto object-contain block"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAINEL DE PROBLEMAS / POR QUE NÓS? */}
      <section className="py-16 md:py-32 bg-white dark:bg-card/20">
        <div className="container px-4">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-20 items-center">
            <div className="space-y-6 md:space-y-8">
              <h2 className="text-3xl md:text-5xl font-black text-foreground leading-[1.1]">
                Vender online em Moçambique não precisa ser uma <span className="text-destructive underline decoration-wavy underline-offset-8">dor de cabeça.</span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Esqueça as gambiarras de transferência manual ou o envio de arquivos por WhatsApp. 
                A EnsinaPay automatiza o que é burocrático e abre as portas do maior mercado da América Latina para o seu conteúdo: <span className="text-foreground font-bold">o Brasil.</span>
              </p>
              
              <div className="space-y-4">
                {problems.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 md:p-4 rounded-2xl bg-muted/50 border border-transparent hover:border-border transition-all">
                    <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    <span className="text-sm md:text-base font-medium text-foreground">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-secondary p-6 sm:p-12 md:p-16 rounded-[24px] sm:rounded-[40px] text-white space-y-8 md:space-y-10 relative overflow-hidden shadow-2xl shadow-secondary/30">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
               <h3 className="text-2xl sm:text-3xl font-bold">Com a EnsinaPay é assim:</h3>
               <div className="space-y-5 md:space-y-6">
                {solutions.map((s, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-base sm:text-lg font-medium text-white/90">{s}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="w-full h-14 bg-white text-secondary hover:bg-white/90 font-bold text-lg rounded-xl" asChild>
                <Link to="/register">Quero minha conta agora</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PASSOS - GRID MODERNO */}
      <section id="como-funciona" className="py-16 md:py-32">
        <div className="container px-4">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-foreground">Como funciona?</h2>
            <p className="text-base md:text-lg text-muted-foreground">O fluxo mais simples e eficiente do mercado para você e seu cliente.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <div key={i} className="group p-6 sm:p-8 rounded-3xl bg-white dark:bg-card border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{step.desc}</p>
                <div className="mt-6 text-[10px] font-black text-muted-foreground/30 tracking-[4px] uppercase">Passo {i+1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES - BENTO GRID INSPIRED */}
      <section className="py-16 md:py-32 bg-secondary/5">
        <div className="container px-4">
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
             <div className="lg:col-span-2 grid md:grid-cols-2 gap-6 md:gap-8">
                {features.map((f, i) => (
                  <div key={i} className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-card border border-border/50 shadow-sm">
                    <f.icon className="w-10 h-10 text-secondary mb-6" />
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                ))}
             </div>
             <div className="bg-gradient-to-br from-secondary to-secondary-foreground p-6 sm:p-10 rounded-[24px] sm:rounded-[40px] text-white flex flex-col justify-between relative overflow-hidden shadow-2xl min-h-[300px]">
                <TrendingUp className="w-20 h-20 text-white/10 absolute -top-4 -right-4" />
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black mb-4 md:mb-6">Focado em Escalar.</h3>
                  <p className="text-white/80 leading-relaxed text-sm sm:text-base md:text-lg">
                    Não somos apenas um processador de pagamentos local. Somos o seu braço direito tecnológico para abrir novos mercados e escalar o seu negócio digital em Moçambique.
                  </p>
                </div>
                <div className="mt-8 md:mt-12 space-y-4">
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-bold">100% Taxa de Disponibilidade</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-bold">Suporte Prioritário via WhatsApp</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS MINI / TRUST */}
      <section className="py-16 md:py-32">
        <div className="container px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-muted-foreground/50 mb-12 md:mb-16 uppercase tracking-[5px]">Plataforma Feita Para</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-center opacity-70 grayscale hover:grayscale-0 transition-all">
             <div className="flex flex-col items-center gap-2">
                <Users className="w-8 h-8 md:w-10 md:h-10 text-secondary" />
                <span className="font-bold text-sm sm:text-base text-foreground">Criadores</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-secondary" />
                <span className="font-bold text-sm sm:text-base text-foreground">Educadores</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-secondary" />
                <span className="font-bold text-sm sm:text-base text-foreground">Consultores</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-secondary" />
                <span className="font-bold text-sm sm:text-base text-foreground">Autores</span>
             </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA - PREMIUM BOX */}
      <section className="py-12 sm:py-20 px-4">
        <div className="container max-w-6xl p-6 sm:p-12 md:p-24 rounded-[32px] sm:rounded-[60px] bg-[#0f172a] text-white text-center relative overflow-hidden shadow-2xl shadow-black/40">
           <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-transparent pointer-events-none" />
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent" />
           
           <div className="relative z-10 space-y-8 md:space-y-10">
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
                A sua jornada sem fronteiras <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary to-emerald-400">começa aqui.</span>
              </h2>
              <p className="text-sm sm:text-base md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                Junte-se a centenas de criadores moçambicanos que já estão a faturar localmente e vendendo para o Brasil. Receba via M-Pesa, E-Mola ou Pix com facilidade.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button size="lg" className="w-full sm:w-auto h-16 px-12 text-xl font-bold bg-secondary hover:bg-secondary/90 text-white rounded-2xl transition-all hover:scale-105" asChild>
                  <Link to="/register">Criar minha conta grátis</Link>
                </Button>
              </div>
              <p className="text-xs text-white/40">Sem taxas de adesão. Você só paga quando vende.</p>
           </div>
        </div>
      </section>

      {/* FOOTER - CLEAN */}
      <footer className="py-12 sm:py-20 border-t border-border/50">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center md:text-left">
              <Logo size="md" />
              <p className="text-sm text-muted-foreground max-w-xs">
                A plataforma líder em vendas de infoprodutos com pagamentos locais em Moçambique e Pix no Brasil.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm font-bold text-foreground/70">
              <Link to="/terms" className="hover:text-secondary transition-colors">Termos</Link>
              <Link to="/privacy" className="hover:text-secondary transition-colors">Privacidade</Link>
              <Link to="/contact" className="hover:text-secondary transition-colors">Contacto</Link>
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted font-bold text-xs">
                 <Globe className="w-3 h-3" /> Moçambique
              </a>
            </div>
          </div>
          <div className="mt-12 md:mt-16 pt-8 border-t border-border/20 text-center text-xs text-muted-foreground">
            © 2026 EnsinaPay. Elevando o empreendedorismo digital moçambicano.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

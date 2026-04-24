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
  "Plataformas estrangeiras não aceitam pagamentos locais",
  "O processo de recebimento via M-Pesa é manual e lento",
  "Falta de confiança dos clientes em checkouts amadores",
  "Dificuldade em entregar arquivos digitais automaticamente",
];

const solutions = [
  "Checkouts otimizados que convertem até 3x mais",
  "Integração nativa com M-Pesa e E-Mola",
  "Entrega de arquivos e acessos 100% automática",
  "Dashboard completo para gerir o seu império digital",
];

const steps = [
  { 
    icon: Package, 
    title: "Crie seu produto", 
    desc: "Em menos de 2 minutos, configure o seu produto digital, preço e conteúdo de entrega.",
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
    title: "Venda com M-Pesa", 
    desc: "Seus clientes pagam via M-Pesa ou E-Mola e o sistema valida o pagamento instantaneamente.",
    color: "bg-red-500/10 text-red-600"
  },
  { 
    icon: Send, 
    title: "Entrega automática", 
    desc: "O cliente recebe o produto por e-mail no mesmo segundo. Sem que você precise mover um dedo.",
    color: "bg-green-500/10 text-green-600"
  },
];

const features = [
  {
    icon: Zap,
    title: "Alta Conversão",
    desc: "Páginas de checkout desenhadas para mobile, garantindo que você não perca vendas por lentidão."
  },
  {
    icon: ShieldCheck,
    title: "Segurança Total",
    desc: "Seus dados e os dos seus clientes protegidos com criptografia de ponta a ponta."
  },
  {
    icon: Smartphone,
    title: "Foco no Local",
    desc: "A primeira plataforma de infoprodutos feita por moçambicanos para moçambicanos."
  },
  {
    icon: BarChart3,
    title: "Gestão Financeira",
    desc: "Acompanhe seus lucros, taxas e peça saques diretamente para sua conta M-Pesa."
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-background overflow-x-hidden">
      <LandingNav />

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px]" />
        </div>

        <div className="container px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-wider animate-fade-in">
              <Sparkles className="w-3 h-3" />
              A Revolução dos Infoprodutos em Moçambique
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-foreground leading-[0.95] animate-fade-in-up">
              Transforme seu <br />
              conhecimento em <span className="text-secondary">lucro real.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              A EnsinaPay é a plataforma definitiva para vender cursos, ebooks e mentorias usando 
              <span className="text-foreground font-bold"> M-Pesa e E-Mola</span>. Simples, rápido e automático.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold bg-secondary hover:bg-secondary/90 text-white shadow-xl shadow-secondary/20 rounded-2xl group" asChild>
                <Link to="/register">
                  Criar minha conta agora
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto h-16 px-8 text-lg font-bold rounded-2xl border border-transparent hover:border-border hover:bg-white/50" asChild>
                <a href="#como-funciona" className="flex items-center gap-2">
                  <MousePointer2 className="w-5 h-5" />
                  Ver demonstração
                </a>
              </Button>
            </div>
            
            {/* Social Proof Mini */}
            <div className="pt-12 flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Confiado por centenas de empreendedores</p>
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-background bg-secondary text-white flex items-center justify-center text-[10px] font-bold">
                  +200
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW / MOCKUP */}
      <section className="container px-4 -mt-16 relative">
        <div className="relative max-w-6xl mx-auto rounded-3xl border border-border/50 bg-white/40 dark:bg-white/5 backdrop-blur-xl p-2 md:p-4 shadow-2xl animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl -z-10" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl -z-10" />
          
          <div className="rounded-2xl overflow-hidden border border-border/50 shadow-inner">
             {/* Simulating the dashboard look from the screenshots */}
             <div className="bg-muted/30 aspect-[16/9] md:aspect-[21/9] flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-secondary/10 to-transparent pointer-events-none" />
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
                  alt="Dashboard Preview" 
                  className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                   <div className="bg-white/90 dark:bg-black/80 p-6 rounded-2xl shadow-2xl flex items-center gap-4 max-w-md border border-white/20">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                         <CheckCircle2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Venda Confirmada!</p>
                        <p className="text-xl font-black text-foreground">+ 1,500.00 MT</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* PAINEL DE PROBLEMAS / POR QUE NÓS? */}
      <section className="py-32 bg-white dark:bg-card/20">
        <div className="container px-4">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-foreground leading-[1.1]">
                Vender online em Moçambique não precisa ser uma <span className="text-destructive underline decoration-wavy underline-offset-8">dor de cabeça.</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Esqueça as gambiarras, as transferências manuais e o envio de arquivos por WhatsApp. 
                A EnsinaPay automatiza o que é chato para você focar no que importa: <span className="text-foreground font-bold">o seu conteúdo.</span>
              </p>
              
              <div className="space-y-4">
                {problems.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-transparent hover:border-border transition-all">
                    <XCircle className="w-6 h-6 text-destructive shrink-0" />
                    <span className="font-medium text-foreground">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-secondary p-12 md:p-16 rounded-[40px] text-white space-y-10 relative overflow-hidden shadow-2xl shadow-secondary/30">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
               <h3 className="text-3xl font-bold">Com a EnsinaPay é assim:</h3>
               <div className="space-y-6">
                {solutions.map((s, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-1">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-medium text-white/90">{s}</span>
                  </div>
                ))}
              </div>
              <Button size="lg" className="w-full h-14 bg-white text-secondary hover:bg-white/90 font-bold text-lg rounded-xl" asChild>
                <Link to="/register text-secondary">Quero minha conta agora</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PASSOS - GRID MODERNO */}
      <section id="como-funciona" className="py-32">
        <div className="container px-4">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-foreground">Como funciona?</h2>
            <p className="text-lg text-muted-foreground">O fluxo mais simples e eficiente do mercado para o seu cliente.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-white dark:bg-card border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                <div className="mt-6 text-[10px] font-black text-muted-foreground/30 tracking-[4px] uppercase">Passo {i+1}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES - BENTO GRID INSPIRED */}
      <section className="py-32 bg-secondary/5">
        <div className="container px-4">
          <div className="grid lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
                {features.map((f, i) => (
                  <div key={i} className="p-8 rounded-3xl bg-white dark:bg-card border border-border/50 shadow-sm">
                    <f.icon className="w-10 h-10 text-secondary mb-6" />
                    <h3 className="text-2xl font-bold text-foreground mb-3">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                ))}
             </div>
             <div className="bg-gradient-to-br from-secondary to-secondary-foreground p-10 rounded-[40px] text-white flex flex-col justify-between relative overflow-hidden shadow-2xl">
                <TrendingUp className="w-20 h-20 text-white/10 absolute -top-4 -right-4" />
                <div>
                  <h3 className="text-3xl font-black mb-6">Focado em Escalar.</h3>
                  <p className="text-white/80 leading-relaxed text-lg">
                    Não somos apenas um processador de pagamentos. Somos o seu braço direito tecnológico para escalar o seu negócio digital em Moçambique.
                  </p>
                </div>
                <div className="mt-12 space-y-4">
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-bold">100% Taxa de Disponibilidade</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-sm font-bold">Suporte Prioritário via WhatsApp</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS MINI / TRUST */}
      <section className="py-32">
        <div className="container px-4 text-center">
          <h2 className="text-3xl font-bold text-muted-foreground/50 mb-16 uppercase tracking-[5px]">Plataforma Feita Para</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 items-center opacity-70 grayscale hover:grayscale-0 transition-all">
             <div className="flex flex-col items-center gap-2">
                <Users className="w-10 h-10 text-secondary" />
                <span className="font-bold text-foreground">Criadores</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <GraduationCap className="w-10 h-10 text-secondary" />
                <span className="font-bold text-foreground">Educadores</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <Briefcase className="w-10 h-10 text-secondary" />
                <span className="font-bold text-foreground">Consultores</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <BookOpen className="w-10 h-10 text-secondary" />
                <span className="font-bold text-foreground">Autores</span>
             </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA - PREMIUM BOX */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl p-12 md:p-24 rounded-[60px] bg-[#0f172a] text-white text-center relative overflow-hidden shadow-2xl shadow-black/40">
           <div className="absolute inset-0 bg-gradient-to-r from-secondary/20 to-transparent pointer-events-none" />
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary to-transparent" />
           
           <div className="relative z-10 space-y-10">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
                A sua jornada digital <br /> <span className="text-secondary">começa aqui.</span>
              </h2>
              <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                Junte-se a centenas de moçambicanos que já estão a faturar alto vendendo produtos digitais com pagamento local.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <Button size="lg" className="w-full sm:w-auto h-16 px-12 text-xl font-bold bg-secondary hover:bg-secondary/90 text-white rounded-2xl transition-all hover:scale-105" asChild>
                  <Link to="/register">Criar minha conta grátis</Link>
                </Button>
              </div>
              <p className="text-sm text-white/40">Sem taxas de manutenção. Você só paga quando vende.</p>
           </div>
        </div>
      </section>

      {/* FOOTER - CLEAN */}
      <footer className="py-20 border-t border-border/50">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-4 text-center md:text-left">
              <Logo size="md" />
              <p className="text-sm text-muted-foreground max-w-xs">
                A plataforma líder em vendas de infoprodutos com pagamentos locais em Moçambique.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-10 text-sm font-bold text-foreground/70">
              <Link to="/terms" className="hover:text-secondary transition-colors">Termos</Link>
              <Link to="/privacy" className="hover:text-secondary transition-colors">Privacidade</Link>
              <Link to="/contact" className="hover:text-secondary transition-colors">Contacto</Link>
              <a href="#" className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted font-bold text-xs">
                 <Globe className="w-3 h-3" /> Moçambique
              </a>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-border/20 text-center text-xs text-muted-foreground">
            © 2026 EnsinaPay. Elevando o empreendedorismo digital moçambicano.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import {
  ArrowRight, XCircle, CheckCircle2, Package, Link2, CreditCard, Send,
  Rocket, Smartphone, Mail, BarChart3, Shield, Globe, Users, BookOpen, Briefcase, GraduationCap
} from "lucide-react";
import Logo from "@/components/Logo";

const problems = [
  "Não existem plataformas adaptadas ao nosso mercado",
  "Receber pagamentos é confuso",
  "Você perde vendas por falta de confiança",
  "Tudo precisa ser feito manualmente",
];

const solutions = [
  "Criar páginas de checkout profissionais",
  "Receber via M-Pesa e E-Mola",
  "Entregar automaticamente seus produtos",
  "Gerir tudo em um único lugar",
];

const steps = [
  { icon: Package, title: "Crie seu produto", desc: "Adicione nome, preço e o que será entregue." },
  { icon: Link2, title: "Gere seu link de checkout", desc: "Compartilhe com seus clientes." },
  { icon: CreditCard, title: "Receba pagamentos", desc: "Via M-Pesa ou E-Mola." },
  { icon: Send, title: "Entregue automaticamente", desc: "Seu cliente recebe tudo sem esforço." },
];

const benefits = [
  { icon: Rocket, text: "Checkout rápido e profissional" },
  { icon: Smartphone, text: "Pagamentos locais integrados" },
  { icon: Mail, text: "Entrega automática por email" },
  { icon: BarChart3, text: "Controle total das suas vendas" },
  { icon: Shield, text: "Plataforma segura e confiável" },
];

const diferenciais = [
  "Suporte a M-Pesa",
  "Suporte a E-Mola",
  "Simples, leve e rápida",
  "Sem complicações técnicas",
];

const audiencias = [
  { icon: Users, text: "Criadores de conteúdo" },
  { icon: GraduationCap, text: "Professores" },
  { icon: Briefcase, text: "Empreendedores digitais" },
  { icon: BookOpen, text: "Vendedores de ebooks e cursos" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* HERO */}
      <section className="container py-16 md:py-32 text-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1] animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Venda seus produtos digitais de forma simples com{" "}
          <span className="text-primary">M-Pesa e E-Mola</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in leading-relaxed" style={{ animationDelay: "0.2s" }}>
          Crie seu checkout em minutos, receba pagamentos locais e entregue automaticamente — sem complicações.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in w-full max-w-xs mx-auto sm:max-w-none" style={{ animationDelay: "0.3s" }}>
          <Button size="lg" className="w-full sm:w-auto text-base px-8 h-14 md:text-lg font-bold" asChild>
            <Link to="/register">
              Começar Grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-14 md:text-lg border-border hover:border-primary/40" asChild>
            <a href="#como-funciona">Ver como funciona</a>
          </Button>
        </div>
      </section>

      {/* SEÇÃO 2 — PROBLEMA */}
      <section className="py-16 md:py-28 overflow-hidden">
        <div className="container max-w-3xl text-center px-4 md:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Vender online em Moçambique ainda é <span className="text-primary">complicado…</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Se você já tentou vender um produto digital, sabe como é difícil:
          </p>
          <div className="space-y-4 text-left max-w-lg mx-auto">
            {problems.map((p, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-foreground">{p}</span>
              </div>
            ))}
          </div>
          <p className="mt-10 text-lg text-muted-foreground">
            👉 Resultado? Você trabalha muito… e <span className="text-primary font-semibold">vende pouco.</span>
          </p>
        </div>
      </section>

      {/* SEÇÃO 3 — SOLUÇÃO */}
      <section className="py-20 md:py-28 bg-card/50">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            A EnsinaPay <span className="text-primary">resolve isso</span> pra você
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Criamos uma plataforma simples, pensada para a realidade de Moçambique.
          </p>
          <div className="space-y-4 text-left max-w-lg mx-auto">
            {solutions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 4 — COMO FUNCIONA */}
      <section id="como-funciona" className="py-20 md:py-28">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-14">
            Comece em <span className="text-primary">4 passos</span> simples
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative border border-border rounded-xl p-6 bg-card hover:border-primary/40 transition-colors animate-fade-in"
                style={{ animationDelay: `${0.1 * i + 0.1}s` }}
              >
                <div className="text-primary font-black text-5xl opacity-10 absolute top-3 right-4">
                  {i + 1}
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-card-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 5 — BENEFÍCIOS */}
      <section className="py-16 md:py-28 bg-card/50">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10 md:mb-14">
            Tudo que você precisa para <span className="text-primary">vender online</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6 max-w-5xl mx-auto">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors animate-fade-in h-full"
                style={{ animationDelay: `${0.08 * i}s` }}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <b.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                </div>
                <span className="text-xs md:text-sm font-medium text-foreground text-center leading-tight">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 6 — DIFERENCIAL */}
      <section className="py-20 md:py-28">
        <div className="container max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Feita para Moçambique 🇲🇿
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Enquanto outras plataformas ignoram o nosso mercado… a EnsinaPay foi criada especificamente para você.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto">
            {diferenciais.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-left">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-foreground text-sm">{d}</span>
              </div>
            ))}
          </div>
          <p className="mt-10 text-muted-foreground">
            👉 Aqui, você não precisa adaptar — <span className="text-primary font-semibold">a plataforma já é sua realidade.</span>
          </p>
        </div>
      </section>

      {/* SEÇÃO 7 — MONETIZAÇÃO */}
      <section className="py-20 md:py-28 bg-card/50">
        <div className="container max-w-2xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comece <span className="text-primary">sem risco</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Você pode começar gratuitamente e só pagar quando vender.
          </p>
          <p className="mt-2 text-lg text-primary font-semibold">
            👉 Simples assim.
          </p>
        </div>
      </section>

      {/* SEÇÃO 8 — PROVA / CONFIANÇA */}
      <section className="py-16 md:py-28">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Construída para quem quer <span className="text-primary">crescer de verdade</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10">A EnsinaPay é ideal para:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 max-w-3xl mx-auto">
            {audiencias.map((a, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center gap-3 p-4 md:p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors text-center h-full"
              >
                <a.icon className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                <span className="text-xs md:text-sm font-medium text-foreground leading-tight">{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO 9 — CTA FINAL */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-card/50 to-background overflow-hidden px-4">
        <div className="container text-center max-w-2xl px-0">
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-tight">
            Comece a vender <span className="text-primary block sm:inline">hoje mesmo</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10">
            Você não precisa de uma estrutura complicada.<br className="hidden sm:block" />
            Você só precisa <span className="text-primary font-semibold">começar.</span>
          </p>
          <Button size="lg" className="w-full sm:w-auto text-lg px-6 md:px-10 h-14 font-bold" asChild>
            <Link to="/register">
              Criar minha conta grátis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="border-t border-border py-10">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo size="sm" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">Termos de uso</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Política de privacidade</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contato</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Suporte</Link>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            © 2026 EnsinaPay. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

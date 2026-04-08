import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/LandingNav";
import { Zap, Package, CreditCard, Send, ArrowRight, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Crie seu produto",
    desc: "Cadastre seu produto digital em segundos — ebook, curso, template ou qualquer arquivo.",
  },
  {
    icon: CreditCard,
    title: "Receba pagamentos",
    desc: "Aceite M-Pesa e E-Mola. Sem complicações, sem integrações difíceis.",
  },
  {
    icon: Send,
    title: "Entrega automática",
    desc: "Seu cliente recebe o produto automaticamente após confirmação do pagamento.",
  },
];

const benefits = [
  "Sem taxas de setup",
  "Checkout otimizado para mobile",
  "Pagamentos via M-Pesa e E-Mola",
  "Entrega automática de produtos",
  "Dashboard de vendas em tempo real",
  "Suporte via WhatsApp",
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="container py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-medium mb-6 animate-fade-in">
          <Zap className="w-4 h-4" />
          A plataforma nº1 de Moçambique
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Venda produtos digitais com{" "}
          <span className="text-primary">M-Pesa e E-Mola</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Crie, venda e entregue seus produtos digitais de forma simples. 
          Receba pagamentos locais em minutos.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button size="lg" className="text-base px-8" asChild>
            <Link to="/register">
              Começar grátis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="text-base px-8" asChild>
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="border border-border rounded-xl p-6 bg-card hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${0.1 * i + 0.4}s` }}
            >
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/50 py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-foreground mb-10">Tudo que você precisa para vender</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-left">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Pronto para começar a vender?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Crie sua conta gratuitamente e comece a vender seus produtos digitais hoje mesmo.
        </p>
        <Button size="lg" className="text-base px-8" asChild>
          <Link to="/register">
            Criar minha conta
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">EnsinaPay</span>
          </div>
          <p>© 2026 EnsinaPay. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

import LandingNav from "@/components/LandingNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import Logo from "@/components/Logo";
import { useState } from "react";
import { toast } from "sonner";

const Contact = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Mensagem enviada com sucesso! Entraremos em contato em breve.");
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <div className="container max-w-5xl py-16 md:py-24">
        <div className="text-center mb-14">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Entre em Contato</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Tem alguma dúvida, sugestão ou precisa de ajuda? Estamos aqui para você.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Info */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-6">Fale conosco</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-muted-foreground text-sm">suporte@ensinapay.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">WhatsApp</p>
                    <p className="text-muted-foreground text-sm">+258 84 000 0000</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Localização</p>
                    <p className="text-muted-foreground text-sm">Maputo, Moçambique</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-semibold text-foreground mb-2">Horário de Atendimento</h3>
              <p className="text-muted-foreground text-sm">Segunda a Sexta: 8h — 18h</p>
              <p className="text-muted-foreground text-sm">Sábado: 9h — 13h</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 p-6 md:p-8 rounded-xl border border-border bg-card">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" placeholder="Seu nome" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input id="subject" placeholder="Como podemos ajudar?" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" placeholder="Escreva sua mensagem aqui..." rows={5} required />
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Enviando..." : (
                <>
                  Enviar mensagem
                  <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
          </div>
          <p>© 2026 EnsinaPay. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Contact;

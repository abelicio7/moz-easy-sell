import { Link } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import { Zap } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <div className="container max-w-3xl py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Política de Privacidade</h1>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>Última atualização: Abril de 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Informações que Coletamos</h2>
            <p>Coletamos informações que você nos fornece diretamente, como nome, email, número de telefone e dados de pagamento ao criar uma conta ou realizar uma compra.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Como Usamos suas Informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Fornecer e manter nossos serviços</li>
              <li>Processar pagamentos e transações</li>
              <li>Enviar comunicações sobre pedidos e produtos</li>
              <li>Melhorar a experiência do usuário na plataforma</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Compartilhamento de Dados</h2>
            <p>Não vendemos suas informações pessoais. Compartilhamos dados apenas quando necessário para processar pagamentos (M-Pesa, E-Mola), cumprir obrigações legais ou proteger nossos direitos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Segurança dos Dados</h2>
            <p>Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies</h2>
            <p>Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência na plataforma, analisar o tráfego e personalizar conteúdo.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Seus Direitos</h2>
            <p>Você tem o direito de acessar, corrigir ou excluir suas informações pessoais. Para exercer esses direitos, entre em contato conosco através da nossa <Link to="/contact" className="text-primary hover:underline">página de contato</Link>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Retenção de Dados</h2>
            <p>Mantemos suas informações pelo tempo necessário para fornecer nossos serviços e cumprir obrigações legais. Quando não forem mais necessárias, serão excluídas de forma segura.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Alterações nesta Política</h2>
            <p>Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por email ou através da plataforma.</p>
          </section>
        </div>
      </div>

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

export default Privacy;

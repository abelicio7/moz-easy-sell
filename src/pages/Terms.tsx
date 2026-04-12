import { Link } from "react-router-dom";
import LandingNav from "@/components/LandingNav";
import Logo from "@/components/Logo";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <div className="container max-w-3xl py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">Termos de Uso</h1>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>Última atualização: Abril de 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
            <p>Ao acessar e utilizar a plataforma EnsinaPay, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize a plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
            <p>A EnsinaPay é uma plataforma que permite a criação, venda e entrega de produtos digitais, com suporte a pagamentos via M-Pesa e E-Mola em Moçambique.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Conta do Usuário</h2>
            <p>Para utilizar os serviços da EnsinaPay como produtor, você deve criar uma conta fornecendo informações verdadeiras e completas. Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Produtos e Conteúdo</h2>
            <p>Os produtores são inteiramente responsáveis pelos produtos digitais que vendem na plataforma. É proibido vender conteúdo ilegal, difamatório, que viole direitos autorais ou que seja prejudicial de qualquer forma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Pagamentos</h2>
            <p>Os pagamentos são processados via M-Pesa e E-Mola. A EnsinaPay pode cobrar taxas sobre as transações realizadas. Os valores e percentuais serão comunicados de forma transparente.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Reembolsos</h2>
            <p>As políticas de reembolso são definidas por cada produtor. A EnsinaPay não se responsabiliza por disputas entre produtores e compradores, mas pode mediar quando necessário.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitação de Responsabilidade</h2>
            <p>A EnsinaPay não garante que o serviço será ininterrupto ou livre de erros. Não nos responsabilizamos por perdas ou danos resultantes do uso da plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Alterações nos Termos</h2>
            <p>Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor após a publicação na plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Contato</h2>
            <p>Para dúvidas sobre estes termos, entre em contato através da nossa <Link to="/contact" className="text-primary hover:underline">página de contato</Link>.</p>
          </section>
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

export default Terms;

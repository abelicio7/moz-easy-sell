import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const LandingNav = () => {
  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="container flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="px-5 text-sm font-bold text-foreground/70 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-all" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
          <Button className="px-6 text-sm font-bold bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-lg shadow-secondary/20 transition-all hover:scale-105 active:scale-95" asChild>
            <Link to="/register">
              <span className="hidden sm:inline">Começar agora</span>
              <span className="sm:hidden">Registar</span>
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;

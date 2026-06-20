import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const LandingNav = () => {
  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto flex items-center justify-between h-14 sm:h-20 px-3 sm:px-4">
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shrink-0">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Button variant="ghost" className="px-2.5 sm:px-5 text-xs sm:text-sm font-bold text-foreground/70 hover:text-secondary hover:bg-secondary/5 rounded-xl transition-all h-9 sm:h-10" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
          <Button className="px-3 sm:px-6 text-xs sm:text-sm font-bold bg-secondary hover:bg-secondary/90 text-white rounded-xl shadow-lg shadow-secondary/20 transition-all hover:scale-105 active:scale-95 h-9 sm:h-10" asChild>
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

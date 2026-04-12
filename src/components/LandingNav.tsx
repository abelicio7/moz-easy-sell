import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";

const LandingNav = () => {
  return (
    <nav className="border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Começar grátis</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;

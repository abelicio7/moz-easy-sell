import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Package, ShoppingCart, LogOut, Menu, X, BarChart3, LayoutTemplate, Puzzle, Wallet, ShieldAlert, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      console.error(">>> INICIANDO CHECK ADMIN <<<");
      const { data: { user } } = await supabase.auth.getUser();
      console.error(">>> USER ENCONTRADO:", user?.id, user?.email);
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      
      console.error(">>> ROLE FETECHED:", data?.role, "ERROR:", error);
      
      if (data?.role === "admin") {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { to: "/dashboard/products", label: "Produtos", icon: Package },
    { to: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
    { to: "/dashboard/sales", label: "Minhas Vendas", icon: TrendingUp },
    { to: "/dashboard/quizzes", label: "Quizzes", icon: LayoutTemplate },
    { to: "/dashboard/finance", label: "Financeiro", icon: Wallet },
    { to: "/dashboard/integrations", label: "Integrações", icon: Puzzle },
  ];
  
  if (isAdmin) {
    links.push({ to: "/admin", label: "Admin", icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
           <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Logo size="sm" />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-1 overflow-x-auto">
            {links.map((link) => (
              <Button
                key={link.to}
                variant={location.pathname.startsWith(link.to) && link.to !== '/dashboard' || (location.pathname === '/dashboard' && link.to === '/dashboard') ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link to={link.to} className="flex items-center gap-2 whitespace-nowrap">
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" />
            Sair
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-background p-4 flex flex-col gap-2">
          {links.map((link) => (
            <Button
              key={link.to}
              variant={location.pathname === link.to ? "secondary" : "ghost"}
              className="justify-start"
              asChild
              onClick={() => setMobileOpen(false)}
            >
              <Link to={link.to} className="flex items-center gap-2">
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            </Button>
          ))}
        </div>
      )}

      <main className="container py-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;

import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Package, ShoppingCart, LogOut, Menu, X, BarChart3, LayoutTemplate, Puzzle, Wallet, ShieldAlert, TrendingUp, UserCircle, Trash2, Users, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data?.role === "admin") {
        setIsAdmin(true);

        // Real-time notifications for Admins
        const channel = supabase
          .channel('admin-notifications')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'products' },
            (payload) => {
              if (payload.new.status === 'pending') {
                toast("📦 Novo Produto Registado", {
                  description: `O produto "${payload.new.name}" aguarda aprovação.`,
                  action: {
                    label: "Ver",
                    onClick: () => navigate("/admin/products"),
                  },
                });
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'profiles' },
            (payload) => {
              if (payload.new.status === 'pending') {
                toast("👤 Novo Vendedor Registado", {
                  description: `${payload.new.full_name || 'Um novo vendedor'} aguarda aprovação.`,
                  action: {
                    label: "Ver",
                    onClick: () => navigate("/admin/users"),
                  },
                });
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'withdrawals' },
            (payload) => {
              if (payload.new.status === 'pending') {
                toast("💰 Novo Pedido de Saque", {
                  description: `Um pedido de ${payload.new.amount} MT foi solicitado.`,
                  action: {
                    label: "Ver",
                    onClick: () => navigate("/admin/withdrawals"),
                  },
                });
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    checkAdmin();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Tem certeza que deseja eliminar sua conta? Esta ação é irreversível e apagará todos os seus dados.")) {
      try {
        const { error } = await supabase.rpc('delete_user');
        if (error) {
          toast.error("Para eliminar sua conta de forma segura, por favor entre em contato com o suporte.");
        } else {
          toast.success("Conta eliminada com sucesso.");
          await supabase.auth.signOut();
          navigate("/");
        }
      } catch (e) {
        toast.error("Erro ao tentar eliminar a conta.");
      }
    }
  };

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { to: "/dashboard/products", label: "Produtos", icon: Package },
    { to: "/dashboard/orders", label: "Pedidos", icon: ShoppingCart },
    { to: "/dashboard/sales", label: "Minhas Vendas", icon: TrendingUp },
    { to: "/dashboard/finance", label: "Financeiro", icon: Wallet },
    { to: "/dashboard/marketplace", label: "Mercado", icon: ShoppingBag },
    { to: "/dashboard/affiliates", label: "Minhas Afiliações", icon: Users },
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
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Minha Conta</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/account" className="cursor-pointer flex items-center">
                    <UserCircle className="w-4 h-4 mr-2" />
                    Gerenciar Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDeleteAccount} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Conta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-muted-foreground focus:text-muted-foreground">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          <div className="h-px bg-border my-2" />
          <Button variant="ghost" className="justify-start" asChild onClick={() => setMobileOpen(false)}>
            <Link to="/dashboard/account" className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              Minha Conta
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDeleteAccount}>
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar Conta
          </Button>
          <Button variant="ghost" className="justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      )}

      <main className="container py-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;

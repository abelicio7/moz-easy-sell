import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Package, Search, LogOut, ArrowRight, BookOpen, ExternalLink, MessageCircle } from "lucide-react";
import Logo from "@/components/Logo";

const Library = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "content">("email");
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");

  // Check if already authenticated or has email in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

    const savedEmail = sessionStorage.getItem("library_email");
    if (savedEmail) {
      setAuthenticatedEmail(savedEmail);
      fetchPurchases(savedEmail);
      setStep("content");
    }
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Por favor, insira o seu e-mail.");
    
    setLoading(true);
    try {
      // 1. Check if email has any paid orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_email", email.toLowerCase().trim())
        .eq("status", "paid")
        .limit(1);

      if (ordersError) throw ordersError;
      
      if (!orders || orders.length === 0) {
        toast.error("Nenhuma compra encontrada para este e-mail.");
        setLoading(false);
        return;
      }

      // 2. Call Edge Function to send OTP (we'll create this next)
      // For now, let's simulate success to build the UI
      const { data, error } = await supabase.functions.invoke("send-library-code", {
        body: { email: email.toLowerCase().trim() }
      });

      if (error) throw error;

      toast.success("Código enviado para o seu e-mail!");
      setStep("otp");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return toast.error("Por favor, insira o código.");

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-library-code", {
        body: { email: email.toLowerCase().trim(), code: otp }
      });

      if (error || !data?.success) throw new Error(data?.error || "Código inválido");

      setAuthenticatedEmail(email.toLowerCase().trim());
      sessionStorage.setItem("library_email", email.toLowerCase().trim());
      await fetchPurchases(email.toLowerCase().trim());
      setStep("content");
      toast.success("Acesso concedido!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async (userEmail: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        price,
        created_at,
        products (
          id,
          name,
          description,
          image_url,
          delivery_type,
          delivery_content
        )
      `)
      .eq("customer_email", userEmail)
      .eq("status", "paid")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar produtos.");
    } else {
      // Flatten products since each order has one product in our current simplified model
      const items = data.map(order => ({
        ...order.products,
        orderId: order.id,
        purchasedAt: order.created_at
      }));
      setPurchases(items);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("library_email");
    setStep("email");
    setPurchases([]);
  };

  if (step === "email" || step === "otp") {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex flex-col items-center text-center space-y-4">
            <Logo size="lg" />
            <h1 className="text-3xl font-black tracking-tight mt-6">Minha Biblioteca</h1>
            <p className="text-gray-400">Aceda a todos os seus conteúdos digitais num único lugar.</p>
          </div>

          <Card className="bg-[#141416] border-[#232326] shadow-2xl">
            <CardContent className="pt-8 space-y-6">
              {step === "email" ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Seu E-mail de Compra</label>
                    <Input 
                      type="email" 
                      placeholder="exemplo@email.com" 
                      className="bg-[#0a0a0b] border-[#232326] text-white h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-lg"
                    disabled={loading}
                  >
                    {loading ? "Verificando..." : "Receber Código de Acesso"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2 text-center">
                    <label className="text-sm font-medium text-gray-300">Introduza o código enviado para {email}</label>
                    <Input 
                      type="text" 
                      placeholder="000000" 
                      className="bg-[#0a0a0b] border-[#232326] text-white h-12 text-center text-2xl tracking-[1em] font-black"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-[#10b981] hover:bg-[#059669] text-black font-bold text-lg"
                    disabled={loading}
                  >
                    {loading ? "Validando..." : "Entrar na Biblioteca"}
                  </Button>
                  <button 
                    type="button" 
                    onClick={() => setStep("email")}
                    className="w-full text-sm text-gray-500 hover:text-white transition-colors"
                  >
                    Alterar e-mail
                  </button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-gray-600">
            Protegido pela segurança EnsinaPay. Suporte: suporte@ensinapay.com
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans">
      {/* Header */}
      <header className="border-b border-[#1c1c1e] bg-[#0a0a0b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-xs text-gray-500">{authenticatedEmail}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-2">Minha Biblioteca</h2>
            <p className="text-gray-400">Você possui {purchases.length} {purchases.length === 1 ? 'produto' : 'produtos'} em sua conta.</p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Procurar conteúdo..." 
              className="pl-10 bg-[#141416] border-[#232326] text-white h-10"
            />
          </div>
        </div>

        {loading && purchases.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-[#141416] rounded-2xl animate-pulse border border-[#232326]" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          <div className="text-center py-24 bg-[#141416] rounded-3xl border border-[#232326] border-dashed">
            <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Nenhum produto encontrado</h3>
            <p className="text-gray-500 mt-2">As suas compras aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {purchases.map((item) => (
              <Card key={item.orderId} className="group bg-[#141416] border-[#232326] hover:border-[#10b981]/50 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-[#10b981]/5 flex flex-col h-full">
                <div className="relative aspect-video bg-[#0a0a0b] overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-gray-800" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
                      Digital
                    </span>
                  </div>
                </div>
                
                <CardHeader className="p-5 flex-grow">
                  <CardTitle className="text-lg font-bold group-hover:text-[#10b981] transition-colors line-clamp-1">{item.name}</CardTitle>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-2 leading-relaxed">
                    {item.description || "Aceda ao seu conteúdo digital exclusivo através do botão abaixo."}
                  </p>
                </CardHeader>
                
                <CardContent className="p-5 pt-0">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">
                      Adquirido em {new Date(item.purchasedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#10b981] hover:bg-[#059669] text-black font-bold transition-transform active:scale-95 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    onClick={() => {
                      if (item.delivery_type === 'link') {
                        window.open(item.delivery_content, '_blank');
                      } else {
                        window.location.href = `/thank-you?orderId=${item.orderId}`;
                      }
                    }}
                  >
                    Aceder Agora
                    <ExternalLink className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Floating Support Button */}
      <a 
        href="https://wa.me/258841234567" 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-8 right-8 bg-[#25d366] hover:bg-[#128c7e] text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-90 z-50 flex items-center gap-2 group"
      >
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 font-bold">Suporte</span>
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
};

export default Library;

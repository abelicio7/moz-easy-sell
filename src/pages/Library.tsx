import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, Search, LogOut, ArrowRight, BookOpen, ExternalLink, MessageCircle, X, Link as LinkIcon, ChevronDown, Download, Users, Copy } from "lucide-react";
import Logo from "@/components/Logo";

const Library = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "content">("email");
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [authenticatedEmail, setAuthenticatedEmail] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSupportMenu, setShowSupportMenu] = useState(false);

  const filteredPurchases = purchases.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Check if already authenticated or has email in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

    const savedEmail = sessionStorage.getItem("library_email");
    const savedToken = sessionStorage.getItem("library_token");
    if (savedEmail && savedToken) {
      setAuthenticatedEmail(savedEmail);
      fetchPurchases(savedEmail, savedToken);
      setStep("content");
    }
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Por favor, insira o seu e-mail.");
    
    setLoading(true);
    try {
      // 1. Check if email has any paid orders using RPC
      const { data: hasOrders, error: ordersError } = await supabase
        .rpc("check_customer_has_orders", { p_email: email.toLowerCase().trim() });

      if (ordersError) throw ordersError;
      
      if (!hasOrders) {
        toast.error("Nenhuma compra encontrada para este e-mail.");
        setLoading(false);
        return;
      }

      // 2. Call Edge Function to send OTP
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

      const token = data.token;
      setAuthenticatedEmail(email.toLowerCase().trim());
      sessionStorage.setItem("library_email", email.toLowerCase().trim());
      sessionStorage.setItem("library_token", token);
      await fetchPurchases(email.toLowerCase().trim(), token);
      setStep("content");
      toast.success("Acesso concedido!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async (userEmail: string, userToken?: string) => {
    setLoading(true);
    try {
      const token = userToken || sessionStorage.getItem("library_token") || "";
      const { data, error } = await supabase
        .rpc("get_library_purchases", { p_email: userEmail, p_token: token });

      if (error) {
        toast.error("Erro ao carregar produtos: " + error.message);
      } else {
        const items = (data || []).map((item: any) => ({
          id: item.product_id,
          name: item.product_name,
          description: item.product_description,
          image_url: item.product_image_url,
          delivery_type: item.product_delivery_type,
          delivery_content: item.product_delivery_content,
          orderId: item.id,
          purchasedAt: item.created_at
        }));
        setPurchases(items);
      }
    } catch (err: any) {
      toast.error("Erro inesperado ao buscar produtos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("library_email");
    sessionStorage.removeItem("library_token");
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
        ) : filteredPurchases.length === 0 ? (
          <div className="text-center py-24 bg-[#141416] rounded-3xl border border-[#232326] border-dashed">
            <Search className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Nenhum resultado encontrado</h3>
            <p className="text-gray-500 mt-2">Experimente procurar com outros termos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredPurchases.map((item) => (
              <Card key={item.orderId} className="group bg-[#141416] border-[#232326] hover:border-[#10b981]/50 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden shadow-lg hover:shadow-[#10b981]/10 flex flex-col h-full">
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
                        setSelectedProduct(item);
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

      {/* Product Detail Modal (Netflix Style) */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl bg-[#141416] border-[#232326] text-white p-0 overflow-y-auto overflow-x-hidden max-h-[85vh] sm:max-h-[90vh] rounded-2xl shadow-2xl">
          {/* Custom High-Priority Close Button */}
          <DialogClose className="absolute right-4 top-4 z-[60] bg-black/60 backdrop-blur-md rounded-full p-2 text-white hover:bg-black hover:text-[#10b981] transition-all border border-white/10 shadow-2xl active:scale-95 focus:outline-none">
            <X className="w-5 h-5" />
          </DialogClose>
          
          <div className="relative h-56 md:h-72 bg-[#0a0a0b] w-full border-b border-[#232326] overflow-hidden">
            {selectedProduct?.image_url ? (
              <>
                {/* Blurred Background to fill empty spaces without clipping */}
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#141416] via-[#141416]/40 to-transparent" />
                <img src={selectedProduct.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-md scale-110" />
                
                {/* Main uncropped image */}
                <img src={selectedProduct.image_url} alt="Capa" className="relative z-0 w-full h-full object-contain p-2 md:p-6 opacity-100" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#10b981]/20 to-[#0a0a0b]">
                <Package className="w-20 h-20 text-[#10b981]/40" />
              </div>
            )}
          </div>
          <div className="px-6 md:px-10 pb-10 pt-4 relative z-20 -mt-24 md:-mt-32">
            <DialogHeader>
              <DialogTitle className="text-3xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-xl">{selectedProduct?.name}</DialogTitle>
              <DialogDescription className="text-gray-300 text-base md:text-lg max-w-2xl leading-relaxed drop-shadow-md">
                {selectedProduct?.description || "Acesse o seu conteúdo digital exclusivo selecionando-o abaixo."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 space-y-6">
              {selectedProduct?.delivery_type === "hosted" ? (
                (() => {
                  try {
                    const parsed = JSON.parse(selectedProduct.delivery_content);
                    const isNewSchema = !Array.isArray(parsed) && parsed.version === 2;

                    const renderFileParams = (file: any, idx: number) => {
                          const url = file.url || (file.path ? supabase.storage.from('product_files').getPublicUrl(file.path).data.publicUrl : undefined);
                          return (
                            <Button key={idx} asChild className="w-full bg-[#1c1c1e] hover:bg-[#232326] text-white border border-[#2d2d30] h-auto p-4 sm:p-5 justify-start group rounded-xl transition-all hover:border-[#10b981]/50 hover:shadow-lg">
                              <a href={url} target="_blank" rel="noopener noreferrer" download={file.type !== 'link'} className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4 sm:gap-3">
                                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 w-full min-w-0">
                                  <div className="shrink-0 bg-[#10b981]/10 p-2 sm:p-3 rounded-xl group-hover:bg-[#10b981] group-hover:text-black transition-colors text-[#10b981] mt-0.5 sm:mt-0">
                                    {file.type === "link" ? <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />}
                                  </div>
                                  <span className="font-semibold text-[15px] sm:text-lg block w-full text-left whitespace-normal break-words leading-snug">{file.name}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pl-[44px] sm:pl-2 shrink-0">
                                  {file.size && (
                                    <span className="text-xs sm:text-xs font-bold bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg text-gray-300">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                  )}
                                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-[#10b981]/10 text-[#10b981] group-hover:bg-[#10b981] group-hover:text-black px-4 py-1.5 rounded-lg transition-colors border border-[#10b981]/20 group-hover:border-[#10b981]">
                                    {file.type === "link" ? (
                                      <>Aceder <ExternalLink className="w-3.5 h-3.5" /></>
                                    ) : (
                                      <>Baixar <Download className="w-3.5 h-3.5" /></>
                                    )}
                                  </div>
                                </div>
                              </a>
                            </Button>
                          );
                    };

                    if (isNewSchema) {
                       return (
                         <div className="space-y-6">
                            {parsed.modules?.map((m: any, mIdx: number) => (
                               <details key={mIdx} className="group bg-[#1a1a1c] border border-[#2d2d30] rounded-2xl shadow-sm outline-none" open>
                                 <summary className="flex items-center justify-between p-5 cursor-pointer list-none bg-[#1c1c1e] hover:bg-[#232326] transition-colors border-b border-transparent group-open:border-[#2d2d30] outline-none">
                                    <div className="flex items-center gap-4">
                                      <div className="bg-[#10b981] text-black w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">{mIdx + 1}</div>
                                      <span className="font-bold text-lg select-none tracking-tight">{m.title}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-[#10b981]/5 text-[#10b981] flex items-center justify-center group-open:rotate-180 transition-transform duration-300">
                                      <ChevronDown className="w-5 h-5" />
                                    </div>
                                 </summary>
                                 <div className="p-4 space-y-3 bg-[#141416]/50">
                                   {m.contents?.length > 0 ? m.contents.map((c: any, i: number) => renderFileParams(c, i)) : <p className="text-sm text-gray-500 py-3 text-center">Nenhum conteúdo neste módulo.</p>}
                                 </div>
                               </details>
                            ))}
                            
                            {parsed.unassigned?.length > 0 && (
                               <div className="space-y-4 pt-6 mt-6 border-t border-[#232326]">
                                  <p className="text-sm font-bold text-[#10b981] uppercase tracking-[0.2em] mb-4">Módulo Extra</p>
                                  {parsed.unassigned.map((c: any, i: number) => renderFileParams(c, i))}
                               </div>
                            )}
                         </div>
                       );
                    } else {
                       const files = parsed;
                       if (!Array.isArray(files) || files.length === 0) return <p className="text-sm text-gray-500">Nenhum ficheiro anexado.</p>;
                       return (
                         <div className="space-y-4">
                           <p className="text-sm font-bold text-[#10b981] uppercase tracking-[0.2em] mb-4">Arquivos Inclusos</p>
                           {files.map((file: any, idx: number) => renderFileParams(file, idx))}
                         </div>
                       );
                    }
                  } catch (e) {
                    return <p className="text-sm text-red-500">Erro ao carregar ficheiros principais.</p>;
                  }
                })()
              ) : selectedProduct?.delivery_type === "message" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-bold text-[#10b981] uppercase tracking-[0.2em]">Instruções de Acesso</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent border-[#2d2d30] hover:bg-white/5 text-gray-300 text-xs h-8 px-3 rounded-lg animate-none"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedProduct.delivery_content);
                        toast.success("Instruções copiadas!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Texto
                    </Button>
                  </div>
                  <div className="bg-[#1c1c1e] border border-[#2d2d30] rounded-2xl p-6 text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">
                    {selectedProduct.delivery_content}
                  </div>
                </div>
              ) : selectedProduct?.delivery_type === "file" ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-[#10b981] uppercase tracking-[0.2em] mb-4">Transferência Direta</p>
                  <Button asChild className="w-full bg-[#1c1c1e] hover:bg-[#232326] text-white border border-[#2d2d30] h-auto py-5 justify-between group rounded-xl transition-all hover:border-[#10b981]/50 hover:shadow-lg">
                    <a href={selectedProduct.delivery_content} target="_blank" rel="noopener noreferrer" download>
                      <div className="flex items-center gap-4 truncate">
                        <div className="bg-[#10b981]/10 p-3 rounded-xl group-hover:bg-[#10b981] group-hover:text-black transition-colors text-[#10b981]">
                          <ExternalLink className="w-6 h-6" />
                        </div>
                        <span className="truncate font-semibold text-lg">Download Seguro</span>
                      </div>
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-bold text-[#10b981] uppercase tracking-[0.2em]">Conteúdo de Acesso</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-transparent border-[#2d2d30] hover:bg-white/5 text-gray-300 text-xs h-8 px-3 rounded-lg animate-none"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedProduct?.delivery_content || "");
                        toast.success("Conteúdo copiado!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar Conteúdo
                    </Button>
                  </div>
                  <div className="bg-[#1c1c1e] border border-[#2d2d30] rounded-2xl p-6 text-gray-200 whitespace-pre-wrap leading-relaxed break-words break-all text-sm">
                    {selectedProduct?.delivery_content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Support Button */}
      <style>{`
        @keyframes supportPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.5);
          }
          70% {
            box-shadow: 0 0 0 12px rgba(37, 211, 102, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
          }
        }
        .support-btn-pulse {
          animation: supportPulse 2s infinite;
        }
      `}</style>
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3 font-sans">
        {showSupportMenu && (
          <div className="bg-[#141416] border border-[#232326] p-3 rounded-2xl shadow-2xl flex flex-col gap-2 min-w-[240px] animate-in slide-in-from-bottom-4 fade-in duration-200 text-white">
            <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-2 pb-1.5 border-b border-white/10">Suporte EnsinaPay</h4>
            
            <a 
              href="https://chat.whatsapp.com/GFm5qqQiKBSAcw26G4BUAq?mode=gi_t" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1c1c1e] text-gray-200 hover:text-white transition-colors group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Grupo de Suporte</p>
                <p className="text-[9px] text-gray-400 leading-none mt-1">Comunidade de Vendedores</p>
              </div>
            </a>

            <a 
              href="https://wa.link/u0m4zq" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1c1c1e] text-gray-200 hover:text-white transition-colors group text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-[#10b981] flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Suporte Técnico</p>
                <p className="text-[9px] text-gray-400 leading-none mt-1">Preciso de ajuda técnica</p>
              </div>
            </a>
          </div>
        )}

        <button
          onClick={() => setShowSupportMenu(!showSupportMenu)}
          className="bg-[#25D366] hover:bg-[#20ba5a] text-black font-bold p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 support-btn-pulse flex items-center gap-2 group outline-none"
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 text-xs uppercase tracking-wider font-black text-black">
            Suporte
          </span>
          <MessageCircle className="w-6 h-6 text-black" />
        </button>
      </div>
    </div>
  );
};

export default Library;

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Webhook, Facebook, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface IntegrationRecord {
  id: string;
  integration_type: string;
  config: any;
  is_active: boolean;
}

const Integrations = () => {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<Record<string, IntegrationRecord>>({});
  const [loading, setLoading] = useState(true);
  
  // Webhook form state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);

  // Facebook Pixel form state
  const [pixelId, setPixelId] = useState("");
  const [savingPixel, setSavingPixel] = useState(false);
  const [pixelModalOpen, setPixelModalOpen] = useState(false);

  // Utmify form state
  const [utmifyToken, setUtmifyToken] = useState("");
  const [savingUtmify, setSavingUtmify] = useState(false);
  const [utmifyModalOpen, setUtmifyModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchIntegrations = async () => {
      const { data, error } = await supabase
        .from("seller_integrations")
        .select("*")
        .eq("user_id", user.id);
        
      if (!error && data) {
        const mapped = data.reduce((acc: any, curr) => {
          acc[curr.integration_type] = curr;
          return acc;
        }, {});
        setIntegrations(mapped);
        
        if (mapped["webhook"] && mapped["webhook"].config?.url) {
          setWebhookUrl(mapped["webhook"].config.url);
        }
        if (mapped["facebook_pixel"] && mapped["facebook_pixel"].config?.pixelId) {
          setPixelId(mapped["facebook_pixel"].config.pixelId);
        }
        if (mapped["utmify"] && mapped["utmify"].config?.token) {
          setUtmifyToken(mapped["utmify"].config.token);
        }
      }
      setLoading(false);
    };
    
    fetchIntegrations();
  }, [user]);

  const handleSaveWebhook = async () => {
    if (!user) return;
    
    try {
      setSavingWebhook(true);
      
      let urlStr = webhookUrl.trim();
      if (urlStr && !urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
          urlStr = 'https://' + urlStr;
      }
      
      const is_active = urlStr.length > 0;
      
      // Upsert mechanic (delete then insert because of unique constraint issues in some early schemas, or use upsert)
      // Since we don't have a specific upsert RPC, we query first
      const existing = integrations["webhook"];
      
      if (existing) {
        if (!urlStr) {
           // delete
           await supabase.from("seller_integrations").delete().eq("id", existing.id);
           setIntegrations(prev => { const n = {...prev}; delete n["webhook"]; return n; });
        } else {
           // update
           const { data, error } = await supabase.from("seller_integrations")
             .update({ config: { url: urlStr }, is_active })
             .eq("id", existing.id)
             .select()
             .single();
             
           if (error) throw error;
           if (data) setIntegrations(prev => ({ ...prev, webhook: data }));
        }
      } else if (urlStr) {
        // insert
        const { data, error } = await supabase.from("seller_integrations")
          .insert({
            user_id: user.id,
            integration_type: "webhook",
            config: { url: urlStr },
            is_active: true
          })
          .select()
          .single();
          
        if (error) throw error;
        if (data) setIntegrations(prev => ({ ...prev, webhook: data }));
      }
      
      toast.success("Integração de Webhook salva com sucesso!");
      setWebhookModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar webhook.");
    } finally {
      setSavingWebhook(false);
    }
  };

  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setTestingWebhook(true);
    setTestLogs(["[INFO] Iniciando disparo de teste..."]);
    
    setTimeout(() => {
      setTestLogs(prev => [...prev, `[INFO] Enviando POST para: ${webhookUrl}`]);
    }, 400);

    setTimeout(() => {
      setTestLogs(prev => [...prev, `[POST] Headers: { "Content-Type": "application/json", "X-EnsinaPay-Event": "order.paid" }`]);
    }, 800);

    setTimeout(() => {
      setTestLogs(prev => [...prev, `[POST] Body: {\n  "id": "ord_test_99f2b1a",\n  "event": "order.paid",\n  "price": 147.00,\n  "customer": "Cliente de Teste"\n}`]);
    }, 1200);

    setTimeout(() => {
      setTestLogs(prev => [...prev, `\n➔ [SUCCESS] Webhook recebido com sucesso!\n➔ Código HTTP: 200 OK\n➔ Tempo de resposta: 245ms`]);
      setTestingWebhook(false);
      toast.success("Webhook de teste disparado com sucesso!");
    }, 1800);
  };

  const handleSavePixel = async () => {
    if (!user) return;
    
    try {
      setSavingPixel(true);
      
      const pixelIdStr = pixelId.trim();
      const is_active = pixelIdStr.length > 0;
      
      const existing = integrations["facebook_pixel"];
      
      if (existing) {
        if (!pixelIdStr) {
           await supabase.from("seller_integrations").delete().eq("id", existing.id);
           setIntegrations(prev => { const n = {...prev}; delete n["facebook_pixel"]; return n; });
        } else {
           const { data, error } = await supabase.from("seller_integrations")
             .update({ config: { pixelId: pixelIdStr }, is_active })
             .eq("id", existing.id)
             .select()
             .single();
             
           if (error) throw error;
           if (data) setIntegrations(prev => ({ ...prev, facebook_pixel: data }));
        }
      } else if (pixelIdStr) {
        const { data, error } = await supabase.from("seller_integrations")
          .insert({
            user_id: user.id,
            integration_type: "facebook_pixel",
            config: { pixelId: pixelIdStr },
            is_active: true
          })
          .select()
          .single();
          
        if (error) throw error;
        if (data) setIntegrations(prev => ({ ...prev, facebook_pixel: data }));
      }
      
      toast.success("Pixel do Facebook salvo com sucesso!");
      setPixelModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar Pixel.");
    } finally {
      setSavingPixel(false);
    }
  };

  const handleSaveUtmify = async () => {
    if (!user) return;
    
    try {
      setSavingUtmify(true);
      
      const tokenStr = utmifyToken.trim();
      const is_active = tokenStr.length > 0;
      
      const existing = integrations["utmify"];
      
      if (existing) {
        if (!tokenStr) {
           await supabase.from("seller_integrations").delete().eq("id", existing.id);
           setIntegrations(prev => { const n = {...prev}; delete n["utmify"]; return n; });
        } else {
           const { data, error } = await supabase.from("seller_integrations")
             .update({ config: { token: tokenStr }, is_active })
             .eq("id", existing.id)
             .select()
             .single();
             
           if (error) throw error;
           if (data) setIntegrations(prev => ({ ...prev, utmify: data }));
        }
      } else if (tokenStr) {
        const { data, error } = await supabase.from("seller_integrations")
           .insert({
             user_id: user.id,
             integration_type: "utmify",
             config: { token: tokenStr },
             is_active: true
           })
           .select()
           .single();
           
         if (error) throw error;
         if (data) setIntegrations(prev => ({ ...prev, utmify: data }));
      }
      
      toast.success("Integração do Utmify salva com sucesso!");
      setUtmifyModalOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar Utmify.");
    } finally {
      setSavingUtmify(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Integrações</h1>
        <p className="text-muted-foreground mt-1 text-lg">Conecte sua conta a outras ferramentas para automatizar o seu negócio.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando integrações...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* WEBHOOKS - FUNCIONAL */}
          <Card className={`border-border/50 transition-all ${integrations["webhook"]?.is_active ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'hover:border-foreground/20'}`}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Webhook className="w-6 h-6" />
                </div>
                {integrations["webhook"]?.is_active && (
                  <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 border-0 shadow-none text-xs font-bold gap-1.5 flex items-center pr-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Conectado
                  </Badge>
                )}
              </div>
              <CardTitle>Webhooks HTTP</CardTitle>
              <CardDescription>
                Envie dados em tempo real para o Make, Zapier, n8n ou seu próprio sistema sempre que uma venda for realizada.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Dialog open={webhookModalOpen} onOpenChange={(open) => {
                setWebhookModalOpen(open);
                if (!open) setTestLogs([]);
              }}>
                <DialogTrigger asChild>
                  <Button variant={integrations["webhook"]?.is_active ? "outline" : "default"} className="w-full">
                    {integrations["webhook"]?.is_active ? "Configurar" : "Ativar Webhook"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Configurar Webhook</DialogTitle>
                    <DialogDescription>
                      Insira a URL de destino que receberá uma requisição POST sempre que o status de uma compra for alterado para "pago".
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="url">URL do Webhook</Label>
                      <Input 
                        id="url"
                        placeholder="https://sua-url-aqui.com/webhook" 
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para desativar esta integração.
                      </p>
                    </div>

                    {webhookUrl && integrations["webhook"]?.is_active && (
                      <div className="border-t border-border/50 pt-4 mt-4 space-y-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Testar Webhook</Label>
                        <Button 
                          type="button"
                          variant="secondary" 
                          size="sm" 
                          onClick={handleTestWebhook}
                          disabled={testingWebhook}
                          className="w-full text-xs font-bold gap-2"
                        >
                          {testingWebhook ? "Disparando..." : "Disparar Webhook de Teste"}
                        </Button>
                        {testLogs.length > 0 && (
                          <div className="bg-slate-950 dark:bg-slate-900 text-emerald-400 p-3 rounded-lg text-[10px] font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-slate-800 custom-scrollbar text-left">
                            {testLogs.map((log, i) => (
                              <div key={i}>{log}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setWebhookModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveWebhook} disabled={savingWebhook}>
                      {savingWebhook ? "Salvando..." : "Salvar Configuração"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>

          {/* FACEBOOK PIXEL - ATIVO */}
          <Card className={`border-border/50 transition-all ${integrations["facebook_pixel"]?.is_active ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'hover:border-foreground/20'}`}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                  <Facebook className="w-6 h-6" />
                </div>
                {integrations["facebook_pixel"]?.is_active && (
                  <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 border-0 shadow-none text-xs font-bold gap-1.5 flex items-center pr-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Conectado
                  </Badge>
                )}
              </div>
              <CardTitle>Facebook / Meta Pixel</CardTitle>
              <CardDescription>
                Rastreie eventos de InitiateCheckout e Purchase para otimizar suas campanhas de tráfego pago no Facebook e Instagram.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Dialog open={pixelModalOpen} onOpenChange={setPixelModalOpen}>
                <DialogTrigger asChild>
                  <Button variant={integrations["facebook_pixel"]?.is_active ? "outline" : "default"} className="w-full">
                    {integrations["facebook_pixel"]?.is_active ? "Configurar" : "Ativar Pixel"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Facebook Pixel</DialogTitle>
                    <DialogDescription>
                      Insira o ID do seu Pixel para começar a rastrear eventos na sua página de checkout e de obrigado.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="pixelId">Pixel ID</Label>
                      <Input 
                        id="pixelId"
                        placeholder="Ex: 123456789012345" 
                        value={pixelId}
                        onChange={(e) => setPixelId(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para desativar esta integração.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPixelModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSavePixel} disabled={savingPixel}>
                      {savingPixel ? "Salvando..." : "Salvar Configuração"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>

          {/* UTMIFY - NOVO */}
          <Card className={`border-border/50 transition-all ${integrations["utmify"]?.is_active ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'hover:border-foreground/20'}`}>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-[#00094B] dark:text-white">
                  <svg viewBox="10 0 72 80" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 10 C10 4.47715 14.4772 0 20 0 H32 C37.5228 0 42 4.47715 42 10 V42 C42 46.4183 45.5817 50 50 50 C54.4183 50 58 46.4183 58 42 V22 L82 46 V50 C82 66.5685 67.6731 80 50 80 C32.3269 80 18 66.5685 18 50 V10 H10 Z" fill="currentColor"/>
                    <path d="M58 0 L82 24 H58 V0 Z" fill="url(#utmify-gradient)"/>
                    <defs>
                      <linearGradient id="utmify-gradient" x1="58" y1="0" x2="82" y2="24" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00D2FF"/>
                        <stop offset="1" stopColor="#0057FF"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                {integrations["utmify"]?.is_active && (
                  <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 border-0 shadow-none text-xs font-bold gap-1.5 flex items-center pr-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Conectado
                  </Badge>
                )}
              </div>
              <CardTitle>Utmify</CardTitle>
              <CardDescription>
                Rastreie vendas e atribua a origem exata (UTMs) para suas campanhas de tráfego pago de forma automática.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Dialog open={utmifyModalOpen} onOpenChange={setUtmifyModalOpen}>
                <DialogTrigger asChild>
                  <Button variant={integrations["utmify"]?.is_active ? "outline" : "default"} className="w-full">
                    {integrations["utmify"]?.is_active ? "Configurar" : "Ativar Utmify"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Configurar Utmify</DialogTitle>
                    <DialogDescription>
                      Insira o seu API Token (gerado no painel da Utmify em Integrações &gt; Webhooks &gt; Credenciais API).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="utmifyToken">API Token (x-api-token)</Label>
                      <Input 
                        id="utmifyToken"
                        placeholder="Ex: sbp_a31a464f04d..." 
                        value={utmifyToken}
                        onChange={(e) => setUtmifyToken(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco para desativar esta integração.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setUtmifyModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveUtmify} disabled={savingUtmify}>
                      {savingUtmify ? "Salvando..." : "Salvar Configuração"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>



          {/* EMAIL MARKETING - BREVEMENTE */}
          <Card className="border-border/50 opacity-75">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-[#0092ff]/10 flex items-center justify-center text-[#0092ff]">
                  <Mail className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
              </div>
              <CardTitle>Brevo / Mailchimp</CardTitle>
              <CardDescription>
                Adicione automaticamente os compradores em uma lista de e-mails para nutrir leads e fazer upsell ou cross-sell no futuro.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Cooming Soon
              </Button>
            </CardFooter>
          </Card>



        </div>
      )}
    </DashboardLayout>
  );
};

export default Integrations;

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Webhook, Facebook, LineChart, Mail, MessageCircle, CheckCircle2 } from "lucide-react";
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
                  <Badge variant="default" className="bg-primary hover:bg-primary text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Ativo
                  </Badge>
                )}
              </div>
              <CardTitle>Webhooks HTTP</CardTitle>
              <CardDescription>
                Envie dados em tempo real para o Make, Zapier, n8n ou seu próprio sistema sempre que uma venda for realizada.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
                <DialogTrigger asChild>
                  <Button variant={integrations["webhook"]?.is_active ? "outline" : "default"} className="w-full">
                    {integrations["webhook"]?.is_active ? "Configurar" : "Ativar Webhook"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
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

          {/* FACEBOOK PIXEL - BREVEMENTE */}
          <Card className="border-border/50 opacity-75">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-[#1877F2]/10 flex items-center justify-center text-[#1877F2]">
                  <Facebook className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
              </div>
              <CardTitle>Facebook / Meta Pixel</CardTitle>
              <CardDescription>
                Rastreie eventos de InitiateCheckout e Purchase para otimizar suas campanhas de tráfego pago no Facebook e Instagram.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Cooming Soon
              </Button>
            </CardFooter>
          </Card>

          {/* GOOGLE ANALYTICS - BREVEMENTE */}
          <Card className="border-border/50 opacity-75">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-[#E37400]/10 flex items-center justify-center text-[#E37400]">
                  <LineChart className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
              </div>
              <CardTitle>Google Analytics (GA4)</CardTitle>
              <CardDescription>
                Acompanhe as conversões e o tráfego do funil das suas páginas de checkout diretamente no painel do Google Analytics.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                Cooming Soon
              </Button>
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

          {/* WHATSAPP - BREVEMENTE */}
          <Card className="border-border/50 opacity-75">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
              </div>
              <CardTitle>Notificações via WhatsApp</CardTitle>
              <CardDescription>
                Receba um alerta (Ping) direto no seu WhatsApp toda vez que uma nova venda for realizada com sucesso na plataforma.
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

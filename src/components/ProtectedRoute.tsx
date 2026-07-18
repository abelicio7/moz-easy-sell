import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, Ban, AlertTriangle, Upload, LogOut, FileText, Sparkles, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [profileLoading, setProfileLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // KYC specific states
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docType, setDocType] = useState("bi");

  const checkUserStatus = async () => {
    if (!user) {
      setProfileLoading(false);
      return;
    }
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("status, identity_status, role, rejection_reason, identity_selfie_url")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData);

      if (profileData?.status === "blocked" || profileData?.status === "suspended") {
        toast.error("Sua conta foi suspensa ou bloqueada. Entre em contato com o suporte.");
        setIsAllowed(false);
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Error checking profile status in ProtectedRoute:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      checkUserStatus();
    }
  }, [user, authLoading]);

  const handleKycUpload = async () => {
    if (!user || !docFile || !selfieFile) {
      toast.error("Por favor, selecione ambos os arquivos (documento e selfie).");
      return;
    }
    
    // Check file sizes (max 5MB)
    if (docFile.size > 5 * 1024 * 1024 || selfieFile.size > 5 * 1024 * 1024) {
      toast.error("Os arquivos devem ter no máximo 5MB cada.");
      return;
    }
    
    try {
      setUploadingDoc(true);
      
      // 1. Upload Doc File
      const docExt = docFile.name.split('.').pop();
      const docFileName = `id_${user.id}_${Math.random()}.${docExt}`;
      const docFilePath = `${user.id}/${docFileName}`;
      
      const { error: docUploadError } = await supabase.storage
        .from('kyc_documents')
        .upload(docFilePath, docFile, { upsert: true });
        
      if (docUploadError) throw docUploadError;
      
      const { data: docUrlData } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(docFilePath);

      // 2. Upload Selfie File
      const selfieExt = selfieFile.name.split('.').pop();
      const selfieFileName = `selfie_${user.id}_${Math.random()}.${selfieExt}`;
      const selfieFilePath = `${user.id}/${selfieFileName}`;
      
      const { error: selfieUploadError } = await supabase.storage
        .from('kyc_documents')
        .upload(selfieFilePath, selfieFile, { upsert: true });
        
      if (selfieUploadError) throw selfieUploadError;
      
      const { data: selfieUrlData } = supabase.storage
        .from('kyc_documents')
        .getPublicUrl(selfieFilePath);
        
      // 3. Update Profile Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          identity_status: 'pending',
          identity_document_url: docUrlData.publicUrl,
          identity_selfie_url: selfieUrlData.publicUrl
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      toast.success("Documento e selfie enviados com sucesso! Aguarde a análise da nossa equipa.");
      setProfile((prev: any) => ({
        ...prev,
        identity_status: 'pending',
        identity_document_url: docUrlData.publicUrl,
        identity_selfie_url: selfieUrlData.publicUrl
      }));
      setDocFile(null);
      setSelfieFile(null);
      
      // Notify admins
      try {
        const adminHtmlContent = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #0f172a; padding: 24px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Alerta de Administração: Novo KYC</h2>
            </div>
            <div style="padding: 32px; line-height: 1.6; color: #334155;">
              <p style="font-size: 16px; margin-top: 0; margin-bottom: 20px;">Olá, Administrador.</p>
              <p style="font-size: 15px; margin-bottom: 20px;">Um novo vendedor enviou documento e selfie para análise de verificação KYC. Detalhes do vendedor:</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Nome:</strong> ${user.user_metadata?.full_name || 'Vendedor'}</p>
                <p style="margin: 0; font-size: 14px;"><strong>E-mail:</strong> ${user.email}</p>
              </div>
              <div style="text-align: center;">
                <a href="${window.location.origin}/admin/users?filter=pending" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Aceder Painel de KYC</a>
              </div>
            </div>
          </div>
        `;

        await supabase.functions.invoke("notify-admins", {
          body: { 
            subject: `🪪 NOVO DOCUMENTO KYC (Onboarding): ${user.user_metadata?.full_name || user.email}`, 
            htmlContent: adminHtmlContent
          }
        });
      } catch (adminErr) {
        console.error("Erro ao notificar admins sobre KYC:", adminErr);
      }

      // Notify seller
      try {
        const sellerHtmlContent = `
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
            <div style="background-color: #0f172a; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Verificação de Identidade Recebida</h1>
            </div>
            <div style="padding: 40px 32px; line-height: 1.6; color: #334155;">
              <p style="font-size: 16px; margin-top: 0; margin-bottom: 24px;">Olá, <strong>${user.user_metadata?.full_name || 'Vendedor'}</strong>.</p>
              <p style="font-size: 15px; margin-bottom: 24px;">Confirmamos com sucesso a receção do seu documento de identificação e da sua selfie para análise do processo de KYC (Know Your Customer).</p>
              <p style="font-size: 15px; margin-bottom: 24px;">A nossa equipe de conformidade está a analisar as suas informações. Assim que a conta for validada, seu acesso ao painel estará liberado.</p>
            </div>
          </div>
        `;

        await supabase.functions.invoke("send-email-notification", {
          body: { 
            to: user.email, 
            subject: "🪪 Informações de Identidade Recebidas - EnsinaPay", 
            htmlContent: sellerHtmlContent,
            senderName: "EnsinaPay"
          }
        });
      } catch (sellerErr) {
        console.error("Erro ao notificar vendedor sobre KYC:", sellerErr);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao fazer upload dos documentos.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("ensina_device_token");
    window.location.href = "/login";
  };

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !isAllowed) return <Navigate to="/login" replace />;

  const deviceToken = localStorage.getItem("ensina_device_token");
  if (!deviceToken) {
    return <Navigate to="/verify-2fa" state={{ from: location }} replace />;
  }

  // INTERCEPT SELLER REGISTRATION / MANUAL APPROVAL / KYC WORKFLOW
  if (profile && profile.role !== "admin" && (profile.status === "pending" || profile.identity_status !== "approved")) {
    const kycStatus = profile.identity_status || "unverified";
    
    return (
      <div className="min-h-screen flex flex-col justify-between bg-muted/30 p-4">
        {/* Header Bar */}
        <header className="flex items-center justify-between py-4 max-w-4xl mx-auto w-full">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground font-semibold gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-lg transition-all duration-300 animate-in fade-in duration-500">
            {kycStatus === "unverified" || kycStatus === "rejected" ? (
              /* State 1: KYC Upload Form */
              <Card className="shadow-2xl border-border/50 bg-background/95 backdrop-blur-sm overflow-hidden">
                <div className="p-6 sm:p-8 bg-card border-b border-border/50 space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">Ativação de Conta</span>
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">Verifique a sua Identidade</CardTitle>
                  <CardDescription className="text-sm">
                    Para começares a vender e configurar os teus checkouts na EnsinaPay, precisamos de validar os teus documentos de identidade.
                  </CardDescription>
                </div>
                
                <CardContent className="p-6 sm:p-8 space-y-6">
                  {kycStatus === "rejected" && (
                    <div className="p-4 bg-red-500/10 border-l-4 border-red-500 text-red-600 rounded-r-xl space-y-1 text-xs">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Documentação Recusada pela Equipe
                      </p>
                      <p className="font-medium text-red-600/90 leading-relaxed mt-1">
                        Motivo: {profile.rejection_reason || "Informações ilegíveis ou documentos incorretos."}
                      </p>
                      <p className="text-[10px] text-red-500/80 pt-1">
                        Por favor, envie um novo documento com imagens nítidas.
                      </p>
                    </div>
                  )}

                  <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 rounded-r-xl space-y-1 text-xs">
                    <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4.5 h-4.5" />
                      Aviso Importante: Titularidade das Contas
                    </p>
                    <p className="font-medium leading-relaxed">
                      O nome no documento enviado deve ser idêntico ao titular da conta bancária / carteira móvel cadastrada para recebimento dos saques.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de Documento</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione o documento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bi">Bilhete de Identidade (BI)</SelectItem>
                          <SelectItem value="passport">Passaporte</SelectItem>
                          <SelectItem value="dire">DIRE</SelectItem>
                          <SelectItem value="other">Outro Documento Oficial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Anexar Cópia do Documento</Label>
                      <label className="relative border-2 border-dashed border-primary/20 hover:border-primary/50 rounded-2xl p-6 text-center hover:bg-muted/10 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group">
                        <input 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                          className="hidden"
                          disabled={uploadingDoc}
                        />
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {docFile ? docFile.name : "Clique para selecionar o documento"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">Máximo: 5MB • Formatos: PNG, JPG, PDF</p>
                        </div>
                      </label>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selfie segurando o Documento</Label>
                      <label className="relative border-2 border-dashed border-primary/20 hover:border-primary/50 rounded-2xl p-6 text-center hover:bg-muted/10 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                          className="hidden"
                          disabled={uploadingDoc}
                        />
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {selfieFile ? selfieFile.name : "Clique para tirar/anexar selfie"}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">Foto do seu rosto segurando o documento • Máximo: 5MB • Formato: Imagem</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <Button 
                    onClick={handleKycUpload} 
                    disabled={!docFile || !selfieFile || uploadingDoc} 
                    className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20"
                  >
                    {uploadingDoc ? "A enviar documentos..." : "Submeter para Verificação"}
                  </Button>
                </CardContent>

                <CardFooter className="bg-muted/30 border-t border-border/50 p-4 text-[10px] text-muted-foreground flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  Os teus dados estão encriptados de forma segura conforme as diretrizes de privacidade.
                </CardFooter>
              </Card>
            ) : (
              /* State 2: KYC Under Review */
              <Card className="shadow-2xl border-border/50 bg-background/95 backdrop-blur-sm p-6 sm:p-8 space-y-8 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center animate-pulse">
                    <Clock className="w-8 h-8 text-amber-500" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Badge className="bg-amber-500/10 text-amber-600 border-0 hover:bg-amber-500/10 font-bold uppercase tracking-wider text-[10px] px-3 py-1">
                    Análise Pendente
                  </Badge>
                  <CardTitle className="text-2xl font-bold text-foreground">Verificação em Andamento</CardTitle>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Recebemos os teus documentos! A nossa equipe de conformidade está a analisar o teu perfil para ativar a tua conta de vendedor.
                  </p>
                </div>

                {/* Simulated Timeline Tracker */}
                <div className="relative max-w-xs mx-auto py-2">
                  <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border -z-10" />
                  
                  <div className="space-y-6 text-left">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">✓</div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Conta Registada</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Perfil de vendedor criado</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md">✓</div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Documentos Enviados</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Identidade recebida com sucesso</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-md z-10">⏳</div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Validação Manual</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Revisão por um administrador da EnsinaPay</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 opacity-50">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0 border border-border">🔒</div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">Painel Liberado</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Acesso total para vendas e saques</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/40 rounded-2xl border border-border/50 text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  💡 <strong>Prazo médio:</strong> A análise manual costuma ser concluída em um período de 12 a 24 horas úteis. Enviaremos uma notificação para o e-mail cadastrado assim que for concluído.
                </div>
              </Card>
            )}
          </div>
        </main>

        {/* Footer Area */}
        <footer className="text-center py-6 text-[10px] text-muted-foreground uppercase tracking-widest">
          &copy; {new Date().getFullYear()} EnsinaPay • Todos os direitos reservados.
        </footer>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

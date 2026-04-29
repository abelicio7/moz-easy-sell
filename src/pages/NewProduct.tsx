import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

const NewProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    delivery_type: "link",
    delivery_content: "",
    support_whatsapp: "",
    allow_affiliates: false,
    commission_percent: "20",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `${productId}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, imageFile, { upsert: true });
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name || !form.price || !form.delivery_content || !form.support_whatsapp) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.from("products").insert({
      user_id: user.id,
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      delivery_type: form.delivery_type,
      delivery_content: form.delivery_content,
      support_whatsapp: form.support_whatsapp,
    }).select("id").single();

    if (error || !data) {
      toast.error("Erro ao criar produto");
      setLoading(false);
      return;
    }

    if (imageFile) {
      const imageUrl = await uploadImage(data.id);
      if (imageUrl) {
        await supabase.from("products").update({ image_url: imageUrl }).eq("id", data.id);
      }
    }

    // Handle affiliate offer
    if (form.allow_affiliates) {
      await supabase.from("affiliate_offers").insert({
        product_id: data.id,
        commission_percent: parseFloat(form.commission_percent),
        is_active: true
      });
    }

    // --- NOTIFICATIONS START ---
    try {
      // 1. Notify Seller
      const sellerSubject = `Produto Recebido: ${form.name}`;
      const sellerHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #3b82f6;">Recebemos o seu produto!</h2>
          <p>Olá, <strong>${user.user_metadata?.full_name || 'Vendedor'}</strong>.</p>
          <p>O seu produto <strong>"${form.name}"</strong> foi submetido com sucesso e já está na nossa fila de análise.</p>
          <p>Assim que a nossa equipa validar o conteúdo, você receberá um novo e-mail com o resultado.</p>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">Obrigado por escolher a EnsinaPay.</p>
        </div>
      `;

      if (user.email) {
        await supabase.functions.invoke("send-email-notification", {
          body: { to: user.email, subject: sellerSubject, htmlContent: sellerHtml, senderName: "EnsinaPay" }
        });
      }

      // 2. Notify Admins
      const adminSubject = `NOVO PRODUTO: ${form.name} aguardando aprovação`;
      const adminHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; background-color: #f9fafb;">
          <h2 style="color: #111827;">Novo Produto para Revisão</h2>
          <p>Um novo produto foi cadastrado e aguarda sua análise:</p>
          <div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <p><strong>Produto:</strong> ${form.name}</p>
            <p><strong>Vendedor:</strong> ${user.user_metadata?.full_name || user.email}</p>
            <p><strong>Preço:</strong> ${form.price} MT</p>
          </div>
          <a href="${window.location.origin}/admin/products" style="display: inline-block; background-color: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Aceder Painel Admin</a>
        </div>
      `;

      await supabase.functions.invoke("notify-admins", {
        body: { subject: adminSubject, htmlContent: adminHtml }
      });
    } catch (notifErr) {
      console.error("Error sending notifications:", notifErr);
      // Non-blocking: we still want the user to see success
    }
    // --- NOTIFICATIONS END ---

    setLoading(false);
    toast.success("Produto criado e enviado para aprovação!");
    navigate("/dashboard/products");
  };

  return (
    <DashboardLayout>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Novo Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image upload */}
            <div className="space-y-2">
              <Label>Imagem do produto</Label>
              {imagePreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clique para adicionar imagem</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG até 5MB</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nome do produto *</Label>
              <Input placeholder="Ex: Ebook de Marketing" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva seu produto..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp para Suporte *</Label>
              <Input type="tel" placeholder="Ex: 840000000" value={form.support_whatsapp} onChange={(e) => setForm({ ...form, support_whatsapp: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Preço (MT) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="150.00" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo de entrega *</Label>
              <Select value={form.delivery_type} onValueChange={(v) => setForm({ ...form, delivery_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link externo</SelectItem>
                  <SelectItem value="file">Arquivo (URL)</SelectItem>
                  <SelectItem value="message">Mensagem personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {form.delivery_type === "link" ? "URL do produto *" : form.delivery_type === "file" ? "URL do arquivo *" : "Mensagem de entrega *"}
              </Label>
              {form.delivery_type === "message" ? (
                <Textarea placeholder="Mensagem que o cliente receberá..." value={form.delivery_content} onChange={(e) => setForm({ ...form, delivery_content: e.target.value })} required />
              ) : (
                <Input placeholder="https://..." value={form.delivery_content} onChange={(e) => setForm({ ...form, delivery_content: e.target.value })} required />
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-bold mb-4 font-mono text-primary uppercase tracking-tighter italic">Programa de Afiliados</h3>
              <div className="flex items-center gap-2 mb-4">
                <input 
                  type="checkbox" 
                  id="allow_affiliates"
                  checked={form.allow_affiliates}
                  onChange={(e) => setForm({ ...form, allow_affiliates: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="allow_affiliates" className="cursor-pointer">Permitir que outros vendam este produto</Label>
              </div>

              {form.allow_affiliates && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label>Comissão do Afiliado (%) *</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    max="90" 
                    value={form.commission_percent} 
                    onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground italic">Dica: Comissões entre 30% e 50% atraem mais afiliados.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Criando..." : "Criar Produto"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default NewProduct;

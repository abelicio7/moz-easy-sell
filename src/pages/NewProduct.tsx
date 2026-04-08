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

const NewProduct = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    delivery_type: "link",
    delivery_content: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name || !form.price || !form.delivery_content) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("products").insert({
      user_id: user.id,
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      delivery_type: form.delivery_type,
      delivery_content: form.delivery_content,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao criar produto");
    } else {
      toast.success("Produto criado com sucesso!");
      navigate("/dashboard");
    }
  };

  return (
    <DashboardLayout>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Novo Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do produto *</Label>
              <Input placeholder="Ex: Ebook de Marketing" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva seu produto..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
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

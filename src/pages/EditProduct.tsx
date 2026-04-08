import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", delivery_type: "link", delivery_content: "" });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      if (data) {
        setForm({
          name: data.name,
          description: data.description || "",
          price: String(data.price),
          delivery_type: data.delivery_type,
          delivery_content: data.delivery_content,
        });
      }
    };
    fetch();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("products").update({
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      delivery_type: form.delivery_type,
      delivery_content: form.delivery_content,
    }).eq("id", id!);
    setLoading(false);
    if (error) {
      toast.error("Erro ao atualizar");
    } else {
      toast.success("Produto atualizado!");
      navigate("/dashboard");
    }
  };

  return (
    <DashboardLayout>
      <Card className="max-w-lg mx-auto">
        <CardHeader><CardTitle>Editar Produto</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preço (MT) *</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo de entrega</Label>
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
              <Label>{form.delivery_type === "message" ? "Mensagem *" : "URL *"}</Label>
              {form.delivery_type === "message" ? (
                <Textarea value={form.delivery_content} onChange={(e) => setForm({ ...form, delivery_content: e.target.value })} required />
              ) : (
                <Input value={form.delivery_content} onChange={(e) => setForm({ ...form, delivery_content: e.target.value })} required />
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">{loading ? "Salvando..." : "Salvar"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>Cancelar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default EditProduct;

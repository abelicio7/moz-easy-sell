import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  aspectRatio?: string; // e.g. "aspect-[4/3]" or "aspect-video"
}

const ImageUpload = ({
  value,
  onChange,
  bucket = "quiz-images",
  folder = "uploads",
  label = "Clique para carregar imagem",
  aspectRatio = "aspect-[4/3]",
}: ImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor escolhe um ficheiro de imagem (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem não pode ter mais de 5MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(data.publicUrl);
      toast.success("Imagem carregada!");
    } catch (err: any) {
      toast.error("Erro ao carregar: " + (err.message || "tente novamente"));
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRemove = async () => {
    onChange(null);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {value ? (
        /* Preview */
        <div className={cn("relative w-full rounded-2xl overflow-hidden border-2 border-border group", aspectRatio)}>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-xl h-9"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
              Substituir
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="rounded-xl h-9"
              onClick={handleRemove}
            >
              <X className="w-4 h-4 mr-1.5" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        /* Drop Zone */
        <div
          className={cn(
            "w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 text-center p-8",
            aspectRatio,
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            uploading && "pointer-events-none opacity-70"
          )}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm font-bold text-muted-foreground">A carregar...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Arrasta aqui ou clica para selecionar · PNG, JPG, WebP · máx. 5MB
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;

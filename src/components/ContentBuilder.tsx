import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, GripVertical, Plus, FileText, Link as LinkIcon, File } from "lucide-react";

export type ContentType = 'file' | 'link';

export interface ContentNode {
  id: string;
  type: ContentType;
  name: string;
  source?: 'existing' | 'new';
  fileObj?: File;
  path?: string;
  size?: number;
  url?: string;
}

export interface ModuleNode {
  id: string;
  title: string;
  contents: ContentNode[];
}

interface Props {
  modules: ModuleNode[];
  setModules: (m: ModuleNode[]) => void;
  unassigned: ContentNode[];
  setUnassigned: (c: ContentNode[]) => void;
}

export default function ContentBuilder({ modules, setModules, unassigned, setUnassigned }: Props) {
  const [draggedItem, setDraggedItem] = useState<{ type: 'module'|'content', modIndex: number, contentIndex: number } | null>(null);
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null); // null means unassigned
  
  const [linkForm, setLinkForm] = useState({ name: '', url: '' });

  // Native HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'module'|'content', modIndex: number, contentIndex: number) => {
    e.stopPropagation();
    setDraggedItem({ type, modIndex, contentIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetType: 'module'|'content', targetModIndex: number, targetContentIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'module' && targetType === 'module') {
      // Reorder modules
      const newMods = [...modules];
      const [moved] = newMods.splice(draggedItem.modIndex, 1);
      newMods.splice(targetModIndex, 0, moved);
      setModules(newMods);
    } 
    else if (draggedItem.type === 'content') {
      // Move content between or within modules/unassigned
      let sourceArray = draggedItem.modIndex === -1 ? [...unassigned] : [...modules[draggedItem.modIndex].contents];
      let item = sourceArray[draggedItem.contentIndex];
      
      sourceArray.splice(draggedItem.contentIndex, 1);
      
      let newMods = [...modules];
      let newUn = [...unassigned];

      if (draggedItem.modIndex === -1 && targetModIndex === -1) {
         newUn = sourceArray; // reorder in unassigned
         newUn.splice(targetContentIndex, 0, item);
      } else if (draggedItem.modIndex !== -1 && targetModIndex !== -1) {
         if (draggedItem.modIndex === targetModIndex) {
            sourceArray.splice(targetContentIndex, 0, item);
            newMods[draggedItem.modIndex].contents = sourceArray;
         } else {
            newMods[draggedItem.modIndex].contents = sourceArray;
            newMods[targetModIndex].contents.splice(targetContentIndex, 0, item);
         }
      } else if (draggedItem.modIndex === -1 && targetModIndex !== -1) {
         newUn = sourceArray;
         newMods[targetModIndex].contents.splice(targetContentIndex, 0, item);
      } else if (draggedItem.modIndex !== -1 && targetModIndex === -1) {
         newMods[draggedItem.modIndex].contents = sourceArray;
         newUn.splice(targetContentIndex, 0, item);
      }

      setModules(newMods);
      setUnassigned(newUn);
    }
    setDraggedItem(null);
  };

  const addModule = () => {
    setModules([...modules, { id: Date.now().toString(), title: "Novo Módulo", contents: [] }]);
  };

  const updateModuleHeader = (index: number, title: string) => {
    const newMods = [...modules];
    newMods[index].title = title;
    setModules(newMods);
  };

  const removeModule = (index: number) => {
    if (confirm("Remover módulo inteiro e todo o seu conteúdo?")) {
      const newMods = [...modules];
      newMods.splice(index, 1);
      setModules(newMods);
    }
  };

  const removeContent = (modIndex: number, contentIndex: number) => {
    if (modIndex === -1) {
      const newUn = [...unassigned];
      newUn.splice(contentIndex, 1);
      setUnassigned(newUn);
    } else {
      const newMods = [...modules];
      newMods[modIndex].contents.splice(contentIndex, 1);
      setModules(newMods);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newNodes: ContentNode[] = Array.from(files).map(file => ({
      id: Math.random().toString(),
      type: 'file',
      name: file.name,
      source: 'new',
      fileObj: file,
      size: file.size
    }));

    if (targetModuleId === null) {
      setUnassigned([...unassigned, ...newNodes]);
    } else {
      const newMods = modules.map(m => m.id === targetModuleId ? { ...m, contents: [...m.contents, ...newNodes] } : m);
      setModules(newMods);
    }
    setAddModalOpen(false);
  };

  const handleAddLink = () => {
    if (!linkForm.name || !linkForm.url) return;
    const newNode: ContentNode = { 
      id: Math.random().toString(), 
      type: 'link', 
      name: linkForm.name, 
      url: linkForm.url 
    };

    if (targetModuleId === null) {
      setUnassigned([...unassigned, newNode]);
    } else {
      const newMods = modules.map(m => m.id === targetModuleId ? { ...m, contents: [...m.contents, newNode] } : m);
      setModules(newMods);
    }
    setLinkForm({ name: '', url: '' });
    setAddModalOpen(false);
  };

  const renderContentItem = (c: ContentNode, modIndex: number, contentIdx: number) => (
    <div 
      key={c.id}
      draggable
      onDragStart={(e) => handleDragStart(e, 'content', modIndex, contentIdx)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, 'content', modIndex, contentIdx)}
      className="flex items-center gap-3 p-3 bg-secondary/50 border border-border rounded-lg ml-6 cursor-move hover:bg-secondary/80 transition-colors"
    >
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      {c.type === 'file' ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
      <div className="flex-1 flex justify-between items-center min-w-0">
        <span className="truncate text-sm font-medium">{c.name} {c.source === 'new' && <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded ml-2">NOVO</span>}</span>
      </div>
      <Button variant="ghost" size="sm" onClick={() => removeContent(modIndex, contentIdx)} className="h-8 w-8 p-0 shrink-0 text-red-500 hover:bg-red-500/10">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Organização (Members Area)</h3>
        <Button type="button" onClick={addModule} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2"/>
          Criar Módulo
        </Button>
      </div>

      <div className="space-y-4">
        {modules.map((mod, modIdx) => (
          <div 
            key={mod.id} 
            draggable
            onDragStart={(e) => handleDragStart(e, 'module', modIdx, -1)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'module', modIdx, -1)}
            className="border border-border/60 bg-card rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4 cursor-move">
              <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
              <Input 
                value={mod.title}
                onChange={(e) => updateModuleHeader(modIdx, e.target.value)}
                className="font-bold text-lg border-transparent hover:border-border focus:border-primary px-2 h-auto py-1"
                placeholder="Título do Módulo"
              />
              <Button type="button" variant="ghost" onClick={() => removeModule(modIdx)} className="text-red-500 shrink-0"><Trash2 className="w-4 h-4"/></Button>
            </div>

            <div className="space-y-2 mb-3 min-h-[10px]" onDragOver={handleDragOver} onDrop={(e) => { 
                if (mod.contents.length === 0 && draggedItem?.type === 'content') handleDrop(e, 'content', modIdx, 0);
              }}>
              {mod.contents.map((c, cIdx) => renderContentItem(c, modIdx, cIdx))}
            </div>

            <Button type="button" variant="ghost" size="sm" className="ml-6 text-muted-foreground w-[calc(100%-1.5rem)] justify-start border border-dashed border-border" onClick={() => { setTargetModuleId(mod.id); setAddModalOpen(true); }}>
               <Plus className="w-4 h-4 mr-2"/> Adicionar Aula/Material
            </Button>
          </div>
        ))}
      </div>

      <div className="border border-dashed border-border/60 rounded-xl p-4 bg-secondary/10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-sm text-muted-foreground">Materiais Extra (Sem Módulo)</h4>
        </div>
        <div className="space-y-2 mb-3 min-h-[10px]" onDragOver={handleDragOver} onDrop={(e) => {
           if (unassigned.length === 0 && draggedItem?.type === 'content') handleDrop(e, 'content', -1, 0);
        }}>
          {unassigned.map((c, cIdx) => renderContentItem(c, -1, cIdx))}
        </div>
        <Button type="button" variant="ghost" size="sm" className="w-full justify-center border border-dashed border-border text-muted-foreground" onClick={() => { setTargetModuleId(null); setAddModalOpen(true); }}>
           <Plus className="w-4 h-4 mr-2"/> Adicionar Conteúdo Avulso
        </Button>
      </div>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Conteúdo</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div>
              <p className="text-sm font-bold mb-2">1. Upload de Arquivos</p>
              <Input type="file" multiple onChange={handleFileUpload} />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-px bg-border flex-1"/>
              <span className="text-xs text-muted-foreground">OU</span>
              <div className="h-px bg-border flex-1"/>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold">2. Adicionar Link Externo</p>
              <Input placeholder="Título do link (Ex: Grupo VIP)" value={linkForm.name} onChange={e => setLinkForm({...linkForm, name: e.target.value})} />
              <Input placeholder="https://..." value={linkForm.url} onChange={e => setLinkForm({...linkForm, url: e.target.value})} type="url" />
              <Button type="button" className="w-full" onClick={handleAddLink}>Salvar Link</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

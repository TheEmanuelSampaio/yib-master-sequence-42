
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { toast } from 'sonner';

export function TagsTab() {
  const { tags, addTag } = useApp();
  const [newTag, setNewTag] = useState("");
  
  const handleAddTag = async () => {
    if (!newTag) {
      toast.error("Digite uma tag");
      return;
    }
    
    try {
      const result = await addTag(newTag);
      if (result.success) {
        toast.success("Tag adicionada com sucesso!");
        setNewTag("");
      } else {
        toast.error(result.error || "Erro ao adicionar tag");
      }
    } catch (error) {
      console.error("Erro ao adicionar tag:", error);
      toast.error("Erro ao adicionar tag");
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tags</h2>
      </div>
      
      <div className="flex gap-2">
        <Input
          placeholder="Nova tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTag();
            }
          }}
        />
        <Button onClick={handleAddTag}>
          <PlusCircle className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {tags.length === 0 ? (
          <div className="text-muted-foreground">Nenhuma tag encontrada. Adicione sua primeira tag.</div>
        ) : (
          tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-sm py-1 px-3">
              {tag}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

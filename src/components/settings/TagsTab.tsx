
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";

export const TagsTab = () => {
  const { tags, addTag, deleteTag } = useApp();
  const [newTagName, setNewTagName] = useState("");

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Digite o nome da tag");
      return;
    }
    
    try {
      await addTag(newTagName.trim());
      setNewTagName("");
      toast.success("Tag adicionada com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao adicionar tag");
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    try {
      await deleteTag(tagName);
      toast.success("Tag removida com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover tag");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tags</CardTitle>
          <CardDescription>
            Gerencie as tags usadas em sequências e contatos
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <div className="flex">
            <Input
              placeholder="Nome da tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="w-[200px]"
            />
            <Button 
              className="ml-2" 
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
            >
              <Tag className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm">
              <span className="mr-1">{tag}</span>
              <button 
                onClick={() => handleDeleteTag(tag)}
                className="text-muted-foreground hover:text-red-500 transition-colors ml-1"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {tags.length === 0 && (
            <div className="w-full flex flex-col items-center justify-center py-8 bg-muted/30 rounded-lg">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma tag cadastrada</h3>
              <p className="text-center text-muted-foreground mb-4">
                Adicione tags para usar em sequências e contatos
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

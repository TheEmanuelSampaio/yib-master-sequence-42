
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

export const TagsTab = () => {
  const { tags, addTag, deleteTag } = useApp();
  
  const [newTag, setNewTag] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    
    const { success, error } = await addTag(newTag.trim());
    if (success) {
      setNewTag('');
    }
  };

  const handleDeleteTag = async (tag: string) => {
    if (deleteTag) {
      await deleteTag(tag);
    }
  };

  const filteredTags = tags.filter(tag => 
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Gerenciamento de Tags</CardTitle>
        <CardDescription>
          Gerencie tags utilizadas pelo sistema para segmentação de contatos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex space-x-2">
          <Input
            placeholder="Nova tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddTag();
              }
            }}
          />
          <Button onClick={handleAddTag}>
            Adicionar
          </Button>
        </div>

        <div>
          <Input
            placeholder="Pesquisar tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          
          <div className="flex flex-wrap gap-2">
            {filteredTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="py-1.5 px-3 text-sm">
                {tag}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-4 w-4 p-0 ml-2 text-destructive hover:text-destructive hover:bg-transparent">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a tag "{tag}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => handleDeleteTag(tag)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Badge>
            ))}
            {filteredTags.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tag encontrada</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


import { createContext, useContext, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface TagsContextType {
  tags: string[];
  setTags: (tags: string[]) => void;
  addTag: (tagName: string) => Promise<void>;
  deleteTag: (tagName: string) => Promise<void>;
  refreshTags: () => Promise<void>;
}

const TagsContext = createContext<TagsContextType | undefined>(undefined);

export const TagsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: currentUser } = useAuth();
  const [tags, setTags] = useState<string[]>([]);

  const refreshTags = async () => {
    try {
      if (!currentUser) return;
      
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('name');
      
      if (tagsError) throw tagsError;
      
      setTags(tagsData.map(tag => tag.name));
    } catch (error: any) {
      console.error("Error fetching tags:", error);
      toast.error(`Erro ao carregar tags: ${error.message}`);
    }
  };

  const addTag = async (tagName: string) => {
    try {
      if (!currentUser) {
        toast.error("Usuário não autenticado");
        return;
      }
      
      const { error } = await supabase
        .from('tags')
        .insert({
          name: tagName,
          created_by: currentUser.id
        });
      
      if (error) throw error;
      
      setTags(prev => [...prev, tagName]);
      toast.success("Tag adicionada com sucesso");
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(`Erro ao adicionar tag: ${error.message}`);
    }
  };

  const deleteTag = async (tagName: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('name', tagName);
      
      if (error) throw error;
      
      setTags(prev => prev.filter(tag => tag !== tagName));
      toast.success("Tag removida com sucesso");
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast.error(`Erro ao remover tag: ${error.message}`);
    }
  };

  return (
    <TagsContext.Provider value={{
      tags,
      setTags,
      addTag,
      deleteTag,
      refreshTags
    }}>
      {children}
    </TagsContext.Provider>
  );
};

export const useTags = () => {
  const context = useContext(TagsContext);
  if (context === undefined) {
    throw new Error("useTags must be used within a TagsProvider");
  }
  return context;
};

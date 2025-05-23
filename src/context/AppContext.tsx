
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Instance } from "@/types";
import { AppContextType } from "@/types/context";
import { toast } from "sonner";

const defaultContextValue: AppContextType = {
  currentInstance: null,
  isDataInitialized: false,
  isLoadingData: false,
  setCurrentInstance: () => {},
  refreshBasicData: async () => {},
};

export const AppContext = createContext<AppContextType>(defaultContextValue);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, _setCurrentInstanceInternal] = useState<Instance | null>(null);
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Função para definir a instância atual E persistir no localStorage
  const setCurrentInstance = useCallback((instance: Instance | null) => {
    _setCurrentInstanceInternal(instance);
    if (instance) {
      localStorage.setItem('selectedInstanceId', instance.id);
      console.log(`AppContext: Instância atual definida como "${instance.name}" (ID: ${instance.id}) e salva no localStorage.`);
    } else {
      localStorage.removeItem('selectedInstanceId');
      console.log("AppContext: Instância atual removida (definida como null). localStorage limpo.");
    }
  }, []);

  // Carrega apenas dados básicos essenciais (instances e configurações globais)
  const refreshBasicData = useCallback(async () => {
    if (!user || isLoadingData) return;

    setIsLoadingData(true);
    console.log(`AppContext: Iniciando refreshBasicData. Usuário: ${user?.id}`);

    try {
      console.log("AppContext: Carregando dados básicos (instances)...");
      // Carregar apenas instâncias por enquanto
      const { data: instancesData, error: instancesError } = await supabase
        .from('instances')
        .select('*, clients(*)');
      
      if (instancesError) throw instancesError;
      
      const typedInstances = instancesData.map(i => ({
        id: i.id,
        name: i.name,
        evolutionApiUrl: i.evolution_api_url,
        apiKey: i.api_key,
        active: i.active,
        clientId: i.client_id,
        client: i.clients ? {
          id: i.clients.id,
          accountId: i.clients.account_id,
          accountName: i.clients.account_name,
          createdBy: i.clients.created_by,
          createdAt: i.clients.created_at,
          updatedAt: i.clients.updated_at,
          authToken: i.clients.auth_token,
          creator_account_name: i.clients.creator_account_name,
        } : undefined,
        createdBy: i.created_by,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      })) as Instance[];
      
      setInstances(typedInstances);
      
      // Marcar como inicializado
      setIsDataInitialized(true);
      console.log("AppContext: Dados básicos carregados. isDataInitialized definido como true.");

    } catch (error: any) {
      console.error("AppContext: Erro durante refreshBasicData:", error);
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setIsLoadingData(false);
    }
  }, [user, isLoadingData]);

  // Efeito para carregar dados básicos na montagem ou mudança de usuário
  useEffect(() => {
    if (user && !isDataInitialized && !isLoadingData) {
      console.log("AppContext: useEffect[user] disparando refreshBasicData inicial.");
      refreshBasicData();
    } else if (!user) {
      // Limpar estado
      setInstances([]);
      setCurrentInstance(null);
      setIsDataInitialized(false);
      console.log("AppContext: Usuário deslogado, estados básicos limpos.");
    }
  }, [user, isDataInitialized, isLoadingData, refreshBasicData, setCurrentInstance]);

  // Efeito para restaurar currentInstance do localStorage
  useEffect(() => {
    if (isDataInitialized && instances.length > 0 && !currentInstance) {
      const savedInstanceId = localStorage.getItem('selectedInstanceId');
      console.log(`AppContext: Tentando restaurar currentInstance. ID salvo: ${savedInstanceId}. Instâncias carregadas: ${instances.length}`);
      let instanceToSet: Instance | null = null;

      if (savedInstanceId) {
        instanceToSet = instances.find(i => i.id === savedInstanceId) || null;
        if (instanceToSet) {
          console.log(`AppContext: Instância "${instanceToSet.name}" restaurada do localStorage.`);
        } else {
          console.warn(`AppContext: ID de instância salvo (${savedInstanceId}) não encontrado na lista atual. Definindo padrão.`);
          localStorage.removeItem('selectedInstanceId');
        }
      }

      if (!instanceToSet) {
        instanceToSet = instances.find(i => i.active) || instances[0];
        console.log(`AppContext: Nenhuma instância válida no localStorage. Definindo instância padrão: "${instanceToSet?.name}".`);
      }

      if (instanceToSet) {
        setCurrentInstance(instanceToSet);
      } else {
        console.warn("AppContext: Nenhuma instância disponível para ser definida como atual.");
        setCurrentInstance(null);
      }
    }
  }, [instances, isDataInitialized, currentInstance, setCurrentInstance]);

  const value: AppContextType = {
    currentInstance,
    isDataInitialized,
    isLoadingData,
    setCurrentInstance,
    refreshBasicData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

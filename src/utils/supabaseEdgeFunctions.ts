
import { supabase } from "@/integrations/supabase/client";

/**
 * Utilitário para invocar funções edge do Supabase com autenticação
 */
export const invokeEdgeFunction = async <T = any, P = any>(
  functionName: string,
  payload?: P
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`Erro ao chamar a função ${functionName}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Erro inesperado ao chamar a função ${functionName}:`, error);
    return { data: null, error: error as Error };
  }
};

/**
 * Utilitário para fazer chamadas à API tag-change
 */
export const tagChange = async (chatwootData: any) => {
  return invokeEdgeFunction<any, { data: any }>('tag-change', {
    data: chatwootData
  });
};

/**
 * Utilitário para recuperar mensagens pendentes
 */
export const getPendingMessages = async () => {
  return invokeEdgeFunction<any>('pending-messages');
};

/**
 * Utilitário para atualizar o status de entrega de mensagem
 */
export const updateDeliveryStatus = async (messageId: string, success: boolean, error?: string) => {
  return invokeEdgeFunction<any, { messageId: string; success: boolean; error?: string }>('delivery-status', {
    messageId,
    success,
    error
  });
};

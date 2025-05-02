
/**
 * Utilitário para gerenciar problemas comuns com diálogos e modais
 */

/**
 * Restaura o estado normal do documento quando modals/dialogs são fechados
 * Corrige problemas de pointer-events e scroll-lock que podem ocorrer
 */
export const resetBodyStylesAfterDialog = () => {
  // Limpa pointer-events: none
  if (document.body.style.pointerEvents === 'none') {
    document.body.style.pointerEvents = '';
  }
  
  // Remove atributos de scroll lock
  if (document.body.hasAttribute('data-scroll-locked')) {
    document.body.removeAttribute('data-scroll-locked');
  }
  
  // Restaura overflow
  if (document.body.style.overflow === 'hidden') {
    document.body.style.overflow = '';
  }

  // Força a limpeza direta de estilos inline de pointer-events
  document.body.style.removeProperty('pointer-events');

  // Force uma atualização visual do DOM
  window.requestAnimationFrame(() => {
    document.body.style.removeProperty('pointer-events');
  });
};

/**
 * Event handler para prevenir propagação de eventos em menus e diálogos
 */
export const stopEventPropagation = (e: React.MouseEvent) => {
  e.stopPropagation();
};

/**
 * Wrapper para mudar estado de um diálogo com limpeza automática do body
 * @param newState Novo estado do diálogo (true = aberto, false = fechado)
 * @param onChangeCallback Função de callback para atualizar o estado
 */
export const safeDialogChange = (
  newState: boolean, 
  onChangeCallback: (state: boolean) => void
) => {
  // Se o diálogo estiver fechando
  if (!newState) {
    resetBodyStylesAfterDialog();
    
    // Aplicar limpeza adicional após um breve delay para garantir que 
    // todas as animações e eventos foram concluídos
    setTimeout(resetBodyStylesAfterDialog, 100);
    setTimeout(resetBodyStylesAfterDialog, 300);
  }
  
  onChangeCallback(newState);
};

/**
 * Handler seguro para diálogos do Radix UI que evita problemas com estilos do body
 * @param onOpenChange Função original onOpenChange do componente de diálogo
 */
export const createSafeDialogHandler = (onOpenChange: (open: boolean) => void) => {
  return (newOpen: boolean) => {
    if (!newOpen) {
      // Limpa imediatamente
      resetBodyStylesAfterDialog();
      
      // E também após um breve delay para garantir que todas as animações terminaram
      setTimeout(resetBodyStylesAfterDialog, 100);
      setTimeout(resetBodyStylesAfterDialog, 300);
    }
    onOpenChange(newOpen);
  };
};

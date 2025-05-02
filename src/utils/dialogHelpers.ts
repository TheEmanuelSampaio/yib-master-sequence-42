
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
};

/**
 * Event handler para prevenir propagação de eventos em menus e diálogos
 */
export const stopEventPropagation = (e: React.MouseEvent) => {
  e.stopPropagation();
};

/**
 * Wrapper para mudar estado de um diálogo com limpeza automática do body
 */
export const safeDialogChange = (
  newState: boolean, 
  onChangeCallback: (state: boolean) => void
) => {
  // Se o diálogo estiver fechando
  if (!newState) {
    resetBodyStylesAfterDialog();
  }
  
  onChangeCallback(newState);
};

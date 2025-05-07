
// Tipos para condições avançadas de sequências

/**
 * Representa um grupo de tags com o mesmo operador dentro do grupo
 */
export interface ConditionGroup {
  id?: string; // ID do grupo (opcional para novos grupos)
  groupIndex: number; // Posição do grupo na condição
  groupOperator: 'AND' | 'OR'; // Operador dentro do grupo (entre tags)
  tags: string[]; // Lista de tags no grupo
}

/**
 * Representa a condição avançada completa com múltiplos grupos
 */
export interface AdvancedCondition {
  conditionOperator: 'AND' | 'OR'; // Operador entre grupos
  groups: ConditionGroup[]; // Lista de grupos de condições
}

/**
 * Funções utilitárias para condições
 */

// Converte uma condição simples em uma condição avançada
export function simpleToAdvanced(type: 'AND' | 'OR', tags: string[]): AdvancedCondition {
  return {
    conditionOperator: 'OR', // Por padrão, entre grupos é OR
    groups: [
      {
        groupIndex: 0,
        groupOperator: type, // O tipo da condição simples define o operador do grupo
        tags: [...tags] // Copia a lista de tags
      }
    ]
  };
}

// Converte uma condição avançada em uma condição simples (simplificação)
// Retorna null se a condição não puder ser simplificada
export function advancedToSimple(condition: AdvancedCondition): { type: 'AND' | 'OR', tags: string[] } | null {
  // Se tiver mais de um grupo, não pode ser simplificada
  if (condition.groups.length !== 1) {
    return null;
  }
  
  const group = condition.groups[0];
  return {
    type: group.groupOperator,
    tags: [...group.tags]
  };
}

// Avalia se um conjunto de tags atende a uma condição avançada
export function evaluateAdvancedCondition(contactTags: string[], condition: AdvancedCondition): boolean {
  // Se não houver grupos, a condição é falsa
  if (!condition.groups || condition.groups.length === 0) {
    return false;
  }
  
  const results = condition.groups.map(group => {
    // Para cada grupo, avaliamos se as tags do contato atendem à condição
    if (group.groupOperator === 'AND') {
      // Todas as tags do grupo precisam estar presentes
      return group.tags.every(tag => contactTags.includes(tag));
    } else {
      // Pelo menos uma tag do grupo precisa estar presente
      return group.tags.some(tag => contactTags.includes(tag));
    }
  });
  
  // Aplicamos o operador da condição para combinar os resultados dos grupos
  if (condition.conditionOperator === 'AND') {
    // Todos os grupos precisam ser verdadeiros
    return results.every(result => result === true);
  } else {
    // Pelo menos um grupo precisa ser verdadeiro
    return results.some(result => result === true);
  }
}


/**
 * Representa um grupo de condições para uma sequência
 */
export interface ConditionGroup {
  id?: string;
  groupIndex: number;
  groupOperator: "AND" | "OR"; // Operador entre este grupo e o próximo
  conditionOperator: "AND" | "OR"; // Operador interno do grupo
  tags: string[];
}

/**
 * Representa uma condição avançada completa (conjunto de grupos de condições)
 */
export interface AdvancedCondition {
  type: "start" | "stop";
  groups: ConditionGroup[];
}

/**
 * Converte uma condição simples para o formato de condição avançada
 */
export function convertSimpleToAdvanced(
  type: "start" | "stop",
  conditionType: "AND" | "OR", 
  tags: string[]
): AdvancedCondition {
  return {
    type,
    groups: [
      {
        groupIndex: 0,
        groupOperator: "AND", // Por padrão, apenas um grupo
        conditionOperator: conditionType,
        tags: [...tags]
      }
    ]
  };
}

/**
 * Avalia se um conjunto de tags atende a uma condição avançada
 */
export function evaluateAdvancedCondition(
  contactTags: string[], 
  condition: AdvancedCondition
): boolean {
  if (!condition.groups || condition.groups.length === 0) {
    return false;
  }

  let result = false;
  let isFirst = true;

  // Avalia cada grupo de condições
  for (let i = 0; i < condition.groups.length; i++) {
    const group = condition.groups[i];
    const groupResult = evaluateConditionGroup(contactTags, group);
    
    if (isFirst) {
      result = groupResult;
      isFirst = false;
    } else {
      // Aplica o operador do grupo anterior para combinar com o resultado atual
      const prevGroup = condition.groups[i - 1];
      if (prevGroup.groupOperator === "AND") {
        result = result && groupResult;
      } else {
        result = result || groupResult;
      }
    }
  }

  return result;
}

/**
 * Avalia se um conjunto de tags atende a um grupo de condições
 */
function evaluateConditionGroup(
  contactTags: string[], 
  group: ConditionGroup
): boolean {
  if (!group.tags || group.tags.length === 0) {
    return false;
  }

  if (group.conditionOperator === "AND") {
    // Todas as tags do grupo devem existir nas tags do contato
    return group.tags.every(tag => contactTags.includes(tag));
  } else {
    // Ao menos uma tag do grupo deve existir nas tags do contato
    return group.tags.some(tag => contactTags.includes(tag));
  }
}

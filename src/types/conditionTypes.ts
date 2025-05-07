
export interface TagGroup {
  id?: string;
  operator: "AND" | "OR"; // Operador dentro do grupo
  tags: string[];
}

export interface AdvancedCondition {
  operator: "AND" | "OR"; // Operador entre os grupos
  groups: TagGroup[];
}

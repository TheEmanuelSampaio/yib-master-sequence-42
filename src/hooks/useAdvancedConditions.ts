
import { useState } from "react";
import { AdvancedCondition, ConditionGroup } from "@/types/conditionTypes";
import { v4 as uuidv4 } from "uuid";

export function useAdvancedConditions(initialCondition?: AdvancedCondition) {
  const [condition, setCondition] = useState<AdvancedCondition>(
    initialCondition || { type: "start", groups: [] }
  );

  // Adiciona um novo grupo vazio
  const addGroup = () => {
    const newGroupIndex = condition.groups.length;
    const newGroup: ConditionGroup = {
      id: uuidv4(),
      groupIndex: newGroupIndex,
      groupOperator: "OR", // Por padrão, OR entre grupos
      conditionOperator: "AND", // Por padrão, AND dentro do grupo
      tags: []
    };

    setCondition({
      ...condition,
      groups: [...condition.groups, newGroup]
    });
  };

  // Remove um grupo pelo índice
  const removeGroup = (index: number) => {
    if (index < 0 || index >= condition.groups.length) {
      return;
    }

    const updatedGroups = condition.groups.filter((_, i) => i !== index)
      .map((group, i) => ({
        ...group,
        groupIndex: i // Atualiza os índices
      }));

    setCondition({
      ...condition,
      groups: updatedGroups
    });
  };

  // Atualiza um grupo específico
  const updateGroup = (index: number, updatedGroup: Partial<ConditionGroup>) => {
    if (index < 0 || index >= condition.groups.length) {
      return;
    }

    const updatedGroups = condition.groups.map((group, i) => {
      if (i === index) {
        return { ...group, ...updatedGroup };
      }
      return group;
    });

    setCondition({
      ...condition,
      groups: updatedGroups
    });
  };

  // Adiciona uma tag a um grupo
  const addTagToGroup = (groupIndex: number, tag: string) => {
    if (groupIndex < 0 || groupIndex >= condition.groups.length || !tag) {
      return;
    }

    const group = condition.groups[groupIndex];
    if (group.tags.includes(tag)) {
      return; // Tag já existe no grupo
    }

    const updatedGroups = condition.groups.map((g, i) => {
      if (i === groupIndex) {
        return {
          ...g,
          tags: [...g.tags, tag]
        };
      }
      return g;
    });

    setCondition({
      ...condition,
      groups: updatedGroups
    });
  };

  // Remove uma tag de um grupo
  const removeTagFromGroup = (groupIndex: number, tag: string) => {
    if (groupIndex < 0 || groupIndex >= condition.groups.length) {
      return;
    }

    const updatedGroups = condition.groups.map((group, i) => {
      if (i === groupIndex) {
        return {
          ...group,
          tags: group.tags.filter(t => t !== tag)
        };
      }
      return group;
    });

    setCondition({
      ...condition,
      groups: updatedGroups
    });
  };

  // Altera o operador entre grupos
  const toggleGroupOperator = (groupIndex: number) => {
    if (groupIndex < 0 || groupIndex >= condition.groups.length) {
      return;
    }

    const updatedGroups = condition.groups.map((group, i) => {
      if (i === groupIndex) {
        return {
          ...group,
          groupOperator: group.groupOperator === "AND" ? "OR" : "AND"
        };
      }
      return group;
    });

    setCondition({
      ...condition,
      groups: updatedGroups
    });
  };

  // Altera o operador interno de um grupo
  const toggleConditionOperator = (groupIndex: number) => {
    if (groupIndex < 0 || groupIndex >= condition.groups.length) {
      return;
    }

    const updatedGroups = condition.groups.map((group, i) => {
      if (i === groupIndex) {
        return {
          ...group,
          conditionOperator: group.conditionOperator === "AND" ? "OR" : "AND"
        };
      }
      return group;
    });

    setCondition({
      ...condition,
      groups: updatedGroups
    });
  };

  return {
    condition,
    setCondition,
    addGroup,
    removeGroup,
    updateGroup,
    addTagToGroup,
    removeTagFromGroup,
    toggleGroupOperator,
    toggleConditionOperator
  };
}

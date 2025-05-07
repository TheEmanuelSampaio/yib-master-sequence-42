
import { useState, useEffect } from 'react';
import { ConditionGroup, ConditionStructure, TagCondition } from '@/types';

export function useAdvancedConditions(initialCondition: TagCondition) {
  // State for basic condition
  const [conditionType, setConditionType] = useState<"AND" | "OR">(initialCondition.type);
  const [tags, setTags] = useState<string[]>(initialCondition.tags || []);
  
  // State for advanced conditions
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);
  const [advancedCondition, setAdvancedCondition] = useState<ConditionStructure>({
    mainOperator: initialCondition.type,
    groups: initialCondition.tags.length > 0 ? [
      {
        id: `group_${Math.random().toString(36).substring(2, 11)}`,
        operator: initialCondition.type,
        tags: [...initialCondition.tags]
      }
    ] : []
  });
  
  // Sync basic condition with advanced condition when switching modes
  useEffect(() => {
    if (useAdvancedMode) {
      // If switching to advanced mode, initialize with the basic condition
      if (advancedCondition.groups.length === 0) {
        setAdvancedCondition({
          mainOperator: conditionType,
          groups: tags.length > 0 ? [
            {
              id: `group_${Math.random().toString(36).substring(2, 11)}`,
              operator: conditionType,
              tags: [...tags]
            }
          ] : []
        });
      }
    } else {
      // If switching to basic mode, take tags from the first group if available
      if (advancedCondition.groups.length > 0) {
        setConditionType(advancedCondition.mainOperator);
        setTags(advancedCondition.groups[0].tags);
      }
    }
  }, [useAdvancedMode]);
  
  // Helper to toggle the condition type (AND/OR)
  const toggleConditionType = () => {
    setConditionType(prevType => prevType === "AND" ? "OR" : "AND");
  };
  
  // Add tag to the basic condition
  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags(prevTags => [...prevTags, tag.trim()]);
    }
  };
  
  // Remove tag from the basic condition
  const removeTag = (tag: string) => {
    setTags(prevTags => prevTags.filter(t => t !== tag));
  };
  
  // Get the current condition (either basic or advanced)
  const getCurrentCondition = (): TagCondition => {
    return {
      type: conditionType,
      tags
    };
  };
  
  return {
    conditionType,
    tags,
    useAdvancedMode,
    advancedCondition,
    setAdvancedCondition,
    setUseAdvancedMode,
    toggleConditionType,
    addTag,
    removeTag,
    getCurrentCondition
  };
}

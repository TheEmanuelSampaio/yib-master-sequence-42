
import { useState, useEffect } from 'react';
import { Instance } from '@/types';
import { useInstances } from './use-queries';

export function useCurrentInstance() {
  const { data: instances, isLoading } = useInstances();
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  
  // Load current instance from localStorage or fallback to first instance
  useEffect(() => {
    if (!instances?.length || isLoading) return;
    
    const savedInstanceId = localStorage.getItem('selectedInstanceId');
    
    if (savedInstanceId) {
      const savedInstance = instances.find(i => i.id === savedInstanceId);
      if (savedInstance) {
        setCurrentInstance(savedInstance);
        return;
      }
    }
    
    // Fallback to first active instance or just first instance
    const activeInstance = instances.find(i => i.active) || instances[0];
    if (activeInstance) {
      setCurrentInstance(activeInstance);
      localStorage.setItem('selectedInstanceId', activeInstance.id);
    }
  }, [instances, isLoading]);
  
  const selectInstance = (instance: Instance) => {
    setCurrentInstance(instance);
    localStorage.setItem('selectedInstanceId', instance.id);
  };
  
  return {
    currentInstance,
    selectInstance,
    isLoading
  };
}

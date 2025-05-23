
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface UsePagedDataOptions<T> {
  pageSize?: number;
  initialPage?: number;
  queryKey: string[];
  tableName: string;
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  filter?: Record<string, any>;
  select?: string;
  relationships?: string;
}

export function usePagedData<T>({
  pageSize = 10,
  initialPage = 1,
  queryKey,
  tableName,
  orderBy = { column: 'created_at', ascending: false },
  filter = {},
  select = '*',
  relationships = '',
}: UsePagedDataOptions<T>) {
  const [page, setPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const fetchData = async () => {
    try {
      // Fetch the total count
      const countQuery = supabase
        .from(tableName as any)
        .select('id', { count: 'exact', head: true });
      
      // Apply filters to count query
      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          countQuery.in(key, value);
        } else if (value !== undefined && value !== null && value !== '') {
          countQuery.eq(key, value);
        }
      });
      
      const { count, error: countError } = await countQuery;
      
      if (countError) throw countError;
      
      setTotalItems(count || 0);
      setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));
      
      // Fetch the paginated data
      let query = supabase
        .from(tableName as any)
        .select(`${select}${relationships ? `, ${relationships}` : ''}`)
        .order(orderBy.column, { ascending: !!orderBy.ascending })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      // Apply filters to data query
      Object.entries(filter).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
          query.in(key, value);
        } else if (value !== undefined && value !== null && value !== '') {
          query.eq(key, value);
        }
      });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data as T[];
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(`Erro ao carregar dados: ${(error as Error).message}`);
      throw error;
    }
  };

  // Use React Query for data fetching with caching
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...queryKey, page, pageSize, JSON.stringify(filter)],
    queryFn: fetchData,
    staleTime: 1000 * 60, // 1 minute
  });

  const nextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const previousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
    }
  };

  return {
    data: data || [],
    isLoading,
    isError,
    page,
    totalPages,
    totalItems,
    nextPage,
    previousPage,
    goToPage,
    pageSize,
    refetch
  };
}

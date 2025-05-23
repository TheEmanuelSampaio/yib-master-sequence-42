
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

// Pagination parameters
export type PaginationParams = {
  page: number;
  pageSize: number;
};

// Route data configuration to determine what data to load
export type RouteDataType = 
  | "clients" 
  | "instances" 
  | "sequences" 
  | "contacts" 
  | "timeRestrictions" 
  | "users"
  | "tags"
  | "none";

// Base fetcher function type
export type DataFetcher<T> = (pagination: PaginationParams) => Promise<{
  data: T[];
  count: number;
}>;

// Create fetchers for each data type
const createClientsFetcher = (): DataFetcher<any> => {
  return async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    
    // Get count of total records
    const { count, error: countError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Get paginated data
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .range(start, start + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      data: data.map(client => ({
        id: client.id,
        accountId: client.account_id,
        accountName: client.account_name,
        createdBy: client.created_by,
        createdAt: client.created_at,
        updatedAt: client.updated_at
      })),
      count: count || 0
    };
  };
};

const createContactsFetcher = (): DataFetcher<any> => {
  return async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    
    // Get count of total records
    const { count, error: countError } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Get paginated contacts
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .range(start, start + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Process contact tags in parallel for each contact
    const contactsWithTags = await Promise.all(
      data.map(async (contact) => {
        // Get tags for this contact
        const { data: tagsData } = await supabase
          .from('contact_tags')
          .select('tag_name')
          .eq('contact_id', contact.id);
          
        const tags = tagsData?.map(t => t.tag_name) || [];
        
        return {
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phone_number,
          clientId: contact.client_id,
          tags: tags,
          inboxId: contact.inbox_id,
          conversationId: contact.conversation_id,
          displayId: contact.display_id,
          createdAt: contact.created_at,
          updatedAt: contact.updated_at,
        };
      })
    );
    
    return {
      data: contactsWithTags,
      count: count || 0
    };
  };
};

const createUsersFetcher = (): DataFetcher<any> => {
  return async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    
    // Get count of total records
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Get paginated data
    const { data: profilesData, error } = await supabase
      .from('profiles')
      .select('*')
      .range(start, start + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Get user emails through RPC
    const { data: authUsersData } = await supabase
      .rpc('get_users_with_emails');
      
    // Create a map of user IDs to emails for quick lookup
    const emailMap = new Map();
    if (authUsersData && Array.isArray(authUsersData)) {
      authUsersData.forEach(userData => {
        if (userData.id && userData.email) {
          emailMap.set(userData.id, userData.email);
        }
      });
    }
    
    // Process users
    const users = profilesData.map(profile => {
      return {
        id: profile.id,
        accountName: profile.account_name,
        email: emailMap.get(profile.id) || `user-${profile.id.substring(0, 4)}@example.com`,
        role: profile.role,
        avatar: ""
      };
    });
    
    return {
      data: users,
      count: count || 0
    };
  };
};

const createTimeRestrictionsFetcher = (): DataFetcher<any> => {
  return async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    
    // Get count of total records
    const { count, error: countError } = await supabase
      .from('time_restrictions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Get paginated data
    const { data, error } = await supabase
      .from('time_restrictions')
      .select('*')
      .range(start, start + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return {
      data: data.map(restriction => ({
        id: restriction.id,
        name: restriction.name,
        active: restriction.active,
        days: restriction.days,
        startHour: restriction.start_hour,
        startMinute: restriction.start_minute,
        endHour: restriction.end_hour,
        endMinute: restriction.end_minute,
        isGlobal: true
      })),
      count: count || 0
    };
  };
};

const createTagsFetcher = (): DataFetcher<any> => {
  return async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    
    // Get count of total records
    const { count, error: countError } = await supabase
      .from('tags')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Get paginated data
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .range(start, start + pageSize - 1)
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return {
      data: data.map(tag => tag.name),
      count: count || 0
    };
  };
};

// Map route paths to specific data fetchers
const getDataTypesForRoute = (pathname: string): RouteDataType[] => {
  switch (pathname) {
    case "/settings":
      return ["users", "clients", "timeRestrictions", "tags"];
    case "/contacts":
      return ["contacts", "clients", "tags"];
    case "/instances":
      return ["clients", "instances"];
    case "/sequences":
      return ["sequences", "timeRestrictions", "tags"];
    case "/":
      return ["contacts", "sequences"]; // Dashboard
    default:
      return ["none"];
  }
};

// Hook to get fetchers needed for current route
export const useRouteDataFetchers = () => {
  const { pathname } = useLocation();
  const dataTypes = getDataTypesForRoute(pathname);
  
  const getFetcher = (type: RouteDataType): DataFetcher<any> | null => {
    switch (type) {
      case "clients":
        return createClientsFetcher();
      case "contacts":
        return createContactsFetcher();
      case "users":
        return createUsersFetcher();
      case "timeRestrictions":
        return createTimeRestrictionsFetcher();
      case "tags":
        return createTagsFetcher();
      case "none":
      default:
        return null;
    }
  };
  
  return {
    dataTypes,
    getFetcher
  };
};

// Generic hook to fetch data with pagination
export const usePagedData = <T,>(
  fetcher: DataFetcher<T> | null,
  options?: UseQueryOptions<{ data: T[]; count: number }, Error>
) => {
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    pageSize: 10
  });
  
  const [totalPages, setTotalPages] = useState(1);
  
  const queryResult = useQuery({
    queryKey: ['pagedData', options?.queryKey, pagination],
    queryFn: async () => fetcher ? await fetcher(pagination) : { data: [], count: 0 },
    enabled: !!fetcher && (options?.enabled !== false),
    ...options
  });
  
  // Calculate total pages whenever count changes
  useEffect(() => {
    if (queryResult.data?.count) {
      setTotalPages(Math.ceil(queryResult.data.count / pagination.pageSize));
    }
  }, [queryResult.data?.count, pagination.pageSize]);
  
  // Functions to change page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPagination(prev => ({ ...prev, page }));
    }
  };
  
  const nextPage = () => {
    if (pagination.page < totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };
  
  const prevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };
  
  // Change page size
  const setPageSize = (pageSize: number) => {
    setPagination({ page: 1, pageSize });
  };
  
  return {
    ...queryResult,
    pagination,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    setPageSize
  };
};

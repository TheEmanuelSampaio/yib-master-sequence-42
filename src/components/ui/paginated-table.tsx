
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

interface PaginatedTableProps<T> {
  data: T[];
  columns: {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    className?: string;
  }[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  actionColumn?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  keyExtractor: (item: T) => string;
}

export function PaginatedTable<T>({
  data,
  columns,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onNextPage,
  onPrevPage,
  actionColumn,
  emptyMessage = "Nenhum registro encontrado",
  keyExtractor,
}: PaginatedTableProps<T>) {
  // Generate page links (show max 5 pages)
  const renderPageLinks = () => {
    const pageLinks = [];
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4 && totalPages > 5) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageLinks.push(
        <PaginationItem key={i}>
          <PaginationLink 
            isActive={page === i} 
            onClick={() => onPageChange(i)}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return pageLinks;
  };
  
  // Render loading skeletons when data is loading
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              {actionColumn && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                ))}
                {actionColumn && (
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Skeleton className="h-8 w-20" />
            </PaginationItem>
            <PaginationItem>
              <Skeleton className="h-8 w-8" />
            </PaginationItem>
            <PaginationItem>
              <Skeleton className="h-8 w-8" />
            </PaginationItem>
            <PaginationItem>
              <Skeleton className="h-8 w-20" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {actionColumn && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((item) => (
              <TableRow key={keyExtractor(item)}>
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex} className={column.className}>
                    {typeof column.accessor === 'function' 
                      ? column.accessor(item) 
                      : String(item[column.accessor])
                    }
                  </TableCell>
                ))}
                {actionColumn && (
                  <TableCell className="text-right">
                    {actionColumn(item)}
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell 
                colSpan={actionColumn ? columns.length + 1 : columns.length} 
                className="text-center py-6 text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={onPrevPage} 
                className={page === 1 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {renderPageLinks()}
            
            <PaginationItem>
              <PaginationNext 
                onClick={onNextPage}
                className={page === totalPages ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}


import { ReactNode } from "react";
import { Skeleton } from "./skeleton";

interface DataLoaderProps {
  isLoading: boolean;
  children: ReactNode;
  count?: number;
  className?: string;
}

export function DataLoader({ isLoading, children, count = 3, className = "" }: DataLoaderProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={className}>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <Skeleton key={index} className="h-20 w-full mb-2" />
        ))}
    </div>
  );
}

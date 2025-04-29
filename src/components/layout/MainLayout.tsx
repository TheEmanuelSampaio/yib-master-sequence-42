
import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Spinner } from './Spinner';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { loading, user, setupCompleted } = useAuth();
  
  if (loading) {
    return <Spinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (setupCompleted === false) {
    return <Navigate to="/setup" />;
  }

  return (
    <div className="min-h-screen flex">
      <div className="fixed h-screen z-10">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>
      <div className={`flex flex-col flex-1 overflow-hidden ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}


import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "@/components/ui/toaster";
import { Outlet } from "react-router-dom";
import { ContextDebugger } from "../debug/ContextDebugger";

export const MainLayout = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-4 md:p-8 pt-0 md:pt-0 overflow-y-auto">
          <Outlet />
        </main>
        <Toaster />
        <ContextDebugger />
      </div>
    </div>
  );
};

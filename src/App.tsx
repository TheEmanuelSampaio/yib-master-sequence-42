
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Sequences from "./pages/Sequences";
import Contacts from "./pages/Contacts";
import Messages from "./pages/Messages";
import Instances from "./pages/Instances";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <AuthProvider>
        <AppProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                
                <Route element={<ProtectedRoute requireAuth={true} />}>
                  <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
                  <Route path="/sequences" element={<MainLayout><Sequences /></MainLayout>} />
                  <Route path="/contacts" element={<MainLayout><Contacts /></MainLayout>} />
                  <Route path="/messages" element={<MainLayout><Messages /></MainLayout>} />
                  <Route path="/instances" element={<MainLayout><Instances /></MainLayout>} />
                  <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
                  <Route path="/api-docs" element={<MainLayout><ApiDocs /></MainLayout>} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

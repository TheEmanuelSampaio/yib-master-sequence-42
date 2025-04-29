
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MainLayout } from "@/components/layout/MainLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Sequences from "./pages/Sequences";
import Contacts from "./pages/Contacts";
import Messages from "./pages/Messages";
import Instances from "./pages/Instances";
import Settings from "./pages/Settings";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
import Login from "./pages/Login";

// Auth components
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireSetup } from "./components/auth/RequireSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Auth Routes */}
                <Route path="/setup" element={<RequireSetup><Setup /></RequireSetup>} />
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route path="/" element={<RequireAuth><MainLayout><Dashboard /></MainLayout></RequireAuth>} />
                <Route path="/sequences" element={<RequireAuth><MainLayout><Sequences /></MainLayout></RequireAuth>} />
                <Route path="/contacts" element={<RequireAuth><MainLayout><Contacts /></MainLayout></RequireAuth>} />
                <Route path="/messages" element={<RequireAuth><MainLayout><Messages /></MainLayout></RequireAuth>} />
                <Route path="/instances" element={<RequireAuth><MainLayout><Instances /></MainLayout></RequireAuth>} />
                <Route path="/settings" element={<RequireAuth><MainLayout><Settings /></MainLayout></RequireAuth>} />
                <Route path="/api-docs" element={<RequireAuth><MainLayout><ApiDocs /></MainLayout></RequireAuth>} />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

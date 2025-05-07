
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { AppProvider } from "@/context/AppContext";

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

// Create a React Query client with optimized configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reduce retry attempts for faster failure detection
      retry: 1,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Reuse the cached data first while fetching in the background
      staleTime: 1000 * 60 * 1, // 1 minute (better balance between freshness and performance)
      // Show queries for up to 5 minutes before garbage collection
      gcTime: 1000 * 60 * 5,
      // Add better error handling
      useErrorBoundary: false,
      // Add retry delay to prevent overwhelming the server
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system">
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <Routes>
                {/* Auth Routes */}
                <Route path="/setup" element={<RequireSetup><Setup /></RequireSetup>} />
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/sequences" element={<Sequences />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/instances" element={<Instances />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                </Route>
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
    {/* Add React Query DevTools for development with smaller initial size */}
    <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
  </QueryClientProvider>
);

export default App;

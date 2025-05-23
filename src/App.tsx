// src/App.tsx
import React, { Suspense } from 'react'; // Adicione Suspense
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { AppProvider } from "@/context/AppContext";
import { Spinner } from "@/components/layout/Spinner"; // Componente de fallback

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Sequences = React.lazy(() => import('./pages/Sequences'));
const Contacts = React.lazy(() => import('./pages/Contacts'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Instances = React.lazy(() => import('./pages/Instances'));
const Settings = React.lazy(() => import('./pages/Settings'));
const ApiDocs = React.lazy(() => import('./pages/ApiDocs'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const Setup = React.lazy(() => import('./pages/Setup'));
const Login = React.lazy(() => import('./pages/Login'));

// Auth components
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireSetup } from "./components/auth/RequireSetup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
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
              <Suspense fallback={<Spinner message="Carregando página..." />}> {/* Fallback UI */}
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
              </Suspense>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from "@/components/ui/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instances from './pages/Instances';
import Sequences from './pages/Sequences';
import Messages from './pages/Messages';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import MainLayout from './layouts/MainLayout';
import RequireAuth from './components/auth/RequireAuth';
import { AuthProvider } from './context/AuthContext';
import Setup from './pages/Setup';
import RequireSetup from './components/auth/RequireSetup';
import ApiDocs from './pages/ApiDocs';

import { AppProvider } from './context/AppContext';
import { SequenceProvider } from './context/SequenceContext';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <AppProvider>
          <SequenceProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/setup" element={
                  <RequireAuth>
                    <Setup />
                  </RequireAuth>
                } />
                <Route path="/" element={
                  <RequireAuth>
                    <RequireSetup>
                      <MainLayout />
                    </RequireSetup>
                  </RequireAuth>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="instances" element={<Instances />} />
                  <Route path="sequences" element={<Sequences />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="contacts" element={<Contacts />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="api-docs" element={<ApiDocs />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
          </SequenceProvider>
        </AppProvider>
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;

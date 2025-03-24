import React, { useContext, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme } from "./styles/theme";
import { AuthContext, AuthProvider } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const auth = useContext(AuthContext);
  return auth?.token ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <AuthProvider>
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <Router>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<Navigate to="/auth" />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard
                    toggleTheme={() => setIsDarkMode((prev) => !prev)}
                  />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;

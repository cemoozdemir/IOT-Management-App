import React, {
  useContext,
  useEffect,
  useState,
} from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { ThemeProvider } from "styled-components";
import {
  darkTheme,
  lightTheme,
} from "./styles/theme";
import { GlobalStyle } from "./styles/GlobalStyle";
import {
  AuthContext,
  AuthProvider,
} from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";

const THEME_STORAGE_KEY = "iot-theme";

const getInitialDarkMode = (): boolean => {
  const stored =
    window.localStorage.getItem(
      THEME_STORAGE_KEY
    );

  if (stored === "dark") {
    return true;
  }

  if (stored === "light") {
    return false;
  }

  return (
    window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches ?? false
  );
};

interface AppRoutesProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({
  isDarkMode,
  toggleTheme,
}) => {
  const auth = useContext(AuthContext);

  if (!auth) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          auth.token ? (
            <Navigate
              to="/dashboard"
              replace
            />
          ) : (
            <AuthPage />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          auth.token ? (
            <Dashboard
              isDarkMode={isDarkMode}
              toggleTheme={toggleTheme}
            />
          ) : (
            <Navigate
              to="/auth"
              replace
            />
          )
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to={
              auth.token
                ? "/dashboard"
                : "/auth"
            }
            replace
          />
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] =
    useState<boolean>(
      getInitialDarkMode
    );

  useEffect(() => {
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      isDarkMode
        ? "dark"
        : "light"
    );
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(
      (current) => !current
    );
  };

  return (
    <AuthProvider>
      <ThemeProvider
        theme={
          isDarkMode
            ? darkTheme
            : lightTheme
        }
      >
        <GlobalStyle />

        <Router>
          <AppRoutes
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;

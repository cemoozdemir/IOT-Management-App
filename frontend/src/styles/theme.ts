import styled from "styled-components";

export const lightTheme = {
  background: "#ffffff",
  text: "#111827",
  sidebarBg: "#1f2937",
  sidebarText: "#ffffff",
  mainBg: "#f9fafb",
  cardBg: "#ffffff",

  // NEW for buttons
  buttonBg: "#f3f4f6", // light gray
  buttonHover: "#e5e7eb", // slightly darker on hover
  buttonText: "#111827", // dark readable text
  accent: "#2563eb", // blue-ish for links
};

export const darkTheme = {
  background: "#111827",
  text: "#ffffff",
  sidebarBg: "#1f2937",
  sidebarText: "#ffffff",
  mainBg: "#1f1f1f",
  cardBg: "#1e1e1e",

  // NEW for buttons
  buttonBg: "#f3f4f6",
  buttonHover: "#e5e7eb",
  buttonText: "#111827",
  accent: "#60a5fa", // light blue for links
};

// ----------------------
// Shared Styled Elements
// ----------------------

export const Wrapper = styled.div`
  display: flex;
  height: 100vh;
  background: ${(props) => props.theme.mainBg};
`;

export const VisualPane = styled.div`
  flex: 1;
  background: linear-gradient(135deg, #007cf0, #00dfd8);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  padding: 2rem;
`;

export const FormPane = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.cardBg};
`;

export const FormBox = styled.div`
  background: ${(props) => props.theme.cardBg};
  padding: 2.5rem;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
`;

export const Title = styled.h2`
  text-align: center;
  margin-bottom: 1.75rem;
  font-size: 1.5rem;
  font-weight: 600;
`;

export const ToggleText = styled.p`
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9rem;
`;

export type ThemeType = typeof lightTheme;

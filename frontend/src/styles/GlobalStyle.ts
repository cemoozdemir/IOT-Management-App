import { createGlobalStyle } from "styled-components";

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    background: ${(props) => props.theme.mainBg};
    color-scheme: ${(props) => props.theme.mode};
  }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background: ${(props) => props.theme.mainBg};
    color: ${(props) => props.theme.text};
    font-family:
      Inter,
      ui-sans-serif,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  #root {
    min-height: 100vh;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  button {
    -webkit-tap-highlight-color: transparent;
  }

  a {
    color: inherit;
  }

  ::selection {
    background: ${(props) => props.theme.selectionBg};
  }

  :focus-visible {
    outline: 3px solid ${(props) => props.theme.focusRing};
    outline-offset: 2px;
  }
`;

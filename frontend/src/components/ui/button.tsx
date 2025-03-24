import React from "react";
import styled, { css } from "styled-components";

type Variant = "default" | "outline" | "destructive" | "link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variantStyles = {
  default: css`
    background-color: ${(props) => props.theme.buttonBg};
    color: ${(props) => props.theme.buttonText};
    border: none;

    &:hover {
      background-color: ${(props) => props.theme.buttonHover};
    }
  `,
  outline: css`
    background-color: transparent;
    border: 2px solid ${(props) => props.theme.text};
    color: ${(props) => props.theme.text};

    &:hover {
      background-color: ${(props) => props.theme.hoverBg};
    }
  `,
  destructive: css`
    background-color: transparent;
    border: 2px solid #ef4444;
    color: #ef4444;

    &:hover {
      background-color: rgba(239, 68, 68, 0.1);
    }
  `,
  link: css`
    background: none;
    color: ${(props) => props.theme.accent};
    padding: 0;
    font-size: 0.9rem;
    border: none;

    &:hover {
      text-decoration: underline;
    }
  `,
};

const StyledButton = styled.button<ButtonProps>`
  all: unset;
  box-sizing: border-box; // Add this line
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 100%; // ensure 100% width here too
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  ${(props) => variantStyles[props.variant || "default"]};

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  loading,
  disabled,
  ...props
}) => {
  return (
    <StyledButton disabled={disabled || loading} {...props}>
      {loading ? "Loading..." : children}
    </StyledButton>
  );
};

export default Button;

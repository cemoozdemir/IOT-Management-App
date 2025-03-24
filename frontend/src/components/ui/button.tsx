import React from "react";
import styled, { css } from "styled-components";

type Variant = "default" | "outline" | "destructive" | "link";

interface StyledButtonProps {
  variant: Variant;
  disabled?: boolean;
}

const StyledButton = styled.button<StyledButtonProps>`
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;

  ${(props) =>
    props.variant === "default" &&
    css`
      background-color: ${props.theme.buttonBg};
      color: ${props.theme.buttonText};
      border: none;

      &:hover {
        background-color: ${props.theme.buttonHover};
      }
    `}

  ${(props) =>
    props.variant === "outline" &&
    css`
      background-color: transparent;
      border: 2px solid ${props.theme.text};
      color: ${props.theme.text};

      &:hover {
        background-color: ${props.theme.hoverBg};
      }
    `}

  ${(props) =>
    props.variant === "destructive" &&
    css`
      background-color: transparent;
      border: 2px solid red;
      color: red;

      &:hover {
        background-color: rgba(255, 0, 0, 0.1);
      }
    `}

  ${(props) =>
    props.variant === "link" &&
    css`
      background: none;
      color: ${props.theme.accent};
      padding: 0;
      font-size: 0.9rem;

      &:hover {
        text-decoration: underline;
      }
    `}

  ${(props) =>
    props.disabled &&
    css`
      opacity: 0.6;
      cursor: not-allowed;
    `}
`;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  ...props
}) => {
  return <StyledButton variant={variant} {...props} />;
};

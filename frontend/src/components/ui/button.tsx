import React from "react";
import styled, { css } from "styled-components";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "destructive"
  | "ghost"
  | "link";

export type ButtonSize =
  | "sm"
  | "md";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

interface StyledButtonProps {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
}

const variantStyles = {
  default: css`
    background: ${(props) => props.theme.primary};
    border-color: ${(props) => props.theme.primary};
    color: #ffffff;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.primaryHover};
      border-color: ${(props) => props.theme.primaryHover};
    }
  `,

  secondary: css`
    background: ${(props) => props.theme.surfaceRaised};
    border-color: ${(props) => props.theme.border};
    color: ${(props) => props.theme.text};

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.hoverBg};
    }
  `,

  outline: css`
    background: transparent;
    border-color: ${(props) => props.theme.borderStrong};
    color: ${(props) => props.theme.text};

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.hoverBg};
    }
  `,

  destructive: css`
    background: ${(props) => props.theme.dangerSoft};
    border-color: ${(props) => props.theme.dangerSoft};
    color: ${(props) => props.theme.danger};

    &:hover:not(:disabled) {
      border-color: ${(props) => props.theme.danger};
    }
  `,

  ghost: css`
    background: transparent;
    border-color: transparent;
    color: ${(props) => props.theme.textMuted};

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.hoverBg};
      color: ${(props) => props.theme.text};
    }
  `,

  link: css`
    min-height: auto;
    padding: 0;
    background: transparent;
    border-color: transparent;
    color: ${(props) => props.theme.accent};

    &:hover:not(:disabled) {
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  `,
};

const StyledButton = styled.button<StyledButtonProps>`
  display: inline-flex;
  width: ${(props) =>
    props.$fullWidth
      ? "100%"
      : "auto"};
  min-height: ${(props) =>
    props.$size === "sm"
      ? "36px"
      : "42px"};
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: ${(props) =>
    props.$size === "sm"
      ? "0.5rem 0.75rem"
      : "0.65rem 1rem"};
  border: 1px solid transparent;
  border-radius: ${(props) => props.theme.radiusSm};
  font-size: ${(props) =>
    props.$size === "sm"
      ? "0.84rem"
      : "0.92rem"};
  font-weight: 650;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color ${(props) => props.theme.transition},
    border-color ${(props) => props.theme.transition},
    color ${(props) => props.theme.transition},
    opacity ${(props) => props.theme.transition};

  ${(props) =>
    variantStyles[
      props.$variant
    ]};

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  loading = false,
  disabled,
  variant = "default",
  size = "md",
  fullWidth = false,
  type,
  ...props
}) => {
  return (
    <StyledButton
      {...props}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
    >
      {loading ? "Loading..." : children}
    </StyledButton>
  );
};

export default Button;

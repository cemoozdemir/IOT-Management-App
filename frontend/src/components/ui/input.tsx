import React from "react";
import styled from "styled-components";

const StyledInput = styled.input`
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 0.68rem 0.85rem;
  background: ${(props) => props.theme.inputBg};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: ${(props) => props.theme.radiusSm};
  color: ${(props) => props.theme.text};
  font-size: 0.93rem;
  line-height: 1.4;
  transition:
    border-color ${(props) => props.theme.transition},
    box-shadow ${(props) => props.theme.transition};

  &::placeholder {
    color: ${(props) => props.theme.textMuted};
  }

  &:hover:not(:disabled) {
    border-color: ${(props) => props.theme.borderStrong};
  }

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.primary};
    box-shadow: 0 0 0 3px ${(props) => props.theme.focusRing};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Input = (
  props: React.InputHTMLAttributes<HTMLInputElement>
) => {
  return <StyledInput {...props} />;
};

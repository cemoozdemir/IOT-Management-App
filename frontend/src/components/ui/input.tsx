import React from "react";
import styled from "styled-components";

const StyledInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid ${(props) => props.theme.border || "#ccc"};
  border-radius: 8px;
  font-size: 1rem;
  background-color: ${(props) => props.theme.inputBg || "#fff"};
  color: ${(props) => props.theme.text || "#000"};
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.accent || "#007BFF"};
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
  }

  &::placeholder {
    color: ${(props) => props.theme.muted || "#aaa"};
  }
`;

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return <StyledInput {...props} />;
};

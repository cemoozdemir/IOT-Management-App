import React from "react";
import styled from "styled-components";

const StyledSelect = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid ${(props) => props.theme.border || "#ccc"};
  border-radius: 8px;
  background-color: ${(props) => props.theme.inputBg || "#fff"};
  color: ${(props) => props.theme.text || "#000"};
  margin-bottom: 1.25rem;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.accent || "#007BFF"};
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
  }
`;

export const Select = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) => {
  return <StyledSelect {...props} />;
};

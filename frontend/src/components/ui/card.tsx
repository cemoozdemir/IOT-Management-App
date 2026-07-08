import styled from "styled-components";

export const Card = styled.section`
  min-width: 0;
  padding: 1.25rem;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: ${(props) => props.theme.radiusMd};
  box-shadow: ${(props) => props.theme.shadowSm};
`;

export const CardHeader = styled.div`
  margin-bottom: 1.1rem;
`;

export const CardTitle = styled.h2`
  margin: 0;
  color: ${(props) => props.theme.text};
  font-size: 1rem;
  line-height: 1.3;
  font-weight: 700;
  letter-spacing: -0.015em;
`;

export const CardDescription = styled.p`
  margin: 0.35rem 0 0;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.87rem;
  line-height: 1.5;
`;

export const CardContent = styled.div`
  min-width: 0;
`;

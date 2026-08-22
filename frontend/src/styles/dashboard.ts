import styled from "styled-components";
import { Card } from "../components/ui/card";

export const ErrorBanner = styled.div`
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  background: ${(props) => props.theme.dangerSoft};
  border: 1px solid ${(props) => props.theme.danger};
  border-radius: ${(props) => props.theme.radiusSm};
  color: ${(props) => props.theme.danger};
  font-size: 0.88rem;
`;

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
  margin-bottom: 1rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricCard = styled(Card)`
  padding: 1rem 1.1rem;
`;

export const MetricLabel = styled.div`
  color: ${(props) => props.theme.textMuted};
  font-size: 0.76rem;
  font-weight: 650;
`;

export const MetricValue = styled.div`
  margin-top: 0.3rem;
  color: ${(props) => props.theme.text};
  font-size: 1.75rem;
  line-height: 1;
  font-weight: 760;
  letter-spacing: -0.04em;
`;

export const MetricHint = styled.div`
  margin-top: 0.45rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.74rem;
`;

export const WorkspaceGrid = styled.div`
  display: grid;
  grid-template-columns:
    minmax(0, 0.85fr)
    minmax(340px, 1.15fr);
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const StatusLine = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  color: ${(props) => props.theme.text};
  font-size: 0.88rem;
  font-weight: 650;
`;

export const StatusDot = styled.span<{ $active?: boolean }>`
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: ${(props) =>
    props.$active
      ? props.theme.success
      : props.theme.textMuted};
`;

export const TelemetryMessage = styled.p`
  margin: 0.9rem 0 0;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.86rem;
  line-height: 1.55;
`;

export const DeviceForm = styled.form`
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, 1fr)
    auto;
  gap: 0.8rem;
  align-items: end;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.div`
  min-width: 0;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  color: ${(props) => props.theme.text};
  font-size: 0.76rem;
  font-weight: 650;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

export const CountBadge = styled.span`
  min-width: 28px;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: ${(props) => props.theme.hoverBg};
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.74rem;
  font-weight: 700;
`;

export const DeviceList = styled.div`
  display: grid;
  gap: 0.65rem;
`;

export const DeviceRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 0.9rem;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: ${(props) => props.theme.radiusSm};
  background: ${(props) => props.theme.surfaceRaised};

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

export const DeviceName = styled.div`
  color: ${(props) => props.theme.text};
  font-size: 0.9rem;
  font-weight: 700;
`;

export const DeviceMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.3rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.77rem;
`;

export const StatusBadge = styled.span<{ $online: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.22rem 0.45rem;
  border-radius: 999px;
  background: ${(props) =>
    props.$online
      ? props.theme.successSoft
      : props.theme.hoverBg};
  color: ${(props) =>
    props.$online
      ? props.theme.success
      : props.theme.textMuted};
  font-size: 0.7rem;
  font-weight: 700;

  &::before {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: currentColor;
    content: "";
  }
`;

export const DeviceActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;

  @media (max-width: 700px) {
    justify-content: flex-start;
  }
`;

export const EmptyState = styled.div`
  padding: 2.25rem 1rem;
  border: 1px dashed ${(props) => props.theme.borderStrong};
  border-radius: ${(props) => props.theme.radiusSm};
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.86rem;
  line-height: 1.55;
`;

export const CredentialNotice = styled(Card)`
  margin-bottom: 1rem;
  overflow: hidden;
  border-color: ${(props) =>
    props.theme.borderStrong};
`;

export const CredentialNoticeBody = styled.div`
  display: grid;
  gap: 1rem;
  padding: 1.1rem;
`;

export const CredentialHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

export const CredentialEyebrow = styled.div`
  margin-bottom: 0.3rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const CredentialTitle = styled.div`
  color: ${(props) => props.theme.text};
  font-size: 1rem;
  font-weight: 760;
`;

export const CredentialDescription = styled.p`
  max-width: 720px;
  margin: 0.35rem 0 0;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.82rem;
  line-height: 1.55;
`;

export const CredentialCodeRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.7rem;
  align-items: stretch;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const CredentialValue = styled.code`
  display: block;
  min-width: 0;
  padding: 0.8rem 0.9rem;
  overflow-wrap: anywhere;
  border: 1px solid ${(props) => props.theme.border};
  border-radius: ${(props) => props.theme.radiusSm};
  background: ${(props) => props.theme.hoverBg};
  color: ${(props) => props.theme.text};
  font-size: 0.78rem;
  line-height: 1.5;
  user-select: all;
`;

export const CredentialWarning = styled.div`
  padding-top: 0.85rem;
  border-top: 1px solid ${(props) => props.theme.border};
  color: ${(props) => props.theme.textMuted};
  font-size: 0.76rem;
  line-height: 1.5;
`;

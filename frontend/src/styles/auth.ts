import styled from "styled-components";
import { Input } from "../components/ui/input";

export const AuthShell = styled.main`
  min-height: 100vh;
  display: grid;
  grid-template-columns:
    minmax(380px, 0.92fr)
    minmax(440px, 1.08fr);
  background: ${(props) => props.theme.mainBg};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroPane = styled.section`
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(2rem, 5vw, 4.5rem);
  background:
    radial-gradient(
      circle at 20% 18%,
      rgba(96, 165, 250, 0.35),
      transparent 34%
    ),
    radial-gradient(
      circle at 82% 78%,
      rgba(37, 99, 235, 0.28),
      transparent 38%
    ),
    linear-gradient(
      145deg,
      #081120 0%,
      #111d35 56%,
      #172554 100%
    );
  color: #ffffff;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const HeroBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
`;

export const BrandMark = styled.div`
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: ${(props) => props.theme.primary};
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
`;

export const BrandText = styled.div`
  font-size: 0.98rem;
  font-weight: 750;
  letter-spacing: -0.015em;
`;

export const HeroContent = styled.div`
  max-width: 570px;
`;

export const HeroEyebrow = styled.div`
  margin-bottom: 1rem;
  color: #93c5fd;
  font-size: 0.76rem;
  font-weight: 750;
  letter-spacing: 0.11em;
  text-transform: uppercase;
`;

export const HeroTitle = styled.h1`
  max-width: 560px;
  margin: 0;
  font-size: clamp(2.5rem, 5vw, 4.4rem);
  line-height: 1.02;
  font-weight: 780;
  letter-spacing: -0.055em;
`;

export const HeroDescription = styled.p`
  max-width: 510px;
  margin: 1.4rem 0 0;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.7;
`;

export const FeatureList = styled.div`
  display: grid;
  gap: 0.8rem;
  margin-top: 2rem;
`;

export const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #e2e8f0;
  font-size: 0.86rem;

  &::before {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: #60a5fa;
    content: "";
  }
`;

export const HeroFooter = styled.div`
  color: #64748b;
  font-size: 0.72rem;
`;

export const FormRegion = styled.section`
  min-width: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: clamp(1.25rem, 4vw, 3.5rem);

  @media (max-width: 900px) {
    min-height: 100dvh;
  }

  @media (max-width: 520px) {
    padding: 1rem;
  }
`;

export const FormContainer = styled.div`
  width: min(100%, 460px);
`;

export const MobileBrand = styled.div`
  display: none;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 2rem;
  color: ${(props) => props.theme.text};
  font-size: 0.92rem;
  font-weight: 750;

  @media (max-width: 900px) {
    display: flex;
  }
`;

export const AuthCard = styled.div`
  padding: 2rem;
  background: ${(props) => props.theme.surface};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: ${(props) => props.theme.radiusLg};
  box-shadow: ${(props) => props.theme.shadowMd};

  @media (max-width: 520px) {
    padding: 1.4rem;
    border-radius: ${(props) => props.theme.radiusMd};
  }
`;

export const FormEyebrow = styled.div`
  margin-bottom: 0.55rem;
  color: ${(props) => props.theme.primary};
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.09em;
  text-transform: uppercase;
`;

export const FormTitle = styled.h2`
  margin: 0;
  color: ${(props) => props.theme.text};
  font-size: clamp(1.55rem, 4vw, 1.9rem);
  line-height: 1.2;
  font-weight: 760;
  letter-spacing: -0.035em;
`;

export const FormDescription = styled.p`
  margin: 0.65rem 0 1.65rem;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.88rem;
  line-height: 1.55;
`;

export const AuthForm = styled.form`
  display: grid;
  gap: 1rem;
`;

export const Field = styled.div`
  min-width: 0;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.42rem;
  color: ${(props) => props.theme.text};
  font-size: 0.78rem;
  font-weight: 680;
`;

export const AuthInput = styled(Input)`
  min-height: 46px;
`;

export const PasswordField = styled.div`
  position: relative;
`;

export const PasswordInput = styled(Input)`
  min-height: 46px;
  padding-right: 4.5rem;
`;

export const PasswordToggle = styled.button`
  position: absolute;
  top: 50%;
  right: 0.55rem;
  min-height: 32px;
  padding: 0 0.45rem;
  transform: translateY(-50%);
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.74rem;
  font-weight: 680;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${(props) => props.theme.hoverBg};
    color: ${(props) => props.theme.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ErrorMessage = styled.div`
  padding: 0.8rem 0.9rem;
  background: ${(props) => props.theme.dangerSoft};
  border: 1px solid ${(props) => props.theme.danger};
  border-radius: ${(props) => props.theme.radiusSm};
  color: ${(props) => props.theme.danger};
  font-size: 0.8rem;
  line-height: 1.45;
`;

export const ModeSwitch = styled.div`
  margin-top: 1.4rem;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.84rem;
`;

export const SecurityNote = styled.p`
  margin: 1.35rem 0 0;
  color: ${(props) => props.theme.textMuted};
  text-align: center;
  font-size: 0.72rem;
  line-height: 1.5;
`;

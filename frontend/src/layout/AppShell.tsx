import React from "react";
import styled from "styled-components";
import { Button } from "../components/ui/button";

interface AppShellProps {
  title: string;
  subtitle?: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const Shell = styled.div`
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  background: ${(props) => props.theme.mainBg};

  @media (max-width: 900px) {
    display: block;
  }
`;

const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 1.35rem 1rem;
  display: flex;
  flex-direction: column;
  background: ${(props) => props.theme.sidebarBg};
  border-right: 1px solid ${(props) => props.theme.sidebarBorder};
  color: ${(props) => props.theme.sidebarText};

  @media (max-width: 900px) {
    display: none;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.5rem 1.5rem;
`;

const BrandMark = styled.div`
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  background: ${(props) => props.theme.primary};
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.03em;
`;

const BrandText = styled.div`
  min-width: 0;
`;

const BrandName = styled.div`
  color: ${(props) => props.theme.sidebarText};
  font-size: 0.94rem;
  font-weight: 700;
`;

const BrandCaption = styled.div`
  margin-top: 0.1rem;
  color: ${(props) => props.theme.sidebarMuted};
  font-size: 0.72rem;
`;

const Navigation = styled.nav`
  flex: 1;
`;

const NavLabel = styled.div`
  padding: 0 0.55rem 0.55rem;
  color: ${(props) => props.theme.sidebarMuted};
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ActiveNavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 42px;
  padding: 0 0.75rem;
  border-radius: ${(props) => props.theme.radiusSm};
  background: rgba(255, 255, 255, 0.08);
  color: ${(props) => props.theme.sidebarText};
  font-size: 0.88rem;
  font-weight: 650;

  &::before {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: ${(props) => props.theme.primary};
    content: "";
  }
`;

const SidebarFooter = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const SidebarAction = styled(Button)`
  color: ${(props) => props.theme.sidebarText};
  border-color: ${(props) => props.theme.sidebarBorder};

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: ${(props) => props.theme.sidebarMuted};
    color: ${(props) => props.theme.sidebarText};
  }
`;

const Main = styled.main`
  min-width: 0;
`;

const MobileToolbar = styled.header`
  display: none;
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 64px;
  padding: 0.7rem 1rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: ${(props) => props.theme.surface};
  border-bottom: 1px solid ${(props) => props.theme.border};

  @media (max-width: 900px) {
    display: flex;
  }
`;

const MobileBrand = styled.div`
  color: ${(props) => props.theme.text};
  font-size: 0.92rem;
  font-weight: 750;
`;

const MobileActions = styled.div`
  display: flex;
  gap: 0.35rem;
`;

const Content = styled.div`
  width: min(100%, 1440px);
  margin: 0 auto;
  padding: 2rem 2.25rem 3rem;

  @media (max-width: 1100px) {
    padding: 1.6rem;
  }

  @media (max-width: 640px) {
    padding: 1.15rem 1rem 2rem;
  }
`;

const PageHeader = styled.header`
  margin-bottom: 1.5rem;
`;

const PageTitle = styled.h1`
  margin: 0;
  color: ${(props) => props.theme.text};
  font-size: clamp(1.55rem, 2.4vw, 2rem);
  line-height: 1.18;
  font-weight: 760;
  letter-spacing: -0.035em;
`;

const PageSubtitle = styled.p`
  max-width: 680px;
  margin: 0.45rem 0 0;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.92rem;
  line-height: 1.55;
`;

export const AppShell: React.FC<AppShellProps> = ({
  title,
  subtitle,
  isDarkMode,
  onToggleTheme,
  onLogout,
  children,
}) => {
  return (
    <Shell>
      <Sidebar>
        <Brand>
          <BrandMark>IO</BrandMark>

          <BrandText>
            <BrandName>
              IoT Manager
            </BrandName>

            <BrandCaption>
              Control Center
            </BrandCaption>
          </BrandText>
        </Brand>

        <Navigation
          aria-label="Primary navigation"
        >
          <NavLabel>
            Workspace
          </NavLabel>

          <ActiveNavItem
            aria-current="page"
          >
            Overview
          </ActiveNavItem>
        </Navigation>

        <SidebarFooter>
          <SidebarAction
            variant="ghost"
            fullWidth
            onClick={onToggleTheme}
          >
            {isDarkMode
              ? "Light mode"
              : "Dark mode"}
          </SidebarAction>

          <SidebarAction
            variant="outline"
            fullWidth
            onClick={onLogout}
          >
            Sign out
          </SidebarAction>
        </SidebarFooter>
      </Sidebar>

      <Main>
        <MobileToolbar>
          <MobileBrand>
            IoT Manager
          </MobileBrand>

          <MobileActions>
            <Button
              variant="ghost"
              size="sm"
              aria-label={
                isDarkMode
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={onToggleTheme}
            >
              Theme
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
            >
              Sign out
            </Button>
          </MobileActions>
        </MobileToolbar>

        <Content>
          <PageHeader>
            <PageTitle>
              {title}
            </PageTitle>

            {subtitle && (
              <PageSubtitle>
                {subtitle}
              </PageSubtitle>
            )}
          </PageHeader>

          {children}
        </Content>
      </Main>
    </Shell>
  );
};

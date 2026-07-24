import styled from "styled-components";

export const CameraForm =
  styled.form`
    display: grid;
    grid-template-columns:
      minmax(150px, 0.8fr)
      minmax(160px, 1fr)
      minmax(260px, 1.5fr)
      auto;
    gap: 0.75rem;
    align-items: end;
    margin-bottom: 1rem;

    @media (max-width: 980px) {
      grid-template-columns:
        1fr 1fr;
    }

    @media (max-width: 680px) {
      grid-template-columns:
        1fr;
    }
  `;

export const CameraSelect =
  styled.select`
    width: 100%;
    height: 38px;
    padding: 0 0.7rem;
    border: 1px solid
      ${(props) =>
        props.theme.border};
    border-radius:
      ${(props) =>
        props.theme.radiusSm};
    outline: none;
    background:
      ${(props) =>
        props.theme.surfaceRaised};
    color:
      ${(props) =>
        props.theme.text};
    font: inherit;
    font-size: 0.84rem;

    &:focus {
      border-color:
        ${(props) =>
          props.theme.borderStrong};
    }
  `;

export const CameraToggleRow =
  styled.label`
    display: flex;
    min-height: 38px;
    align-items: center;
    gap: 0.55rem;
    color:
      ${(props) =>
        props.theme.text};
    font-size: 0.78rem;
    font-weight: 650;
    cursor: pointer;
  `;

export const CameraCheckbox =
  styled.input`
    width: 16px;
    height: 16px;
    accent-color:
      ${(props) =>
        props.theme.primary};
  `;

export const CameraHint =
  styled.p`
    margin: 0 0 1rem;
    color:
      ${(props) =>
        props.theme.textMuted};
    font-size: 0.76rem;
    line-height: 1.55;
  `;

export const CameraError =
  styled.div`
    margin-bottom: 0.9rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid
      ${(props) =>
        props.theme.danger};
    border-radius:
      ${(props) =>
        props.theme.radiusSm};
    background:
      ${(props) =>
        props.theme.dangerSoft};
    color:
      ${(props) =>
        props.theme.danger};
    font-size: 0.78rem;
  `;

export const CameraList =
  styled.div`
    display: grid;
    gap: 0.7rem;
  `;

export const CameraRow =
  styled.div`
    display: grid;
    grid-template-columns:
      minmax(0, 1fr)
      auto;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem;
    border: 1px solid
      ${(props) =>
        props.theme.border};
    border-radius:
      ${(props) =>
        props.theme.radiusSm};
    background:
      ${(props) =>
        props.theme.surfaceRaised};

    @media (max-width: 760px) {
      grid-template-columns: 1fr;
    }
  `;

export const CameraName =
  styled.div`
    color:
      ${(props) =>
        props.theme.text};
    font-size: 0.9rem;
    font-weight: 700;
  `;

export const CameraMeta =
  styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.35rem;
    color:
      ${(props) =>
        props.theme.textMuted};
    font-size: 0.75rem;
  `;

export const CameraBadge =
  styled.span<{
    $active?: boolean;
  }>`
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    background:
      ${(props) =>
        props.$active
          ? props.theme.successSoft
          : props.theme.hoverBg};
    color:
      ${(props) =>
        props.$active
          ? props.theme.success
          : props.theme.textMuted};
    font-size: 0.68rem;
    font-weight: 700;
  `;

export const CameraActions =
  styled.div`
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.45rem;

    @media (max-width: 760px) {
      justify-content:
        flex-start;
    }
  `;

export const CameraEditPanel =
  styled.form`
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns:
      minmax(160px, 1fr)
      minmax(260px, 1.5fr)
      auto;
    gap: 0.75rem;
    align-items: end;
    padding-top: 0.85rem;
    border-top: 1px solid
      ${(props) =>
        props.theme.border};

    @media (max-width: 760px) {
      grid-template-columns:
        1fr;
    }
  `;

export const CameraEditActions =
  styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  `;

export const CameraSecurityNote =
  styled.div`
    margin-top: 0.85rem;
    padding-top: 0.75rem;
    border-top: 1px solid
      ${(props) =>
        props.theme.border};
    color:
      ${(props) =>
        props.theme.textMuted};
    font-size: 0.72rem;
    line-height: 1.5;
  `;

export const CameraStreamPath =
  styled.code`
    padding: 0.12rem 0.3rem;
    border-radius: 4px;
    background:
      ${(props) =>
        props.theme.hoverBg};
    color:
      ${(props) =>
        props.theme.textMuted};
    font-size: 0.68rem;
  `;

import styled
  from "styled-components";

export const CameraLivePanel =
  styled.div`
    grid-column:
      1 / -1;

    display:
      grid;

    gap:
      0.65rem;

    padding-top:
      0.9rem;

    border-top:
      1px solid
      ${(props) =>
        props.theme.border};
  `;

export const CameraLiveHeader =
  styled.div`
    display:
      flex;

    align-items:
      center;

    justify-content:
      space-between;

    gap:
      0.75rem;

    color:
      ${(props) =>
        props.theme.text};

    font-size:
      0.8rem;

    font-weight:
      700;
  `;

export const CameraLiveStatus =
  styled.span<{
    $error?:
      boolean;
  }>`
    color:
      ${(props) =>
        props.$error
          ? props.theme.danger
          : props.theme.textMuted};

    font-size:
      0.72rem;

    font-weight:
      600;
  `;

export const CameraVideoFrame =
  styled.div`
    position:
      relative;

    overflow:
      hidden;

    width:
      100%;

    aspect-ratio:
      16 / 9;

    border:
      1px solid
      ${(props) =>
        props.theme.border};

    border-radius:
      ${(props) =>
        props.theme.radiusSm};

    background:
      #000;
  `;

export const CameraVideo =
  styled.video`
    display:
      block;

    width:
      100%;

    height:
      100%;

    object-fit:
      contain;

    background:
      #000;
  `;

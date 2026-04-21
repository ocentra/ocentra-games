import "./HudButtonEditorModal.css";
import { useEffect, useRef, useState } from "react";
import { CardGameDesignStudio, type CardGameDesignStudioProps } from "./CardGameDesignStudio";

export type HudButtonEditorModalProps = CardGameDesignStudioProps & {
  open: boolean;
  onClose: () => void;
};

export function HudButtonEditorModal(props: HudButtonEditorModalProps) {
  const { open, onClose } = props;
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 24, y: 24 });
  const [modalSize] = useState({ width: 832, height: 468 });
  const [isDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModalPosition({ x: (window.innerWidth - 832) / 2, y: (window.innerHeight - 468) / 2 });
  }, [open]);

  if (!open) return null;

  return (
    <div className="game-screen__hud-button-modal-backdrop">
      <div className="game-screen__hud-button-modal-dismiss" onClick={onClose} />
      <div 
        ref={modalRef} 
        className="game-screen__hud-button-modal" 
        style={{ left: modalPosition.x, top: modalPosition.y, width: modalSize.width, height: modalSize.height }}
        data-dragging={isDragging}
      >
        <div className="game-screen__hud-button-modal-titlebar">
          <span>Card Game Design Studio</span>
          <button className="game-screen__hud-button-modal-close" onClick={onClose}>×</button>
        </div>
        <CardGameDesignStudio {...props} />
      </div>
    </div>
  );
}

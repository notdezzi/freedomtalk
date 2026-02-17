import React from "react";
export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    size?: "sm" | "md" | "lg";
    showCloseButton?: boolean;
}
export declare function Modal({ isOpen, onClose, title, description, children, className, size, showCloseButton, }: ModalProps): React.JSX.Element | null;
//# sourceMappingURL=Modal.d.ts.map
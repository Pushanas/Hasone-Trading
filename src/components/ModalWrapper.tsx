import React, { useEffect, useState, useCallback } from 'react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
  className?: string;
  children: React.ReactNode;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  maxWidth = 'max-w-md',
  className = '',
  children,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Sync open/close states with animation timing
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered && !isClosing) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 230);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered, isClosing]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !isClosing) {
        setIsClosing(true);
        setTimeout(() => {
          setIsRendered(false);
          setIsClosing(false);
          onClose();
        }, 220);
      }
    },
    [isClosing, onClose]
  );

  // Handle Escape key
  useEffect(() => {
    if (!isRendered) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosing) {
        setIsClosing(true);
        setTimeout(() => {
          setIsRendered(false);
          setIsClosing(false);
          onClose();
        }, 220);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRendered, isClosing, onClose]);

  if (!isRendered) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 select-none ${
        isClosing ? 'modal-backdrop-closing' : 'modal-backdrop-animate'
      }`}
    >
      <div
        className={`w-full ${maxWidth} modal-glass-container ${
          isClosing ? 'closing' : ''
        } ${className}`}
      >
        {children}
      </div>
    </div>
  );
};

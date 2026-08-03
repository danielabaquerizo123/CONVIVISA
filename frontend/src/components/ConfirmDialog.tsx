import React from 'react';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
}) => {
  if (!isOpen) return null;

  const typeClasses = {
    danger: 'text-brand-negative bg-brand-negative/10 border-brand-negative/20',
    warning: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20',
    info: 'text-brand-forest bg-brand-forest/10 border-white/10',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#2B2420]/45 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-[#FAF7F2] border border-brand-secondary/30 rounded-lg max-w-md w-full shadow-2xl p-6 overflow-hidden">
        <div className="flex gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${typeClasses[type]}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 text-left">
            <h3 className="text-lg font-bold text-brand-text font-serif">{title}</h3>
            <p className="text-xs text-brand-secondary leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {cancelText}
          </Button>
          <Button 
            variant={type === 'danger' ? 'danger' : 'primary'} 
            size="sm" 
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

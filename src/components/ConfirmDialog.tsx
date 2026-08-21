import React from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认执行',
  cancelText = '取消',
  variant = 'danger',
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-100',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-100',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500'
        };
      case 'primary':
      default:
        return {
          icon: <HelpCircle className="w-6 h-6 text-indigo-600" />,
          iconBg: 'bg-indigo-100',
          btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 transform transition-all animate-in fade-in zoom-in duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {title}
            </h3>
            <div className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
              {message}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition ${styles.btnBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

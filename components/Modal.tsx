import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface ModalProps {
    isOpen: boolean;
    type?: 'alert' | 'confirm';
    title?: string;
    message: React.ReactNode;
    onClose?: () => void;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    type = 'alert',
    title,
    message,
    onClose,
    onConfirm,
    confirmLabel = '확인',
    cancelLabel = '취소'
}) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (type === 'confirm' && onClose) onClose();
                if (type === 'alert' && onClose) onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, type]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                ref={modalRef}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-scaleIn"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6 text-center">
                    {/* Icon based on type */}
                    <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${type === 'alert' ? 'bg-indigo-100' : 'bg-rose-100'
                        }`}>
                        {type === 'alert' ? (
                            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                        ) : (
                            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        )}
                    </div>

                    {title && (
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {title}
                        </h3>
                    )}

                    <div className="text-sm text-slate-600 leading-relaxed mb-6">
                        {message}
                    </div>

                    <div className={`flex gap-3 ${type === 'alert' ? 'justify-center' : 'justify-between'}`}>
                        {type === 'confirm' && (
                            <Button
                                variant="secondary"
                                onClick={onClose}
                                className="flex-1"
                            >
                                {cancelLabel}
                            </Button>
                        )}
                        <Button
                            variant={type === 'confirm' ? 'danger' : 'primary'}
                            onClick={onConfirm || onClose}
                            className={type === 'alert' ? 'w-full' : 'flex-1'}
                            bouncy
                        >
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

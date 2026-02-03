import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal } from '../components/Modal';

interface ModalOptions {
    title?: string;
    confirmLabel?: string;
    cancelLabel?: string;
}

interface ModalContextType {
    showAlert: (message: React.ReactNode, options?: ModalOptions) => Promise<void>;
    showConfirm: (message: React.ReactNode, options?: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        message: React.ReactNode;
        options?: ModalOptions;
        resolve?: (value: any) => void;
    }>({
        isOpen: false,
        type: 'alert',
        message: '',
    });

    const showAlert = useCallback((message: React.ReactNode, options?: ModalOptions) => {
        return new Promise<void>((resolve) => {
            setModalState({
                isOpen: true,
                type: 'alert',
                message,
                options,
                resolve: () => {
                    setModalState((prev) => ({ ...prev, isOpen: false }));
                    resolve();
                },
            });
        });
    }, []);

    const showConfirm = useCallback((message: React.ReactNode, options?: ModalOptions) => {
        return new Promise<boolean>((resolve) => {
            setModalState({
                isOpen: true,
                type: 'confirm',
                message,
                options,
                resolve: (value: boolean) => {
                    setModalState((prev) => ({ ...prev, isOpen: false }));
                    resolve(value);
                },
            });
        });
    }, []);

    const handleClose = () => {
        if (modalState.type === 'confirm' && modalState.resolve) {
            modalState.resolve(false);
        } else if (modalState.resolve) {
            modalState.resolve(null);
        }
    };

    const handleConfirm = () => {
        if (modalState.resolve) {
            modalState.resolve(true);
        }
    };

    return (
        <ModalContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <Modal
                isOpen={modalState.isOpen}
                type={modalState.type}
                message={modalState.message}
                title={modalState.options?.title}
                confirmLabel={modalState.options?.confirmLabel}
                cancelLabel={modalState.options?.cancelLabel}
                onClose={handleClose}
                onConfirm={handleConfirm}
            />
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

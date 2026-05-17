import React from 'react';
import { Modal } from './Modal';
import { Button, CancelButton } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'primary' | 'danger';
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  variant = 'primary'
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} description={description} size="md">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CancelButton onClick={onCancel}>{cancelLabel}</CancelButton>
        <Button
          color={variant === 'danger' ? 'danger' : 'primary-destructive'}
          size="md"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

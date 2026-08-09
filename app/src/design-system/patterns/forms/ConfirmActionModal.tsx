import React, { useId, useState } from 'react';
import { Button } from '@/design-system/components/actions/Button';
import { Input } from '@/design-system/components/forms/Input';
import { Notice } from '@/design-system/components/feedback/Notice';
import { BottomSheetModal } from '@/design-system/components/overlays/BottomSheetModal';
import { ModalActions } from '@/design-system/components/overlays/ModalActions';

interface ConfirmActionModalReasonProps {
  label?: string;
  placeholder: string;
  rows?: number;
  variant?: React.ComponentProps<typeof Input>['variant'];
  inputClassName?: string;
}

interface ConfirmActionModalProps {
  title: string;
  /** 'destructive' (default) wraps `description` in a destructive Notice — for actions that
   * are themselves irreversible. 'plain' renders it as a muted paragraph instead, for asks
   * that aren't destructive on their own (e.g. requesting someone else review a removal). */
  tone?: 'destructive' | 'plain';
  description: React.ReactNode;
  /** Omit for a plain yes/no confirmation. When present, confirm stays disabled until the
   * trimmed value is non-empty, and that trimmed value is what onConfirm receives. */
  reason?: ConfirmActionModalReasonProps;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
  isSubmitting?: boolean;
  backdropOpacity?: 40 | 50 | 60;
}

// Shell shared by every "confirm this action" bottom sheet — a heading, a description, an
// optional reason textarea gating confirm on a non-empty trimmed value, and a Cancel/Confirm
// footer wired to isSubmitting. Extracted from DeleteChapterModal, DeletePhotoModal,
// RevokeAccessModal and RemovalRequestModal, which had each reimplemented this same shape
// (two of them copying the exact same "reason.trim() && onConfirm(reason.trim())" /
// "disabled={!reason.trim() || isSubmitting}" pair verbatim) — see
// docs/adr/0002-design-system-taxonomy.md's litmus test for why this is the reusable
// mechanism (Patterns), while the copy and domain wiring of each caller stays a Feature.
export function ConfirmActionModal({
  title,
  tone = 'destructive',
  description,
  reason,
  confirmLabel,
  confirmVariant = 'danger',
  onCancel,
  onConfirm,
  isSubmitting = false,
  backdropOpacity,
}: ConfirmActionModalProps) {
  const [reasonValue, setReasonValue] = useState('');
  const reasonInputId = useId();

  const trimmedReason = reasonValue.trim();
  const confirmDisabled = isSubmitting || (!!reason && !trimmedReason);

  const handleConfirm = () => {
    if (confirmDisabled) return;
    onConfirm(reason ? trimmedReason : undefined);
  };

  return (
    <BottomSheetModal onCancel={onCancel} desktopCentered backdropOpacity={backdropOpacity}>
      <h2 className="font-serif text-xl text-foreground mb-1">{title}</h2>

      {tone === 'destructive' ? (
        <Notice variant="destructive" size="sm" className="mb-5 mt-3">
          {description}
        </Notice>
      ) : (
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
      )}

      {reason && (
        <Input
          id={reasonInputId}
          label={reason.label}
          value={reasonValue}
          onChange={setReasonValue}
          placeholder={reason.placeholder}
          rows={reason.rows ?? 3}
          multiline
          disabled={isSubmitting}
          variant={reason.variant}
          className="mb-5"
          labelClassName={reason.label ? 'block text-sm font-medium text-foreground' : undefined}
          inputClassName={reason.inputClassName}
          autoFocus
        />
      )}

      <ModalActions className="pt-0">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant={confirmVariant}
          onClick={handleConfirm}
          disabled={confirmDisabled}
          isLoading={isSubmitting}
        >
          {confirmLabel}
        </Button>
      </ModalActions>
    </BottomSheetModal>
  );
}

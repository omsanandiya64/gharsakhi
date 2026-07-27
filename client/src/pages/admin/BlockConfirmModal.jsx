import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';

export function BlockConfirmModal({ open, account, isBlocking, submitting, onClose, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title={isBlocking ? 'Block this account?' : 'Unblock this account?'}>
      <div className="space-y-4">
        <p className="text-sm text-gs-ink">
          {isBlocking
            ? `${account?.name} will no longer be able to use GharSakhi.`
            : `${account?.name} will be able to use GharSakhi again.`}
        </p>
        <Button variant={isBlocking ? 'danger' : 'primary'} fullWidth disabled={submitting} onClick={onConfirm}>
          {submitting ? 'Please wait...' : isBlocking ? 'Block account' : 'Unblock account'}
        </Button>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';

export function DeclineModal({ open, onClose, onConfirm, submitting }) {
  const [reason, setReason] = useState('');

  function handleClose() {
    setReason('');
    onClose();
  }

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  return (
    <Modal open={open} onClose={handleClose} title="Decline this job">
      <div className="space-y-4">
        <div>
          <label htmlFor="decline-reason" className="block text-sm font-semibold text-gs-ink mb-1">
            Reason
          </label>
          <textarea
            id="decline-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Too far, already booked at that time"
            className="w-full px-4 py-3 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
          />
        </div>
        <Button variant="danger" fullWidth disabled={submitting || !reason.trim()} onClick={handleConfirm}>
          {submitting ? 'Declining...' : 'Confirm decline'}
        </Button>
      </div>
    </Modal>
  );
}

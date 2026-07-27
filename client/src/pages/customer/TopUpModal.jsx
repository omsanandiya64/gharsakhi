import { useState } from 'react';
import { createPaymentOrder, verifyPayment } from '../../api/payments.js';
import { loadRazorpayScript } from '../../lib/razorpay.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import { Modal } from '../../components/Modal.jsx';
import { Button } from '../../components/Button.jsx';

const PRESETS_RUPEES = [500, 1000, 2000];

export function TopUpModal({ open, onClose, onSuccess }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [amountRupees, setAmountRupees] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [status, setStatus] = useState('idle');

  const selectedRupees = customAmount ? Number(customAmount) : amountRupees;

  async function handlePay() {
    if (!selectedRupees || selectedRupees <= 0) {
      showToast('Enter a valid amount.', 'error');
      return;
    }

    setStatus('loading');
    const amountPaise = Math.round(selectedRupees * 100);

    let order;
    try {
      order = await createPaymentOrder(amountPaise);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Could not start the payment.', 'error');
      setStatus('idle');
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      showToast('Could not load the payment provider. Please try again.', 'error');
      setStatus('idle');
      return;
    }

    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount_paise,
      currency: 'INR',
      name: 'GharSakhi',
      description: 'Wallet top-up',
      order_id: order.order_id,
      prefill: { name: user?.name, contact: user?.phone, email: user?.email || undefined },
      theme: { color: '#14807C' },
      handler: async (response) => {
        try {
          await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          showToast('Wallet topped up!', 'success');
          onSuccess();
          onClose();
        } catch (err) {
          showToast(err.response?.data?.error?.message || 'Could not verify your payment.', 'error');
        } finally {
          setStatus('idle');
        }
      },
      modal: {
        // User dismissed the checkout without paying - the order stays
        // 'created' server-side, nothing to verify, no wallet change, and
        // this is a normal cancellation, not an error worth a toast.
        ondismiss: () => setStatus('idle'),
      },
    });

    rzp.open();
  }

  return (
    <Modal open={open} onClose={onClose} title="Top up your wallet">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {PRESETS_RUPEES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setAmountRupees(preset);
                setCustomAmount('');
              }}
              className={`min-h-[48px] rounded-xl border-2 font-semibold ${
                !customAmount && amountRupees === preset
                  ? 'border-gs-teal-600 bg-gs-teal-100 text-gs-teal-900'
                  : 'border-gs-teal-100 text-gs-ink'
              }`}
            >
              ₹{preset}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="custom-amount" className="block text-sm font-semibold text-gs-ink mb-1">
            Or enter a custom amount
          </label>
          <input
            id="custom-amount"
            type="number"
            min="1"
            placeholder="e.g. 750"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full min-h-[48px] px-4 rounded-xl border border-gs-teal-100 focus:border-gs-teal-600 outline-none text-base"
          />
        </div>

        <Button variant="primary" fullWidth disabled={status === 'loading'} onClick={handlePay}>
          {status === 'loading' ? 'Opening checkout...' : `Pay ₹${selectedRupees || 0}`}
        </Button>
      </div>
    </Modal>
  );
}

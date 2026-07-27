import api from './client.js';

export async function createPaymentOrder(amountPaise) {
  const { data } = await api.post('/payments/order', { amount_paise: amountPaise });
  return data;
}

export async function verifyPayment(payload) {
  const { data } = await api.post('/payments/verify', payload);
  return data;
}

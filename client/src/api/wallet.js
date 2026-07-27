import api from './client.js';

export async function getCustomerWallet(params = {}) {
  const { data } = await api.get('/customer/wallet', { params });
  return data;
}

export async function getWorkerWallet(params = {}) {
  const { data } = await api.get('/worker/wallet', { params });
  return data;
}

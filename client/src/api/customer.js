import api from './client.js';

export async function updateCustomerProfile(payload) {
  const { data } = await api.patch('/customer/me', payload);
  return data;
}

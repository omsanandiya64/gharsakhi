import api from './client.js';

export async function loginCustomer(payload) {
  const { data } = await api.post('/auth/customer/login', payload);
  return data;
}

export async function registerCustomer(payload) {
  const { data } = await api.post('/auth/customer/register', payload);
  return data;
}

export async function loginWorker(payload) {
  const { data } = await api.post('/auth/worker/login', payload);
  return data;
}

export async function registerWorker(payload) {
  const { data } = await api.post('/auth/worker/register', payload);
  return data;
}

export async function loginAdmin(payload) {
  const { data } = await api.post('/auth/admin/login', payload);
  return data;
}

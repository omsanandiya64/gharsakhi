import api from './client.js';

export async function getAdminStats() {
  const { data } = await api.get('/admin/stats');
  return data;
}

export async function listAdminBookings(params = {}) {
  const { data } = await api.get('/admin/bookings', { params });
  return data;
}

export async function listAdminCustomers(params = {}) {
  const { data } = await api.get('/admin/customers', { params });
  return data;
}

export async function listAdminWorkers(params = {}) {
  const { data } = await api.get('/admin/workers', { params });
  return data;
}

export async function setAdminCustomerBlocked(id, isBlocked) {
  const { data } = await api.patch(`/admin/customers/${id}/block`, { is_blocked: isBlocked });
  return data;
}

export async function setAdminWorkerBlocked(id, isBlocked) {
  const { data } = await api.patch(`/admin/workers/${id}/block`, { is_blocked: isBlocked });
  return data;
}

export async function listAdminTransactions(params = {}) {
  const { data } = await api.get('/admin/transactions', { params });
  return data;
}

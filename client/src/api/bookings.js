import api from './client.js';

export async function matchWorkers(params) {
  const { data } = await api.get('/customer/workers', { params });
  return data;
}

export async function createBooking(payload) {
  const { data } = await api.post('/bookings', payload);
  return data;
}

export async function listCustomerBookings(params = {}) {
  const { data } = await api.get('/customer/bookings', { params });
  return data;
}

export async function getCustomerBookingDetail(id) {
  const { data } = await api.get(`/customer/bookings/${id}`);
  return data;
}

export async function cancelBooking(id) {
  const { data } = await api.post(`/customer/bookings/${id}/cancel`);
  return data;
}

export async function reviewBooking(id, payload) {
  const { data } = await api.post(`/customer/bookings/${id}/review`, payload);
  return data;
}

export async function getCustomerUpdates(since) {
  const { data } = await api.get('/customer/updates', { params: since ? { since } : {} });
  return data;
}

export async function getWorkerRequests() {
  const { data } = await api.get('/worker/requests');
  return data;
}

export async function acceptBooking(id) {
  const { data } = await api.post(`/worker/bookings/${id}/accept`);
  return data;
}

export async function declineBooking(id, reason) {
  const { data } = await api.post(`/worker/bookings/${id}/decline`, { reason });
  return data;
}

export async function completeBooking(id) {
  const { data } = await api.post(`/worker/bookings/${id}/complete`);
  return data;
}

export async function listWorkerBookings(params = {}) {
  const { data } = await api.get('/worker/bookings', { params });
  return data;
}

export async function getWorkerReviews(params = {}) {
  const { data } = await api.get('/worker/reviews', { params });
  return data;
}

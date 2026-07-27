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

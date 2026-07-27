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

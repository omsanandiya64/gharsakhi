import api from './client.js';

export async function getWorkerMe() {
  const { data } = await api.get('/worker/me');
  return data;
}

export async function updateWorkerProfile(payload) {
  const { data } = await api.patch('/worker/me', payload);
  return data;
}

export async function setWorkerAvailability(isOnline) {
  const { data } = await api.patch('/worker/availability', { is_online: isOnline });
  return data;
}

export async function setWorkerServices(serviceIds) {
  const { data } = await api.put('/worker/services', { service_ids: serviceIds });
  return data;
}

export async function setWorkerAreas(areaIds) {
  const { data } = await api.put('/worker/areas', { area_ids: areaIds });
  return data;
}

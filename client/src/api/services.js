import api from './client.js';

export async function listServices() {
  const { data } = await api.get('/services');
  return data;
}

export async function listAreas() {
  const { data } = await api.get('/areas');
  return data;
}

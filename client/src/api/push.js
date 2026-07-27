import api from './client.js';

export async function getPushPublicKey() {
  const { data } = await api.get('/push/public-key');
  return data;
}

export async function subscribePush(subscription) {
  const { data } = await api.post('/push/subscribe', subscription);
  return data;
}

export async function unsubscribePush(endpoint) {
  const { data } = await api.delete('/push/subscribe', { data: { endpoint } });
  return data;
}

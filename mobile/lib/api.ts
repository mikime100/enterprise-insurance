import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// adb reverse tcp:5000 tcp:5000 maps phone localhost:5000 -> PC port 5000
export const API_BASE = 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

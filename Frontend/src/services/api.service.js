import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || `https://test-monitor-api.empcloud.com/api/v3`;
const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_URL || `wss://test-monitor-ws.empcloud.com`;
const BACKEND_V4_URL = import.meta.env.VITE_BACKEND_V4_URL || `https://test-monitor-api.empcloud.com`;

const authInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
});

const apiInstance = axios.create({
    baseURL: BASE_URL,
});

apiInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    // Don't override Content-Type for FormData — axios sets the correct
    // multipart/form-data boundary automatically when data is a FormData.
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }
    return config;
});

const loginApiInstance = axios.create({
    baseURL: BACKEND_V4_URL,
    headers: {
        'Content-Type': 'application/json'
    },
});

export default {
    authInstance: authInstance,
    apiInstance: apiInstance,
    SOCKET_BASE_URL,
    loginApiInstance
};
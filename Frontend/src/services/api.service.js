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
    // GET/HEAD have no body — skip Content-Type so the request stays closer to a
    // "simple" request where possible. (Authorization still triggers CORS preflight
    // for cross-origin calls; OPTIONS in server logs is normal, then the real GET.)
    const method = (config.method || 'get').toLowerCase();
    if (method === 'get' || method === 'head') {
        delete config.headers['Content-Type'];
        // Avoid browser disk/memory cache + 304 on API GETs (nginx/ETag often causes stale JSON).
        config.headers['Cache-Control'] = 'no-cache';
        config.headers['Pragma'] = 'no-cache';
        config.headers['Expires'] = '0';
        // Unique URL so XHR does not reuse a cached 200 (headers alone are not always enough).
        config.params = {
            ...(config.params && typeof config.params === 'object' ? config.params : {}),
            _nc: Date.now(),
        };
        return config;
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
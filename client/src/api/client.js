import axios from 'axios';

// 生产环境用 VITE_API_URL，本地开发走 Vite 代理
const baseURL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({ baseURL });

// 请求拦截器：附加 JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：401 时清除 token 并跳转登录
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;

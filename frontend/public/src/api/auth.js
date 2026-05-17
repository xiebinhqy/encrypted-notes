import { apiRequest } from './index.js';

export async function login(loginData) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: loginData
  });
}

export async function getUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest('/api/user/info', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

export const authAPI = {
  login,
  getUserInfo
};
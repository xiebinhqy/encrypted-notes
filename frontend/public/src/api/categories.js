import { apiRequest } from './index.js';

export async function getCategories() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest('/api/categories', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

export async function createCategory(categoryData) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest('/api/categories', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: categoryData
  });
}

export const categoriesAPI = {
  getCategories,
  createCategory
};
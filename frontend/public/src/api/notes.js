import { apiRequest } from './index.js';

export async function getNotes(categoryId = null) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  
  let url = '/api/notes';
  const params = new URLSearchParams();
  if (categoryId) params.append('category_id', categoryId);
  if (params.toString()) url += `?${params.toString()}`;

  return apiRequest(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

export async function getNote(noteId) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest(`/api/notes/${noteId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

export async function createNote(noteData) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest('/api/notes', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: noteData
  });
}

export async function updateNote(noteId, noteData) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest(`/api/notes/${noteId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: noteData
  });
}

export async function deleteNote(noteId) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest(`/api/notes/${noteId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}

export const notesAPI = {
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote
};
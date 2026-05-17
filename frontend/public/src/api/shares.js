import { apiRequest } from './index.js';

export async function createShare(noteId, shareData) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('未登录');
  return apiRequest(`/api/notes/${noteId}/share`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: shareData
  });
}

export async function getShareContent(shareKey) {
  return apiRequest(`/api/share/${shareKey}`);
}

export const sharesAPI = {
  createShare,
  getShareContent
};
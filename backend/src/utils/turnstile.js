/**
 * Cloudflare Turnstile 验证码验证工具
 * @version v2.1.1
 * @date 2026-05-20
 */

import { CaptchaError } from './errors.js';
import logger from './logger.js';

/**
 * 验证Turnstile验证码
 * @param {string} token - 验证码令牌
 * @param {string} secretKey - Turnstile密钥
 * @returns {Promise<boolean>} 验证结果
 * @throws {CaptchaError} 验证失败时抛出
 */
export async function verifyTurnstile(token, secretKey) {
  if (!token) {
    throw new CaptchaError('Captcha token is required');
  }
  
  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!data.success) {
      logger.warn('Turnstile verification failed', {
        errorCodes: data['error-codes']
      });
      throw new CaptchaError('Captcha verification failed');
    }
    
    return true;
    
  } catch (error) {
    if (error instanceof CaptchaError) {
      throw error;
    }
    
    logger.error('Turnstile verification error', { error: error.message });
    throw new CaptchaError('Captcha verification service unavailable');
  }
}
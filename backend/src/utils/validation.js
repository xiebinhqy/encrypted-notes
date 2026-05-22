/**
 * 输入参数验证工具
 * @version v2.1.1
 * @date 2026-05-20
 */

import { ValidationError } from './errors.js';

/**
 * 验证请求体
 * @param {Object} body - 请求体
 * @param {Object} schema - 验证规则
 * @throws {ValidationError} 验证失败时抛出
 */
export function validateBody(body, schema) {
  const errors = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = body[field];
    
    // 必填验证
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }
    
    // 跳过空值的非必填字段
    if (value === undefined || value === null) continue;
    
    // 类型验证
    if (rules.type && typeof value !== rules.type) {
      errors[field] = `${field} must be a ${rules.type}`;
      continue;
    }
    
    // 最小长度验证
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
      continue;
    }
    
    // 最大长度验证
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = `${field} must be at most ${rules.maxLength} characters`;
      continue;
    }
    
    // 正则验证
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.message || `${field} format is invalid`;
      continue;
    }
  }
  
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}

/**
 * 解析并验证JSON请求体
 * @param {Request} request - 请求对象
 * @returns {Promise<Object>} 解析后的请求体
 * @throws {ValidationError} 解析失败时抛出
 */
export async function parseAndValidateJson(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }
}
/**
 * 输入参数验证工具
 * 版本：v2.1.0
 */

import { ValidationError } from './errors.js';

export const validator = {
  /**
   * 验证邮箱格式
   * @param {string} email 邮箱地址
   * @returns {boolean}
   */
  isEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * 验证密码强度
   * @param {string} password 密码
   * @returns {boolean}
   */
  isStrongPassword(password) {
    return password.length >= 8;
  },

  /**
   * 验证必填字段
   * @param {object} obj 验证对象
   * @param {string[]} fields 必填字段列表
   * @throws {ValidationError}
   */
  required(obj, fields) {
    const errors = {};
    fields.forEach(field => {
      if (!obj[field] || obj[field].toString().trim() === '') {
        errors[field] = `${field} 是必填字段`;
      }
    });

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }
  },

  /**
   * 验证字符串长度
   * @param {string} value 字符串值
   * @param {string} field 字段名
   * @param {number} min 最小长度
   * @param {number} max 最大长度
   * @throws {ValidationError}
   */
  length(value, field, min, max) {
    if (value.length < min || value.length > max) {
      throw new ValidationError({
        [field]: `${field} 长度必须在 ${min} 到 ${max} 个字符之间`
      });
    }
  }
};
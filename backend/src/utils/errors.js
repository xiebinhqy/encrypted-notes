/**
 * 自定义错误类
 * @version v2.1.1
 * @date 2026-05-20
 */

/**
 * 应用基础错误类
 */
export class AppError extends Error {
    constructor(message, statusCode = 400) {
      super(message);
      this.statusCode = statusCode;
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * 未授权错误
   */
  export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
      super(message, 401);
    }
  }
  
  /**
   * 禁止访问错误
   */
  export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
      super(message, 403);
    }
  }
  
  /**
   * 资源未找到错误
   */
  export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
      super(message, 404);
    }
  }
  
  /**
   * 请求验证错误
   */
  export class ValidationError extends AppError {
    constructor(message = 'Validation failed', errors = {}) {
      super(message, 400);
      this.errors = errors;
    }
  }
  
  /**
   * 冲突错误
   */
  export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
      super(message, 409);
    }
  }
  
  /**
   * 限流错误
   */
  export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
      super(message, 429);
    }
  }
  
  /**
   * 验证码验证错误
   */
  export class CaptchaError extends AppError {
    constructor(message = 'Captcha verification failed') {
      super(message, 400);
    }
  }
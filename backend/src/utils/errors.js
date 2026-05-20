/**
 * 自定义错误类
 * 版本：v2.1.0
 */

export class AppError extends Error {
    constructor(message, statusCode = 400, errors = null) {
      super(message);
      this.statusCode = statusCode;
      this.errors = errors;
      this.isOperational = true;
    }
  }
  
  export class ValidationError extends AppError {
    constructor(errors) {
      super('输入参数验证失败', 400, errors);
    }
  }
  
  export class AuthenticationError extends AppError {
    constructor(message = '身份验证失败') {
      super(message, 401);
    }
  }
  
  export class AuthorizationError extends AppError {
    constructor(message = '权限不足') {
      super(message, 403);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(message = '资源不存在') {
      super(message, 404);
    }
  }
  
  export class DatabaseError extends AppError {
    constructor(message = '数据库操作失败') {
      super(message, 500);
    }
  }
/**
 * 标准JWT工具类（完全兼容Cloudflare Workers）
 * 版本：v1.0.0 - 标准HMAC-SHA256实现
 * 遵循RFC 7519标准，使用Base64URL编码
 */

/**
 * 生成JWT令牌
 * @param {object} payload 载荷数据
 * @param {string} secret 签名密钥
 * @param {string} expiresIn 过期时间（支持格式：7d, 24h, 60m）
 * @returns {Promise<string>} 完整的JWT令牌
 */
export async function sign(payload, secret, expiresIn = '7d') {
    // 计算过期时间戳（秒）
    const now = Math.floor(Date.now() / 1000);
    let exp;
    
    if (expiresIn.endsWith('d')) {
      exp = now + parseInt(expiresIn) * 24 * 60 * 60;
    } else if (expiresIn.endsWith('h')) {
      exp = now + parseInt(expiresIn) * 60 * 60;
    } else if (expiresIn.endsWith('m')) {
      exp = now + parseInt(expiresIn) * 60;
    } else {
      // 默认7天过期
      exp = now + 7 * 24 * 60 * 60;
    }
  
    // JWT头部
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
  
    // 完整载荷（包含标准声明）
    const fullPayload = {
      ...payload,
      iat: now, // 签发时间
      exp: exp  // 过期时间
    };
  
    /**
     * 标准Base64URL编码函数
     * @param {object} obj 要编码的对象
     * @returns {string} Base64URL编码字符串
     */
    function base64UrlEncode(obj) {
      const jsonString = JSON.stringify(obj);
      const bytes = new TextEncoder().encode(jsonString);
      return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')    // 将+替换为-
        .replace(/\//g, '_')    // 将/替换为_
        .replace(/=/g, '');     // 移除填充符=
    }
  
    // 编码头部和载荷
    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(fullPayload);
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
  
    // 使用HMAC-SHA256进行签名
    const encoder = new TextEncoder();
    const secretBytes = encoder.encode(secret);
    
    // 导入签名密钥
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // 生成签名
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(dataToSign)
    );
    
    // 编码签名
    const signatureBytes = new Uint8Array(signatureBuffer);
    const encodedSignature = btoa(String.fromCharCode(...signatureBytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  
    // 返回完整的JWT令牌
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }
  
  /**
   * 验证JWT令牌
   * @param {string} token JWT令牌
   * @param {string} secret 签名密钥
   * @returns {Promise<object>} 解码后的载荷数据
   * @throws {Error} 令牌无效或过期时抛出错误
   */
  export async function verify(token, secret) {
    // 分割令牌为三部分
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('无效的令牌格式：令牌必须包含头部、载荷和签名三部分');
    }
  
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
  
    /**
     * 标准Base64URL解码函数
     * @param {string} str Base64URL编码字符串
     * @returns {object} 解码后的对象
     */
    function base64UrlDecode(str) {
      // 还原Base64格式
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      // 添加填充符
      while (str.length % 4) {
        str += '=';
      }
      // 解码并解析为JSON
      const bytes = atob(str);
      const byteArray = new Uint8Array(bytes.split('').map(c => c.charCodeAt(0)));
      return JSON.parse(String.fromCharCode(...byteArray));
    }
  
    try {
      // 解码头部和载荷
      const header = base64UrlDecode(encodedHeader);
      const payload = base64UrlDecode(encodedPayload);
  
      // 验证签名算法
      if (header.alg !== 'HS256') {
        throw new Error(`不支持的签名算法：${header.alg}，仅支持HS256`);
      }
  
      // 验证过期时间
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('令牌已过期');
      }
  
      // 验证签名
      const encoder = new TextEncoder();
      const secretBytes = encoder.encode(secret);
      
      // 导入验证密钥
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      );
  
      // 准备验证数据
      const dataToVerify = encoder.encode(`${encodedHeader}.${encodedPayload}`);
      
      // 解码签名
      const signatureBytes = new Uint8Array(
        atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map(c => c.charCodeAt(0))
      );
  
      // 验证签名
      const isValid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        signatureBytes,
        dataToVerify
      );
  
      if (!isValid) {
        throw new Error('无效的签名');
      }
  
      // 返回解码后的载荷
      return payload;
    } catch (error) {
      throw new Error(`令牌验证失败：${error.message}`);
    }
  }
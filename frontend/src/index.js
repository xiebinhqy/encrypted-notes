export default {
  async fetch(request, env, ctx) {
    const allowedOrigins = [
      'http://127.0.0.1:8788',
      'http://localhost:8788',
      'https://encrypted-notes-staging.dea.workers.dev',
      'https://你的前端生产域名'
    ];
    const requestOrigin = request.headers.get('Origin');
    const finalOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

    const corsHeaders = new Headers({
      'Access-Control-Allow-Origin': finalOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/__env.js') {
      const response = new Response(`
        window.__ENV__ = {
          API_URL: '${env.API_URL || 'http://127.0.0.1:8787'}',
          ENVIRONMENT: '${env.ENVIRONMENT || 'preview'}'
        };
      `, {
        headers: { 
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store'
        }
      });
      corsHeaders.forEach((value, key) => response.headers.set(key, value));
      return response;
    }

    if (!env.ASSETS) {
      const response = new Response('静态资源托管配置错误，请检查wrangler.toml', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
      corsHeaders.forEach((value, key) => response.headers.set(key, value));
      return response;
    }

    try {
      let response = await env.ASSETS.fetch(request);
      
      if (response.status === 404) {
        const indexRequest = new Request(new URL('/', request.url), request);
        response = await env.ASSETS.fetch(indexRequest);
      }

      const pathname = url.pathname;
      if (pathname.endsWith('.css')) {
        response = new Response(response.body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers),
            'Content-Type': 'text/css; charset=utf-8'
          }
        });
      }
      if (pathname.endsWith('.js')) {
        response = new Response(response.body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers),
            'Content-Type': 'application/javascript; charset=utf-8'
          }
        });
      }
      if (pathname.endsWith('.html')) {
        response = new Response(response.body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers),
            'Content-Type': 'text/html; charset=utf-8'
          }
        });
      }

      corsHeaders.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      console.error('静态资源加载错误:', error);
      const response = new Response(`静态资源加载失败: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
      corsHeaders.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  }
};
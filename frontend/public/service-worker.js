/**
 * Service Worker - 离线功能核心
 * 提供资源缓存、离线访问、后台同步功能
 */

const CACHE_NAME = 'encrypted-notes-v1.0';
const OFFLINE_URL = '/offline.html';

// 预缓存的关键资源列表
const PRECACHE_ASSETS = [
    '/',
    '/login.html',
    '/404.html',
    '/css/core/base.css',
    '/css/core/layout.css',
    '/css/core/theme.css',
    '/css/components/common.css',
    '/css/components/layout.css',
    '/css/components/editor.css',
    '/css/components/modal.css',
    '/css/pages/dashboard.css',
    '/css/pages/login.css',
    '/js/app.js',
    '/js/config.js',
    '/js/core/router.js',
    '/js/core/store.js',
    '/js/core/offline.js',
    '/js/core/utils.js',
    '/js/api/index.js',
    '/js/api/auth.js',
    '/js/api/notes.js',
    '/js/api/categories.js',
    '/js/api/sync.js',
    '/js/api/system.js',
    '/js/pages/DashboardPage.js',
    '/js/pages/LoginPage.js',
    '/js/components/Layout/Sidebar.js',
    '/js/components/Layout/Header.js',
    '/js/components/Editor/NoteEditor.js',
    '/manifest.json'
];

// 可缓存的API端点
const CACHEABLE_API_ENDPOINTS = [
    '/api/notes/list',
    '/api/categories/list',
    '/api/system/stats',
    '/api/notes/stats'
];

// Service Worker安装事件
self.addEventListener('install', event => {
    console.log('[Service Worker] 正在安装...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] 预缓存资源');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] 安装完成');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] 预缓存失败:', error);
            })
    );
});

// Service Worker激活事件
self.addEventListener('activate', event => {
    console.log('[Service Worker] 正在激活...');
    
    // 清理旧缓存
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] 清理旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] 激活完成');
                return self.clients.claim();
            })
    );
});

// 网络请求拦截
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 跳过非HTTP请求和非GET请求
    if (event.request.method !== 'GET') {
        return;
    }
    
    // 处理API请求
    if (url.pathname.startsWith('/api/')) {
        handleApiRequest(event);
        return;
    }
    
    // 处理页面导航请求
    if (event.request.mode === 'navigate') {
        handlePageNavigation(event);
        return;
    }
    
    // 处理静态资源请求
    handleStaticResource(event);
});

// 处理API请求
function handleApiRequest(event) {
    const url = new URL(event.request.url);
    
    // 检查是否为可缓存的API
    const isCacheable = CACHEABLE_API_ENDPOINTS.some(endpoint => 
        url.pathname.startsWith(endpoint)
    );
    
    if (isCacheable) {
        // 网络优先，失败时使用缓存
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // 缓存成功的响应
                    if (response.ok) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // 网络失败，尝试从缓存获取
                    return caches.match(event.request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // 返回离线响应
                            return new Response(
                                JSON.stringify({ 
                                    success: false, 
                                    message: '网络不可用，请检查连接',
                                    offline: true 
                                }),
                                { 
                                    status: 503,
                                    headers: { 'Content-Type': 'application/json' }
                                }
                            );
                        });
                })
        );
    } else {
        // 非缓存API，尝试网络请求
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ 
                            success: false, 
                            message: '网络不可用，操作已加入离线队列',
                            offline: true 
                        }),
                        { 
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
    }
}

// 处理页面导航
function handlePageNavigation(event) {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 缓存页面
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            })
            .catch(() => {
                // 返回缓存的页面或离线页面
                return caches.match(event.request)
                    .then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return caches.match(OFFLINE_URL);
                    });
            })
    );
}

// 处理静态资源
function handleStaticResource(event) {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // 返回缓存
                    return cachedResponse;
                }
                
                // 获取网络资源
                return fetch(event.request)
                    .then(response => {
                        // 检查响应是否有效
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // 缓存新资源
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('[Service Worker] 获取资源失败:', error);
                        // 可以返回默认资源
                        return new Response('网络不可用', {
                            status: 408,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
}

// 后台同步事件
self.addEventListener('sync', event => {
    console.log('[Service Worker] 后台同步事件:', event.tag);
    
    if (event.tag === 'sync-notes') {
        event.waitUntil(syncOfflineData());
    }
});

// 同步离线数据
async function syncOfflineData() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const clients = await self.clients.matchAll();
        
        // 通知所有客户端开始同步
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_STARTED',
                timestamp: Date.now()
            });
        });
        
        // 这里可以添加实际的同步逻辑
        // 例如：从IndexedDB获取待同步数据，发送到服务器
        
        // 模拟同步延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 通知同步完成
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETED',
                timestamp: Date.now()
            });
        });
        
        return Promise.resolve();
    } catch (error) {
        console.error('[Service Worker] 同步失败:', error);
        return Promise.reject(error);
    }
}

// 推送通知事件
self.addEventListener('push', event => {
    console.log('[Service Worker] 推送通知:', event);
    
    const options = {
        body: event.data ? event.data.text() : '新消息',
        icon: '/assets/images/icons/icon-192x192.png',
        badge: '/assets/images/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: '打开应用'
            },
            {
                action: 'close',
                title: '关闭'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('加密笔记', options)
    );
});

// 通知点击事件
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] 通知被点击:', event.notification.tag);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
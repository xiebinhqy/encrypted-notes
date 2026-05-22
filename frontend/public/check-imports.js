// 快速测试脚本，直接在浏览器控制台运行
const testModules = async () => {
    console.log('🔧 测试模块导入...');
    
    try {
        // 测试 api/index.js
        const apiModule = await import('/js/api/index.js');
        console.log('✅ api/index.js 导出内容:', Object.keys(apiModule));
        
        // 测试 utils.js
        console.log('ℹ️ Utils 全局变量:', typeof window.Utils !== 'undefined' ? '已加载' : '未加载');
        
        // 测试 config.js
        console.log('ℹ️ Config 全局变量:', typeof window.Config !== 'undefined' ? '已加载' : '未加载');
        
        return '模块测试完成';
    } catch (error) {
        console.error('❌ 模块测试失败:', error);
        return error.message;
    }
};

// 运行测试
testModules().then(console.log);// 快速测试脚本，直接在浏览器控制台运行
const testModules = async () => {
    console.log('🔧 测试模块导入...');
    
    try {
        // 测试 api/index.js
        const apiModule = await import('/js/api/index.js');
        console.log('✅ api/index.js 导出内容:', Object.keys(apiModule));
        
        // 测试 utils.js
        console.log('ℹ️ Utils 全局变量:', typeof window.Utils !== 'undefined' ? '已加载' : '未加载');
        
        // 测试 config.js
        console.log('ℹ️ Config 全局变量:', typeof window.Config !== 'undefined' ? '已加载' : '未加载');
        
        return '模块测试完成';
    } catch (error) {
        console.error('❌ 模块测试失败:', error);
        return error.message;
    }
};

// 运行测试
testModules().then(console.log);
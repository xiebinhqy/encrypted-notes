const fs = require('fs');
const path = require('path');

console.log('🔍 检查加密笔记应用的文件结构...\n');
console.log('当前目录:', __dirname);
console.log('');

// 检查根目录
const rootFiles = fs.readdirSync(__dirname);
console.log('根目录文件:');
rootFiles.forEach(file => {
  const stat = fs.statSync(path.join(__dirname, file));
  console.log(`  ${stat.isDirectory() ? '📁' : '📄'} ${file}`);
});
console.log('');

// 检查frontend目录
const frontendPath = path.join(__dirname, 'frontend');
if (fs.existsSync(frontendPath)) {
  console.log('✅ frontend/ 目录存在');
  
  // 检查public目录
  const publicPath = path.join(frontendPath, 'public');
  if (fs.existsSync(publicPath)) {
    console.log('✅ frontend/public/ 目录存在');
    
    // 检查关键文件
    const keyFiles = [
      'index.html',
      'js/app.js',
      'js/core/utils.js',
      'js/core/config.js',
      'js/core/offline.js',
      'js/api/index.js',
      'css/variables.css'
    ];
    
    console.log('\n🔍 检查关键文件:');
    keyFiles.forEach(file => {
      const filePath = path.join(publicPath, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
      } else {
        console.log(`  ❌ ${file} - 缺失！`);
      }
    });
    
  } else {
    console.log('❌ frontend/public/ 目录不存在！');
  }
} else {
  console.log('❌ frontend/ 目录不存在！');
}
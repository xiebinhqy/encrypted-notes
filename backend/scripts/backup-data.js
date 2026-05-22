/**
 * 全量数据备份脚本
 * @version v2.1.1
 * @date 2026-05-20
 * @description 导出数据库所有数据为SQL格式
 */

console.log('==============================================');
console.log('Encrypted Notes Database Backup Script');
console.log('Version: v2.1.1');
console.log('==============================================');
console.log('');
console.log('Available commands:');
console.log('');
console.log('Local development:');
console.log('  npm run backup:local');
console.log('');
console.log('Preview environment:');
console.log('  npm run backup:preview');
console.log('');
console.log('Staging environment:');
console.log('  npm run backup:staging');
console.log('');
console.log('Production environment:');
console.log('  npm run backup:production');
console.log('');
console.log('==============================================');
console.log('Automatic backups:');
console.log('  - Every 5 minutes: KV temporary backup to D1');
console.log('  - Daily at 3 AM: Full database backup to KV');
console.log('==============================================');
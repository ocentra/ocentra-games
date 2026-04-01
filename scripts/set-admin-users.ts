/**
 * @deprecated This script has been moved to infra/firebase/scripts/set-admin-users.ts
 * 
 * The new version uses Firebase Admin SDK (bypasses security rules) instead of client SDK.
 * 
 * Migration:
 * - Old: npx tsx scripts/set-admin-users.ts
 * - New: cd infra/firebase && npm run scripts:set-admin
 * 
 * See infra/firebase/README.md for details.
 */

console.warn('⚠️  This script has been moved to infra/firebase/scripts/set-admin-users.ts');
console.warn('   The new version uses Firebase Admin SDK (bypasses security rules)');
console.warn('   Run: cd infra/firebase && npm run scripts:set-admin');
console.warn('');
process.exit(1);

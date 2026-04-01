import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database', 'assetRegistry.db');
console.log('DB Path:', dbPath);
const db = new Database(dbPath);

const hashes = [
    'cd9d81091b0156756551e6d2f809414ec3d6b9ab681c1d6bf4a69bce2ace3e32',
    'f1afea2b0baa1954eb6db5e26e72f6694bbd3af48d415adae5d628ce51c0c33a',
    'd66a73dbe8c1e5391d72ab75e305e9960350466ded6f0126b45f017b6cf8d317',
    'b06a9b9aae561c432c805c418ef67abed4cd9ae9b34c0411b6cf674a5bc8d409',
    'fa38aa9ae8f8f2d4353aae3ff55e6d1bce07374c9f55a2a5454af3e2d17be4a7'
];

const imageCount = (db.prepare('SELECT COUNT(*) as count FROM images').get() as { count: number }).count;
const fileCount = (db.prepare('SELECT COUNT(*) as count FROM files').get() as { count: number }).count;
const assetCount = (db.prepare('SELECT COUNT(*) as count FROM assets').get() as { count: number }).count;

console.log(`Counts: Images=${imageCount}, Files=${fileCount}, Assets=${assetCount}`);

for (const hash of hashes) {
    const img = db.prepare('SELECT * FROM images WHERE hash = ?').get(hash);
    const file = db.prepare('SELECT * FROM files WHERE checksum = ?').get(hash);
    console.log(`Hash ${hash.substring(0, 8)}...: Image=${img ? 'YES' : 'NO'}, File=${file ? 'YES' : 'NO'}`);
}

db.close();

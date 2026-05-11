/**
 * upload-shops.mjs
 *
 * מעלה את כל החנויות מ-src/shops-data.ts ל-Firestore.
 *
 * דרישות:
 *   1. הורד service account JSON מ-Firebase Console:
 *      Project Settings → Service Accounts → Generate new private key
 *   2. שמור את הקובץ כ- service-account.json בתיקייה הראשית של הפרויקט
 *      (הוא כבר ב-.gitignore)
 *
 * שימוש:
 *   npm run upload-shops
 */

import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const admin   = require("firebase-admin");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");

// ─── Load service account ─────────────────────────────────────────────────────
const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ?? path.join(ROOT, "service-account.json");

if (!fs.existsSync(SA_PATH)) {
  console.error(`\n❌ לא נמצא קובץ service account:\n   ${SA_PATH}`);
  console.error(`\nכיצד להוריד:`);
  console.error(`  Firebase Console → Project Settings → Service Accounts → Generate new private key`);
  console.error(`  שמור כ: service-account.json בתיקייה הראשית של הפרויקט\n`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, "utf-8"));

// ─── Load firebase config ─────────────────────────────────────────────────────
const config = JSON.parse(
  fs.readFileSync(path.join(ROOT, "firebase-applet-config.json"), "utf-8")
);
const DB_ID = config.firestoreDatabaseId;
const FAIR  = "main_fair";

// ─── Init Admin SDK ───────────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${config.projectId}.firebaseio.com`,
});

const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore(DB_ID);

// ─── Parse shops-data.ts ──────────────────────────────────────────────────────
const SRC_FILE = path.join(ROOT, "src", "shops-data.ts");
if (!fs.existsSync(SRC_FILE)) {
  console.error(`❌ לא נמצא: ${SRC_FILE}`);
  process.exit(1);
}

const src = fs.readFileSync(SRC_FILE, "utf-8");
const match = src.match(/\/\/ BEGIN_SHOPS([\s\S]*?)\/\/ END_SHOPS/);
if (!match) {
  console.error("❌ לא נמצא בלוק BEGIN_SHOPS / END_SHOPS ב-shops-data.ts");
  process.exit(1);
}

let shops;
try {
  const jsonLike = match[1]
    .replace(/\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1");
  shops = eval("(" + jsonLike + ")"); // eslint-disable-line no-eval
} catch (e) {
  console.error("❌ שגיאה בפענוח shops-data.ts:", e.message);
  process.exit(1);
}

console.log(`\n🏪 נמצאו ${shops.length} חנויות — מעלה ל-Firestore...\n`);

// ─── Upload in batches of 500 ─────────────────────────────────────────────────
const BATCH_SIZE = 500;
let uploaded = 0;

for (let i = 0; i < shops.length; i += BATCH_SIZE) {
  const chunk = shops.slice(i, i + BATCH_SIZE);
  const batch = db.batch();

  for (const shop of chunk) {
    const ref = db.doc(`fairs/${FAIR}/shops/${shop.id}`);
    // leadsCount לא נדרס — רק מוסיפים אם אין
    const { leadsCount, ...shopData } = shop;
    batch.set(ref, shopData, { merge: true });
  }

  await batch.commit();
  uploaded += chunk.length;
  console.log(`  ✓ ${uploaded}/${shops.length} חנויות הועלו`);
}

console.log(`\n✅ הועלו ${uploaded} חנויות ל-fairs/${FAIR}/shops\n`);
process.exit(0);

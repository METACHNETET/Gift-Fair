// סקריפט ליצירת קישורי UTM לכל בעלת עסק
// הרצה: node scripts/generate-links.mjs
// הפלט: scripts/business-links.csv

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = "https://project-e399cadc-aa09-4dbb-960.web.app";
const CAMPAIGN = "giftfair";

const shops = [
  { id: "shop-1",  businessName: "FLY-AI" },
  { id: "shop-2",  businessName: "ברוכי הירשמן - אנגלית מדוברת" },
  { id: "shop-3",  businessName: "מניפה לתנופה" },
  { id: "shop-4",  businessName: "עטיפוני" },
  { id: "shop-5",  businessName: "סמארט גו" },
  { id: "shop-6",  businessName: "איטי ולס - ליווי עסקי לבעלות קורסים" },
  { id: "shop-7",  businessName: "פאות MILKY" },
  { id: "shop-8",  businessName: "מירי מנדלסון - צילום ראש" },
  { id: "shop-9",  businessName: "רפואת שיניים טבעית" },
  { id: "shop-10", businessName: "חשבונאות ומיסים" },
  { id: "shop-11", businessName: "מלכה זיכרמן - יועצת המערכות" },
  { id: "shop-12", businessName: "ברטלר דיזיין - עיצוב גרפי ודיגיטל" },
  { id: "shop-13", businessName: "יהודית רובינשטיין - גרפולוגית" },
  { id: "shop-14", businessName: "אוירון" },
  { id: "shop-15", businessName: "מרים נוביק - הוראה באנרגיה אחרת" },
  { id: "shop-16", businessName: "הורות במרכז - שרה לנגזם" },
  { id: "shop-17", businessName: "מקדמיה - בית ספר" },
  { id: "shop-18", businessName: "גולדיס משכנתאות - לחיות בחופש כלכלי" },
  { id: "shop-19", businessName: "ידידוני לעסקים" },
  { id: "shop-20", businessName: "חסידה School" },
  { id: "shop-21", businessName: "פוטנציאל" },
  { id: "shop-22", businessName: "מגזין ג'נרטור" },
  { id: "shop-23", businessName: "אהבה שלוה הצלחה - מיכל ניאזוף" },
  { id: "shop-24", businessName: "schoolframe" },
  { id: "shop-25", businessName: "נחמה קסלר - שירותי ניהול משרד במיקור חוץ" },
  { id: "shop-26", businessName: "sparking" },
];

// הפוך שם עסק ל-slug תקין ל-UTM
function toUtmSource(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u05D0-\u05EA]/g, "-") // החלפת תווים מיוחדים במקף
    .replace(/-+/g, "-")                        // מקפים כפולים → אחד
    .replace(/^-|-$/g, "");                     // הסרת מקפים בקצוות
}

// שורת כותרת
const rows = ["שם עסק,מזהה חנות,קישור ייחודי"];

for (const shop of shops) {
  const utmSource = toUtmSource(shop.businessName);
  const link = `${BASE_URL}/?utm_source=${utmSource}&utm_medium=referral&utm_campaign=${CAMPAIGN}`;
  // עטיפת שדות בגרשיים כפולות לתמיכה בתווים עבריים ב-Excel
  rows.push(`"${shop.businessName}","${shop.id}","${link}"`);
}

const csvContent = rows.join("\n");
const outputPath = join(__dirname, "business-links.csv");
writeFileSync(outputPath, "\uFEFF" + csvContent, "utf-8"); // BOM לתצוגה נכונה ב-Excel

console.log(`✅ נוצר הקובץ: ${outputPath}`);
console.log(`📋 ${shops.length} קישורים נוצרו`);
console.log("\nתצוגה מקדימה:");
rows.slice(1, 4).forEach(r => console.log(" ", r));
console.log("  ...");

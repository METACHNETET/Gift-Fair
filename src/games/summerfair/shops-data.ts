export interface SummerStore {
  id: number;
  name: string;
  gift: string;
  color: string;
  alsoInGiftFair?: boolean;
}

export interface SummerBomb {
  type: "bomb";
  emoji: string;
  name: string;
  title: string;
  msg: string;
  color: string;
}

export type SummerItem = SummerStore | SummerBomb;

export const STORES: SummerStore[] = [
  { id: 1,  name: "פסק זמן",            gift: "ספר מתכונים מיוחד: אייסים, שייקים, פרוזנים, ברדים וגלידות ביתיות",           color: "#F97316" },
  { id: 2,  name: "רבקה זילבר",          gift: "איך להתחיל לצבור הון ומיינדסט של עשירים",                                     color: "#CA8A04" },
  { id: 3,  name: "דינה רוזנפלד",        gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#E879A4" },
  { id: 4,  name: "רוחמה בורד",          gift: "הגרלה על שואב שוטף",                                                           color: "#7C3AED" },
  { id: 5,  name: "אושרית טולדנו",       gift: "בוט מעצב מאושר PRO",                                                           color: "#6366F1" },
  { id: 6,  name: "רבקי מלוביצקי",       gift: "4 סרטוני תסרוקות בחינם – שהבת שלך תצליח גם בלי שום ניסיון",                   color: "#DB2777" },
  { id: 7,  name: "דבורי זילברשטיין",    gift: "הדרכה לכיוון המצלמה",                                                          color: "#0891B2" },
  { id: 8,  name: "ציבעונילי",           gift: "\"מה אהבתי תורתך\" – ערכת יצירה לילדים",                                       color: "#F59E0B" },
  { id: 9,  name: "טלאל",               gift: "משחקי למידה להדפסה – תעסוקה מושלמת לחופשה",                                    color: "#16A34A" },
  { id: 10, name: "שרי בורנשטיין",       gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#2563EB" },
  { id: 11, name: "שרי וינברג",          gift: "תיקח את המתנה מיריד המתנות",                                                    color: "#9333EA", alsoInGiftFair: true },
  { id: 12, name: "מ גרינבוים",          gift: "תיקח את המתנה מיריד המתנות",                                                    color: "#BE185D", alsoInGiftFair: true },
  { id: 13, name: "אתי בלאק",            gift: "חדר בריחה להדפסה – פיצה משפחתית",                                              color: "#0369A1" },
  { id: 14, name: "מגזין לעצמך",         gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#92400E" },
  { id: 15, name: "ליבדיק",             gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#065F46" },
  { id: 16, name: "מיכל ניאזוף",         gift: "תיקח את המתנה מיריד המתנות",                                                    color: "#4338CA", alsoInGiftFair: true },
  { id: 17, name: "מלכי",               gift: "3 מסרים שהמתבגר/ת שלך מקווה שתקלטי בעצמך",                                    color: "#B45309" },
  { id: 18, name: "יהודית שטיינברג",     gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#0F766E" },
  { id: 19, name: "יעל פינגולד",         gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#7E22CE" },
  { id: 20, name: "רחל כץ",             gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#B91C1C" },
  { id: 21, name: "שרה קצבורג",          gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#1D4ED8" },
  { id: 22, name: "תהילה אדלר",          gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#15803D" },
  { id: 23, name: "סטודיו מפרש",         gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#0284C7" },
  { id: 24, name: "יעל גוטסמן",          gift: "מתנה מיוחדת ביריד החופש",                                                       color: "#DC2626" },
];

export const BOMBS: SummerBomb[] = [
  { type: "bomb", emoji: "🪼", name: "מדוזה",    title: "החופש מלא פיתויים",    msg: "תזהרו שלא יעקצו אתכם 🪼",              color: "#C06090" },
  { type: "bomb", emoji: "🐠", name: "דג מנקה",  title: "אמרת לאמא משעמם לי?", msg: "לכי לעזור לה לנקות 😄",                color: "#3090C0" },
  { type: "bomb", emoji: "🦈", name: "כריש",     title: "מה עושים בחופש?",     msg: "אין בעיות — צאו למלון מחיר כריש! 🦈",  color: "#C03030" },
];

const AVAILABLE_IMGS = [1, 2, 5, 6, 7, 8, 9];
export function giftImg(id: number): string {
  return `/summerfair/gift${AVAILABLE_IMGS[(id - 1) % AVAILABLE_IMGS.length]}.png`;
}

export function buildQueue(): SummerItem[] {
  const queue: SummerItem[] = [...STORES].sort(() => Math.random() - 0.5);
  const bombPool: SummerBomb[] = [...BOMBS, ...BOMBS].sort(() => Math.random() - 0.5).slice(0, 3);
  bombPool.forEach((b) => {
    const pos = 2 + Math.floor(Math.random() * (queue.length - 2));
    queue.splice(pos, 0, { ...b });
  });
  return queue;
}

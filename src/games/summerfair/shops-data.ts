export interface SummerStore {
  id: number;
  name: string;
  gift: string;
  color: string;
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
  { id: 1,  name: "מאפיית הזהב",    gift: "לחם מקושט במתנה",     color: "#C0392B" },
  { id: 2,  name: "פרחי עדן",       gift: "זר פרחים קסום",        color: "#8E44AD" },
  { id: 3,  name: "קפה בוקר",       gift: "קפה חודשי בחינם",      color: "#6D4C41" },
  { id: 4,  name: "ספא ריביירה",    gift: "טיפול פנים מתנה",      color: "#AD1457" },
  { id: 5,  name: "ספריית עמק",     gift: "ספר לבחירתך",          color: "#1565C0" },
  { id: 6,  name: "גן ירק טרי",     gift: "סל ירקות שבועי",       color: "#2E7D32" },
  { id: 7,  name: "פיצרייה נאפולי", gift: "פיצה משפחתית",         color: "#E65100" },
  { id: 8,  name: "חנות הצעצועים",  gift: "צעצוע לבחירה",         color: "#F57F17" },
  { id: 9,  name: "סטודיו יוגה",    gift: "שיעור ניסיון חינם",    color: "#00695C" },
  { id: 10, name: "תכשיטי מור",     gift: "שרשרת כסף מתנה",       color: "#4527A0" },
  { id: 11, name: "מעדניית פריז",   gift: "מגש גבינות",           color: "#F9A825" },
  { id: 12, name: "חנות הכלבים",    gift: "שקית מזון פרמיום",     color: "#BF360C" },
  { id: 13, name: "גלידריית קינג",  gift: "גלידה כפולה חינם",     color: "#0277BD" },
  { id: 14, name: "סלון הספרות",    gift: "תספורת מתנה",          color: "#558B2F" },
  { id: 15, name: "חנות הבגדים",    gift: "שובר ₪100",            color: "#880E4F" },
  { id: 16, name: "מרפאת שיניים",   gift: "בדיקה חינם",           color: "#006064" },
  { id: 17, name: "חנות הספורט",    gift: "גרבי ספורט מתנה",      color: "#D84315" },
  { id: 18, name: "בית הקפה הסודי", gift: "עוגה ביתית חינם",      color: "#6A1B9A" },
  { id: 19, name: "אופטיקה רואים",  gift: "בדיקת ראייה חינם",     color: "#37474F" },
  { id: 20, name: "מסעדת הים",      gift: "מנה ראשונה חינם",      color: "#004D40" },
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

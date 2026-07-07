export interface SummerStore {
  id: number;
  name: string;
  gift: string;
  color: string;
  logo?: string;
  alsoInGiftFair?: boolean;
}

export const MISSING_GIFT = "מתנה מיוחדת ביריד החופש";

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
  { id: 1,  name: "פסק זמן",            gift: "ספר מתכונים מיוחד: אייסים, שייקים, פרוזנים, ברדים וגלידות ביתיות",           color: "#F97316", logo: "/summerfair/logos/פסק זמן.png" },
  { id: 2,  name: "רבקה זילבר",          gift: "איך להתחיל לצבור הון ומיינדסט של עשירים",                                     color: "#CA8A04" },
  { id: 3,  name: "בריאות שיניים",        gift: "בואי לגלות איך שיניים יכולות להתרפא",                                           color: "#E879A4", logo: "/summerfair/logos/refuatshinaim.png", alsoInGiftFair: true },
  { id: 4,  name: "רוחמה בורד",          gift: "הגרלה על שואב שוטף",                                                           color: "#7C3AED", logo: "/summerfair/logos/חד פעמית.jpg" },
  { id: 5,  name: "אושרית טולדנו",       gift: "בוט מעצב מאושר PRO",                                                           color: "#6366F1", logo: "/summerfair/logos/לוגו-אושרית-טולידאנו---תשפו-C-Mcopy08.png" },
  { id: 6,  name: "רבקי מלוביצקי",       gift: "4 סרטוני תסרוקות בחינם – שהבת שלך תצליח גם בלי שום ניסיון",                   color: "#DB2777", logo: "/summerfair/logos/רבקי מלוביצקי.png" },
  { id: 7,  name: "דבורי זילברשטיין",    gift: "הדרכה לכיוון המצלמה",                                                          color: "#0891B2", logo: "/summerfair/logos/schoolframe.png" },
  { id: 8,  name: "ציבעונילי",           gift: "\"מה אהבתי תורתך\" – ערכת יצירה לילדים",                                       color: "#F59E0B", logo: "/summerfair/logos/tzivonili.png" },
  { id: 9,  name: "ידידוני",             gift: "משחקי למידה להדפסה – תעסוקה מושלמת לחופשה",                                    color: "#16A34A", logo: "/summerfair/logos/yedidoni.png" },
  { id: 10, name: "שרי בורנשטיין",       gift: "מדריך איך לקנות בחוכמה באליאקספרס",                                            color: "#2563EB" },
  { id: 11, name: "שרי וינברג",          gift: "קונספט בעיצוב",                                                                 color: "#9333EA", logo: "/summerfair/logos/smartgo.png", alsoInGiftFair: true },
  { id: 12, name: "פאות MILKY",          gift: "סרטון מתנה – איך לחפוף את הפאה שלך בעצמך",                                    color: "#BE185D", logo: "/summerfair/logos/milky.png", alsoInGiftFair: true },
  { id: 13, name: "משחקוד",              gift: "חדר בריחה להדפסה – פיצה משפחתית",                                              color: "#0369A1", logo: "/summerfair/logos/משחקוד לוגו.png" },
  { id: 14, name: "מגזין לעצמך",         gift: "מגזין מתנה",                                                                    color: "#92400E" },
  { id: 15, name: "ליבדיק",             gift: "8 דקות של הדרכת נגינה אטרקטיבית – שאחריה תדעו לנגן שיר בעצמכם",               color: "#065F46", logo: "/summerfair/logos/לייבעדיק.gif" },
  { id: 16, name: "מיכל ניאזוף",         gift: "המדריך לפיתוח אינטליגנציה חיובית",                                             color: "#4338CA", logo: "/summerfair/logos/michalnaizof.png", alsoInGiftFair: true },
  { id: 17, name: "מרחב הקאוצינג",      gift: "3 מסרים שהמתבגר/ת שלך מקווה שתקלטי בעצמך",                                    color: "#B45309", logo: "/summerfair/logos/מרחב הקואצינג100 (1).png" },
  { id: 18, name: "יהודית שטיינברג",     gift: "סדר יום ותוכנית לחופש",                                                        color: "#0F766E", logo: "/summerfair/logos/יהודית שטיינברג.png" },
  { id: 19, name: "יעל פינגולד",         gift: "איך משכפלים עסק? יותר מכירות, יותר ״את״ בלי שעות העבודה שלך",                                                      color: "#7E22CE", logo: "/summerfair/logos/יעל פיינגולד.jpg" },
  { id: 20, name: "רחל כץ",             gift: "כלים פרקטיים לנפש הילד – 2 דקות של הקשבה שמחיות את הרוגע, לאמא לגיל הרך",    color: "#B91C1C", logo: "/summerfair/logos/רחל כץ.png" },
  { id: 21, name: "פסיפס",               gift: "כרטיס הטיסה שלך לאי הקסם – חופשה של שקט מרחק שעה מהבית, בחינם ממש!",          color: "#1D4ED8", logo: "/summerfair/logos/פסיפס.png" },
  { id: 22, name: "תהילה אדלר",          gift: "אתגר הבינה האנושית – האם העין שלך תזהה את הזיוף? מי שמזהה נכון נכנסת להגרלה על קיר אומנותי", color: "#15803D", logo: "/summerfair/logos/תהילה אדלר.jpg" },
  { id: 23, name: "מבורכת",               gift: "5 מתכוני שבת מנצחים מבית מבורכת",                                               color: "#0284C7", logo: "/summerfair/logos/mevorehet.png" },
  { id: 24, name: "יעל גוטסמן",          gift: "פרופיל אישי לבעלת עסק עם שליחות — ב־5 שאלות מפתיעות שידייק ויקדם את העסק שלך", color: "#DC2626", logo: "/summerfair/logos/יעל גוטסמן.png" },
  { id: 25, name: "רחלי שפינגלט",        gift: "פייט בוט שעוזר לך להחליט איפה לפרסם – כל אנשי הקשר והפלטפורמות בפרינט ובדיגיטל", color: "#0F4C81", logo: "/summerfair/logos/רחלי שפינגלט.png" },
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

// כל הפרמטרים של המשחק במקום אחד — קל לכוונן בלי לחפש בקוד

// --- עולם ופיזיקה ---
export const GRAVITY = 2200 // px/s^2
export const JUMP_VELOCITY = 960 // px/s
export const MOVE_SPEED = 440 // px/s
export const CLIMB_SPEED = 420 // px/s, מהירות טיפוס על סולם/מדרגות
// --- תחושת קפיצה בסגנון מריו ---
// עזיבת מקש הקפיצה בזמן עלייה חותכת את המהירות — לחיצה קצרה = קפיצה נמוכה
export const JUMP_CUT_MULTIPLIER = 0.45
// אפשר עדיין לקפוץ זמן קצר אחרי שירדת מקצה הרצפה
export const COYOTE_TIME_MS = 100
// לחיצה על קפיצה רגע לפני הנחיתה נזכרת ומתבצעת בנחיתה
export const JUMP_BUFFER_MS = 130
// ריבאונד אחרי דריכה על אויב: רגיל / כשמחזיקים את מקש הקפיצה
export const STOMP_BOUNCE = 0.62
export const STOMP_BOUNCE_HELD = 0.95
export const PLAYER_WIDTH = 40
export const PLAYER_HEIGHT = 56

// --- משחק ---
export const ROUND_SECONDS = 83
export const KEYS_REQUIRED_FOR_FREE_ENTRY = 4
export const TOTAL_KEYS = 30 // = מספר העסקים/הקופסאות

// --- רקע: ספרייה רחבה עם שלוש קומות ---
import libraryBackground from './assets/magnific__2d-sideview-platform-game-level-background-crossse__76353.png'
export const BACKGROUND_IMAGE_URL = libraryBackground

// שומרים על יחס המקור 2:1 ומגדילים מספיק כדי לכסות גם מסכים רחבים.
export const IMAGE_RENDER_WIDTH = Math.max(
  window.innerWidth,
  window.innerHeight * 2
)
export const IMAGE_RENDER_HEIGHT = Math.round(IMAGE_RENDER_WIDTH / 2)

export const WORLD_WIDTH = IMAGE_RENDER_WIDTH
export const WORLD_HEIGHT = IMAGE_RENDER_HEIGHT

// --- גבהי הרצפות לפי פסי הקומות המצוירים ברקע ---
const FLOOR_1_RATIO = 210 / 587
const FLOOR_2_RATIO = 382 / 587
const FLOOR_1_Y = Math.round(IMAGE_RENDER_HEIGHT * FLOOR_1_RATIO)
const FLOOR_2_Y = Math.round(IMAGE_RENDER_HEIGHT * FLOOR_2_RATIO)
export const GROUND_Y = Math.round(IMAGE_RENDER_HEIGHT * 0.96)

// Gift details can be connected to the fair spreadsheet when its data is available.
// רשימת העסקים והמתנות. כרגע נתוני דוגמה — יוחלפו ברשימת העסקים של היריד.
// logoUrl: כתובת ללוגו (למשל '/logos/name.png'). בלי לוגו מוצג עיגול צבעוני עם ראשי תיבות.
export const COURSES = Array.from({ length: 30 }, (_, i) => ({
  id: `gift-${i + 1}`,
  businessName: `עסק לדוגמה ${i + 1}`,
  giftName: `מתנה מספר ${i + 1}`,
  logoUrl: null,
  color: `hsl(${(i * 47) % 360} 65% 45%)`,
}))

// --- קופסאות מתנה ובועות ---
export const GIFT_BOX_SIZE = 52
export const GIFT_BOX_AIR_GAP = 130 // המרחק מהרצפה לתחתית קופסה באוויר
export const BUBBLE_RADIUS = 36
export const BUBBLE_HOVER_HEIGHT = 150 // גובה הריחוף של הבועה מעל הרצפה
export const BUBBLE_LIFETIME_MS = 5000 // אחרי הזמן הזה הבועה חוזרת לקופסה
export const BUBBLE_DRIFT = 46 // כמה הבועה מתנדנדת לצדדים (px)

// --- בניית הרמה: שלוש קומות המחוברות בסולמות ---
function buildLevel() {
  const platforms = [
    { x: 0, y: FLOOR_1_Y, width: IMAGE_RENDER_WIDTH, height: 18 },
    { x: 0, y: FLOOR_2_Y, width: IMAGE_RENDER_WIDTH, height: 18 },
    { x: 0, y: GROUND_Y, width: IMAGE_RENDER_WIDTH, height: 40 },
  ]

  const ladders = [
    // הסולמות תואמים לסולמות המצוירים ברקע.
    {
      x: Math.round(IMAGE_RENDER_WIDTH * 0.56),
      width: 40,
      topY: FLOOR_1_Y,
      bottomY: FLOOR_2_Y,
    },
    {
      x: Math.round(IMAGE_RENDER_WIDTH * 0.21),
      width: 40,
      topY: FLOOR_2_Y,
      bottomY: GROUND_Y,
    },
  ]

  // --- קופסאות מתנה: כל עסק מקבל קופסה עם הלוגו שלו ---
  // G = על הרצפה (קופצים על המכסה), A = באוויר (מכה בראש מלמטה).
  // המיקומים נבחרו כך שלא יחסמו סולמות/מדפים/מעלית/דלתות, וקופסאות הרצפה
  // לא נמצאות במסלול של האויבים.
  const boxLayout = [
    {
      floorY: FLOOR_1_Y,
      slots: [[0.04, 'G'], [0.12, 'A'], [0.2, 'G'], [0.28, 'A'], [0.36, 'G'],
        [0.44, 'A'], [0.5, 'G'], [0.63, 'A'], [0.69, 'G'], [0.78, 'A']],
    },
    {
      floorY: FLOOR_2_Y,
      slots: [[0.05, 'G'], [0.12, 'A'], [0.3, 'G'], [0.36, 'A'], [0.45, 'A'],
        [0.51, 'A'], [0.62, 'G'], [0.7, 'A'], [0.76, 'G'], [0.88, 'G']],
    },
    {
      floorY: GROUND_Y,
      slots: [[0.04, 'G'], [0.15, 'A'], [0.28, 'A'], [0.36, 'A'], [0.45, 'G'],
        [0.53, 'A'], [0.6, 'G'], [0.68, 'A'], [0.76, 'A'], [0.86, 'G']],
    },
  ]
  const giftBoxes = boxLayout.flatMap(({ floorY, slots }) =>
    slots.map(([xRatio, placement]) => ({ floorY, xRatio, placement }))
  ).map(({ floorY, xRatio, placement }, i) => ({
    id: `box-${COURSES[i].id}`,
    gift: COURSES[i],
    placement: placement === 'G' ? 'ground' : 'air',
    floorY,
    x: Math.round(IMAGE_RENDER_WIDTH * xRatio) - GIFT_BOX_SIZE / 2,
    y:
      placement === 'G'
        ? floorY - GIFT_BOX_SIZE
        : floorY - GIFT_BOX_AIR_GAP - GIFT_BOX_SIZE,
    width: GIFT_BOX_SIZE,
    height: GIFT_BOX_SIZE,
  }))

  // --- מדפים צפים בין הקומות: עולים עליהם מלמטה, ⬇ מפיל מהם ---
  const shelf = (xRatio, upperFloorY, lowerFloorY) => ({
    x: Math.round(IMAGE_RENDER_WIDTH * xRatio),
    y: Math.round((upperFloorY + lowerFloorY) / 2),
    width: 130,
    height: 14,
    kind: 'shelf',
  })
  platforms.push(
    shelf(0.4, FLOOR_2_Y, GROUND_Y),
    shelf(0.82, FLOOR_2_Y, GROUND_Y),
    shelf(0.18, FLOOR_1_Y, FLOOR_2_Y),
    shelf(0.8, FLOOR_1_Y, FLOOR_2_Y)
  )

  // --- מעלית זכוכית שעולה ויורדת בין כל הקומות, עם עצירה בכל קומה ---
  const elevator = {
    x: Math.round(IMAGE_RENDER_WIDTH * 0.92),
    width: 96,
    height: 14,
    topY: FLOOR_1_Y,
    bottomY: GROUND_Y,
    stops: [GROUND_Y, FLOOR_2_Y, FLOOR_1_Y], // מלמטה למעלה
    speed: 110, // px/s
    pauseMs: 900, // עצירה בכל קומה כדי שיהיה קל לעלות/לרדת
  }

  // --- דלתות סודיות (כמו הצינורות במריו): ⬇ מול דלת מעביר לדלת השנייה ---
  const DOOR_WIDTH = 54
  const DOOR_HEIGHT = 84
  const doors = [
    {
      id: 'door-ground',
      x: Math.round(IMAGE_RENDER_WIDTH * 0.105) - DOOR_WIDTH / 2,
      y: GROUND_Y - DOOR_HEIGHT,
      targetId: 'door-top',
    },
    {
      id: 'door-top',
      x: Math.round(IMAGE_RENDER_WIDTH * 0.86) - DOOR_WIDTH / 2,
      y: FLOOR_1_Y - DOOR_HEIGHT,
      targetId: 'door-ground',
    },
  ].map((door) => ({ ...door, width: DOOR_WIDTH, height: DOOR_HEIGHT }))

  return { platforms, ladders, giftBoxes, elevator, doors }
}

export const LEVEL = buildLevel()

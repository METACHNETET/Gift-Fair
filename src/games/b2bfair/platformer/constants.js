// כל הפרמטרים של המשחק במקום אחד — קל לכוונן בלי לחפש בקוד
import { BUSINESSES } from './businesses'

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
export const TOTAL_KEYS = Math.min(BUSINESSES.length, 30) // מפתח לכל עסק (יש 30 משבצות)

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
// רשימת העסקים והמתנות של היריד (מקובץ שנוצר מגיליון התגובות של העסקים)
export const COURSES = BUSINESSES

// --- בועת הבמה: אחרי תפיסת מפתח ---
// כמה זמן יש ללחוץ "רוצה!" לפני שהמתנה מתפוגגת
export const DECIDE_MS = 4000
// כמה זמן מוצגת חגיגת "נוסף לסל" לפני שהמשחק ממשיך
export const CLAIMED_MS = 1100
// משך אנימציית ההתפוגגות
export const FADE_MS = 900
// הגנה מלחיצה בטעות: לחיצות ברגע הראשון אחרי פתיחת הבועה לא נספרות
export const DECIDE_GUARD_MS = 300

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

  const floorSlots = [
    {
      floorY: FLOOR_1_Y,
      xPositions: [0.06, 0.15, 0.24, 0.33, 0.42, 0.51, 0.6, 0.69, 0.78, 0.88],
      jumps: [0, 42, 0, 64, 28, 0, 52, 0, 36, 0],
    },
    {
      floorY: FLOOR_2_Y,
      xPositions: [0.05, 0.14, 0.23, 0.32, 0.41, 0.5, 0.59, 0.68, 0.77, 0.88],
      jumps: [0, 56, 24, 0, 72, 0, 40, 0, 60, 0],
    },
    {
      floorY: GROUND_Y,
      xPositions: [0.05, 0.14, 0.23, 0.32, 0.41, 0.5, 0.59, 0.68, 0.77, 0.88],
      jumps: [0, 36, 0, 68, 0, 48, 0, 72, 28, 0],
    },
  ]

  // Ten keys per floor, with raised keys that require a jump to collect.
  const keySlots = [
    ...floorSlots.flatMap(({ floorY, xPositions, jumps }) =>
      xPositions.map((x, index) => ({
        x,
        y: floorY - 44 - jumps[index],
      }))
    ),
  ]

  // יש 30 משבצות; כשיש פחות עסקים, המפתחות מתפזרים באופן שווה על כל הקומות
  const usedSlotIndexes = Array.from({ length: TOTAL_KEYS }, (_, i) =>
    Math.min(keySlots.length - 1, Math.round((i * keySlots.length) / TOTAL_KEYS))
  )
  const courseBySlot = new Map(usedSlotIndexes.map((slotIndex, i) => [slotIndex, COURSES[i]]))

  // --- קופסאות מתנה (כמו קוביות "?" במריו): מכה מלמטה מקפיצה מפתח ---
  // כל קופסה מחביאה את המפתח של המשבצת שמתחתיה (אינדקס ב-keySlots).
  // קופסה שאין מתחתיה מפתח (כי יש פחות עסקים ממשבצות) לא נבנית.
  const GIFT_BOX_SIZE = 40
  const GIFT_BOX_GAP_ABOVE_FLOOR = 130 // המרחק מהרצפה לתחתית הקופסה
  const giftBoxSlotIndexes = [2, 7, 13, 17, 20, 26]
  const floorYBySlotIndex = (index) => floorSlots[Math.floor(index / 10)].floorY
  const giftBoxes = giftBoxSlotIndexes
    .filter((slotIndex) => courseBySlot.has(slotIndex))
    .map((slotIndex) => ({
      id: `box-${slotIndex}`,
      keyId: `key-${courseBySlot.get(slotIndex).id}`,
      x: Math.round(IMAGE_RENDER_WIDTH * keySlots[slotIndex].x) - GIFT_BOX_SIZE / 2,
      y: floorYBySlotIndex(slotIndex) - GIFT_BOX_GAP_ABOVE_FLOOR - GIFT_BOX_SIZE,
      width: GIFT_BOX_SIZE,
      height: GIFT_BOX_SIZE,
    }))
  const keyIdsInBoxes = new Set(giftBoxes.map((box) => box.keyId))

  const keys = usedSlotIndexes.map((slotIndex) => {
    const slot = keySlots[slotIndex]
    const course = courseBySlot.get(slotIndex)
    return {
      id: `key-${course.id}`,
      courseId: course.id,
      gift: course,
      x: Math.round(IMAGE_RENDER_WIDTH * slot.x) - 16,
      y: slot.y - 44,
      inBox: keyIdsInBoxes.has(`key-${course.id}`),
    }
  })

  // --- מדפים צפים בין הקומות: עולים עליהם מלמטה, ⬇ מפיל מהם ---
  // המדפים ממורכזים ברווח שבין שתי משבצות מפתחות, כדי שלא יכסו מפתח מלמעלה
  // (מפתח נאסף בנחיתה עליו — מדף מעליו היה תופס את הדמות קודם)
  const SHELF_WIDTH = 90
  const shelf = (centerRatio, upperFloorY, lowerFloorY) => ({
    x: Math.round(IMAGE_RENDER_WIDTH * centerRatio) - SHELF_WIDTH / 2,
    y: Math.round((upperFloorY + lowerFloorY) / 2),
    width: SHELF_WIDTH,
    height: 14,
    kind: 'shelf',
  })
  platforms.push(
    shelf(0.455, FLOOR_2_Y, GROUND_Y),
    shelf(0.825, FLOOR_2_Y, GROUND_Y),
    shelf(0.185, FLOOR_1_Y, FLOOR_2_Y),
    shelf(0.825, FLOOR_1_Y, FLOOR_2_Y)
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

  return { platforms, ladders, keys, giftBoxes, elevator, doors }
}

export const LEVEL = buildLevel()

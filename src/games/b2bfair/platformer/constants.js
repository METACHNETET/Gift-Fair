// כל הפרמטרים של המשחק במקום אחד — קל לכוונן בלי לחפש בקוד

// --- עולם ופיזיקה ---
export const GRAVITY = 2200 // px/s^2
export const JUMP_VELOCITY = 960 // px/s
export const MOVE_SPEED = 440 // px/s
export const CLIMB_SPEED = 420 // px/s, מהירות טיפוס על סולם/מדרגות
export const PLAYER_WIDTH = 40
export const PLAYER_HEIGHT = 56

// --- משחק ---
export const ROUND_SECONDS = 83
export const KEYS_REQUIRED_FOR_FREE_ENTRY = 4
export const TOTAL_KEYS = 30

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
export const COURSES = Array.from({ length: 30 }, (_, i) => ({
  id: `gift-${i + 1}`,
  businessName: 'מתנת היריד',
  giftName: `מתנה ${i + 1}`,
  logoUrl: null,
  videoUrl: null,
}))

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

  const keys = keySlots.map((slot, i) => ({
    id: `key-${COURSES[i].id}`,
    courseId: COURSES[i].id,
    gift: COURSES[i],
    x: Math.round(IMAGE_RENDER_WIDTH * slot.x) - 16,
    y: slot.y - 44,
  }))

  return { platforms, ladders, keys }
}

export const LEVEL = buildLevel()

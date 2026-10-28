import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import './App.css'
import {
  GRAVITY,
  JUMP_VELOCITY,
  JUMP_CUT_MULTIPLIER,
  COYOTE_TIME_MS,
  JUMP_BUFFER_MS,
  STOMP_BOUNCE,
  STOMP_BOUNCE_HELD,
  MOVE_SPEED,
  CLIMB_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  GROUND_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ROUND_SECONDS,
  TOP_FLOOR_BONUS_SECONDS,
  GIFT_POINTS,
  BOX_GIFT_POINTS,
  TOP_FLOOR_POINTS_MULTIPLIER,
  TOTAL_KEYS,
  BACKGROUND_IMAGE_URL,
  IMAGE_RENDER_WIDTH,
  IMAGE_RENDER_HEIGHT,
  COURSES,
  LEVEL,
  FLOORS_VISIBLE_PER_SCREEN,
  LADDER_GRAB_MARGIN,
  CAMERA_EDGE_MARGIN,
} from './constants'
import robotSpriteSheet from './assets/robot-sprite-transparent.png'
import robotClimbSpriteSheet from './assets/robot-sprite-climb-no-ladder.png'
import robotIdleClosed from './assets/robot-instructor/01-idle-closed.png'
import robotIdleTalk from './assets/robot-instructor/02-idle-talk.png'
import robotExplainClosed from './assets/robot-instructor/03-explain-closed.png'
import robotExplainTalk from './assets/robot-instructor/04-explain-talk.png'
import robotOpenTalk from './assets/robot-instructor/05-open-talk.png'
import robotOpenClosed from './assets/robot-instructor/06-open-closed.png'
import collegeSignBlank from './assets/robot-instructor/sign-blank.png'

// --- מסך פתיחה: הרובוט המדריך מסביר את חוקי המשחק בבועת דיבור עם אותיות נופלות ---
// כל שלב: pose (idle/explain/open), lit (האם הפנסים דולקים), ignite (להדליק את
// הפנסים תוך כדי — הבהוב קצר לפני השלב), lines לטקסט, holdMs לזמן התצוגה
// (שלב אחרון בלי holdMs = לא מתקדם לבד, זה שלב טופס המייל)
// idle = הפוזה הפותחת (ידיים למטה, פנסים כבויים). מהשלב הבא ואילך הרובוט "פעיל":
// הידיים מתחלפות ברציפות בין explain ל-open (ראו armTimer באפקט למטה) כל עוד
// הוא מדבר, כדי שירגיש הרבה יותר חי ומחווה עם הידיים, לא פוזה קפואה אחת.
const INTRO_STEPS = [
  {
    idle: true,
    lines: ['ברוכים הבאים למכללה לקפיצה עסקית!', `${TOTAL_KEYS} בעלות עסקים פותחות לכם שיעורים במתנה`],
    holdMs: 4400,
  },
  { lines: ['כל שלט עם לוגו מחזיק מפתח לשיעור', 'קפצו עליו — והשיעור נפתח לכם :)'], demo: true, holdMs: 5600 },
  { lines: ['מפתח בתוך קופסה? תנו לה מכה מלמטה!', 'הוא שווה כפול נקודות'], holdMs: 4400 },
  { lines: [`כמה שיעורים תפתחו ב-${ROUND_SECONDS} שניות?`, 'בסוף כולם נשלחים אליכם למייל'], holdMs: 4400 },
  {
    lines: ['איך מפעילים את הרובוט?', 'תנסו עכשיו את החיצים במקלדת'],
    touchLines: ['איך מפעילים את הרובוט?', 'עם הכפתורים האלה — נסו עכשיו!'],
    keyboard: true,
  },
]

const ROBOT_FRAMES = {
  idleClosed: robotIdleClosed,
  idleTalk: robotIdleTalk,
  explainClosed: robotExplainClosed,
  explainTalk: robotExplainTalk,
  openClosed: robotOpenClosed,
  openTalk: robotOpenTalk,
}

function robotFrameFor(pose, mouthOpen) {
  if (pose === 'open') return mouthOpen ? ROBOT_FRAMES.openTalk : ROBOT_FRAMES.openClosed
  if (pose === 'explain') return mouthOpen ? ROBOT_FRAMES.explainTalk : ROBOT_FRAMES.explainClosed
  return mouthOpen ? ROBOT_FRAMES.idleTalk : ROBOT_FRAMES.idleClosed
}

// אותיות הטקסט נופלות פנימה אחת אחרי השנייה (עיכוב מצטבר לפי אינדקס התו).
// כל מילה עטופה בתג נפרד עם white-space:nowrap כדי שהגלישה לשורה הבאה
// תתבצע בין מילים, ולא תשבור מילה באמצע בין שתי אותיות.
// כל רצף שאינו אותיות עבריות (מספר כמו "85", סימני פיסוק, סמיילי כמו ":)")
// בתוך טקסט עברי מקבל עטיפה מבודדת בכיוון LTR — אחרת הדפדפן הופך את סדר
// התווים בתוכו (למשל 85 הופך ל-58, ":)" הופך ל-"):") כששוברים אותם לתגים נפרדים.
const HEBREW_LETTER_RUN = /[א-ת]+|[^א-ת]+/g

function FallingLines({ lines }) {
  let index = 0
  function renderChar(ch) {
    const delay = index * 0.032
    index += 1
    return (
      <span key={index} className="intro-bubble__char" style={{ animationDelay: `${delay}s` }}>
        {ch}
      </span>
    )
  }
  function renderWord(word, key) {
    const runs = word.match(HEBREW_LETTER_RUN) || [word]
    return (
      <span className="intro-bubble__word" key={key}>
        {runs.map((run, runIndex) =>
          /[א-ת]/.test(run) ? (
            [...run].map(renderChar)
          ) : (
            <span
              className="intro-bubble__ltrrun"
              key={runIndex}
              style={{ unicodeBidi: 'isolate', direction: 'ltr' }}
            >
              {[...run].map(renderChar)}
            </span>
          )
        )}
      </span>
    )
  }
  return lines.map((line, lineIndex) => (
    <p className="intro-bubble__line" key={lineIndex}>
      {line.split(' ').flatMap((word, wordIndex, words) => {
        const wordSpan = renderWord(word, `w${wordIndex}`)
        return wordIndex < words.length - 1 ? [wordSpan, ' '] : [wordSpan]
      })}
    </p>
  ))
}

// הדגמה ליד הרובוט הגדול: הוא קופץ על קופסת מתנה (ראו intro-robot-demo-jump ב-CSS), והיא מתפוצצת.
// כל התזמון ב-CSS (אותו משך ועיכוב לכל החלקים, כך שהאחוזים ב-keyframes מסונכרנים).
const DEMO_SPARKS = [
  [-110, -70], [-70, -120], [0, -140], [70, -120], [110, -70],
  [-120, 10], [120, 10], [-60, 50], [60, 50], [-20, -90], [30, -100], [0, 60],
]

function IntroGiftDemo() {
  return (
    <div className="intro-demo" aria-hidden="true">
      <div className="intro-demo__gift">
        <span className="intro-demo__gift-small">תחרות</span>
        <span className="intro-demo__gift-big">30,000 ש״ח לפרסום!</span>
      </div>
      <div className="intro-demo__flash" />
      {DEMO_SPARKS.map(([dx, dy], i) => (
        <span
          key={i}
          className="intro-demo__spark"
          style={{ '--dx': `${dx}px`, '--dy': `${dy}px` }}
        />
      ))}
      <div className="intro-demo__pop">נפתח! 🔓</div>
    </div>
  )
}

// ציור קטן של 3 מקשי החיצים הרלוונטיים (שמאל/למעלה/ימין), עם לולאת הדגמה
// שמדליקה אותם אחד-אחרי-השני (עיכוב אנימציה שונה לכל מקש) כדי להמחיש ללחוץ.
const KEYBOARD_KEYS = [
  { id: 'left', symbol: '←', delay: 0 },
  { id: 'up', symbol: '↑', delay: 0.5 },
  { id: 'right', symbol: '→', delay: 1 },
]

// pressed = אילו חיצים לחוצים ממש עכשיו בפועל (לא רק ההדגמה האוטומטית) —
// מקש שלחוצים עליו באמת נדלק מיד, במקום לחכות לתור שלו בלולאה.
function IntroKeyboard({ pressed }) {
  function keyClass(id) {
    return `intro-keyboard__key intro-keyboard__key--${id}${pressed?.[id] ? ' intro-keyboard__key--pressed' : ''}`
  }
  return (
    <div className="intro-keyboard">
      <div className={keyClass('up')} style={{ animationDelay: `${KEYBOARD_KEYS[1].delay}s` }}>
        {KEYBOARD_KEYS[1].symbol}
      </div>
      <div className="intro-keyboard__row">
        <div className={keyClass('left')} style={{ animationDelay: `${KEYBOARD_KEYS[0].delay}s` }}>
          {KEYBOARD_KEYS[0].symbol}
        </div>
        <div className={keyClass('right')} style={{ animationDelay: `${KEYBOARD_KEYS[2].delay}s` }}>
          {KEYBOARD_KEYS[2].symbol}
        </div>
      </div>
      <div className="intro-keyboard__caption">↑ קפיצה &nbsp;·&nbsp; ← → הליכה</div>
      <div className="intro-keyboard__caption">🖱️ או: לחיצה עם העכבר במקום שאליו רוצים להגיע</div>
    </div>
  )
}

// במסך הסיום מרקר תמיד השיעור השלישי ברשימת "שיעורים שמחכים לך" (אם לא נאספה במשחק)
const PINNED_LESSON = { id: 'b2b-05', index: 2 }
function withPinnedLesson(gifts) {
  const pinned = gifts.find((gift) => gift.id === PINNED_LESSON.id)
  if (!pinned) return gifts
  const rest = gifts.filter((gift) => gift !== pinned)
  rest.splice(Math.min(PINNED_LESSON.index, rest.length), 0, pinned)
  return rest
}

function introLinesFor(step) {
  return (IS_TOUCH && step.touchLines) || step.lines
}

// גרסת המגע של IntroKeyboard: אותם כפתורים כמו במשחק, והלחיצה עליהם מזיזה את
// הרובוט כמו חיצי המקלדת (שולחים אירוע מקלדת מדומה לאותו מאזין)
function IntroTouchButtons({ pressed }) {
  function press(code, isDown) {
    window.dispatchEvent(new KeyboardEvent(isDown ? 'keydown' : 'keyup', { code }))
  }
  function buttonProps(code) {
    return {
      type: 'button',
      onPointerDown: () => press(code, true),
      onPointerUp: () => press(code, false),
      onPointerLeave: () => press(code, false),
    }
  }
  return (
    <div className="intro-touch">
      <div className="intro-touch__group">
        <div className="intro-touch__row">
          <button className={`touch-btn${pressed?.left ? ' touch-btn--pressed' : ''}`} {...buttonProps('ArrowLeft')}>◀</button>
          <button className={`touch-btn${pressed?.right ? ' touch-btn--pressed' : ''}`} {...buttonProps('ArrowRight')}>▶</button>
        </div>
        <span className="intro-touch__caption">הליכה</span>
      </div>
      <div className="intro-touch__group">
        <div className="intro-touch__row">
          <button className={`touch-btn touch-btn--jump${pressed?.up ? ' touch-btn--pressed' : ''}`} {...buttonProps('ArrowUp')}>⤴</button>
        </div>
        <span className="intro-touch__caption">קפיצה</span>
      </div>
    </div>
  )
}

function playLadderNotes(audioContext, notes, startAt, spacing = 0.075) {
  notes.forEach((frequency, index) => {
    const noteStart = startAt + index * spacing
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, noteStart)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, noteStart + 0.18)
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(0.065, noteStart + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.2)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + 0.21)
  })
}

function playKeyPickupSound(audioContext) {
  if (audioContext?.state !== 'running') return

  const startAt = audioContext.currentTime
  const notes = [880, 1174.66, 1567.98]
  notes.forEach((frequency, index) => {
    const noteStart = startAt + index * 0.055
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = index === 2 ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, noteStart)
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(index === 2 ? 0.11 : 0.075, noteStart + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.3)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + 0.31)
  })

  const sparkle = audioContext.createOscillator()
  const sparkleGain = audioContext.createGain()
  sparkle.type = 'sine'
  sparkle.frequency.setValueAtTime(2349.32, startAt + 0.11)
  sparkleGain.gain.setValueAtTime(0.0001, startAt + 0.11)
  sparkleGain.gain.exponentialRampToValueAtTime(0.035, startAt + 0.125)
  sparkleGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.34)
  sparkle.connect(sparkleGain)
  sparkleGain.connect(audioContext.destination)
  sparkle.start(startAt + 0.11)
  sparkle.stop(startAt + 0.35)
}

function playEnemyHitSound(audioContext) {
  if (audioContext?.state !== 'running') return

  const startAt = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()
  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(260, startAt)
  oscillator.frequency.exponentialRampToValueAtTime(82, startAt + 0.24)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(950, startAt)
  filter.frequency.exponentialRampToValueAtTime(240, startAt + 0.22)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(0.09, startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.26)
  oscillator.connect(filter)
  filter.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + 0.27)
}

function playEnemyStompSound(audioContext) {
  if (audioContext?.state !== 'running') return

  const startAt = audioContext.currentTime
  const notes = [392, 523.25, 659.25, 783.99, 1046.5]
  notes.forEach((frequency, index) => {
    const noteStart = startAt + index * 0.045
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    oscillator.type = index === notes.length - 1 ? 'sine' : 'triangle'
    oscillator.frequency.setValueAtTime(frequency, noteStart)
    gain.gain.setValueAtTime(0.0001, noteStart)
    gain.gain.exponentialRampToValueAtTime(index === 2 ? 0.12 : 0.085, noteStart + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(noteStart)
    oscillator.stop(noteStart + 0.33)
  })

  const burst = audioContext.createOscillator()
  const burstGain = audioContext.createGain()
  burst.type = 'sine'
  burst.frequency.setValueAtTime(125, startAt)
  burst.frequency.exponentialRampToValueAtTime(42, startAt + 0.16)
  burstGain.gain.setValueAtTime(0.0001, startAt)
  burstGain.gain.exponentialRampToValueAtTime(0.13, startAt + 0.008)
  burstGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18)
  burst.connect(burstGain)
  burstGain.connect(audioContext.destination)
  burst.start(startAt)
  burst.stop(startAt + 0.19)
}

// כל האויבים הוסרו מהמשחק — הרשימה ריקה, שאר הקוד (ציור/תנועה/פגיעה) פשוט רץ על רשימה ריקה.
const ENEMY_DEFINITIONS = []

// קופסאות המתנה מוצקות מכל הכיוונים (גם אחרי שנפתחו, כמו במריו)
const GIFT_BOX_SOLIDS = LEVEL.giftBoxes.map((box) => ({ ...box, kind: 'box' }))
// גובהי הרצפות (בלי מדפים), מלמעלה למטה
const FLOOR_LEVELS = [...new Set(LEVEL.platforms.filter((p) => !p.kind).map((p) => p.y))].sort((a, b) => a - b)
const PLAYER_MAX_X = Math.min(WORLD_WIDTH, LEVEL.elevator.x + LEVEL.elevator.width) - PLAYER_WIDTH
// --- שמירת לידים ב-Firestore (אותו מבנה כמו ביריד הקיץ) ---
// fairs/b2bfair/early_signups — רשימת הדיוור: כל מי שמאשר דיוור (בפתיחה או בסוף)
// fairs/b2bfair/finale_leads  — מי אסף/בחר אילו מתנות (shopIds = מזהי העסקים)
const B2B_FAIR_ID = 'b2bfair'
const REF_PARAM = new URLSearchParams(window.location.search).get('ref') || ''

async function addMailingSignup(email, source) {
  await addDoc(collection(db, 'fairs', B2B_FAIR_ID, 'early_signups'), {
    email,
    marketingConsent: true,
    source,
    ref: REF_PARAM,
    signedUpAt: serverTimestamp(),
  })
}

const KEYS_BY_ID = Object.fromEntries(LEVEL.keys.map((key) => [key.id, key]))

// שווי המתנה בנקודות — לפי קופסה/רגיל ולפי הקומה (העליונה כפולה)
function keyPoints(key) {
  const base = key.inBox ? BOX_GIFT_POINTS : GIFT_POINTS
  return key.floorY === FLOOR_LEVELS[0] ? base * TOP_FLOOR_POINTS_MULTIPLIER : base
}
const POINTS_BY_COURSE_ID = Object.fromEntries(LEVEL.keys.map((key) => [key.courseId, keyPoints(key)]))

// שיא אישי נשמר בדפדפן בלבד; אם האחסון חסום — פשוט אין שיא
const BEST_SCORE_STORAGE_KEY = 'b2bfair-best-score'
function readBestScore() {
  try {
    return Number(window.localStorage.getItem(BEST_SCORE_STORAGE_KEY)) || 0
  } catch {
    return 0
  }
}
function writeBestScore(score) {
  try {
    window.localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(score))
  } catch {
    // אחסון חסום (גלישה בסתר וכו') — מוותרים על השיא
  }
}

// המייל שאושר לדיוור נשמר בדפדפן, כדי שבכניסה הבאה לא יצטרכו להקליד אותו שוב
const SAVED_EMAIL_STORAGE_KEY = 'b2bfair-email'
function readSavedEmail() {
  try {
    return window.localStorage.getItem(SAVED_EMAIL_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}
function writeSavedEmail(email) {
  try {
    window.localStorage.setItem(SAVED_EMAIL_STORAGE_KEY, email)
  } catch {
    // אחסון חסום — פשוט יקלידו שוב בפעם הבאה
  }
}
const DOORS_BY_ID = Object.fromEntries(LEVEL.doors.map((door) => [door.id, door]))

// ראשי תיבות משתי המילים הראשונות, בלי סימנים כמו מקף או נקודה
function initials(name) {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? []
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')
}

// לוגו העסק; בלי לוגו — עיגול צבעוני עם ראשי תיבות, או עם השם המלא אם הוגדר logoText
function GiftLogo({ gift }) {
  if (gift.logoUrl) return <img src={gift.logoUrl} alt={gift.businessName} draggable="false" />
  if (gift.logoText) {
    return (
      <span className="gift-logo-fallback gift-logo-fallback--text" style={{ background: gift.color }}>
        {gift.logoText}
      </span>
    )
  }
  return (
    <span className="gift-logo-fallback" style={{ background: gift.color }}>
      {initials(gift.businessName)}
    </span>
  )
}

// שיעור במסך הסיום (עמוד המכללה, בעיצוב של עמוד הקורס ב-schoolframe.net):
// לחיצה פותחת/נועלת — כלומר מצטרפים או לא למתנה. נעול = אפור עם מנעול.
function LessonCard({ gift, number, isOpen, onToggle }) {
  return (
    <li className="lesson-item">
      <button
        type="button"
        className={`lesson${isOpen ? ' lesson--open' : ''}`}
        aria-pressed={isOpen}
        onClick={onToggle}
        style={{ '--lesson-color': gift.color, animationDelay: `${Math.min(number, 12) * 60}ms` }}
      >
        <span className="lesson__media">
          <span className="lesson__logo">
            <GiftLogo gift={gift} />
          </span>
          <span className="lesson__shade" />
          <span className="lesson__icon" aria-hidden="true">{isOpen ? '▶' : '🔒'}</span>
          <span className="lesson__tag">🎁 שיעור מתנה</span>
        </span>
        <span className="lesson__body">
          {!isOpen && (
            <span className="lesson__cta">
              <span>לחצו לפתיחה</span>
            </span>
          )}
          <span className="lesson__meta">
            <span className="lesson__number">שיעור {number}</span>
            {isOpen && <span className="lesson__check" aria-label="פתוח">✓</span>}
          </span>
          <strong className="lesson__title">{gift.giftName}</strong>
          {gift.giftDescription && (
            <span className="lesson__desc" title={gift.giftDescription}>{gift.giftDescription}</span>
          )}
          <span className="lesson__teacher">עם {gift.businessName}</span>
        </span>
      </button>
    </li>
  )
}

function playRevealSound(audioContext) {
  if (audioContext?.state !== 'running') return
  const t = audioContext.currentTime
  playLadderNotes(audioContext, [783.99, 987.77, 1174.66, 1567.98], t, 0.07)
  playLadderNotes(audioContext, [1046.5, 1318.51, 1567.98, 2093], t + 0.32, 0.05)
}

// "תקתוק" רובוטי קצר וחד לכל אות שנופלת בבועת הפתיחה — גל ריבוע (square)
// נותן אופי דיגיטלי/רובוטי, ומשך קצר מאוד כדי לא ליצור "בוץ" כשכמה חופפות
const INTRO_BLIP_NOTES = [659.25, 783.99, 880, 987.77, 1174.66, 1318.51, 1479.98]
function playLetterBlip(audioContext, noteIndex) {
  if (audioContext?.state !== 'running') return
  const t = audioContext.currentTime
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(INTRO_BLIP_NOTES[noteIndex % INTRO_BLIP_NOTES.length], t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.045, t + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  osc.connect(gain)
  gain.connect(audioContext.destination)
  osc.start(t)
  osc.stop(t + 0.08)
}

// "קליק" מכני קצר בכל מעבר בין פוזות הידיים של הרובוט המדריך
function playArmSwitchBlip(audioContext) {
  if (audioContext?.state !== 'running') return
  const t = audioContext.currentTime
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(220, t)
  osc.frequency.exponentialRampToValueAtTime(90, t + 0.09)
  filter.type = 'lowpass'
  filter.frequency.value = 1200
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.05, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(audioContext.destination)
  osc.start(t)
  osc.stop(t + 0.11)
}

// ריצת טונים עולה נלהבת — "הפעלה" של הרובוט ברגע שהפנסים נדלקים
function playIgnitePowerUp(audioContext) {
  if (audioContext?.state !== 'running') return
  playLadderNotes(audioContext, [392, 523.25, 659.25, 783.99, 1046.5], audioContext.currentTime, 0.09)
}

function createElevatorState() {
  // מתחילה בקרקע (תחנה 0) ונוסעת לתחנה הבאה למעלה
  return { y: LEVEL.elevator.stops[0], stopIndex: 1, direction: 1, pauseUntil: 0 }
}

function playGiftBoxSound(audioContext) {
  if (audioContext?.state !== 'running') return
  playLadderNotes(audioContext, [783.99, 1046.5, 1318.51, 1567.98], audioContext.currentTime, 0.06)
}

function playDoorSound(audioContext) {
  if (audioContext?.state !== 'running') return
  playLadderNotes(audioContext, [1046.5, 783.99, 523.25, 392], audioContext.currentTime, 0.07)
}

function createEnemies() {
  return ENEMY_DEFINITIONS.map((definition) => {
    const startX = Math.round(WORLD_WIDTH * definition.xRatio)
    const patrolDistance = Math.round(WORLD_WIDTH * definition.patrolRatio)
    const minX = Math.max(0, startX - patrolDistance / 2)
    const maxX = Math.min(WORLD_WIDTH - 62, startX + patrolDistance / 2)
    return {
      ...definition,
      startX,
      x: startX,
      y: definition.floor - 54,
      minX,
      maxX,
      direction: definition.id === 'client' ? -1 : 1,
      alive: true,
    }
  })
}

// סרגל הצד השמאלי (ניקוד, יצירת קשר, חסות) תופס רוחב קבוע, והמשחק מקבל רק את
// השאר — כך הסרגל לא עולה על המשחק. חייב להתאים ל-.hud ב-App.css.
// בטלפון לאורך אין רוחב לסרגל צד — הוא הופך לפס עליון (.app-root--hud-top)
const HUD_WIDTH = 220
const HUD_WIDTH_NARROW = 118
const HUD_BAR_HEIGHT = 56
function isHudTop(windowWidth, windowHeight) {
  return windowWidth <= 600 && windowHeight > windowWidth
}
function hudWidthFor(windowWidth, windowHeight = window.innerHeight) {
  if (isHudTop(windowWidth, windowHeight)) return 0
  return windowWidth <= 600 || windowHeight <= 500 ? HUD_WIDTH_NARROW : HUD_WIDTH
}
function hudHeightFor(windowWidth, windowHeight = window.innerHeight) {
  return isHudTop(windowWidth, windowHeight) ? HUD_BAR_HEIGHT : 0
}
function gameAreaWidth() {
  return window.innerWidth - hudWidthFor(window.innerWidth)
}
function gameAreaHeight() {
  return window.innerHeight - hudHeightFor(window.innerWidth)
}

// בזום של "קומה אחת בגובה המסך" טלפון לאורך רואה רק פס צר מהעולם —
// לכן הזום מוגבל כך שתמיד רואים לפחות כך וכך גבהי-קומה לרוחב
const MIN_VISIBLE_WIDTH_IN_FLOORS = 0.9

// הרובוט מתחיל באמצע המסך — אבל במסך צר זה נופל על הדלת הסודית שבקומת
// הקרקע, שמסתירה אותו, לכן תמיד מימין לה
function spawnX(viewportWidth) {
  const door = DOORS_BY_ID['door-ground']
  return Math.max(door.x + door.width + 40, Math.round(viewportWidth / 2 - PLAYER_WIDTH / 2))
}

// במכשירי מגע ההוראות מראות את כפתורי המגע במקום חיצי המקלדת
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

// גובה רגלי הרובוט מתחתית המסך, כחלק מגובה המסך (ראו cameraY ב-syncCameraToDOM)
const CAMERA_FEET_FROM_BOTTOM = 0.24
// ההליכה מאיצה מעמידה למהירות מלאה ב-WALK_ACCEL_SECONDS — לחיצה קצרה זזה מעט
// (כדי לעמוד בדיוק מתחת למתנה), החזקה ממושכת הולכת מהר כמו קודם
const WALK_ACCEL_SECONDS = 0.28

// שליטה בעכבר על לוח המשחק (למי שלא חושבת על החיצים): לוחצים ומחזיקים לאן
// שרוצים להגיע — הרובוט הולך לשם; נקודה מעל הראש = קפיצה/טיפוס, מתחת לרגליים = ירידה.
// המיקום נשמר בפיקסלים של המסך ומתורגם לעולם בכל פריים, כי המצלמה זזה עם הרובוט.
const POINTER_DEAD_ZONE = 18
// לחיצה קצרה מעל הראש "מחזיקה" את הקפיצה עוד קצת, אחרת השחרור המהיר קוטע אותה
const POINTER_JUMP_HOLD_MS = 280

function pointerWorldY(g) {
  return g.cameraY + g.pointer.y / g.zoom
}

function pointerControls(g, now) {
  const jumpHeld = now < g.pointerJumpUntil
  if (!g.pointer.down) return { left: false, right: false, up: jumpHeld, down: false }
  const dx = g.cameraX + g.pointer.x / g.zoom - (g.x + PLAYER_WIDTH / 2)
  const worldY = pointerWorldY(g)
  return {
    left: dx < -POINTER_DEAD_ZONE,
    right: dx > POINTER_DEAD_ZONE,
    up: jumpHeld || worldY < g.y,
    down: worldY > g.y + PLAYER_HEIGHT + POINTER_DEAD_ZONE,
  }
}

// 'start' -> 'countdown' -> 'playing' -> 'ended'
function App() {
  const [phase, setPhase] = useState('start')
  const [introStep, setIntroStep] = useState(0)
  const [introFrame, setIntroFrame] = useState(ROBOT_FRAMES.idleClosed)
  // תגובה חיה לחיצי המקלדת במסך הפתיחה — לא אנימציית הליכה אמיתית, רק
  // תזוזה/קפיצה קטנה שממחישה שהרובוט "שומע" את החיצים
  const [introNudge, setIntroNudge] = useState(0)
  const [introJumping, setIntroJumping] = useState(false)
  // אילו חיצים לחוצים ממש עכשיו בפועל — כדי להדליק את המקש המתאים בציור
  // המקלדת באופן מיידי כשמנסים, לא רק בלולאת ההדגמה האוטומטית
  const [introKeysPressed, setIntroKeysPressed] = useState({ left: false, right: false, up: false })
  // לחיצה על "התחילו לשחק" פותחת שאלה קצרה אחת (לאן לשלוח את המתנות) לפני
  // שבאמת נכנסים למשחק — לא חוסם: אפשר להמשיך גם בלי להזין כלום
  const [showLeadPrompt, setShowLeadPrompt] = useState(false)
  const [introEmail, setIntroEmail] = useState(readSavedEmail)
  // מייל שמור = כבר אישרו דיוור בכניסה קודמת
  const [introConsent, setIntroConsent] = useState(() => readSavedEmail() !== '')
  const [countdownValue, setCountdownValue] = useState(3)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [collectedIds, setCollectedIds] = useState(() => new Set())
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [giftPreview, setGiftPreview] = useState(null)
  // גובה הרצפה שהדמות עומדת עליה — לחיצי ⬆ ליד הסולם/המעלית ולמונה הקומות
  const [currentFloorY, setCurrentFloorY] = useState(GROUND_Y)
  const [topFloorBonusShown, setTopFloorBonusShown] = useState(false)
  const [caughtToast, setCaughtToast] = useState(null)
  const caughtToastTimerRef = useRef(null)
  // תזכורת "איך משחקים" — בתחילת כל סיבוב, ושוב בכל לחיצת עכבר על אזור המשחק
  // (מי שמנסה ללחוץ על הלוח כנראה לא יודעת שמשחקים עם החיצים)
  const [controlsHintId, setControlsHintId] = useState(0)
  const controlsHintTimerRef = useRef(null)
  // ההסבר על החיצים קופץ רק בלחיצת העכבר הראשונה — מעכשיו העכבר עצמו מזיז את הרובוט
  const mouseHintShownRef = useRef(false)
  // השיא שהיה לפני הסיבוב הנוכחי + האם נשבר — נקבע במעבר למסך הסיום
  const [scoreRecord, setScoreRecord] = useState({ previousBest: 0, isNew: false })
  const [claimedGiftIds, setClaimedGiftIds] = useState(() => new Set())
  // מי שהשאיר מייל בפתיחה לא מתבקש להקליד אותו שוב בסיום (אלא אם לחץ "לשנות")
  // מייל שמור מכניסה קודמת נחשב "כבר נמסר" — גם למי שדילגה ישר לשיעורים
  const [introEmailGiven, setIntroEmailGiven] = useState(() => readSavedEmail() !== '')
  const [editingLeadEmail, setEditingLeadEmail] = useState(false)
  const [leadEmail, setLeadEmail] = useState(readSavedEmail)
  const [leadConsent, setLeadConsent] = useState(() => readSavedEmail() !== '')
  const [leadBusy, setLeadBusy] = useState(false)
  const [leadError, setLeadError] = useState('')
  // אימייל שאישר דיוור בפתיחה — ממנו נשמרת ההתקדמות תוך כדי משחק
  const consentedEmailRef = useRef('')
  const signedUpEmailsRef = useRef(new Set())
  const progressDocIdRef = useRef(null)
  const progressQueueRef = useRef(Promise.resolve())

  const viewportRef = useRef(null)
  const worldLayerRef = useRef(null)
  const playerRef = useRef(null)
  const enemyElementsRef = useRef({})
  const hudRef = useRef(null)
  const keyElementsRef = useRef({})
  const giftBoxElementsRef = useRef({})
  const doorElementsRef = useRef({})
  const elevatorRef = useRef(null)
  const audioContextRef = useRef(null)
  const footstepIndexRef = useRef(0)

  // מצב פיזיקלי חי — לא ב-state כדי לא לגרום ל-re-render כל פריים
  const game = useRef({
    x: spawnX(gameAreaWidth()),
    y: GROUND_Y - PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    jumping: false,
    onGround: false,
    climbing: false,
    jumpWasDown: false,
    jumpCut: false,
    jumpBufferedAt: -Infinity,
    lastGroundedAt: -Infinity,
    groundKind: null,
    dropThroughUntil: 0,
    downWasDown: false,
    downTapped: false,
    elevator: createElevatorState(),
    openedBoxes: new Set(),
    facing: 1,
    cameraX: 0,
    cameraY: 0,
    viewportWidth: gameAreaWidth(),
    viewportHeight: gameAreaHeight(),
    keysDown: new Set(),
    collected: new Set(),
    lastFootstepAt: 0,
    lastClimbSoundAt: 0,
    climbSoundIndex: 0,
    wasClimbing: false,
    enemies: createEnemies(),
    damageUntil: 0,
    rafId: null,
    lastTime: null,
    nearbyKeyId: null,
    zoom: 1,
    pointer: { down: false, x: 0, y: 0 },
    pointerJumpUntil: 0,
  })

  // גובה/רוחב המסך בפועל — נשמר גם ב-state כדי שגודל שכבת העולם יתעדכן בזמן אמת
  // (זה מה שגורם למשחק למלא את כל המסך ולא רק חלק ממנו)
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  // --- קלט מקלדת ---
  useEffect(() => {
    function handleKeyDown(e) {
      game.current.keysDown.add(e.code)
      // לחיצה קצרה מאוד יכולה להתחיל ולהיגמר בין שני פריימים — שומרים אותה
      if (!e.repeat && (e.code === 'ArrowDown' || e.code === 'KeyS')) {
        game.current.downTapped = true
      }
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code
        )
      ) {
        e.preventDefault()
      }
    }
    function handleKeyUp(e) {
      game.current.keysDown.delete(e.code)
    }
    window.addEventListener('keydown', handleKeyDown, { passive: false })
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // --- מדידת גודל המסך בפועל ---
  useEffect(() => {
    function handleResize() {
      game.current.viewportWidth = gameAreaWidth()
      game.current.viewportHeight = gameAreaHeight()
      setViewportSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ממקם את המצלמה ואת הדמות ב-DOM לפי המיקום הנוכחי של game.current —
  // בלי זה, בזמן הספירה לאחור (לפני שלולאת המשחק מתחילה) המסך מציג את
  // חלק העליון של העולם במקום את הדמות שכבר עומדת למטה על הרצפה
  const syncCameraToDOM = useCallback(() => {
    const g = game.current
    // זום דינמי: תמיד מציג בדיוק קומה אחת (שליש מגובה העולם) בגובה המסך,
    // יחסי לגודל המסך בפועל. "חלון הצפייה" בתוך העולם הוא גודל המסך חלקי הזום.
    const floorHeight = (WORLD_HEIGHT / 3) * FLOORS_VISIBLE_PER_SCREEN
    const zoom = Math.min(
      g.viewportHeight / floorHeight,
      g.viewportWidth / (floorHeight * MIN_VISIBLE_WIDTH_IN_FLOORS)
    )
    g.zoom = zoom
    const vw = g.viewportWidth / zoom
    const vh = g.viewportHeight / zoom
    const worldHeight = Math.max(WORLD_HEIGHT, vh)

    let cameraX
    if (WORLD_WIDTH <= vw) {
      cameraX = -(vw - WORLD_WIDTH) / 2
    } else {
      cameraX = g.x + PLAYER_WIDTH / 2 - vw / 2
      cameraX = Math.max(
        -CAMERA_EDGE_MARGIN,
        Math.min(WORLD_WIDTH - vw + CAMERA_EDGE_MARGIN, cameraX)
      )
    }
    g.cameraX = cameraX

    // הרגליים ברבע התחתון של המסך (לא באמצע): מעל הרובוט נשאר רוב גובה הקומה
    // לשלטים המורמים, ולא מבזבזים חצי מסך על הקומה שמתחת. במסכים רחבים ונמוכים
    // מרכוז רגיל חתך את השלטים הגבוהים בראש המסך.
    let cameraY = g.y + PLAYER_HEIGHT - vh * (1 - CAMERA_FEET_FROM_BOTTOM)
    cameraY = Math.max(0, Math.min(worldHeight - vh, cameraY))
    g.cameraY = cameraY

    if (worldLayerRef.current) {
      worldLayerRef.current.style.transform = `scale(${zoom}) translate3d(${-cameraX}px, ${-cameraY}px, 0)`
    }
    if (playerRef.current) {
      playerRef.current.style.transform = `translate3d(${g.x + PLAYER_WIDTH / 2 - 28}px, ${g.y - 64}px, 0) scaleX(${g.facing})`
      playerRef.current.style.backgroundImage = `url(${g.climbing ? robotClimbSpriteSheet : robotSpriteSheet})`
      playerRef.current.classList.toggle('player--walking', g.vx !== 0 && !g.climbing)
      playerRef.current.classList.toggle('player--climbing', g.climbing)
      playerRef.current.classList.toggle('player--moving', g.vx !== 0 || g.climbing)
    }
    for (const enemy of g.enemies) {
      const element = enemyElementsRef.current[enemy.id]
      if (!element || !enemy.alive) continue
      element.style.transform = `translate3d(${enemy.x - enemy.startX}px, 0, 0)`
      element.classList.toggle('enemy--facing-left', enemy.direction < 0)
    }
    if (elevatorRef.current) {
      elevatorRef.current.style.transform = `translate3d(0, ${g.elevator.y - LEVEL.elevator.topY}px, 0)`
    }
  }, [])

  // מציג מיד את הדמות במיקום הנכון (למטה, על הרצפה) ברגע שנכנסים למסך הספירה
  // לאחור, עוד לפני שלולאת המשחק בפועל מתחילה לרוץ
  useEffect(() => {
    if (phase !== 'countdown') return
    syncCameraToDOM()
    // ודאו שאף תגית לוגו של מפתח קרוב לא נחתכת כבר במסגרת הפתיחה: אם המצלמה
    // ההתחלתית חושפת רק חלק מתגית, מזיזים מעט את נקודת ההתחלה כך שתיכלל במלואה
    const g = game.current
    const KEY_WIDTH = 32
    const LOGO_OVERFLOW = 8
    // כמה סבבים — תיקון לכיוון אחד עלול לחשוף התנגשות חדשה בצד השני, אז
    // חוזרים עד שמתכנסים (או שמוותרים אחרי כמה ניסיונות)
    for (let pass = 0; pass < 2; pass++) {
      const viewLeft = g.cameraX
      const viewRight = g.cameraX + g.viewportWidth / g.zoom
      let adjusted = false
      for (const key of LEVEL.keys) {
        const logoLeft = key.x - LOGO_OVERFLOW
        const logoRight = key.x + KEY_WIDTH + LOGO_OVERFLOW
        if (logoLeft < viewLeft && logoRight > viewLeft) {
          g.x -= viewLeft - logoLeft
          adjusted = true
        } else if (logoRight > viewRight && logoLeft < viewRight) {
          g.x += logoRight - viewRight
          adjusted = true
        }
      }
      syncCameraToDOM()
      if (!adjusted) break
    }
  }, [phase, syncCameraToDOM])

  // קונפטי קצר במקום המפתח — בלי לעצור את המשחק, כדי שיספיקו כמה שיותר
  function spawnConfetti(x, y, color) {
    const layer = worldLayerRef.current
    if (!layer) return
    const burst = document.createElement('div')
    burst.className = 'key-confetti'
    burst.style.left = `${x}px`
    burst.style.top = `${y}px`
    for (let i = 0; i < 18; i++) {
      const piece = document.createElement('span')
      piece.style.setProperty('--angle', `${(i / 18) * 360}deg`)
      piece.style.setProperty('--distance', `${70 + (i % 3) * 22}px`)
      piece.style.background = i % 3 === 0 ? color : i % 3 === 1 ? '#f1d896' : '#ffffff'
      burst.appendChild(piece)
    }
    layer.appendChild(burst)
    window.setTimeout(() => burst.remove(), 1000)
  }

  const collectKey = useCallback((keyId, courseId) => {
    if (game.current.collected.has(keyId)) return
    game.current.collected.add(keyId)
    const key = KEYS_BY_ID[keyId]
    playKeyPickupSound(audioContextRef.current)
    playRevealSound(audioContextRef.current)
    const el = keyElementsRef.current[keyId]
    if (el) el.style.display = 'none'
    spawnConfetti(key.x + 16, key.y + 16, key.gift.color)
    const points = keyPoints(key)
    if (worldLayerRef.current) {
      const float = document.createElement('div')
      float.className = 'points-float'
      float.textContent = `+${points}`
      float.style.left = `${key.x + 16}px`
      float.style.top = `${key.y - 10}px`
      worldLayerRef.current.appendChild(float)
      window.setTimeout(() => float.remove(), 1100)
    }
    // "נכנס לסל" — שהמתנה עצמה תרגיש כמו הפרס, לא רק הנקודות
    window.clearTimeout(caughtToastTimerRef.current)
    setCaughtToast({ id: keyId, giftName: key.gift.giftName })
    caughtToastTimerRef.current = window.setTimeout(() => setCaughtToast(null), 2000)
    setCollectedIds((prev) => new Set(prev).add(courseId))
    setClaimedGiftIds((previous) => new Set(previous).add(courseId))
    setGiftPreview(null)
    saveProgress()
  }, [])

  // שמירה מתקדמת: מי שאישר דיוור בפתיחה — כל מפתח שנאסף נשמר מיד, כדי שלא
  // יאבד גם אם עוזבים באמצע. השמירות בתור כדי שה-addDoc הראשון יסתיים לפני update.
  function saveProgress() {
    const email = consentedEmailRef.current
    if (!email) return
    const shopIds = [...game.current.collected].map((keyId) => KEYS_BY_ID[keyId].courseId)
    progressQueueRef.current = progressQueueRef.current.then(async () => {
      try {
        if (progressDocIdRef.current) {
          await updateDoc(doc(db, 'fairs', B2B_FAIR_ID, 'finale_leads', progressDocIdRef.current), {
            shopIds,
            caughtCount: shopIds.length,
            updatedAt: serverTimestamp(),
          })
        } else {
          const ref = await addDoc(collection(db, 'fairs', B2B_FAIR_ID, 'finale_leads'), {
            email,
            name: '',
            shopIds,
            caughtCount: shopIds.length,
            stage: 'progress',
            ref: REF_PARAM,
            claimedAt: serverTimestamp(),
          })
          progressDocIdRef.current = ref.id
        }
      } catch (err) {
        console.error('[b2bfair progress]', err)
      }
    })
  }

  // מכה בקופסת מתנה מלמטה: הקופסה קופצת, מפתח עף ממנה למעלה ונאסף
  const openGiftBox = useCallback((box) => {
    const g = game.current
    const element = giftBoxElementsRef.current[box.id]
    if (element) {
      element.classList.remove('gift-box--bump')
      void element.offsetWidth
      element.classList.add('gift-box--bump')
    }
    if (g.openedBoxes.has(box.id)) return
    g.openedBoxes.add(box.id)
    element?.classList.add('gift-box--opened')
    playGiftBoxSound(audioContextRef.current)

    if (worldLayerRef.current) {
      const pop = document.createElement('div')
      pop.className = 'key-pop'
      pop.textContent = '🔑'
      pop.style.left = `${box.x + box.width / 2 - 16}px`
      pop.style.top = `${box.y - 34}px`
      worldLayerRef.current.appendChild(pop)
      window.setTimeout(() => pop.remove(), 700)
    }
    collectKey(box.keyId, KEYS_BY_ID[box.keyId].courseId)
  }, [collectKey])

  // --- לולאת המשחק ---
  useEffect(() => {
    if (phase !== 'playing') return

    function step(now) {
      const g = game.current
      if (g.lastTime == null) g.lastTime = now
      const dt = Math.min((now - g.lastTime) / 1000, 0.05)
      g.lastTime = now

      for (const enemy of g.enemies) {
        if (!enemy.alive) continue
        enemy.x += enemy.direction * enemy.speed * dt
        if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
          enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x))
          enemy.direction *= -1
        }
      }

      // מעלית: עולה ויורדת בין כל הקומות, עוצרת בכל קומה, ומסיעה את מי שעומד עליה
      const elevatorConfig = LEVEL.elevator
      const elevator = g.elevator
      if (now >= elevator.pauseUntil) {
        const previousElevatorY = elevator.y
        const targetY = elevatorConfig.stops[elevator.stopIndex]
        const step = elevatorConfig.speed * dt
        if (Math.abs(targetY - elevator.y) <= step) {
          elevator.y = targetY
          elevator.pauseUntil = now + elevatorConfig.pauseMs
          const lastStop = elevatorConfig.stops.length - 1
          if (elevator.stopIndex === lastStop) elevator.direction = -1
          else if (elevator.stopIndex === 0) elevator.direction = 1
          elevator.stopIndex += elevator.direction
        } else {
          elevator.y += Math.sign(targetY - elevator.y) * step
        }
        if (g.groundKind === 'elevator') g.y += elevator.y - previousElevatorY
      }

      const pointer = pointerControls(g, now)
      const left = g.keysDown.has('ArrowLeft') || g.keysDown.has('KeyA') || pointer.left
      const right = g.keysDown.has('ArrowRight') || g.keysDown.has('KeyD') || pointer.right
      const upPressed = g.keysDown.has('ArrowUp') || g.keysDown.has('KeyW') || pointer.up
      const downPressed = g.keysDown.has('ArrowDown') || g.keysDown.has('KeyS') || pointer.down
      const jumpPressed = upPressed || g.keysDown.has('Space')

      // תנועה אופקית
      const walkAccel = (MOVE_SPEED / WALK_ACCEL_SECONDS) * dt
      if (left && !right) {
        g.vx = Math.max(-MOVE_SPEED, Math.min(0, g.vx) - walkAccel)
        g.facing = -1
      } else if (right && !left) {
        g.vx = Math.min(MOVE_SPEED, Math.max(0, g.vx) + walkAccel)
        g.facing = 1
      } else {
        g.vx = 0
      }

      if (g.vx !== 0 && !g.climbing && now - g.lastFootstepAt >= 245) {
        const audioContext = audioContextRef.current
        if (audioContext?.state === 'running') {
          const startAt = audioContext.currentTime
          const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46]
          const note = melody[footstepIndexRef.current % melody.length]
          const accent = footstepIndexRef.current % 4 === 0
          footstepIndexRef.current++

          const chime = audioContext.createOscillator()
          const chimeGain = audioContext.createGain()
          const chimeFilter = audioContext.createBiquadFilter()
          chime.type = 'sine'
          chime.frequency.setValueAtTime(note, startAt)
          chime.frequency.exponentialRampToValueAtTime(note * 0.985, startAt + 0.22)
          chimeFilter.type = 'lowpass'
          chimeFilter.frequency.value = 2400
          chimeGain.gain.setValueAtTime(0.0001, startAt)
          chimeGain.gain.exponentialRampToValueAtTime(accent ? 0.095 : 0.07, startAt + 0.018)
          chimeGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.24)
          chime.connect(chimeFilter)
          chimeFilter.connect(chimeGain)
          chimeGain.connect(audioContext.destination)
          chime.start(startAt)
          chime.stop(startAt + 0.25)

          const harmony = audioContext.createOscillator()
          const harmonyGain = audioContext.createGain()
          harmony.type = 'triangle'
          harmony.frequency.setValueAtTime(note * 2, startAt)
          harmonyGain.gain.setValueAtTime(0.0001, startAt)
          harmonyGain.gain.exponentialRampToValueAtTime(0.018, startAt + 0.025)
          harmonyGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18)
          harmony.connect(harmonyGain)
          harmonyGain.connect(audioContext.destination)
          harmony.start(startAt)
          harmony.stop(startAt + 0.19)

          if (accent) {
            const beat = audioContext.createOscillator()
            const beatGain = audioContext.createGain()
            beat.type = 'sine'
            beat.frequency.setValueAtTime(130, startAt)
            beat.frequency.exponentialRampToValueAtTime(68, startAt + 0.12)
            beatGain.gain.setValueAtTime(0.0001, startAt)
            beatGain.gain.exponentialRampToValueAtTime(0.055, startAt + 0.01)
            beatGain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.14)
            beat.connect(beatGain)
            beatGain.connect(audioContext.destination)
            beat.start(startAt)
            beat.stop(startAt + 0.15)
          }
        }
        g.lastFootstepAt = now
      }

      // האם הדמות נמצאת כרגע באזור סולם (לפי המיקום לפני התזוזה)
      const playerCenterX = g.x + PLAYER_WIDTH / 2
      const playerFeetY = g.y + PLAYER_HEIGHT
      const ladder = LEVEL.ladders.find(
        (l) =>
          playerCenterX > l.x - LADDER_GRAB_MARGIN &&
          playerCenterX < l.x + l.width + LADDER_GRAB_MARGIN &&
          playerFeetY > l.topY - 4 &&
          playerFeetY < l.bottomY + 4
      )

      // עומדים בראש הסולם (על הרצפה העליונה) — ⬆ כאן היא קפיצה, לא "טיפוס" שנגמר
      // מיד ובולע את הקפיצה. אחרת מפתח ליד פתח הסולם כמעט בלתי אפשרי לתפוס.
      const atLadderTop = ladder && !g.climbing && Math.abs(playerFeetY - ladder.topY) < 4
      if (ladder && (downPressed || (upPressed && !atLadderTop))) {
        // טיפוס: גרביטציה מבוטלת, תנועה אנכית חופשית בגבולות הסולם
        g.climbing = true
        g.vy = upPressed ? -CLIMB_SPEED : CLIMB_SPEED
      } else if (ladder && !g.onGround && g.climbing) {
        // תלויה על הסולם בלי ללחוץ למעלה/למטה — נשארת במקום
        g.climbing = true
        g.vy = 0
      } else {
        g.climbing = false
      }
      // האם הדמות טיפסה על סולם בפריים הזה — משמש בהמשך כדי לדלג על בדיקת
      // הנחיתה הרגילה בזמן טיפוס (אחרת ירידה מרצפה "נוחתת" עליה מיד ותוקעת)
      const wasClimbing = g.climbing

      const audioContext = audioContextRef.current
      if (g.climbing && g.vy !== 0 && audioContext?.state === 'running') {
        const soundTime = audioContext.currentTime
        if (!g.wasClimbing) {
          playLadderNotes(audioContext, [523.25, 659.25, 783.99, 1046.5], soundTime)
          g.lastClimbSoundAt = now
          g.climbSoundIndex = 0
        } else if (now - g.lastClimbSoundAt >= 210) {
          const risingNotes = [659.25, 783.99, 987.77, 1174.66]
          const step = g.climbSoundIndex % risingNotes.length
          const note = risingNotes[g.vy < 0 ? step : risingNotes.length - 1 - step]
          playLadderNotes(audioContext, [note], soundTime, 0)
          g.climbSoundIndex++
          g.lastClimbSoundAt = now
        }
      }
      g.wasClimbing = g.climbing

      // קפיצה (לא זמינה בזמן טיפוס). רק לחיצה חדשה נספרת, ונזכרת לזמן קצר
      // כדי שלחיצה רגע לפני הנחיתה תתבצע בנחיתה (jump buffer).
      if (jumpPressed && !g.jumpWasDown) g.jumpBufferedAt = now
      g.jumpWasDown = jumpPressed

      const canJump = g.onGround || now - g.lastGroundedAt <= COYOTE_TIME_MS
      if (!g.climbing && canJump && now - g.jumpBufferedAt <= JUMP_BUFFER_MS) {
        g.vy = -JUMP_VELOCITY
        g.onGround = false
        g.jumping = true
        g.jumpCut = false
        g.jumpBufferedAt = -Infinity
        g.lastGroundedAt = -Infinity
      }

      // קפיצה בגובה משתנה: עזיבת המקש בזמן עלייה מקצרת את הקפיצה
      if (g.jumping && !g.jumpCut && !jumpPressed && g.vy < 0) {
        g.vy *= JUMP_CUT_MULTIPLIER
        g.jumpCut = true
      }

      // ⬇ על מדף: נופלים דרכו. ⬇ מול דלת סודית: עוברים לדלת השנייה.
      const downJustPressed = (downPressed && !g.downWasDown) || g.downTapped
      g.downWasDown = downPressed
      g.downTapped = false
      if (downJustPressed && g.onGround && !g.climbing) {
        const door = LEVEL.doors.find(
          (d) =>
            playerCenterX > d.x &&
            playerCenterX < d.x + d.width &&
            Math.abs(playerFeetY - (d.y + d.height)) < 6
        )
        if (door) {
          const target = DOORS_BY_ID[door.targetId]
          g.x = target.x + target.width / 2 - PLAYER_WIDTH / 2
          g.y = target.y + target.height - PLAYER_HEIGHT
          g.vx = 0
          g.vy = 0
          g.groundKind = 'floor'
          playDoorSound(audioContextRef.current)
          const viewport = viewportRef.current
          if (viewport) {
            viewport.classList.remove('game-viewport--door-flash')
            void viewport.offsetWidth
            viewport.classList.add('game-viewport--door-flash')
          }
          syncCameraToDOM()
          g.rafId = requestAnimationFrame(step)
          return
        }
        if (g.groundKind === 'shelf') {
          g.dropThroughUntil = now + 220
          g.onGround = false
        }
      }

      // גרביטציה (לא פועלת בזמן טיפוס על סולם)
      if (!g.climbing) {
        g.vy += GRAVITY * dt
      }

      // עדכון מיקום X עם התנגשות אופקית פשוטה מול משטחים
      let nextX = g.x + g.vx * dt
      // הקצה הימני של העולם הוא הקיר הימני של פיר המעלית — אין מה לעשות מימינו
      nextX = Math.max(0, Math.min(PLAYER_MAX_X, nextX))
      // קופסאות מתנה חוסמות מהצדדים
      for (const box of GIFT_BOX_SOLIDS) {
        const overlapsY = g.y + PLAYER_HEIGHT > box.y && g.y < box.y + box.height
        const overlapsX = nextX + PLAYER_WIDTH > box.x && nextX < box.x + box.width
        if (!overlapsY || !overlapsX) continue
        if (g.vx > 0) nextX = box.x - PLAYER_WIDTH
        else if (g.vx < 0) nextX = box.x + box.width
      }
      // פיר המעלית סגור כמו דלתות מעלית: נכנסים/יוצאים רק כשהמעלית עומדת בקומה
      // שלך (רגלי הדמות בגובה הרצפה שלה, או קצת מעליה בקפיצה). אחרת הפיר חוסם
      // מהצדדים — מבחוץ אי אפשר להיכנס, ומבפנים (בנסיעה) אי אפשר לצאת.
      {
        const shaftLeft = elevatorConfig.x
        const shaftRight = elevatorConfig.x + elevatorConfig.width
        const elevatorStopped = elevatorConfig.stops.some((stopY) => Math.abs(elevator.y - stopY) < 0.5)
        const feetY = g.y + PLAYER_HEIGHT
        const atElevatorFloor = elevatorStopped && feetY <= elevator.y + 2 && feetY >= elevator.y - 140
        const overlapsNext = nextX + PLAYER_WIDTH > shaftLeft && nextX < shaftRight
        if (!atElevatorFloor && overlapsNext) {
          const wasInside = g.x + PLAYER_WIDTH > shaftLeft && g.x < shaftRight
          const centerInside = g.x + PLAYER_WIDTH / 2 >= shaftLeft && g.x + PLAYER_WIDTH / 2 <= shaftRight
          if (wasInside && centerInside) {
            // נעילה רק בנסיעה על המעלית. מי שנשארה בפיר בלעדיה (קפצה, או שהמעלית
            // יצאה) עומדת על רצפת הקומה — יוצאת חופשי, אחרת נתקעת עד שהמעלית חוזרת
            if (g.groundKind === 'elevator') {
              nextX = Math.max(shaftLeft, Math.min(shaftRight - PLAYER_WIDTH, nextX))
            }
          } else {
            nextX = g.x + PLAYER_WIDTH / 2 < (shaftLeft + shaftRight) / 2 ? shaftLeft - PLAYER_WIDTH : shaftRight
          }
        }
      }
      g.x = nextX

      // עדכון מיקום Y + התנגשות אנכית מול משטחים (נחיתה מלמעלה בלבד)
      const previousPlayerBottom = g.y + PLAYER_HEIGHT
      const previousPlayerTop = g.y
      const downwardVelocity = g.vy
      const wasJumping = g.jumping
      let nextY = g.y + g.vy * dt

      let justLandedFromLadder = false
      if (g.climbing) {
        // אי אפשר לטפס מעבר לקצוות הסולם
        const minY = ladder.topY - PLAYER_HEIGHT
        const maxY = ladder.bottomY - PLAYER_HEIGHT
        nextY = Math.max(minY, Math.min(maxY, nextY))
        // הגעה לקצה הסולם תוך כדי טיפוס בכיוון הזה — עומדים מיד על הקומה,
        // בלי לחכות לעזיבת המקש (וגם לא "נוחתים" בטעות על הרצפה שמטפסים ממנה)
        if ((nextY <= minY && g.vy < 0) || (nextY >= maxY && g.vy > 0)) {
          g.climbing = false
          g.vy = 0
          g.onGround = true
          g.groundKind = 'floor'
          justLandedFromLadder = true
        }
      }

      if (!justLandedFromLadder) {
        g.onGround = false
        g.groundKind = null
      }

      // מכה בראש בתחתית קופסת מתנה בזמן עלייה
      if (g.vy < 0 && !g.climbing) {
        for (const box of GIFT_BOX_SOLIDS) {
          const withinX = g.x + PLAYER_WIDTH > box.x && g.x < box.x + box.width
          const boxBottom = box.y + box.height
          if (withinX && g.y >= boxBottom - 1 && nextY < boxBottom) {
            nextY = boxBottom
            g.vy = 0
            g.jumpCut = true
            openGiftBox(box)
            break
          }
        }
      }

      // נחיתה מלמעלה: רצפות, מדפים, המעלית וראש קופסאות המתנה.
      // אם כמה משטחים נחצו באותו פריים — נוחתים על העליון שבהם.
      // המעלית ראשונה כדי שבתיקו מול רצפה באותו גובה היא תנצח ותסיע את הדמות.
      const landingSurfaces = [
        {
          x: elevatorConfig.x,
          y: elevator.y,
          width: elevatorConfig.width,
          kind: 'elevator',
        },
        ...LEVEL.platforms,
        ...GIFT_BOX_SOLIDS,
      ]
      let landing = null
      if (!wasClimbing) {
        for (const platform of landingSurfaces) {
          if (platform.kind === 'shelf' && now < g.dropThroughUntil) continue
          const withinX =
            g.x + PLAYER_WIDTH > platform.x && g.x < platform.x + platform.width
          if (!withinX) continue

          const platformTop = platform.y
          const playerBottomBefore = g.y + PLAYER_HEIGHT
          const playerBottomAfter = nextY + PLAYER_HEIGHT

          if (
            g.vy >= 0 &&
            playerBottomBefore <= platformTop + 1 &&
            playerBottomAfter >= platformTop &&
            (!landing || platformTop < landing.y)
          ) {
            landing = platform
          }
        }
      }
      if (landing) {
        nextY = landing.y - PLAYER_HEIGHT
        g.vy = 0
        g.onGround = true
        g.jumping = false
        g.groundKind = landing.kind ?? 'floor'
      }

      // רצפת ביטחון (לא אמור לקרות, אבל שלא ייפול מהעולם)
      if (nextY + PLAYER_HEIGHT > GROUND_Y) {
        nextY = GROUND_Y - PLAYER_HEIGHT
        g.vy = 0
        g.onGround = true
        g.jumping = false
        g.groundKind = 'floor'
      }

      g.y = nextY
      if (g.onGround) g.lastGroundedAt = now

      for (const enemy of g.enemies) {
        if (!enemy.alive) continue
        const overlapsX =
          g.x + PLAYER_WIDTH > enemy.x + 8 && g.x < enemy.x + 54
        const overlapsY =
          g.y + PLAYER_HEIGHT > enemy.y + 8 && g.y < enemy.y + 54
        if (!overlapsX || !overlapsY) continue

        const stomped =
          downwardVelocity > 0 &&
          previousPlayerBottom <= enemy.y + 20 &&
          g.y + PLAYER_HEIGHT >= enemy.y

        if (stomped) {
          enemy.alive = false
          playEnemyStompSound(audioContextRef.current)
          const element = enemyElementsRef.current[enemy.id]
          if (element) {
            element.classList.add('enemy--exploding')
            window.setTimeout(() => {
              element.style.display = 'none'
            }, 360)
          }
          g.y = enemy.y - PLAYER_HEIGHT
          // ריבאונד: החזקת מקש הקפיצה מעיפה גבוה יותר, ועזיבה באמצע מקצרת
          g.vy = -JUMP_VELOCITY * (jumpPressed ? STOMP_BOUNCE_HELD : STOMP_BOUNCE)
          g.jumping = true
          g.jumpCut = !jumpPressed
          g.onGround = false
          g.lastGroundedAt = -Infinity
          continue
        }

        if (now >= g.damageUntil) {
          g.damageUntil = now + 1000
          g.vx = g.x + PLAYER_WIDTH / 2 < enemy.x + 31 ? -MOVE_SPEED : MOVE_SPEED
          g.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_WIDTH, g.x + Math.sign(g.vx) * 34))
          playEnemyHitSound(audioContextRef.current)
          if (hudRef.current) {
            hudRef.current.classList.remove('hud--damage')
            void hudRef.current.offsetWidth
            hudRef.current.classList.add('hud--damage')
          }
        }
        break
      }

      // Preview nearby gifts; collect only by landing on a key from above.
      let nearbyKey = null
      let collectedKeyThisFrame = false
      // הבועה מוצגת לפי הקומה שהדמות נמצאת בה (הרצפה הקרובה מתחת לרגליים),
      // ולא לפי מרחק אנכי — כך גם מפתח שתלוי גבוה מראה את המתנה כשעוברים מתחתיו
      const feetY = g.y + PLAYER_HEIGHT
      const floorUnderPlayer = FLOOR_LEVELS.find((floorY) => floorY >= feetY - 2) ?? GROUND_Y
      if (g.floorY !== floorUnderPlayer) {
        g.floorY = floorUnderPlayer
        setCurrentFloorY(floorUnderPlayer)
        if (floorUnderPlayer === FLOOR_LEVELS[0] && !g.topFloorBonusGiven) {
          g.topFloorBonusGiven = true
          setTimeLeft((t) => t + TOP_FLOOR_BONUS_SECONDS)
          setTopFloorBonusShown(true)
          setTimeout(() => setTopFloorBonusShown(false), 2200)
        }
      }
      for (const key of LEVEL.keys) {
        if (g.collected.has(key.id)) continue
        const dx = g.x + PLAYER_WIDTH / 2 - (key.x + 16)
        // מפתח בתוך קופסה: רק מציגים את המתנה כשעוברים ליד; נאסף רק במכה בקופסה
        if (key.inBox) {
          if (!nearbyKey && Math.abs(dx) < 100 && key.floorY === floorUnderPlayer) {
            nearbyKey = key
          }
          continue
        }
        const overlapsKeyX =
          g.x + PLAYER_WIDTH > key.x && g.x < key.x + 32
        const landedOnKey =
          wasJumping &&
          downwardVelocity > 0 &&
          previousPlayerTop < key.y &&
          previousPlayerBottom <= key.y + 6 &&
          g.y + PLAYER_HEIGHT >= key.y
        if (overlapsKeyX && landedOnKey) {
          collectKey(key.id, key.courseId)
          collectedKeyThisFrame = true
          break
        }
        if (!nearbyKey && Math.abs(dx) < 100 && key.floorY === floorUnderPlayer) {
          nearbyKey = key
        }
      }
      if (collectedKeyThisFrame) {
        game.current.nearbyKeyId = null
        setGiftPreview(null)
      } else if (nearbyKey) {
        if (g.nearbyKeyId !== nearbyKey.id) {
          g.nearbyKeyId = nearbyKey.id
          setGiftPreview(nearbyKey.gift)
        }
      } else if (g.nearbyKeyId) {
        g.nearbyKeyId = null
        setGiftPreview(null)
      }

      // רמז "קפצו מלמטה" מעל קופסת מתנה סגורה כשעומדים בקומה שלה וקרוב אליה
      for (const box of LEVEL.giftBoxes) {
        const element = giftBoxElementsRef.current[box.id]
        if (!element) continue
        const isNear =
          !g.openedBoxes.has(box.id) &&
          floorUnderPlayer === box.floorY &&
          Math.abs(g.x + PLAYER_WIDTH / 2 - (box.x + box.width / 2)) < 120
        element.classList.toggle('gift-box--near', isNear)
      }

      // רמז ⬇ מעל דלת סודית כשעומדים מולה
      for (const door of LEVEL.doors) {
        const element = doorElementsRef.current[door.id]
        if (!element) continue
        const isNear =
          g.x + PLAYER_WIDTH / 2 > door.x &&
          g.x + PLAYER_WIDTH / 2 < door.x + door.width &&
          Math.abs(g.y + PLAYER_HEIGHT - (door.y + door.height)) < 6
        element.classList.toggle('secret-door--near', isNear)
      }

      // מצלמה עוקבת אחרי הדמות בשני הצירים ונשארת בגבולות העולם, וציור ישיר
      // ל-DOM (בלי re-render בכל פריים)
      syncCameraToDOM()

      g.rafId = requestAnimationFrame(step)
    }

    game.current.rafId = requestAnimationFrame(step)
    return () => {
      if (game.current.rafId) cancelAnimationFrame(game.current.rafId)
      game.current.lastTime = null
    }
  }, [phase, collectKey, openGiftBox, syncCameraToDOM])

  // --- טיימר הסבב ---
  useEffect(() => {
    if (phase !== 'playing') return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval)
          setPhase('ended')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase === 'playing') setTimeLeft(ROUND_SECONDS)
  }, [phase])

  // בכניסה למסך הסיום: משווים לשיא האישי ושומרים אם נשבר
  useEffect(() => {
    if (phase !== 'ended') return
    const finalScore = [...game.current.collected].reduce(
      (sum, keyId) => sum + keyPoints(KEYS_BY_ID[keyId]),
      0
    )
    const previousBest = readBestScore()
    const isNew = finalScore > previousBest
    if (isNew) writeBestScore(finalScore)
    setScoreRecord({ previousBest, isNew })
  }, [phase])

  // דפדפנים חוסמים צליל לפני מחווה של המשתמש — בועת הפתיחה מתקדמת לבד בלי
  // קליק, אז פותחים את ה-AudioContext בהקדם האפשרי: בלחיצה/מגע/מקש ראשונים.
  useEffect(() => {
    if (phase !== 'start') return
    function unlock() {
      ensureAudioContext()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [phase])

  // הרובוט במסך הפתיחה מגיב בפועל לחיצי המקלדת — לא אנימציית הליכה, רק
  // תזוזה קטנה לצדדים וקפיצה קלה, כדי שבאמת ירגישו שהוא "שומע" את החיצים
  useEffect(() => {
    if (phase !== 'start') return
    let jumpTimer = null
    function onKeyDown(e) {
      if (e.code === 'ArrowLeft') {
        setIntroNudge((n) => Math.max(n - 18, -70))
        setIntroKeysPressed((k) => ({ ...k, left: true }))
      } else if (e.code === 'ArrowRight') {
        setIntroNudge((n) => Math.min(n + 18, 70))
        setIntroKeysPressed((k) => ({ ...k, right: true }))
      } else if ((e.code === 'ArrowUp' || e.code === 'Space') && !e.repeat) {
        setIntroJumping(true)
        setIntroKeysPressed((k) => ({ ...k, up: true }))
        playArmSwitchBlip(audioContextRef.current)
        window.clearTimeout(jumpTimer)
        jumpTimer = window.setTimeout(() => setIntroJumping(false), 380)
      }
    }
    function onKeyUp(e) {
      if (e.code === 'ArrowLeft') setIntroKeysPressed((k) => ({ ...k, left: false }))
      else if (e.code === 'ArrowRight') setIntroKeysPressed((k) => ({ ...k, right: false }))
      else if (e.code === 'ArrowUp' || e.code === 'Space') setIntroKeysPressed((k) => ({ ...k, up: false }))
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.clearTimeout(jumpTimer)
    }
  }, [phase])

  // --- רצף בועות הדיבור במסך הפתיחה: מתקדם לבד, ונעצר בשלב האחרון (טופס המייל) ---
  // שלב ה-idle: ידיים למטה, פנסים כבויים, בלי תנועה. מהשלב הבא (אחרי הבהוב
  // הדלקת הפנסים) ואילך הידיים מתחלפות ברציפות בין explain ל-open כל 480ms
  // כל עוד הוא "מדבר" — זה מה שנותן את התחושה של מחוות ידיים פעילות, לא
  // פוזה קפואה. הפה מתחלף closed/talk כל 110ms במקביל, וחוזר לסגור בסוף.
  useEffect(() => {
    if (phase !== 'start') return
    const step = INTRO_STEPS[introStep]
    let mouthTimer = null
    let armTimer = null
    let advanceTimer = null
    let flickerTimer = null
    let closeTimer = null
    let letterTimers = []
    let cancelled = false
    let mouthOpen = false
    let armPose = 'explain'

    function currentPose() {
      return step.idle ? 'idle' : armPose
    }

    function startTalking() {
      mouthOpen = false
      setIntroFrame(robotFrameFor(currentPose(), false))
      mouthTimer = window.setInterval(() => {
        mouthOpen = !mouthOpen
        setIntroFrame(robotFrameFor(currentPose(), mouthOpen))
      }, 110)
      if (!step.idle) {
        armTimer = window.setInterval(() => {
          armPose = armPose === 'explain' ? 'open' : 'explain'
          playArmSwitchBlip(audioContextRef.current)
        }, 480)
      }
      // תקתוק רובוטי לכל אות, באותו תזמון מצטבר (32ms) כמו אנימציית הנפילה
      const letterCount = introLinesFor(step).reduce((sum, line) => sum + line.replace(/ /g, '').length, 0)
      for (let i = 0; i < letterCount; i++) {
        letterTimers.push(
          window.setTimeout(() => playLetterBlip(audioContextRef.current, i), i * 32)
        )
      }
      if (step.holdMs) {
        advanceTimer = window.setTimeout(() => {
          window.clearInterval(mouthTimer)
          window.clearInterval(armTimer)
          setIntroFrame(robotFrameFor(currentPose(), false))
          if (!cancelled) setIntroStep((s) => s + 1)
        }, step.holdMs)
      } else {
        closeTimer = window.setTimeout(() => {
          window.clearInterval(mouthTimer)
          window.clearInterval(armTimer)
          setIntroFrame(robotFrameFor(currentPose(), false))
        }, 1800)
      }
    }

    // הבהוב הדלקת הפנסים קורה פעם אחת, במעבר מה-idle לשלב ה"פעיל" הראשון
    if (introStep === 1) {
      setIntroFrame(ROBOT_FRAMES.idleClosed)
      playIgnitePowerUp(audioContextRef.current)
      let n = 0
      flickerTimer = window.setInterval(() => {
        n += 1
        setIntroFrame(n % 2 === 1 ? ROBOT_FRAMES.explainClosed : ROBOT_FRAMES.idleClosed)
        if (n >= 5) {
          window.clearInterval(flickerTimer)
          if (!cancelled) startTalking()
        }
      }, 110)
    } else {
      startTalking()
    }

    return () => {
      cancelled = true
      window.clearInterval(mouthTimer)
      window.clearInterval(armTimer)
      window.clearInterval(flickerTimer)
      window.clearTimeout(advanceTimer)
      window.clearTimeout(closeTimer)
      letterTimers.forEach(window.clearTimeout)
    }
  }, [phase, introStep])

  function updatePointer(e, isDown) {
    const rect = viewportRef.current.getBoundingClientRect()
    const pointer = game.current.pointer
    pointer.down = isDown
    pointer.x = e.clientX - rect.left
    pointer.y = e.clientY - rect.top
  }

  function flashControlsHint(ms = 4000) {
    window.clearTimeout(controlsHintTimerRef.current)
    setControlsHintId(Date.now())
    controlsHintTimerRef.current = window.setTimeout(() => setControlsHintId(0), ms)
  }

  useEffect(() => {
    if (phase !== 'playing') return
    flashControlsHint()
    return () => {
      window.clearTimeout(controlsHintTimerRef.current)
      setControlsHintId(0)
    }
  }, [phase])

  // --- ספירה לאחור לפני התחלה ---
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdownValue(3)
    const interval = setInterval(() => {
      setCountdownValue((v) => {
        if (v <= 1) {
          clearInterval(interval)
          setPhase('playing')
          return 0
        }
        return v - 1
      })
    }, 700)
    return () => clearInterval(interval)
  }, [phase])

  function ensureAudioContext() {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) audioContextRef.current = new AudioContextClass()
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }

  function startGame() {
    ensureAudioContext()

    game.current.topFloorBonusGiven = false
    setTopFloorBonusShown(false)
    setCaughtToast(null)

    game.current.x = spawnX(game.current.viewportWidth)
    game.current.y = GROUND_Y - PLAYER_HEIGHT
    game.current.vx = 0
    game.current.vy = 0
    game.current.jumping = false
    game.current.onGround = false
    game.current.climbing = false
    game.current.jumpWasDown = false
    game.current.jumpCut = false
    game.current.jumpBufferedAt = -Infinity
    game.current.lastGroundedAt = -Infinity
    game.current.groundKind = null
    game.current.dropThroughUntil = 0
    game.current.downWasDown = false
    game.current.downTapped = false
    game.current.pointer.down = false
    game.current.pointerJumpUntil = 0
    game.current.elevator = createElevatorState()
    // "שחקו שוב" ממשיך מאיפה שעצרו: מפתחות שכבר נאספו (והמתנות שנבחרו) נשמרים,
    // והקופסאות שהמפתח שלהן כבר נאסף נשארות פתוחות — אוספים רק את מה שעוד לא
    const alreadyCollected = game.current.collected
    game.current.openedBoxes = new Set(
      LEVEL.giftBoxes.filter((box) => alreadyCollected.has(box.keyId)).map((box) => box.id)
    )
    for (const box of LEVEL.giftBoxes) {
      const element = giftBoxElementsRef.current[box.id]
      element?.classList.remove('gift-box--bump')
      element?.classList.toggle('gift-box--opened', game.current.openedBoxes.has(box.id))
    }
    for (const key of LEVEL.keys) {
      const element = keyElementsRef.current[key.id]
      if (element) element.style.display = alreadyCollected.has(key.id) ? 'none' : ''
    }
    game.current.facing = 1
    game.current.cameraX = 0
    game.current.lastFootstepAt = 0
    game.current.lastClimbSoundAt = 0
    game.current.climbSoundIndex = 0
    game.current.wasClimbing = false
    game.current.nearbyKeyId = null
    game.current.enemies = createEnemies()
    game.current.damageUntil = 0
    for (const enemy of game.current.enemies) {
      const element = enemyElementsRef.current[enemy.id]
      if (element) {
        element.style.display = ''
        element.classList.remove('enemy--exploding', 'enemy--facing-left')
        element.style.transform = 'translate3d(0, 0, 0)'
      }
    }
    footstepIndexRef.current = 0
    setGiftPreview(null)
    setLeadSubmitted(false)
    setLeadError('')
    setPhase('countdown')
  }

  function handleIntroSubmit(e) {
    e.preventDefault()
    const email = introEmail.trim()
    if (email && introConsent) {
      consentedEmailRef.current = email
      setLeadEmail(email)
      setLeadConsent(true)
      setIntroEmailGiven(true)
      writeSavedEmail(email)
      if (!signedUpEmailsRef.current.has(email)) {
        signedUpEmailsRef.current.add(email)
        addMailingSignup(email, 'intro').catch((err) => console.error('[b2bfair early_signup]', err))
      }
    } else {
      // מחקה את המייל השמור / ביטלה את האישור — בסוף נשאל שוב
      setIntroEmailGiven(false)
    }
    startGame()
  }

  function handleTouchControl(action, isDown) {
    const codeMap = {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      jump: 'ArrowUp',
      down: 'ArrowDown',
    }
    const code = codeMap[action]
    if (isDown) {
      game.current.keysDown.add(code)
      if (action === 'down') game.current.downTapped = true
    }
    else game.current.keysDown.delete(code)
  }

  async function handleLeadSubmit(e) {
    e.preventDefault()
    const email = leadEmail.trim()
    if (!email || !leadConsent || leadBusy) return
    setLeadBusy(true)
    setLeadError('')
    try {
      await addDoc(collection(db, 'fairs', B2B_FAIR_ID, 'finale_leads'), {
        email,
        name: '',
        shopIds: [...claimedGiftIds],
        caughtCount: collectedIds.size,
        marketingConsent: true,
        stage: 'final',
        ref: REF_PARAM,
        claimedAt: serverTimestamp(),
      })
      writeSavedEmail(email)
      if (!signedUpEmailsRef.current.has(email)) {
        signedUpEmailsRef.current.add(email)
        await addMailingSignup(email, 'end').catch((err) => console.error('[b2bfair early_signup]', err))
      }
      // מייל תודה (Cloud Function sendB2BThankYou) — כשל במייל לא מכשיל את השליחה
      fetch('/api/b2b-thank-you', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch((err) => console.error('[b2bfair thank-you email]', err))
      setLeadSubmitted(true)
    } catch (err) {
      console.error('[b2bfair finale]', err)
      setLeadError('משהו השתבש בשליחה — נסו שוב בעוד רגע')
    } finally {
      setLeadBusy(false)
    }
  }

  function toggleGiftSelection(giftId) {
    setClaimedGiftIds((previous) => {
      const next = new Set(previous)
      if (next.has(giftId)) next.delete(giftId)
      else next.add(giftId)
      return next
    })
  }

  const keysCollectedCount = collectedIds.size
  const giftsClaimedCount = claimedGiftIds.size
  const collectedGifts = COURSES.filter((course) => collectedIds.has(course.id))
  const uncollectedGifts = withPinnedLesson(COURSES.filter((course) => !collectedIds.has(course.id)))
  const formattedTime = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`
  const score = [...collectedIds].reduce((sum, courseId) => sum + POINTS_BY_COURSE_ID[courseId], 0)
  // FLOOR_LEVELS ממוינות מלמעלה למטה, אז הקרקע היא קומה 1
  const currentFloorNumber = FLOOR_LEVELS.length - FLOOR_LEVELS.indexOf(currentFloorY)
  // מפתחות שעוד לא נאספו בקומות שמעל הדמות — מעודדים לעלות (בקומות העליונות אוספים פחות)
  const giftsAboveCount = LEVEL.keys.filter(
    (key) => key.floorY < currentFloorY && !collectedIds.has(key.courseId)
  ).length
  // חיצי ⬆ בתחתית כל סולם ובתחנת המעלית שבקומה הנוכחית, כל עוד יש מתנות למעלה
  const upHints =
    giftsAboveCount > 0
      ? [
          ...LEVEL.ladders
            .filter((ladder) => ladder.bottomY === currentFloorY)
            .map((ladder) => ({ id: `ladder-${ladder.x}`, centerX: ladder.x + ladder.width / 2, floorY: ladder.bottomY })),
          {
            id: 'elevator',
            centerX: LEVEL.elevator.x + LEVEL.elevator.width / 2,
            floorY: currentFloorY,
          },
        ]
      : []

  return (
    <div
      className={`app-root${isHudTop(viewportSize.width, viewportSize.height) ? ' app-root--hud-top' : ''}`}
      style={{
        '--hud-w': `${hudWidthFor(viewportSize.width, viewportSize.height)}px`,
        '--hud-h': `${hudHeightFor(viewportSize.width, viewportSize.height)}px`,
      }}
    >
      {phase === 'start' && (
        <div className="scene scene--center intro-scene">
          <div className="intro-banner">
            <img className="intro-banner__sign" src={collegeSignBlank} alt="" />
            <span className="intro-banner__text">המכללה לקפיצה עסקית</span>
          </div>

          <div className={`intro-stage${INTRO_STEPS[introStep].demo ? ' intro-stage--demo' : ''}`}>
            {INTRO_STEPS[introStep].demo && <IntroGiftDemo />}
            <AnimatePresence mode="wait">
              <motion.div
                key={introStep}
                className="intro-bubble"
                initial={{ opacity: 0, y: 16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -18, scale: 0.96 }}
                transition={{ duration: 0.35 }}
              >
                <FallingLines lines={introLinesFor(INTRO_STEPS[introStep])} />
                {INTRO_STEPS[introStep].keyboard &&
                  (IS_TOUCH ? (
                    <IntroTouchButtons pressed={introKeysPressed} />
                  ) : (
                    <IntroKeyboard pressed={introKeysPressed} />
                  ))}
              </motion.div>
            </AnimatePresence>
            <img
              className={`intro-robot${INTRO_STEPS[introStep].idle ? '' : ' intro-robot--active'}`}
              src={introFrame}
              alt="הרובוט המדריך"
              style={{
                transform: `translateY(calc(-50% + ${introJumping ? -46 : 0}px)) translateX(${introNudge}px)`,
              }}
            />
          </div>

          {/* למי שלא רוצה לשחק — ישר למסך השיעורים, שם אפשר לפתוח את כולם */}
          {!showLeadPrompt && (
            <button type="button" className="intro-skip-btn" onClick={() => setPhase('ended')}>
              לדלג ישר לשיעורים ←
            </button>
          )}

          {!showLeadPrompt && (
            <button
              type="button"
              className="primary-btn intro-start-btn"
              onClick={() => setShowLeadPrompt(true)}
            >
              התחילו לשחק
            </button>
          )}

          {showLeadPrompt && (
            <div className="intro-lead-overlay">
              <form className="lead-form intro-lead-overlay__card" onSubmit={handleIntroSubmit}>
                <div className="intro-lead-overlay__heading">שניה ⏳</div>
                <div className="intro-lead-overlay__question">לאן לשלוח לכם את השיעורים שתפתחו?</div>
                <input
                  type="email"
                  placeholder="אימייל"
                  value={introEmail}
                  onChange={(e) => setIntroEmail(e.target.value)}
                />
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={introConsent}
                    onChange={(e) => setIntroConsent(e.target.checked)}
                  />
                  <span>
                    ברור שמאשר.ת קבלת דיוור מבעלות העסקים שאפתח את השיעורים שלהן, וממנהלות היריד ד.
                    זילברשטיין ויעל פיינגולד
                  </span>
                </label>
                <div className="intro-lead-overlay__controls">
                  {IS_TOUCH
                    ? '🎮 משחקים עם הכפתורים שבתחתית המסך'
                    : '🎮 משחקים עם החיצים במקלדת: ⬅️ ➡️ הליכה · ⬆️ קפיצה — או בלחיצת עכבר על המקום שאליו רוצים להגיע'}
                </div>
                <button
                  type="submit"
                  className="primary-btn intro-lead-overlay__submit"
                  disabled={introEmail.trim() !== '' && !introConsent}
                >
                  התחילו לשחק
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {phase === 'countdown' && (
        <div className="scene scene--center">
          <div className="countdown-number">{countdownValue}</div>
        </div>
      )}

      {/* סרגל צד נפרד בשמאל — כמו בשאר הירידים: ניקוד, יצירת קשר וחסות.
          המשחק (game-viewport) מתחיל מימינו ולא נכנס מתחתיו. */}
      {(phase === 'playing' || phase === 'countdown') && (
        <aside className="hud" ref={hudRef}>
          <div className="hud__title">המכללה לקפיצה עסקית</div>

          <div className="hud__stats">
            <div className={`hud-pill${topFloorBonusShown ? ' hud-pill--bonus' : ''}`}>
              <span className="hud-pill__label">⏱ זמן</span>
              <span className="hud-pill__value">{formattedTime}</span>
            </div>
            <div className="hud-pill">
              <span className="hud-pill__label">🔑 מפתחות</span>
              <span className="hud-pill__value">{keysCollectedCount} / {TOTAL_KEYS}</span>
            </div>
            <div className="hud-pill hud-pill--basket" key={`score-${score}`}>
              <span className="hud-pill__label">⭐ נקודות</span>
              <span className="hud-pill__value">{score}</span>
            </div>
            <div className="hud-pill hud-pill--floor">
              <span className="hud-pill__label">🏢 קומה</span>
              <span className="hud-pill__value">{currentFloorNumber}</span>
            </div>
            {giftsAboveCount > 0 && (
              <div className="hud-above">⬆ עוד {giftsAboveCount} מפתחות למעלה</div>
            )}
          </div>

          <div className="hud__bottom">
            <a className="hud-contact" href="mailto:dvoraz@schoolframe.net">
              <span className="hud-contact__icon" aria-hidden="true">✉️</span>
              <span className="hud-contact__title">בעל עסק? צור קשר</span>
              <span className="hud-contact__email" dir="ltr">dvoraz@schoolframe.net</span>
            </a>

            <div className="hud-sponsor">
              <span className="hud-sponsor__label">בשיתוף</span>
              <img
                className="hud-sponsor__logo"
                src="/b2bfair/logos/b2b-24.png"
                alt="יעל פיינגולד"
                draggable={false}
              />
              <span className="hud-sponsor__name">יעל פיינגולד</span>
            </div>
          </div>
        </aside>
      )}

      {(phase === 'playing' || phase === 'countdown') && (
        <div
          className="game-viewport"
          ref={viewportRef}
          onPointerDown={(e) => {
            if (phase !== 'playing' || e.target.closest('button')) return
            e.currentTarget.setPointerCapture(e.pointerId)
            const g = game.current
            updatePointer(e, true)
            if (pointerWorldY(g) < g.y) g.pointerJumpUntil = performance.now() + POINTER_JUMP_HOLD_MS
            if (pointerWorldY(g) > g.y + PLAYER_HEIGHT + POINTER_DEAD_ZONE) g.downTapped = true
            if (!mouseHintShownRef.current) {
              mouseHintShownRef.current = true
              flashControlsHint()
            }
          }}
          onPointerMove={(e) => {
            if (game.current.pointer.down) updatePointer(e, true)
          }}
          onPointerUp={() => {
            game.current.pointer.down = false
          }}
          onPointerCancel={() => {
            game.current.pointer.down = false
          }}
        >
          <div className="parallax-layer parallax-sky" />
          <div
            className="parallax-layer parallax-far"
            style={{
              transform: `translate3d(${-(game.current.cameraX * 0.4 * game.current.zoom)}px, ${-(
                game.current.cameraY * 0.4 * game.current.zoom
              )}px, 0)`,
            }}
          />
          <div
            className="world-layer"
            ref={worldLayerRef}
            style={{
              width: WORLD_WIDTH,
              height: Math.max(WORLD_HEIGHT, viewportSize.height),
              backgroundImage: BACKGROUND_IMAGE_URL
                ? `url(${BACKGROUND_IMAGE_URL})`
                : undefined,
              backgroundRepeat: 'no-repeat',
              backgroundSize: BACKGROUND_IMAGE_URL
                ? `${IMAGE_RENDER_WIDTH}px ${IMAGE_RENDER_HEIGHT}px`
                : undefined,
              backgroundPosition: BACKGROUND_IMAGE_URL ? 'top left' : undefined,
            }}
          >
            {LEVEL.platforms.map((p, i) => (
              <div
                key={i}
                className={`platform${p.kind ? ` platform--${p.kind}` : ''}`}
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.width,
                  height: p.height,
                }}
              />
            ))}

            {LEVEL.ladders.map((l, i) => (
              <div
                key={i}
                className="ladder"
                style={{
                  left: l.x,
                  top: l.topY,
                  width: l.width,
                  height: l.bottomY - l.topY,
                }}
              />
            ))}

            {phase === 'playing' &&
              upHints.map((hint) => (
                <div
                  key={hint.id}
                  className="up-hint"
                  style={{ left: hint.centerX, top: hint.floorY }}
                >
                  ⬆
                </div>
              ))}

            <div
              className="elevator-shaft"
              style={{
                left: LEVEL.elevator.x,
                top: LEVEL.elevator.topY - 90,
                width: LEVEL.elevator.width,
                height: LEVEL.elevator.bottomY - LEVEL.elevator.topY + 90,
              }}
            />
            <div
              className="elevator"
              ref={elevatorRef}
              style={{
                left: LEVEL.elevator.x,
                top: LEVEL.elevator.topY,
                width: LEVEL.elevator.width,
                height: LEVEL.elevator.height,
              }}
            />

            {LEVEL.doors.map((door) => (
              <div
                key={door.id}
                ref={(el) => {
                  doorElementsRef.current[door.id] = el
                }}
                className="secret-door"
                style={{
                  left: door.x,
                  top: door.y,
                  width: door.width,
                  height: door.height,
                }}
              >
                <span className="secret-door__glow" />
                <span className="secret-door__portal" />
                <span className="secret-door__leaf secret-door__leaf--left" />
                <span className="secret-door__leaf secret-door__leaf--right" />
                <span className="secret-door__gem" />
                <span className="secret-door__spark secret-door__spark--1" />
                <span className="secret-door__spark secret-door__spark--2" />
                <span className="secret-door__spark secret-door__spark--3" />
                <span className="secret-door__hint">⬇</span>
              </div>
            ))}

            {LEVEL.giftBoxes.map((box) => (
              <div
                key={box.id}
                ref={(el) => {
                  giftBoxElementsRef.current[box.id] = el
                }}
                className="gift-box"
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                }}
              >
                <span className="gift-box__logo">
                  <GiftLogo gift={KEYS_BY_ID[box.keyId].gift} />
                </span>
                <span className="gift-box__icon" aria-hidden="true">🎁</span>
                <span className="gift-box__hint">⬆ קפצו מלמטה!</span>
              </div>
            ))}

            {LEVEL.keys.filter((k) => !k.inBox).map((k) => (
              <div
                key={k.id}
                ref={(el) => {
                  keyElementsRef.current[k.id] = el
                }}
                className="key-item"
                style={{ left: k.x, top: k.y }}
                title={`${k.gift.businessName} — ${k.gift.giftName}`}
              >
                <span className={`key-item__logo${k.gift.wideSign ? ' key-item__logo--wide' : ''}`}>
                  <GiftLogo gift={k.gift} />
                </span>
                <span className="key-item__key" aria-hidden="true">🔑</span>
              </div>
            ))}

            {ENEMY_DEFINITIONS.map((enemy) => (
              <div
                key={enemy.id}
                ref={(element) => {
                  enemyElementsRef.current[enemy.id] = element
                }}
                className={`enemy enemy--${enemy.tone}`}
                style={{
                  left: Math.round(WORLD_WIDTH * enemy.xRatio),
                  top: enemy.floor - 54,
                }}
                aria-label={enemy.name}
              >
                <span className="enemy-name">{enemy.name}</span>
                <span className="enemy-face">
                  <span className="enemy-antenna" />
                  <span className="enemy-eye" />
                  <span className="enemy-eye" />
                  <span className="enemy-symbol">{enemy.symbol}</span>
                </span>
                <span className="enemy-body" />
              </div>
            ))}

            <div
              className="player"
              ref={playerRef}
              style={{ backgroundImage: `url(${robotSpriteSheet})` }}
            >
              <span className="robot-eyes" aria-hidden="true" />
            </div>
          </div>

          {phase === 'playing' && (
            <>
              {controlsHintId !== 0 && (
                <div className="controls-hint" dir="rtl" key={controlsHintId}>
                  {IS_TOUCH ? (
                    'משחקים עם הכפתורים שבתחתית המסך'
                  ) : (
                    <>
                      משחקים עם <strong>החיצים במקלדת</strong>: ⬅️ ➡️ הליכה · ⬆️ קפיצה · ⬇️ ירידה
                      <br />
                      או: <strong>לוחצים ומחזיקים עם העכבר</strong> לאן שרוצים להגיע (מעל הרובוט = קפיצה)
                    </>
                  )}
                </div>
              )}

              {caughtToast && (
                <div className="caught-toast" dir="rtl" key={caughtToast.id}>
                  🔓 נפתח שיעור: <strong>{caughtToast.giftName}</strong>
                </div>
              )}

              {topFloorBonusShown && (
                <div className="bonus-toast" dir="rtl">
                  הגעתם לקומה העליונה! ⏱ +{TOP_FLOOR_BONUS_SECONDS} שניות
                </div>
              )}

              {/* יציאה מוקדמת מהמשחק — עוברים מיד למסך בחירת המתנות */}
              <button
                type="button"
                className="finish-btn"
                onClick={(e) => {
                  e.currentTarget.blur()
                  setPhase('ended')
                }}
              >
                סיימתי לשחק ✓
              </button>

              <div className="touch-controls">
                <div className="touch-side">
                  <button
                    className="touch-btn"
                    onPointerDown={() => handleTouchControl('left', true)}
                    onPointerUp={() => handleTouchControl('left', false)}
                    onPointerLeave={() => handleTouchControl('left', false)}
                  >
                    ◀
                  </button>
                  <button
                    className="touch-btn"
                    onPointerDown={() => handleTouchControl('right', true)}
                    onPointerUp={() => handleTouchControl('right', false)}
                    onPointerLeave={() => handleTouchControl('right', false)}
                  >
                    ▶
                  </button>
                </div>
                <div className="touch-side">
                  <button
                    className="touch-btn"
                    onPointerDown={() => handleTouchControl('down', true)}
                    onPointerUp={() => handleTouchControl('down', false)}
                    onPointerLeave={() => handleTouchControl('down', false)}
                  >
                    ▼
                  </button>
                  <button
                    className="touch-btn touch-btn--jump"
                    onPointerDown={() => handleTouchControl('jump', true)}
                    onPointerUp={() => handleTouchControl('jump', false)}
                    onPointerLeave={() => handleTouchControl('jump', false)}
                  >
                    ⤴
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {giftPreview && phase === 'playing' && (
        <aside className="gift-preview" aria-live="polite">
          <div className="gift-preview__logo">
            <GiftLogo gift={giftPreview} />
          </div>
          <div className="gift-preview__copy">
            <span>🔑 מפתח לשיעור של {giftPreview.businessName}</span>
            <strong>{giftPreview.giftName}</strong>
            {giftPreview.giftDescription && (
              <p className="gift-preview__desc">{giftPreview.giftDescription}</p>
            )}
          </div>
        </aside>
      )}

      {phase === 'ended' && (
        <div className="scene scene--center">
          {/* מסך הסיום בנוי כמו עמוד קורס דיגיטלי: כל מתנה היא שיעור, פתוח או נעול.
              קודם השיעורים שעוד לא נפתחו במשחק (שם הלידים החסרים), אחר כך מה שנפתח. */}
          <div className="college" dir="rtl">
            <header className="college__header">
              <h1 className="college__title">ברוכים הבאים למכללה העסקית</h1>
              <p className="college__subtitle">
                כל האוטוריטות התאספו לתת לעסק שלך את הפינוקים שמגיע לו :)
              </p>
              <p className="score-summary">
                ⭐ {score} נקודות
                {scoreRecord.isNew && score > 0 && <span className="score-summary__record">🏆 שברת שיא!</span>}
                {!scoreRecord.isNew && scoreRecord.previousBest > 0 && (
                  <span className="score-summary__best">השיא שלך: {scoreRecord.previousBest}</span>
                )}
              </p>
              <div className="college__progress">
                <div className="college__progress-text">
                  פתחת <strong>{giftsClaimedCount}</strong> מתוך {COURSES.length} שיעורים
                </div>
                <div className="college__progress-bar">
                  <span style={{ width: `${(giftsClaimedCount / COURSES.length) * 100}%` }} />
                </div>
              </div>
            </header>

            <ol className="college__lessons">
              {uncollectedGifts.length > 0 && (
                <li className="college__chapter">
                  <h4>פרק: שיעורים שמחכים לך</h4>
                  <span className="college__locked-pill">נעול לצפייה 🔒</span>
                  {/* רק "פתחו הכול" — אין כפתור שנועל את הכול בלחיצה אחת */}
                  {uncollectedGifts.some((gift) => !claimedGiftIds.has(gift.id)) && (
                    <button
                      type="button"
                      className="college__unlock-all"
                      onClick={() => setClaimedGiftIds(new Set(COURSES.map((course) => course.id)))}
                    >
                      🔓 פתחו את כל השיעורים
                    </button>
                  )}
                </li>
              )}
              {uncollectedGifts.map((gift, index) => (
                <LessonCard
                  key={gift.id}
                  gift={gift}
                  number={index + 1}
                  isOpen={claimedGiftIds.has(gift.id)}
                  onToggle={() => toggleGiftSelection(gift.id)}
                />
              ))}

              {collectedGifts.length > 0 && (
                <li className="college__chapter">
                  <h4>פרק: שיעורים שפתחת במשחק 🔑</h4>
                </li>
              )}
              {collectedGifts.map((gift, index) => (
                <LessonCard
                  key={gift.id}
                  gift={gift}
                  number={uncollectedGifts.length + index + 1}
                  isOpen={claimedGiftIds.has(gift.id)}
                  onToggle={() => toggleGiftSelection(gift.id)}
                />
              ))}
            </ol>
          </div>

          <p className="result-badge">
            {introEmailGiven && !editingLeadEmail
              ? 'המייל שלך כבר אצלנו — נשאר רק ללחוץ ולקבל את השיעורים'
              : 'לאן לשלוח לך את השיעורים שפתחת?'}
          </p>

          {!leadSubmitted ? (
            <form className="lead-form" onSubmit={handleLeadSubmit}>
              {introEmailGiven && !editingLeadEmail ? (
                <p className="lead-form__known-email">
                  נשלח אל <strong dir="ltr">{leadEmail}</strong>{' '}
                  <button type="button" className="lead-form__change" onClick={() => setEditingLeadEmail(true)}>
                    לשנות
                  </button>
                </p>
              ) : (
                <>
                  <input
                    type="email"
                    placeholder="אימייל"
                    required
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                  />
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      required
                      checked={leadConsent}
                      onChange={(e) => setLeadConsent(e.target.checked)}
                    />
                    <span>
                      ברור שמאשר.ת קבלת דיוור מבעלות העסקים שאפתח את השיעורים שלהן, וממנהלות היריד ד.
                      זילברשטיין ויעל פיינגולד
                    </span>
                  </label>
                </>
              )}
              <button type="submit" className="primary-btn" disabled={giftsClaimedCount === 0 || leadBusy}>
                {giftsClaimedCount === 0
                  ? 'פתחו לפחות שיעור אחד'
                  : leadBusy
                    ? 'שולחים...'
                    : giftsClaimedCount === 1
                      ? 'שלחו לי את השיעור'
                      : `שלחו לי את ${giftsClaimedCount} השיעורים`}
              </button>
              {leadError && <p className="lead-form__error">{leadError}</p>}
            </form>
          ) : (
            <p className="thank-you">
              בעלות העסקים מכינות לכם את השיעורים...
              <br />
              הם בדרך אליכם למייל!
            </p>
          )}

          <button className="secondary-btn" onClick={startGame}>
            שחקו שוב
          </button>
        </div>
      )}

      {/* הבהרה משפטית — מוצגת קטן בתחתית בכל שלבי היריד */}
      <p className={`fair-disclaimer${phase === 'playing' || phase === 'countdown' ? ' fair-disclaimer--game' : ''}`}>
        המתנות באחריות העסקים המפרסמים בלבד ונשלחות על ידי העסקים. ט.ל.ח. במקרה של תקלה, בעל העסק פטור.
      </p>
    </div>
  )
}

export default App

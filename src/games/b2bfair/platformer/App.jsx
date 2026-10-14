import { useCallback, useEffect, useRef, useState } from 'react'
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
  KEYS_REQUIRED_FOR_FREE_ENTRY,
  TOTAL_KEYS,
  BACKGROUND_IMAGE_URL,
  IMAGE_RENDER_WIDTH,
  IMAGE_RENDER_HEIGHT,
  COURSES,
  LEVEL,
  UNWRAP_TAPS,
  REVEAL_MS,
} from './constants'
import robotSpriteSheet from './assets/robot-sprite-transparent.png'
import robotClimbSpriteSheet from './assets/robot-sprite-climb-no-ladder.png'

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

const ENEMY_DEFINITIONS = [
  {
    id: 'tax',
    name: 'מס הכנסה',
    symbol: '₪',
    xRatio: 0.3,
    floor: GROUND_Y,
    patrolRatio: 0.12,
    speed: 62,
    tone: 'tax',
  },
  {
    id: 'client',
    name: 'לקוח טרדן',
    symbol: '?',
    xRatio: 0.72,
    floor: GROUND_Y,
    patrolRatio: 0.1,
    speed: 86,
    tone: 'client',
  },
  {
    id: 'vat',
    name: 'מע״מ',
    symbol: '%',
    xRatio: 0.44,
    floor: Math.round(IMAGE_RENDER_HEIGHT * (382 / 587)),
    patrolRatio: 0.1,
    speed: 72,
    tone: 'vat',
  },
  {
    id: 'clock',
    name: 'אין לי זמן!',
    symbol: '◷',
    xRatio: 0.76,
    floor: Math.round(IMAGE_RENDER_HEIGHT * (210 / 587)),
    patrolRatio: 0.08,
    speed: 104,
    tone: 'clock',
  },
]

// קופסאות המתנה מוצקות מכל הכיוונים (גם אחרי שנפתחו, כמו במריו)
const GIFT_BOX_SOLIDS = LEVEL.giftBoxes.map((box) => ({ ...box, kind: 'box' }))
const KEYS_BY_ID = Object.fromEntries(LEVEL.keys.map((key) => [key.id, key]))
const DOORS_BY_ID = Object.fromEntries(LEVEL.doors.map((door) => [door.id, door]))

function initials(name) {
  const words = name.trim().split(/\s+/)
  return (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')
}

// לוגו העסק; בלי לוגו — עיגול צבעוני עם ראשי תיבות
function GiftLogo({ gift }) {
  if (gift.logoUrl) return <img src={gift.logoUrl} alt={gift.businessName} draggable="false" />
  return (
    <span className="gift-logo-fallback" style={{ background: gift.color }}>
      {initials(gift.businessName)}
    </span>
  )
}

function playUnwrapTapSound(audioContext, tapIndex) {
  if (audioContext?.state !== 'running') return
  const notes = [523.25, 659.25, 783.99, 987.77]
  playLadderNotes(audioContext, [notes[tapIndex % notes.length]], audioContext.currentTime, 0)
}

function playRevealSound(audioContext) {
  if (audioContext?.state !== 'running') return
  const t = audioContext.currentTime
  playLadderNotes(audioContext, [783.99, 987.77, 1174.66, 1567.98], t, 0.07)
  playLadderNotes(audioContext, [1046.5, 1318.51, 1567.98, 2093], t + 0.32, 0.05)
}

// בועת הבמה: המתנה של העסק במרכז המסך — קודם עטופה (לוחצים כדי לפתוח), ואז נחשפת
function GiftStage({ stage, onTap }) {
  const { gift, taps, opened } = stage
  return (
    <div className="gift-stage" onPointerDown={onTap} role="dialog" aria-live="polite">
      <div
        className={`gift-stage__bubble${opened ? ' gift-stage__bubble--opened' : ''}`}
        style={{ '--brand': gift.color }}
      >
        {!opened ? (
          <>
            <div key={taps} className={`gift-stage__box gift-stage__box--shake-${Math.min(taps, 3)}`}>
              <span className="gift-stage__ribbon" aria-hidden="true" />
              <span className="gift-stage__box-logo">
                <GiftLogo gift={gift} />
              </span>
            </div>
            <p className="gift-stage__business">{gift.businessName}</p>
            <p className="gift-stage__hint">
              לחצו רווח / הקישו לפתיחה
              <span className="gift-stage__dots">
                {Array.from({ length: UNWRAP_TAPS }, (_, i) => (
                  <span key={i} className={i < taps ? 'is-on' : ''} />
                ))}
              </span>
            </p>
          </>
        ) : (
          <>
            <div className="gift-stage__confetti" aria-hidden="true">
              {Array.from({ length: 22 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    '--angle': `${(i / 22) * 360}deg`,
                    '--distance': `${120 + (i % 4) * 28}px`,
                    background: i % 3 === 0 ? gift.color : i % 3 === 1 ? '#f1d896' : '#ffffff',
                  }}
                />
              ))}
            </div>
            <span className="gift-stage__logo">
              <GiftLogo gift={gift} />
            </span>
            <p className="gift-stage__business">{gift.businessName}</p>
            <h2 className="gift-stage__gift">{gift.giftName}</h2>
            <p className="gift-stage__added">🎉 נוסף לסל המתנות שלכם</p>
          </>
        )}
      </div>
    </div>
  )
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

// 'start' -> 'countdown' -> 'playing' -> 'ended'
function App() {
  const [phase, setPhase] = useState('start')
  const [countdownValue, setCountdownValue] = useState(3)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const [collectedIds, setCollectedIds] = useState(() => new Set())
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const [giftPreview, setGiftPreview] = useState(null)
  // בועת הבמה הפתוחה כרגע: { gift, taps, opened } או null
  const [giftStage, setGiftStage] = useState(null)
  const giftStageRef = useRef(null)
  const revealTimerRef = useRef(null)
  const [claimedGiftIds, setClaimedGiftIds] = useState(() => new Set())

  const viewportRef = useRef(null)
  const worldLayerRef = useRef(null)
  const coordinateRulerRef = useRef(null)
  const coordinateReadoutRef = useRef(null)
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
    x: Math.max(0, Math.round(window.innerWidth / 2 - PLAYER_WIDTH / 2)),
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
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
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
      if (giftStageRef.current) {
        if (['Space', 'ArrowUp', 'Enter', 'KeyW'].includes(e.code)) {
          e.preventDefault()
          if (!e.repeat) tapGiftStageRef.current()
        }
        return
      }
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
      game.current.viewportWidth = window.innerWidth
      game.current.viewportHeight = window.innerHeight
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
    const vw = g.viewportWidth
    const vh = g.viewportHeight
    const worldHeight = Math.max(WORLD_HEIGHT, vh)

    let cameraX
    if (WORLD_WIDTH <= vw) {
      cameraX = -(vw - WORLD_WIDTH) / 2
    } else {
      cameraX = g.x + PLAYER_WIDTH / 2 - vw / 2
      cameraX = Math.max(0, Math.min(WORLD_WIDTH - vw, cameraX))
    }
    g.cameraX = cameraX

    let cameraY = g.y + PLAYER_HEIGHT / 2 - vh / 2
    cameraY = Math.max(0, Math.min(worldHeight - vh, cameraY))
    g.cameraY = cameraY

    if (worldLayerRef.current) {
      worldLayerRef.current.style.transform = `translate3d(${-cameraX}px, ${-cameraY}px, 0)`
    }
    if (coordinateRulerRef.current) {
      coordinateRulerRef.current.style.transform = `translateY(${-cameraY}px)`
    }
    if (playerRef.current) {
      playerRef.current.style.transform = `translate3d(${g.x + PLAYER_WIDTH / 2 - 56}px, ${g.y - 128}px, 0) scaleX(${g.facing})`
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
  }, [phase, syncCameraToDOM])

  // עוצר את המשחק ופותח את בועת הבמה של העסק
  function openGiftStage(courseId) {
    const g = game.current
    g.paused = true
    g.keysDown.clear()
    g.vx = 0
    const gift = COURSES.find((course) => course.id === courseId)
    const stage = { gift, taps: 0, opened: UNWRAP_TAPS === 0 }
    giftStageRef.current = stage
    setGiftStage(stage)
    if (stage.opened) revealGift()
  }

  function revealGift() {
    playRevealSound(audioContextRef.current)
    window.clearTimeout(revealTimerRef.current)
    revealTimerRef.current = window.setTimeout(closeGiftStage, REVEAL_MS)
  }

  function closeGiftStage() {
    window.clearTimeout(revealTimerRef.current)
    giftStageRef.current = null
    setGiftStage(null)
    const g = game.current
    g.keysDown.clear()
    g.lastTime = null
    g.paused = false
  }

  // לחיצה בזמן שהבועה פתוחה: מנערת את הקופסה; בלחיצה האחרונה היא נפתחת.
  // אחרי שנפתחה — לחיצה נוספת סוגרת מהר יותר.
  function tapGiftStage() {
    const stage = giftStageRef.current
    if (!stage) return
    if (stage.opened) {
      closeGiftStage()
      return
    }
    const taps = stage.taps + 1
    playUnwrapTapSound(audioContextRef.current, taps - 1)
    const next = { ...stage, taps, opened: taps >= UNWRAP_TAPS }
    giftStageRef.current = next
    setGiftStage(next)
    if (next.opened) revealGift()
  }
  const tapGiftStageRef = useRef(tapGiftStage)
  tapGiftStageRef.current = tapGiftStage

  const collectKey = useCallback((keyId, courseId) => {
    if (game.current.collected.has(keyId)) return
    game.current.collected.add(keyId)
    playKeyPickupSound(audioContextRef.current)
    const el = keyElementsRef.current[keyId]
    if (el) el.style.display = 'none'
    setCollectedIds((prev) => new Set(prev).add(courseId))
    setGiftPreview(null)
    openGiftStage(courseId)
  }, [])

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
      if (g.paused) {
        // בועת הבמה פתוחה — העולם קפוא
        g.lastTime = now
        g.rafId = requestAnimationFrame(step)
        return
      }
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

      const left = g.keysDown.has('ArrowLeft') || g.keysDown.has('KeyA')
      const right = g.keysDown.has('ArrowRight') || g.keysDown.has('KeyD')
      const upPressed = g.keysDown.has('ArrowUp') || g.keysDown.has('KeyW')
      const downPressed = g.keysDown.has('ArrowDown') || g.keysDown.has('KeyS')
      const jumpPressed = upPressed || g.keysDown.has('Space')

      // תנועה אופקית
      if (left && !right) {
        g.vx = -MOVE_SPEED
        g.facing = -1
      } else if (right && !left) {
        g.vx = MOVE_SPEED
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
          playerCenterX > l.x &&
          playerCenterX < l.x + l.width &&
          playerFeetY > l.topY - 4 &&
          playerFeetY < l.bottomY + 4
      )

      if (ladder && (upPressed || downPressed)) {
        // טיפוס: גרביטציה מבוטלת, תנועה אנכית חופשית בגבולות הסולם
        g.climbing = true
        g.vy = upPressed ? -CLIMB_SPEED : CLIMB_SPEED
      } else if (ladder && !g.onGround) {
        // תלויה על הסולם בלי ללחוץ למעלה/למטה — נשארת במקום
        g.climbing = true
        g.vy = 0
      } else {
        g.climbing = false
      }

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
      nextX = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_WIDTH, nextX))
      // קופסאות מתנה חוסמות מהצדדים
      for (const box of GIFT_BOX_SOLIDS) {
        const overlapsY = g.y + PLAYER_HEIGHT > box.y && g.y < box.y + box.height
        const overlapsX = nextX + PLAYER_WIDTH > box.x && nextX < box.x + box.width
        if (!overlapsY || !overlapsX) continue
        if (g.vx > 0) nextX = box.x - PLAYER_WIDTH
        else if (g.vx < 0) nextX = box.x + box.width
      }
      g.x = nextX

      // עדכון מיקום Y + התנגשות אנכית מול משטחים (נחיתה מלמעלה בלבד)
      const previousPlayerBottom = g.y + PLAYER_HEIGHT
      const previousPlayerTop = g.y
      const downwardVelocity = g.vy
      const wasJumping = g.jumping
      let nextY = g.y + g.vy * dt

      if (g.climbing) {
        // אי אפשר לטפס מעבר לקצוות הסולם
        nextY = Math.max(
          ladder.topY - PLAYER_HEIGHT,
          Math.min(ladder.bottomY - PLAYER_HEIGHT, nextY)
        )
      }

      g.onGround = false
      g.groundKind = null

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
      for (const key of LEVEL.keys) {
        if (key.inBox || g.collected.has(key.id)) continue
        const dx = g.x + PLAYER_WIDTH / 2 - (key.x + 16)
        const dy = g.y + PLAYER_HEIGHT / 2 - (key.y + 16)
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
        if (!nearbyKey && Math.abs(dx) < 100 && Math.abs(dy) < 120) {
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
      if (game.current.paused) return
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

  function startGame() {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) audioContextRef.current = new AudioContextClass()
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }

    game.current.x = Math.max(
      0,
      Math.round(game.current.viewportWidth / 2 - PLAYER_WIDTH / 2)
    )
    game.current.y = GROUND_Y - PLAYER_HEIGHT
    game.current.vx = 0
    game.current.vy = 0
    game.current.jumping = false
    game.current.onGround = false
    game.current.climbing = false
    game.current.paused = false
    giftStageRef.current = null
    setGiftStage(null)
    window.clearTimeout(revealTimerRef.current)
    game.current.jumpWasDown = false
    game.current.jumpCut = false
    game.current.jumpBufferedAt = -Infinity
    game.current.lastGroundedAt = -Infinity
    game.current.groundKind = null
    game.current.dropThroughUntil = 0
    game.current.downWasDown = false
    game.current.downTapped = false
    game.current.elevator = createElevatorState()
    game.current.openedBoxes = new Set()
    for (const element of Object.values(giftBoxElementsRef.current)) {
      element?.classList.remove('gift-box--opened', 'gift-box--bump')
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
    game.current.collected = new Set()
    setCollectedIds(new Set())
    setClaimedGiftIds(new Set())
    setGiftPreview(null)
    setLeadSubmitted(false)
    setPhase('countdown')
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

  function handleLeadSubmit(e) {
    e.preventDefault()
    // TODO: לחבר ל-API אמיתי (כמו saveLead בפרויקט Gift-Fair) כשיהיה backend למשחק הזה
    setLeadSubmitted(true)
  }

  function toggleGiftSelection(giftId) {
    setClaimedGiftIds((previous) => {
      const next = new Set(previous)
      if (next.has(giftId)) next.delete(giftId)
      else next.add(giftId)
      return next
    })
  }

  function handleViewportPointerMove(e) {
    const viewportTop = viewportRef.current?.getBoundingClientRect().top ?? 0
    const worldY = Math.round(e.clientY - viewportTop + game.current.cameraY)
    if (coordinateReadoutRef.current) {
      coordinateReadoutRef.current.textContent = `Y: ${worldY} px`
    }
  }

  function resetCoordinateReadout() {
    if (coordinateReadoutRef.current) {
      coordinateReadoutRef.current.textContent = 'Y: -- px'
    }
  }

  const keysCollectedCount = collectedIds.size
  const giftsClaimedCount = claimedGiftIds.size
  const collectedGifts = COURSES.filter((course) => collectedIds.has(course.id))
  const uncollectedGifts = COURSES.filter((course) => !collectedIds.has(course.id))
  const unlockedFreeEntry = keysCollectedCount >= KEYS_REQUIRED_FOR_FREE_ENTRY
  const formattedTime = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`

  return (
    <div className="app-root">
      {phase === 'start' && (
        <div className="scene scene--center">
          <h1>יריד הלידים — מתחם המשחק</h1>
          <p className="subtitle">
            אספו כמה שיותר מפתחות תוך דקה ועשרים ושלוש שניות —
            <br />
            כל מפתח פותח קורס של בעלת עסק במתחם הקורסים
          </p>
          <button className="primary-btn" onClick={startGame}>
            התחילו לשחק
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="scene scene--center">
          <div className="countdown-number">{countdownValue}</div>
        </div>
      )}

      {(phase === 'playing' || phase === 'countdown') && (
        <div
          className="game-viewport"
          ref={viewportRef}
          onPointerMove={handleViewportPointerMove}
          onPointerLeave={resetCoordinateReadout}
        >
          <div className="parallax-layer parallax-sky" />
          <div
            className="parallax-layer parallax-far"
            style={{
              transform: `translate3d(${-(game.current.cameraX * 0.4)}px, ${-(
                game.current.cameraY * 0.4
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
                <span className="gift-box__icon">🎁</span>
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
                <span className="key-item__logo">
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

          <div className="coordinate-ruler" aria-hidden="true">
            <div className="coordinate-ruler__header">
              <span>Y</span>
              <span ref={coordinateReadoutRef}>Y: -- px</span>
            </div>
            <div className="coordinate-ruler__track" ref={coordinateRulerRef}>
              {Array.from(
                { length: Math.floor(WORLD_HEIGHT / 25) + 1 },
                (_, index) => index * 25
              ).map((y) => (
                <div
                  key={y}
                  className={`coordinate-ruler__tick${y % 100 === 0 ? ' coordinate-ruler__tick--major' : ''}`}
                  style={{ top: y }}
                >
                  {y % 100 === 0 && <span>{y}</span>}
                </div>
              ))}
            </div>
          </div>

          {phase === 'playing' && (
            <>
              <div className="hud" ref={hudRef}>
                <div className="hud-pill">⏱ {formattedTime}</div>
                <div className="hud-pill">
                  🔑 {keysCollectedCount} / {TOTAL_KEYS}
                </div>
              </div>

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

      {giftPreview && phase === 'playing' && !giftStage && (
        <aside className="gift-preview" aria-live="polite">
          <div className="gift-preview__logo">
            <GiftLogo gift={giftPreview} />
          </div>
          <div className="gift-preview__copy">
            <span>{giftPreview.businessName}</span>
            <strong>{giftPreview.giftName}</strong>
          </div>
        </aside>
      )}

      {giftStage && phase === 'playing' && (
        <GiftStage stage={giftStage} onTap={() => tapGiftStageRef.current()} />
      )}

      {phase === 'ended' && (
        <div className="scene scene--center">
          <h1>הזמן נגמר!</h1>
          <p className="subtitle">נאספו {keysCollectedCount} מתוך {COURSES.length} מתנות</p>

          <div className="gift-selection" dir="rtl">
            <h2>לאילו עסקים תרצו להצטרף?</h2>
            <p className="gift-selection__count">
              סמנו את העסקים שתרצו לקבל מהם את המתנה ועדכונים · {giftsClaimedCount} נבחרו
            </p>
            <button
              type="button"
              className="secondary-btn gift-selection__all"
              onClick={() =>
                setClaimedGiftIds(
                  giftsClaimedCount === COURSES.length
                    ? new Set()
                    : new Set(COURSES.map((course) => course.id))
                )
              }
            >
              {giftsClaimedCount === COURSES.length ? 'ניקוי הבחירה' : 'בחרו הכול'}
            </button>
            <div className="gift-selection__list">
              {collectedGifts.map((gift) => (
                <label className="gift-selection__item" key={gift.id}>
                  <input
                    type="checkbox"
                    checked={claimedGiftIds.has(gift.id)}
                    onChange={() => toggleGiftSelection(gift.id)}
                  />
                  <span className="gift-selection__logo">
                    <GiftLogo gift={gift} />
                  </span>
                  <span className="gift-selection__text">
                    <strong>{gift.giftName}</strong>
                    <small>{gift.businessName}</small>
                  </span>
                  <span className="gift-selection__status">
                    {claimedGiftIds.has(gift.id) ? 'מצטרפים ✓' : 'נאסף במשחק 🎁'}
                  </span>
                </label>
              ))}
              {uncollectedGifts.map((gift) => (
                <label className="gift-selection__item gift-selection__item--extra" key={gift.id}>
                  <input
                    type="checkbox"
                    checked={claimedGiftIds.has(gift.id)}
                    onChange={() => toggleGiftSelection(gift.id)}
                  />
                  <span className="gift-selection__logo">
                    <GiftLogo gift={gift} />
                  </span>
                  <span className="gift-selection__text">
                    <strong>{gift.giftName}</strong>
                    <small>{gift.businessName} · אפשר להוסיף גם בלי לאסוף במשחק</small>
                  </span>
                  <span className="gift-selection__status">
                    {claimedGiftIds.has(gift.id) ? 'מצטרפים ✓' : 'להצטרפות'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {unlockedFreeEntry ? (
            <p className="result-badge result-badge--success">
              כל הכבוד! פתחתם כניסה חינם למתחם הקורסים 🎉
            </p>
          ) : (
            <p className="result-badge">
              עוד {KEYS_REQUIRED_FOR_FREE_ENTRY - keysCollectedCount} מתנות
              היו נותנים כניסה חינם — אפשר גם לרכוש כרטיס למתחם הקורסים
            </p>
          )}

          {!leadSubmitted ? (
            <form className="lead-form" onSubmit={handleLeadSubmit}>
              <input type="text" placeholder="שם מלא" required />
              <input type="email" placeholder="אימייל" required />
              <input type="tel" placeholder="טלפון" />
              <button type="submit" className="primary-btn" disabled={giftsClaimedCount === 0}>
                {giftsClaimedCount === 0 ? 'סמנו לפחות עסק אחד' : 'קבלו את המתנות שבחרתם'}
              </button>
            </form>
          ) : (
            <p className="thank-you">תודה! שלחנו את הפרטים למייל שלכם.</p>
          )}

          <button className="secondary-btn" onClick={startGame}>
            שחקו שוב
          </button>
        </div>
      )}
    </div>
  )
}

export default App

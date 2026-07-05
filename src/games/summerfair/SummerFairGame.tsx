import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { STORES, BOMBS, buildQueue, giftImg, SummerItem, SummerStore, SummerBomb } from "./shops-data";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const DURATION_MS = 5500;
const CIRC = 2 * Math.PI * 36; // SVG circle circumference (r=36)

function isBomb(item: SummerItem): item is SummerBomb {
  return (item as SummerBomb).type === "bomb";
}

// ─── Confetti Canvas ──────────────────────────────────────────────────────────
function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const rafRef = useRef(0);
  const onRef = useRef(false);

  const start = useCallback((accentColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d")!;
    const pal = [accentColor, "#FFD700", "#FF6B6B", "#4ECDC4", "#A8E6CF", "#FFA500", "#ffffff"];
    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -30 - Math.random() * canvas.height * 0.5,
      w: 7 + Math.random() * 9,
      h: 5 + Math.random() * 6,
      color: pal[Math.floor(Math.random() * pal.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.18,
      vy: 2.5 + Math.random() * 3.5,
      vx: (Math.random() - 0.5) * 2.5,
    }));
    onRef.current = true;
    const animate = () => {
      if (!onRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.vy; p.x += p.vx; p.rot += p.rotV;
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [canvasRef]);

  const stop = useCallback(() => {
    onRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  return { start, stop };
}

// ─── Registration Dialog ───────────────────────────────────────────────────────
interface RegDialogProps {
  store: SummerStore;
  onSubmit: (name: string, email: string) => Promise<void>;
  onSkip: () => void;
}

function RegistrationDialog({ store, onSubmit, onSkip }: RegDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setLoading(true);
    await onSubmit(name.trim(), email.trim());
  };

  return (
    <motion.div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,10,40,0.7)", backdropFilter: "blur(6px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir="rtl"
    >
      <motion.div
        className="bg-white rounded-3xl shadow-2xl p-8 mx-4 w-full max-w-sm"
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 30, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
      >
        <div className="text-center mb-6">
          <img src={giftImg(store.id)} alt="" className="w-16 h-16 object-contain mx-auto mb-3" />
          <h2 className="text-xl font-black text-stone-800">
            כמעט תפסת מתנה מ{store.name}!
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            השאירי פרטים ואשלח לך את: <strong>{store.gift}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="שם מלא"
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-sky-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="אימייל"
            dir="ltr"
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-sky-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim()}
            className="w-full rounded-xl py-3 font-bold text-base text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${store.color}, ${store.color}cc)` }}
          >
            {loading ? "שולח..." : "קבלי את המתנה! 🎁"}
          </button>
          <button
            type="button"
            className="w-full rounded-xl py-2 text-sm text-stone-400 hover:text-stone-600"
            onClick={onSkip}
          >
            דלגי
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Game ─────────────────────────────────────────────────────────────────
export default function SummerFairGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get("ref") || "";

  // ── Phase ──
  type Phase = "intro" | "playing" | "win" | "bomb" | "reg" | "gameover";
  const [phase, setPhase] = useState<Phase>("intro");

  // ── Score state ──
  const [scoreCaught, setScoreCaught] = useState(0);
  const [scoreMissed, setScoreMissed] = useState(0);
  const [remaining, setRemaining] = useState(STORES.length);

  // ── Current item displayed (re-renders for overlays) ──
  const [currentItem, setCurrentItem] = useState<SummerItem | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showGift, setShowGift] = useState(false); // for gift wrapper visibility
  const [showMissFlash, setShowMissFlash] = useState(false);

  // ── Refs (game state that doesn't need re-renders) ──
  const queueRef = useRef<SummerItem[]>([]);
  const activeItemRef = useRef<SummerItem | null>(null);
  const giftXRef = useRef(0);
  const giftYRef = useRef(0);
  const giftVXRef = useRef(0);
  const startTsRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef(0);
  const pausedRef = useRef(false);
  const lastBobYRef = useRef(0);

  // ── DOM refs (direct manipulation in RAF) ──
  const giftWrapRef = useRef<HTMLDivElement | null>(null);
  const timerFillRef = useRef<SVGCircleElement | null>(null);

  // ── Fisher drag refs ──
  const fisherRef = useRef<HTMLImageElement | null>(null);
  const draggingRef = useRef(false);
  const offXRef = useRef(0);
  const offYRef = useRef(0);
  const mouseDownXRef = useRef(0);
  const mouseDownYRef = useRef(0);
  const didDragRef = useRef(false);

  // ── Confetti ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { start: startConfetti, stop: stopConfetti } = useConfetti(canvasRef);

  // ── Sand gifts (accumulated) ──
  const [sandGifts, setSandGifts] = useState<{ id: number; x: number; bottom: number; deg: number }[]>([]);

  // ─── Game helpers ───────────────────────────────────────────────────────────
  const minY = useCallback(() => {
    const fisher = fisherRef.current;
    if (!fisher) return window.innerHeight * 0.6;
    return window.innerHeight * (3 / 4) - (2 / 3) * fisher.offsetHeight;
  }, []);

  const hookX = useCallback(() => {
    const fisher = fisherRef.current;
    if (!fisher) return 0;
    const r = fisher.getBoundingClientRect();
    return r.left + r.width * 0.5;
  }, []);

  const moveFisherTo = useCallback((x: number, y: number) => {
    const fisher = fisherRef.current;
    if (!fisher) return;
    const maxX = window.innerWidth - fisher.offsetWidth;
    const maxY = window.innerHeight - fisher.offsetHeight;
    fisher.style.left = Math.max(window.innerWidth * 0.15, Math.min(x, maxX)) + "px";
    fisher.style.top = Math.max(minY(), Math.min(y, maxY)) + "px";
    fisher.style.transform = "none";
  }, [minY]);

  const initFisherPos = useCallback(() => {
    const fisher = fisherRef.current;
    if (!fisher) return;
    fisher.style.left = window.innerWidth * 0.18 + "px";
    fisher.style.top = minY() + "px";
  }, [minY]);

  // ─── Game loop (RAF — direct DOM) ──────────────────────────────────────────
  const onCatch = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    // hide preview
    const item = activeItemRef.current;
    if (!item) return;
    activeItemRef.current = null;
    pausedRef.current = true;
    setShowGift(false);
    setIsUrgent(false);

    if (isBomb(item)) {
      setShowMissFlash(true);
      setTimeout(() => setShowMissFlash(false), 500);
      setCurrentItem(item);
      setPhase("bomb");
    } else {
      const store = item as SummerStore;
      setScoreCaught((c) => c + 1);
      setSandGifts((prev) => [
        ...prev,
        {
          id: store.id,
          x: Math.random() * (window.innerWidth * 0.2 - 70),
          bottom: 8 + Math.random() * 55,
          deg: (Math.random() - 0.5) * 34,
        },
      ]);
      setCurrentItem(store);
      startConfetti(store.color);
      setPhase("win");
    }
  }, [startConfetti]);

  const onMiss = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const item = activeItemRef.current;
    activeItemRef.current = null;
    pausedRef.current = true;
    setShowGift(false);
    setIsUrgent(false);

    if (item && !isBomb(item)) {
      setScoreMissed((m) => m + 1);
      setShowMissFlash(true);
      setTimeout(() => setShowMissFlash(false), 500);
    }

    setTimeout(() => {
      pausedRef.current = false;
      if (queueRef.current.length > 0) {
        spawnNext();
      } else {
        setPhase("gameover");
      }
    }, 700);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tick = useCallback((ts: number) => {
    const wrap = giftWrapRef.current;
    const fill = timerFillRef.current;
    if (!wrap || !fill || !activeItemRef.current) return;

    if (!startTsRef.current) { startTsRef.current = ts; lastTsRef.current = ts; }
    const dt = ts - (lastTsRef.current ?? ts);
    lastTsRef.current = ts;
    const elapsed = ts - startTsRef.current;
    const progress = Math.min(elapsed / DURATION_MS, 1);

    // Move X
    giftXRef.current += giftVXRef.current * dt;
    const margin = 50;
    const leftBound = window.innerWidth * 0.15 + margin;
    const rightBound = window.innerWidth - margin;
    if (giftXRef.current < leftBound) { giftXRef.current = leftBound; giftVXRef.current = Math.abs(giftVXRef.current); }
    if (giftXRef.current > rightBound) { giftXRef.current = rightBound; giftVXRef.current = -Math.abs(giftVXRef.current); }

    const bobY = giftYRef.current + Math.sin(elapsed * 0.004) * 9;
    lastBobYRef.current = bobY;

    wrap.style.left = giftXRef.current - 90 + "px";
    wrap.style.top = bobY - 90 + "px";

    fill.style.strokeDashoffset = (CIRC * progress).toFixed(2);

    if (progress > 0.65 && !wrap.classList.contains("urgent")) {
      wrap.classList.add("urgent");
      setIsUrgent(true);
    }

    if (progress >= 1) { onMiss(); return; }

    rafRef.current = requestAnimationFrame(tick);
  }, [onMiss]);

  const spawnNext = useCallback(() => {
    if (queueRef.current.length === 0 || pausedRef.current) return;
    const item = queueRef.current.shift()!;
    activeItemRef.current = item;

    const margin = 50;
    const leftBound = window.innerWidth * 0.18 + margin;
    const rightBound = window.innerWidth * 0.92 - margin;
    giftXRef.current = leftBound + Math.random() * (rightBound - leftBound);
    giftYRef.current = window.innerHeight * (0.80 + Math.random() * 0.06);
    giftVXRef.current = (0.10 + Math.random() * 0.10) * (Math.random() < 0.5 ? 1 : -1);

    startTsRef.current = null;
    lastTsRef.current = null;

    setCurrentItem(item);
    setIsUrgent(false);
    setShowGift(true);
    setRemaining(queueRef.current.filter((s) => !isBomb(s)).length);

    // position wrap immediately
    if (giftWrapRef.current) {
      giftWrapRef.current.style.left = giftXRef.current - 90 + "px";
      giftWrapRef.current.style.top = giftYRef.current - 90 + "px";
      giftWrapRef.current.classList.remove("urgent");
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // ─── Fisher mouse/touch events ─────────────────────────────────────────────
  useEffect(() => {
    const fisher = fisherRef.current;
    if (!fisher) return;

    const onLoad = () => initFisherPos();
    if (fisher.complete) initFisherPos(); else fisher.addEventListener("load", onLoad);

    const onMouseDown = (e: MouseEvent) => {
      draggingRef.current = true;
      didDragRef.current = false;
      mouseDownXRef.current = e.clientX;
      mouseDownYRef.current = e.clientY;
      const r = fisher.getBoundingClientRect();
      offXRef.current = e.clientX - r.left;
      offYRef.current = e.clientY - r.top;
      fisher.style.cursor = "grabbing";
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      if (Math.hypot(e.clientX - mouseDownXRef.current, e.clientY - mouseDownYRef.current) > 5)
        didDragRef.current = true;
      moveFisherTo(e.clientX - offXRef.current, e.clientY - offYRef.current);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (draggingRef.current && !didDragRef.current && !pausedRef.current && activeItemRef.current) {
        const br = fisher.getBoundingClientRect();
        if (
          giftXRef.current >= br.left && giftXRef.current <= br.right &&
          lastBobYRef.current >= br.top && lastBobYRef.current <= br.bottom
        ) {
          onCatch();
        }
      }
      draggingRef.current = false;
      fisher.style.cursor = "grab";
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const r = fisher.getBoundingClientRect();
      offXRef.current = t.clientX - r.left;
      offYRef.current = t.clientY - r.top;
      e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      moveFisherTo(t.clientX - offXRef.current, t.clientY - offYRef.current);
      e.preventDefault();
    };

    fisher.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    fisher.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      fisher.removeEventListener("load", onLoad);
      fisher.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      fisher.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [initFisherPos, moveFisherTo, onCatch]);

  // ─── Start game ───────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    queueRef.current = buildQueue();
    setScoreCaught(0);
    setScoreMissed(0);
    setRemaining(STORES.length);
    setSandGifts([]);
    pausedRef.current = false;
    setPhase("playing");
    setTimeout(spawnNext, 600);
  }, [spawnNext]);

  // ─── Close overlays ───────────────────────────────────────────────────────
  const closeWin = useCallback(() => {
    stopConfetti();
    pausedRef.current = false;
    setPhase("reg"); // show registration dialog
  }, [stopConfetti]);

  const closeReg = useCallback(() => {
    pausedRef.current = false;
    if (queueRef.current.length > 0) {
      setPhase("playing");
      spawnNext();
    } else {
      setPhase("gameover");
    }
  }, [spawnNext]);

  const closeBomb = useCallback(() => {
    pausedRef.current = false;
    if (queueRef.current.length > 0) {
      setPhase("playing");
      spawnNext();
    } else {
      setPhase("gameover");
    }
  }, [spawnNext]);

  // Auto-close win after 2s then show reg
  useEffect(() => {
    if (phase !== "win") return;
    const t = setTimeout(closeWin, 2000);
    return () => clearTimeout(t);
  }, [phase, closeWin]);

  // Auto-close bomb after 3s
  useEffect(() => {
    if (phase !== "bomb") return;
    const t = setTimeout(closeBomb, 3000);
    return () => clearTimeout(t);
  }, [phase, closeBomb]);

  // Cleanup RAF on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ─── Firebase save ─────────────────────────────────────────────────────────
  const saveLeadToFirestore = async (store: SummerStore, name: string, email: string) => {
    try {
      await addDoc(collection(db, "fairs", "summerfair", "leads"), {
        shopId: String(store.id),
        shopName: store.name,
        giftName: store.gift,
        name,
        email,
        ref: refParam,
        claimedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[summerfair lead] failed:", err);
    }
  };

  const handleRegSubmit = async (name: string, email: string) => {
    if (currentItem && !isBomb(currentItem)) {
      await saveLeadToFirestore(currentItem as SummerStore, name, email);
      toast.success("המתנה בדרך אלייך! 🎁");
    }
    closeReg();
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const currentStore = currentItem && !isBomb(currentItem) ? (currentItem as SummerStore) : null;
  const currentBomb = currentItem && isBomb(currentItem) ? (currentItem as SummerBomb) : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 overflow-hidden font-sans"
      style={{ fontFamily: "'Heebo', sans-serif" }}
      dir="rtl"
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/summerfair/beach.gif')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      />

      {/* Sand gifts (accumulated in bottom-left) */}
      {sandGifts.map((g, i) => (
        <img
          key={i}
          src={giftImg(g.id)}
          alt=""
          className="absolute pointer-events-none object-contain z-[3]"
          style={{
            width: "clamp(50px, 8vw, 110px)",
            height: "clamp(50px, 8vw, 110px)",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            left: g.x,
            bottom: g.bottom,
            transform: `rotate(${g.deg}deg)`,
          }}
        />
      ))}

      {/* Fisher boat */}
      <img
        ref={fisherRef}
        src="/summerfair/thefisher.png"
        draggable={false}
        alt=""
        className="absolute z-20 select-none"
        style={{
          width: "clamp(160px, 25vw, 380px)",
          cursor: "grab",
          touchAction: "none",
          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.4))",
          display: phase === "intro" ? "none" : "block",
        }}
      />

      {/* Gift preview HUD */}
      <AnimatePresence>
        {phase === "playing" && showGift && currentStore && (
          <motion.div
            className="fixed top-[60px] left-1/2 text-center z-50 pointer-events-none"
            style={{ transform: "translateX(-50%)", width: "90vw", maxWidth: 700 }}
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <motion.img
              src={giftImg(currentStore.id)}
              alt=""
              className="block mx-auto mb-2 object-contain"
              style={{ width: "clamp(64px,11vw,128px)", height: "clamp(64px,11vw,128px)", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span
              className="block font-black leading-tight mb-2"
              style={{
                fontSize: "clamp(36px,6vw,62px)",
                background: `linear-gradient(135deg, ${currentStore.color} 0%, #fff 50%, ${currentStore.color} 100%)`,
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.6))",
                animation: "shimmer 2.5s linear infinite",
              }}
            >
              {currentStore.name}
            </span>
            <span className="block font-bold text-white" style={{ fontSize: "clamp(20px,3.5vw,32px)", textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
              {currentStore.gift}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift box (direct DOM for RAF performance) */}
      {phase === "playing" && (
        <div
          ref={giftWrapRef}
          className="gift-wrapper absolute flex items-center justify-center pointer-events-none z-[5]"
          style={{
            width: "clamp(140px,22vw,300px)",
            height: "clamp(140px,22vw,300px)",
            display: showGift ? "flex" : "none",
          }}
        >
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3.5" />
            <circle
              ref={timerFillRef}
              cx="45" cy="45" r="36"
              fill="none"
              stroke={currentStore?.color ?? "#FFD700"}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={0}
              style={{ transform: "rotate(-90deg)", transformOrigin: "45px 45px", transition: "stroke 0.4s" }}
            />
          </svg>
          <div
            className="relative flex items-center justify-center"
            style={{
              width: "clamp(110px,18vw,250px)",
              height: "clamp(110px,18vw,250px)",
              animation: isUrgent ? "urgencyPulse 0.38s ease-in-out infinite" : undefined,
            }}
          >
            {currentItem && isBomb(currentItem) ? (
              <div className="flex items-center justify-center text-[clamp(70px,14vw,140px)] leading-none">
                {(currentItem as SummerBomb).emoji}
              </div>
            ) : currentStore ? (
              <>
                <img
                  src={giftImg(currentStore.id)}
                  alt={currentStore.name}
                  className="object-contain"
                  style={{ width: "clamp(100px,17vw,240px)", height: "clamp(100px,17vw,240px)", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}
                />
                <span
                  className="absolute font-bold text-white"
                  style={{
                    bottom: -22,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "clamp(7px,1.2vw,11px)",
                    textShadow: "0 1px 4px rgba(0,0,0,1)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentStore.name}
                </span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Score bar */}
      {phase !== "intro" && (
        <div
          className="fixed top-[18px] left-1/2 -translate-x-1/2 flex gap-6 items-center z-50 rounded-full text-white font-bold"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.18)",
            padding: "clamp(8px,1.5vw,16px) clamp(22px,3.5vw,48px)",
            fontSize: "clamp(14px,2.2vw,24px)",
          }}
        >
          <span>🎣 תפסת <span className="text-yellow-400 font-black" style={{ fontSize: "clamp(18px,3vw,32px)" }}>{scoreCaught}</span></span>
          <span className="text-white/25">|</span>
          <span>💨 פספסת <span className="text-yellow-400 font-black" style={{ fontSize: "clamp(18px,3vw,32px)" }}>{scoreMissed}</span></span>
          <span className="text-white/25">|</span>
          <span>🎁 נשאר <span className="text-yellow-400 font-black" style={{ fontSize: "clamp(18px,3vw,32px)" }}>{remaining}</span></span>
        </div>
      )}

      {/* Back to hub button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-4 right-4 z-50 rounded-full px-4 py-2 text-sm font-bold text-white"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        ← ירידים
      </button>

      {/* Miss flash */}
      <AnimatePresence>
        {showMissFlash && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-[150]"
            style={{ background: "rgba(255,0,0,0.2)" }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[300]" />

      {/* ── Intro Overlay ── */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-5 overflow-hidden"
            style={{
              backgroundImage: "url('/summerfair/beach.gif')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="absolute inset-0" style={{ background: "rgba(0,10,30,0.45)" }} />

            {/* Floating fisher */}
            <motion.img
              src="/summerfair/thefisher.png"
              alt=""
              className="absolute bottom-0 left-5 pointer-events-none z-[2]"
              style={{ width: "clamp(160px,24vw,320px)", filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.5))" }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />

            {/* Wave */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[90px] pointer-events-none"
              style={{
                background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 90'%3E%3Cpath fill='rgba(18,160,140,0.35)' d='M0,45 C240,90 480,0 720,45 C960,90 1200,0 1440,45 L1440,90 L0,90 Z'/%3E%3C/svg%3E\") center/cover no-repeat",
                animation: "waveDrift 5s ease-in-out infinite alternate",
              }}
            />

            {/* Title */}
            <motion.h1
              className="relative z-[2] font-black"
              style={{
                fontSize: "clamp(38px,7vw,70px)",
                letterSpacing: 4,
                background: "linear-gradient(135deg, #ffe566 0%, #ffaa33 50%, #ff6b35 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 3px 14px rgba(255,160,50,0.55))",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              יריד הקיץ
            </motion.h1>
            <motion.div
              className="relative z-[2] uppercase tracking-widest font-light"
              style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(12px,1.8vw,16px)", letterSpacing: 6, marginTop: -14 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Summer Fair
            </motion.div>

            {/* Instructions */}
            <motion.div
              className="relative z-[2] flex flex-wrap items-center justify-center gap-1 rounded-full text-white/90 font-semibold"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                backdropFilter: "blur(12px)",
                padding: "clamp(10px,1.8vw,20px) clamp(20px,3.5vw,44px)",
                fontSize: "clamp(13px,1.8vw,17px)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span>בים צפות הרבה מתנות</span>
              <span className="mx-3 text-yellow-400/60">·</span>
              <span>גררי את הסירה למתנה שאת רוצה</span>
              <span className="mx-3 text-yellow-400/60">·</span>
              <span>לחצי עליה</span>
              <span className="mx-3 text-yellow-400/60">·</span>
              <span>והופ — המתנה בדרך אלייך</span>
            </motion.div>

            {/* Start button */}
            <motion.button
              onClick={startGame}
              className="relative z-[2] font-black rounded-full border-0"
              style={{
                background: "linear-gradient(135deg, #ffe566, #ff8c00)",
                color: "#1a0800",
                padding: "clamp(14px,2.5vw,32px) clamp(56px,10vw,128px)",
                fontSize: "clamp(20px,3.5vw,40px)",
                boxShadow: "0 8px 36px rgba(255,150,0,.6), 0 0 0 3px rgba(255,220,80,0.25)",
                letterSpacing: 1,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.97 }}
            >
              שנתחיל
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Win Overlay ── */}
      <AnimatePresence>
        {phase === "win" && currentStore && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(0,10,40,0.6)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Sunburst */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 720, height: 720,
                background: `repeating-conic-gradient(${currentStore.color}55 0deg 9deg, transparent 9deg 18deg)`,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
            {/* Glow rings */}
            {[1, 2, 3].map((n) => (
              <motion.div
                key={n}
                className="absolute rounded-full"
                style={{
                  border: "2px solid rgba(255,220,50,0.22)",
                  width: `clamp(${180 + n * 100}px, ${30 + n * 14}vw, ${320 + n * 200}px)`,
                  height: `clamp(${180 + n * 100}px, ${30 + n * 14}vw, ${320 + n * 200}px)`,
                }}
                animate={{ opacity: [0.8, 0], scale: [0.8, 1.1] }}
                transition={{ duration: 2, repeat: Infinity, delay: (n - 1) * 0.65 }}
              />
            ))}

            {/* Win card */}
            <motion.div
              className="relative z-[2] rounded-[30px] text-center"
              style={{
                background: "linear-gradient(150deg, #0a1628 0%, #0d3b6e 50%, #1565c0 100%)",
                border: `2px solid ${currentStore.color}cc`,
                padding: "clamp(28px,5vw,56px) clamp(36px,6.5vw,72px) clamp(24px,4vw,52px)",
                maxWidth: 520, width: "92vw",
                boxShadow: `0 0 80px rgba(255,220,50,.35), 0 30px 80px rgba(0,0,0,.6)`,
              }}
              initial={{ scale: 0.2, y: 120, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 22, stiffness: 300, delay: 0.1 }}
            >
              {["✨", "⭐", "✨", "🌟", "⭐"].map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute text-[clamp(18px,3.2vw,36px)] pointer-events-none"
                  style={{ top: i < 3 ? "-14px" : "60%", [i % 2 === 0 ? "right" : "left"]: i * 8 + "px" }}
                  animate={{ opacity: [0, 1, 0], scale: [0.4, 1.3, 0.4], rotate: [0, 20, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}
                >{s}</motion.span>
              ))}
              <motion.img
                src={giftImg(currentStore.id)}
                alt=""
                style={{ width: 90, height: 90, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}
                className="mx-auto block mb-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              />
              <div className="text-white/55 uppercase tracking-widest mb-1" style={{ fontSize: "clamp(11px,1.8vw,18px)", letterSpacing: 3 }}>
                תפסת מתנה מ
              </div>
              <div
                className="font-black leading-tight mb-4"
                style={{
                  fontSize: "clamp(32px,5.8vw,56px)",
                  background: "linear-gradient(135deg,#FFD700,#FFA500,#FFD700)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 20px rgba(255,200,0,.6))",
                }}
              >
                {currentStore.name}
              </div>
              <div className="h-0.5 w-[140px] mx-auto mb-4" style={{ background: "linear-gradient(90deg,transparent,rgba(255,215,0,.8),transparent)" }} />
              <div className="text-white/50 mb-2 uppercase tracking-widest" style={{ fontSize: "clamp(12px,2vw,18px)" }}>המתנה שלך</div>
              <div className="text-white font-bold" style={{ fontSize: "clamp(20px,3.5vw,38px)" }}>{currentStore.gift}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Registration Dialog ── */}
      <AnimatePresence>
        {phase === "reg" && currentStore && (
          <RegistrationDialog
            store={currentStore}
            onSubmit={handleRegSubmit}
            onSkip={closeReg}
          />
        )}
      </AnimatePresence>

      {/* ── Bomb Overlay ── */}
      <AnimatePresence>
        {phase === "bomb" && currentBomb && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(20,0,0,0.65)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="font-black text-[#FF6B6B]"
                style={{ fontSize: 52, textShadow: "0 0 24px rgba(255,50,50,0.8), 0 2px 8px rgba(0,0,0,0.9)", letterSpacing: 2 }}
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 18 }}
              >
                אויששש
              </motion.div>
              <motion.div
                className="rounded-[30px] text-center"
                style={{
                  background: "linear-gradient(150deg, #1a0000 0%, #4a0000 50%, #7a0000 100%)",
                  border: "2px solid rgba(255,80,80,0.7)",
                  padding: "clamp(28px,5vw,56px) clamp(36px,6.5vw,72px) clamp(24px,4vw,52px)",
                  maxWidth: 480, width: "92vw",
                  boxShadow: "0 0 80px rgba(255,50,50,.4), 0 30px 80px rgba(0,0,0,.6)",
                }}
                initial={{ scale: 0.2, y: 60, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 22, delay: 0.1 }}
              >
                <motion.div
                  className="block mb-4 leading-none"
                  style={{ fontSize: "clamp(64px,12vw,120px)" }}
                  initial={{ scale: 0, rotate: -25 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.15 }}
                >
                  {currentBomb.emoji}
                </motion.div>
                <motion.div
                  className="font-black text-[#FF6B6B] mb-3"
                  style={{ fontSize: "clamp(24px,4.2vw,40px)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {currentBomb.title}
                </motion.div>
                <motion.div
                  className="text-white font-bold leading-relaxed"
                  style={{ fontSize: "clamp(16px,2.8vw,28px)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                >
                  {currentBomb.msg}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Game Over ── */}
      <AnimatePresence>
        {phase === "gameover" && (
          <motion.div
            className="fixed inset-0 z-[400] flex items-center justify-center"
            style={{ background: "rgba(0,10,40,0.75)", backdropFilter: "blur(8px)" }}
            dir="rtl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="rounded-3xl text-center mx-4"
              style={{
                background: "linear-gradient(150deg, #0a1628 0%, #0d3b6e 100%)",
                border: "2px solid rgba(255,215,0,0.4)",
                padding: "clamp(32px,6vw,64px) clamp(40px,7vw,80px)",
                maxWidth: 480, width: "92vw",
              }}
              initial={{ scale: 0.8, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div style={{ fontSize: "clamp(56px,10vw,96px)" }} className="mb-4">🎉</div>
              <h2 className="font-black text-white mb-2" style={{ fontSize: "clamp(28px,5vw,48px)" }}>
                יריד הקיץ הסתיים!
              </h2>
              <p className="text-yellow-300 mb-6" style={{ fontSize: "clamp(14px,2.5vw,22px)" }}>
                תפסת <strong>{scoreCaught}</strong> מתנות 🎁
              </p>
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={startGame}
                  className="rounded-2xl font-bold text-stone-900 border-0"
                  style={{
                    background: "linear-gradient(135deg, #FFD700, #FF8C00)",
                    padding: "clamp(12px,2.2vw,20px) clamp(32px,5vw,64px)",
                    fontSize: "clamp(16px,2.5vw,24px)",
                    boxShadow: "0 6px 24px rgba(255,160,0,.5)",
                  }}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  שחקי שוב 🎣
                </motion.button>
                <button
                  onClick={() => navigate("/")}
                  className="rounded-2xl font-bold text-white border-0"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    padding: "clamp(10px,1.8vw,18px)",
                    fontSize: "clamp(14px,2vw,20px)",
                  }}
                >
                  חזרה לירידים
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shimmer keyframe + urgency pulse */}
      <style>{`
        @keyframes shimmer {
          from { background-position: 200% center; }
          to   { background-position: -200% center; }
        }
        @keyframes urgencyPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.1); }
        }
        @keyframes waveDrift {
          from { transform: translateX(-15px); }
          to   { transform: translateX(15px); }
        }
      `}</style>
    </div>
  );
}

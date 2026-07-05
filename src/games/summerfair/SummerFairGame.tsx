import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { STORES, buildQueue, giftImg, SummerItem, SummerStore, SummerBomb } from "./shops-data";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const DURATION_MS = 5500;
const CIRC = 2 * Math.PI * 36;

function isBomb(item: SummerItem): item is SummerBomb {
  return (item as SummerBomb).type === "bomb";
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
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
      w: 7 + Math.random() * 9, h: 5 + Math.random() * 6,
      color: pal[Math.floor(Math.random() * pal.length)],
      rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.18,
      vy: 2.5 + Math.random() * 3.5, vx: (Math.random() - 0.5) * 2.5,
    }));
    onRef.current = true;
    const animate = () => {
      if (!onRef.current) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
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

// ─── Email Dialog (before game) ────────────────────────────────────────────────
function EmailDialog({
  onStart,
  onSkip,
}: {
  onStart: (email: string, consent: boolean) => void;
  onSkip: () => void;
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const submit = async () => {
    if (email.trim() && !consent) { setConsentError(true); return; }
    onStart(email.trim(), consent);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: "rgba(0,10,30,0.7)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir="rtl"
    >
      <motion.div
        className="bg-white rounded-3xl p-8 mx-4 w-full max-w-sm shadow-2xl"
        initial={{ scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
      >
        <div className="text-center mb-6">
          <motion.div className="text-4xl mb-3" animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}>🎁</motion.div>
          <h2 className="font-black text-stone-800 mb-2 leading-tight" style={{ fontSize: "clamp(22px, 5vw, 28px)" }}>
            רגע לפני שנתחיל —
          </h2>
          <p className="font-extrabold leading-snug" style={{
            fontSize: "clamp(20px, 5vw, 26px)",
            background: "linear-gradient(135deg, #0891b2, #0369a1, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            לאיפה תרצי שאשלח<br />לך את המתנות? 🌊
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1 text-stone-700">אימייל (לא חובה)</label>
            <input
              type="email"
              placeholder="example@email.com"
              dir="ltr"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-sky-400"
              value={email}
              onChange={e => { setEmail(e.target.value); setConsentError(false); }}
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer select-none" onClick={() => { setConsent(p => !p); setConsentError(false); }}>
            <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
              consent ? "bg-sky-500 border-sky-500" : consentError ? "border-red-400" : "border-stone-300"
            }`}>
              {consent && (
                <svg viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`text-xs leading-snug ${consentError ? "text-red-600 font-semibold" : "text-stone-600"}`}>
              אני מאשרת דיוור מהעסקים — שיוכלו לשלוח לי את המתנות 🙂 ומדבורה זילברשטיין מנהלת היריד
            </span>
          </label>

          {email.trim() && !consent && (
            <p className="text-xs text-red-500 font-medium">⚠ יש לאשר קבלת דיוור כדי לשמור את המייל</p>
          )}

          <button
            disabled={!!email.trim() && !consent}
            onClick={submit}
            className="w-full rounded-xl py-3 font-bold text-base text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #0891b2, #0369a1)" }}
          >
            יאללה, בואו נתחיל! 🎣
          </button>
          <button
            onClick={onSkip}
            className="w-full rounded-xl py-2 text-sm text-stone-400 hover:text-stone-600"
          >
            דלגי
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Finale Dialog ─────────────────────────────────────────────────────────────
function FinaleDialog({
  caughtStores,
  allStores,
  prefillEmail,
  refParam,
  onClose,
  onPlayAgain,
}: {
  caughtStores: SummerStore[];
  allStores: SummerStore[];
  prefillEmail: string;
  refParam: string;
  onClose: () => void;
  onPlayAgain: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const caughtIds = new Set(caughtStores.map(s => String(s.id)));
  const uncaught = allStores.filter(s => !caughtIds.has(String(s.id)));
  const [extraIds, setExtraIds] = useState<Set<number>>(new Set());
  const toggleExtra = (id: number) => setExtraIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const CONFETTI = ["🎁", "🎀", "🌟", "✨", "🎊", "🎉", "💝", "🌸", "🏆", "🦋"];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const allShopIds = [
        ...caughtStores.map(s => String(s.id)),
        ...Array.from(extraIds).map(id => String(id)),
      ];
      await addDoc(collection(db, "fairs", "summerfair", "finale_leads"), {
        name: name.trim(),
        email: email.trim(),
        shopIds: allShopIds,
        caughtCount: caughtStores.length,
        ref: refParam,
        claimedAt: serverTimestamp(),
      });
      setSent(true);
    } catch (err) {
      toast.error("שגיאה — לא נשמר", { description: String(err), duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "radial-gradient(ellipse at 50% 60%, #0891b288 0%, #0c4a6e99 60%, #000000cc 100%)" }}
      dir="rtl"
    >
      <button
        onClick={onClose}
        className="fixed top-4 left-4 z-[500] w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-2xl font-bold transition-colors shadow-lg"
      >×</button>

      {CONFETTI.map((emoji, i) => (
        <motion.span
          key={i}
          className="fixed text-3xl pointer-events-none select-none"
          style={{ left: `${8 + i * 9}%`, top: "-6%" }}
          animate={{ y: ["0vh", "110vh"], rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)], opacity: [1, 1, 0] }}
          transition={{ duration: 3.5 + i * 0.3, repeat: Infinity, delay: i * 0.25, ease: "linear" }}
        >{emoji}</motion.span>
      ))}

      <motion.div
        className="relative w-full max-w-lg mx-4 rounded-[2rem] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,.7)]"
        initial={{ scale: 0.7, y: 60, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 260 }}
        dir="rtl"
      >
        {/* Header */}
        <div className="relative px-8 pt-10 pb-6 text-center"
          style={{ background: "linear-gradient(135deg, #0891b2, #0369a1, #0c4a6e)" }}>
          <motion.div className="text-7xl mb-3"
            animate={{ scale: [1, 1.18, 1], rotate: [-6, 6, -6] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          >🏆</motion.div>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-1">
            כמה מתנות יש לך!
          </h1>
          <p className="text-white/90 text-lg font-semibold">
            {caughtStores.length} מתנות מחכות לך 🎁
          </p>
        </div>

        {/* Body */}
        <div className="bg-white px-8 py-7">
          {!sent ? (
            <>
              <p className="text-stone-600 text-center text-sm leading-relaxed mb-6">
                עבדת קשה — עכשיו תנוחי 😊<br />
                אנחנו כבר נדאג למשלוח
              </p>

              {/* Caught gifts summary */}
              {caughtStores.length > 0 && (
                <div className="mb-5">
                  <p className="text-center font-bold text-sky-700 text-sm mb-3">המתנות שתפסת ✅</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {caughtStores.map(store => (
                      <div key={store.id} className="flex items-center gap-1 bg-sky-50 border border-sky-200 rounded-full px-3 py-1">
                        <img src={giftImg(store.id)} alt="" className="w-5 h-5 object-contain" />
                        <span className="text-xs font-semibold text-sky-800">{store.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uncaught extras */}
              {uncaught.length > 0 && (
                <div className="mb-5">
                  <p className="text-center font-bold text-stone-600 text-sm mb-3">רוצה להוסיף עוד מתנות? ✨</p>
                  <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                    {uncaught.map(store => (
                      <label key={store.id} className="flex items-center gap-3 cursor-pointer group select-none" onClick={() => toggleExtra(store.id)}>
                        <div className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                          extraIds.has(store.id) ? "bg-sky-500 border-sky-500" : "border-stone-300 group-hover:border-sky-400"
                        }`}>
                          {extraIds.has(store.id) && (
                            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}
                              viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.svg>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-stone-800 truncate">{store.gift}</span>
                          <span className="text-xs text-stone-500 truncate">{store.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-center font-bold text-stone-800 text-base mb-4">לאיפה לשלוח לך את הכבודה? 📦</p>

              <form onSubmit={handleSend} className="space-y-4">
                <input
                  required
                  type="text"
                  placeholder="השם שלך"
                  dir="rtl"
                  className="w-full rounded-xl border-2 border-sky-200 focus:border-sky-500 px-4 py-3 text-base text-center outline-none"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <input
                  required
                  type="email"
                  placeholder="הכניסי את האימייל שלך"
                  dir="ltr"
                  className="w-full rounded-xl border-2 border-sky-200 focus:border-sky-500 px-4 py-3 text-base text-center outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />

                <label className="flex items-start gap-3 cursor-pointer group select-none" onClick={() => setAgreed(p => !p)}>
                  <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    agreed ? "bg-sky-500 border-sky-500" : "border-stone-300 group-hover:border-sky-400"
                  }`}>
                    {agreed && (
                      <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}
                        viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    )}
                  </div>
                  <span className="text-sm text-stone-600 leading-snug pt-0.5">
                    ברור שאני מאשרת דיוור — מהעסקים שצריכים לדוור לי את המתנות, ולדבורה זילברשטיין מנהלת היריד
                  </span>
                </label>

                <p className="text-[11px] text-stone-400 leading-relaxed text-center px-1">
                  המתנות ישלחו אלייך בסוף היריד.<br />
                  האחריות על שליחת המתנות היא על בעלי העסקים בלבד.
                </p>

                <motion.button
                  type="submit"
                  disabled={busy || !agreed}
                  className="w-full py-4 rounded-xl font-extrabold text-white text-lg shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(90deg, #0369a1, #0891b2)" }}
                  whileHover={agreed ? { scale: 1.03 } : {}}
                  whileTap={agreed ? { scale: 0.97 } : {}}
                >
                  {busy ? "שולחת..." : "שלחו לי את המתנות! 🌊"}
                </motion.button>

                <button
                  type="button"
                  onClick={onPlayAgain}
                  className="block mx-auto px-5 py-2.5 rounded-xl font-bold text-white text-sm hover:opacity-80"
                  style={{ background: "linear-gradient(90deg, #0369a1, #0891b2)" }}
                >
                  אני רוצה לשחק עוד סיבוב 🎣
                </button>
              </form>
            </>
          ) : (
            <motion.div
              className="text-center py-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" }}
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-extrabold text-stone-800 mb-2">יאללה, בדרך!</h2>
              <p className="text-stone-500 leading-relaxed text-sm mb-6">
                הצוות שלנו מטפל בבקשות בתשומת לב.<br />
                פרטי המתנות ישלחו לאימייל שלך.<br />
                תהני מהמתנות! ✨
              </p>
              <button
                onClick={onPlayAgain}
                className="px-6 py-3 rounded-xl font-bold text-white text-sm hover:opacity-80"
                style={{ background: "linear-gradient(90deg, #0369a1, #0891b2)" }}
              >
                עוד סיבוב 🎣
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Game ─────────────────────────────────────────────────────────────────
export default function SummerFairGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get("ref") || "";

  type Phase = "intro" | "email" | "playing" | "win" | "bomb" | "finale";
  const [phase, setPhase] = useState<Phase>("intro");

  // ── User info ──
  const [userEmail, setUserEmail] = useState("");
  const hasConsentRef = useRef(false);
  const hasShownEmailAfterFirstWin = useRef(false);

  // ── Score / tracking ──
  const [scoreCaught, setScoreCaught] = useState(0);
  const [scoreMissed, setScoreMissed] = useState(0);
  const [remaining, setRemaining] = useState(STORES.length);
  const caughtStoresRef = useRef<SummerStore[]>([]);
  const [caughtStores, setCaughtStores] = useState<SummerStore[]>([]);

  // ── Current item ──
  const [currentItem, setCurrentItem] = useState<SummerItem | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showMissFlash, setShowMissFlash] = useState(false);

  // ── Game refs ──
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

  // ── DOM refs ──
  const giftWrapRef = useRef<HTMLDivElement | null>(null);
  const timerFillRef = useRef<SVGCircleElement | null>(null);

  // ── Fisher refs ──
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

  // ── Sand gifts ──
  const [sandGifts, setSandGifts] = useState<{ id: number; x: number; bottom: number; deg: number }[]>([]);

  // ─── Fisher helpers ─────────────────────────────────────────────────────────
  const minY = useCallback(() => {
    const f = fisherRef.current;
    return f ? window.innerHeight * (3 / 4) - (2 / 3) * f.offsetHeight : window.innerHeight * 0.6;
  }, []);

  const moveFisherTo = useCallback((x: number, y: number) => {
    const f = fisherRef.current;
    if (!f) return;
    f.style.left = Math.max(window.innerWidth * 0.15, Math.min(x, window.innerWidth - f.offsetWidth)) + "px";
    f.style.top = Math.max(minY(), Math.min(y, window.innerHeight - f.offsetHeight)) + "px";
    f.style.transform = "none";
  }, [minY]);

  const initFisherPos = useCallback(() => {
    const f = fisherRef.current;
    if (!f) return;
    f.style.left = window.innerWidth * 0.18 + "px";
    f.style.top = minY() + "px";
  }, [minY]);

  // ─── Game logic ─────────────────────────────────────────────────────────────
  const onCatch = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
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
      setScoreCaught(c => c + 1);
      caughtStoresRef.current = [...caughtStoresRef.current, store];
      setCaughtStores([...caughtStoresRef.current]);
      setSandGifts(prev => [...prev, {
        id: store.id,
        x: Math.random() * (window.innerWidth * 0.2 - 70),
        bottom: 8 + Math.random() * 55,
        deg: (Math.random() - 0.5) * 34,
      }]);
      setCurrentItem(store);
      startConfetti(store.color);
      setPhase("win");
    }
  }, [startConfetti]);

  const afterWinClosed = useCallback(() => {
    pausedRef.current = false;
    // After first win, if user hasn't given email yet → show email popup
    if (!hasShownEmailAfterFirstWin.current && !hasConsentRef.current && caughtStoresRef.current.length === 1) {
      hasShownEmailAfterFirstWin.current = true;
      setPhase("email");
      return;
    }
    if (queueRef.current.length > 0) {
      setPhase("playing");
      spawnNext();
    } else {
      setPhase("finale");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMiss = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const item = activeItemRef.current;
    activeItemRef.current = null;
    pausedRef.current = true;
    setShowGift(false);
    setIsUrgent(false);
    if (item && !isBomb(item)) {
      setScoreMissed(m => m + 1);
      setShowMissFlash(true);
      setTimeout(() => setShowMissFlash(false), 500);
    }
    setTimeout(() => {
      pausedRef.current = false;
      if (queueRef.current.length > 0) spawnNext();
      else setPhase("finale");
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

    giftXRef.current += giftVXRef.current * dt;
    const lB = window.innerWidth * 0.15 + 50, rB = window.innerWidth - 50;
    if (giftXRef.current < lB) { giftXRef.current = lB; giftVXRef.current = Math.abs(giftVXRef.current); }
    if (giftXRef.current > rB) { giftXRef.current = rB; giftVXRef.current = -Math.abs(giftVXRef.current); }

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
    const lB = window.innerWidth * 0.18 + 50, rB = window.innerWidth * 0.92 - 50;
    giftXRef.current = lB + Math.random() * (rB - lB);
    giftYRef.current = window.innerHeight * (0.80 + Math.random() * 0.06);
    giftVXRef.current = (0.10 + Math.random() * 0.10) * (Math.random() < 0.5 ? 1 : -1);
    startTsRef.current = null; lastTsRef.current = null;
    setCurrentItem(item);
    setIsUrgent(false);
    setShowGift(true);
    setRemaining(queueRef.current.filter(s => !isBomb(s)).length);
    if (giftWrapRef.current) {
      giftWrapRef.current.style.left = giftXRef.current - 90 + "px";
      giftWrapRef.current.style.top = giftYRef.current - 90 + "px";
      giftWrapRef.current.classList.remove("urgent");
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Auto-close win after 2s
  useEffect(() => {
    if (phase !== "win") return;
    const t = setTimeout(() => { stopConfetti(); afterWinClosed(); }, 2000);
    return () => clearTimeout(t);
  }, [phase, stopConfetti, afterWinClosed]);

  // Auto-close bomb after 3s
  useEffect(() => {
    if (phase !== "bomb") return;
    const t = setTimeout(() => {
      pausedRef.current = false;
      if (queueRef.current.length > 0) { setPhase("playing"); spawnNext(); }
      else setPhase("finale");
    }, 3000);
    return () => clearTimeout(t);
  }, [phase, spawnNext]);

  // Cleanup on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ─── Fisher mouse/touch ──────────────────────────────────────────────────────
  useEffect(() => {
    const f = fisherRef.current;
    if (!f) return;
    const onLoad = () => initFisherPos();
    if (f.complete) initFisherPos(); else f.addEventListener("load", onLoad);

    const onMD = (e: MouseEvent) => {
      draggingRef.current = true; didDragRef.current = false;
      mouseDownXRef.current = e.clientX; mouseDownYRef.current = e.clientY;
      const r = f.getBoundingClientRect();
      offXRef.current = e.clientX - r.left; offYRef.current = e.clientY - r.top;
      f.style.cursor = "grabbing"; e.preventDefault();
    };
    const onMM = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      if (Math.hypot(e.clientX - mouseDownXRef.current, e.clientY - mouseDownYRef.current) > 5) didDragRef.current = true;
      moveFisherTo(e.clientX - offXRef.current, e.clientY - offYRef.current);
    };
    const onMU = () => {
      if (draggingRef.current && !didDragRef.current && !pausedRef.current && activeItemRef.current) {
        const br = f.getBoundingClientRect();
        if (giftXRef.current >= br.left && giftXRef.current <= br.right &&
            lastBobYRef.current >= br.top && lastBobYRef.current <= br.bottom) onCatch();
      }
      draggingRef.current = false; f.style.cursor = "grab";
    };
    const onTS = (e: TouchEvent) => {
      const t = e.touches[0], r = f.getBoundingClientRect();
      offXRef.current = t.clientX - r.left; offYRef.current = t.clientY - r.top; e.preventDefault();
    };
    const onTM = (e: TouchEvent) => {
      const t = e.touches[0]; moveFisherTo(t.clientX - offXRef.current, t.clientY - offYRef.current); e.preventDefault();
    };

    f.addEventListener("mousedown", onMD);
    document.addEventListener("mousemove", onMM);
    document.addEventListener("mouseup", onMU);
    f.addEventListener("touchstart", onTS, { passive: false });
    document.addEventListener("touchmove", onTM, { passive: false });
    return () => {
      f.removeEventListener("load", onLoad);
      f.removeEventListener("mousedown", onMD);
      document.removeEventListener("mousemove", onMM);
      document.removeEventListener("mouseup", onMU);
      f.removeEventListener("touchstart", onTS);
      document.removeEventListener("touchmove", onTM);
    };
  }, [initFisherPos, moveFisherTo, onCatch]);

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleEmailStart = async (email: string, consent: boolean) => {
    if (email && consent) {
      setUserEmail(email);
      hasConsentRef.current = true;
      try {
        await addDoc(collection(db, "fairs", "summerfair", "early_signups"), {
          email, marketingConsent: true, signedUpAt: serverTimestamp(), ref: refParam,
        });
      } catch (err) { console.error("[summerfair early_signup]", err); }
    }
    startGame();
  };

  const handleEmailSkip = () => startGame();

  const handleEmailAfterFirstWin = async (email: string, consent: boolean) => {
    if (email && consent) {
      setUserEmail(email);
      hasConsentRef.current = true;
      try {
        await addDoc(collection(db, "fairs", "summerfair", "early_signups"), {
          email, marketingConsent: true, signedUpAt: serverTimestamp(), ref: refParam,
        });
      } catch (err) { console.error("[summerfair early_signup]", err); }
    }
    // continue game
    pausedRef.current = false;
    if (queueRef.current.length > 0) { setPhase("playing"); spawnNext(); }
    else setPhase("finale");
  };

  const startGame = useCallback(() => {
    queueRef.current = buildQueue();
    caughtStoresRef.current = [];
    setCaughtStores([]);
    setScoreCaught(0);
    setScoreMissed(0);
    setRemaining(STORES.length);
    setSandGifts([]);
    hasShownEmailAfterFirstWin.current = false;
    pausedRef.current = false;
    setPhase("playing");
    setTimeout(spawnNext, 600);
  }, [spawnNext]);

  const currentStore = currentItem && !isBomb(currentItem) ? (currentItem as SummerStore) : null;
  const currentBomb = currentItem && isBomb(currentItem) ? (currentItem as SummerBomb) : null;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ fontFamily: "'Heebo', sans-serif" }} dir="rtl">
      {/* Background */}
      <div className="absolute inset-0" style={{
        backgroundImage: "url('/summerfair/beach.gif')",
        backgroundSize: "cover", backgroundPosition: "center",
        backgroundRepeat: "no-repeat", backgroundAttachment: "fixed",
      }} />

      {/* Sand gifts */}
      {sandGifts.map((g, i) => (
        <img key={i} src={giftImg(g.id)} alt="" className="absolute pointer-events-none object-contain z-[3]"
          style={{ width: "clamp(50px,8vw,110px)", height: "clamp(50px,8vw,110px)",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            left: g.x, bottom: g.bottom, transform: `rotate(${g.deg}deg)` }} />
      ))}

      {/* Fisher */}
      <img ref={fisherRef} src="/summerfair/thefisher.png" draggable={false} alt=""
        className="absolute z-20 select-none"
        style={{ width: "clamp(160px,25vw,380px)", cursor: "grab", touchAction: "none",
          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.4))",
          display: phase === "intro" ? "none" : "block" }} />

      {/* Gift preview HUD */}
      <AnimatePresence>
        {(phase === "playing" || phase === "win") && showGift && currentStore && (
          <motion.div
            className="fixed top-[60px] left-1/2 text-center z-50 pointer-events-none"
            style={{ transform: "translateX(-50%)", width: "90vw", maxWidth: 700 }}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <motion.img src={giftImg(currentStore.id)} alt="" className="block mx-auto mb-2 object-contain"
              style={{ width: "clamp(64px,11vw,128px)", height: "clamp(64px,11vw,128px)", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
              animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="block font-black leading-tight mb-2" style={{
              fontSize: "clamp(36px,6vw,62px)",
              background: `linear-gradient(135deg, ${currentStore.color} 0%, #fff 50%, ${currentStore.color} 100%)`,
              backgroundSize: "200% auto", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.6))", animation: "shimmer 2.5s linear infinite",
            }}>{currentStore.name}</span>
            <span className="block font-bold text-white" style={{ fontSize: "clamp(20px,3.5vw,32px)", textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}>
              {currentStore.gift}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift box */}
      {(phase === "playing" || phase === "win" || phase === "bomb") && (
        <div ref={giftWrapRef} className="gift-wrapper absolute flex items-center justify-center pointer-events-none z-[5]"
          style={{ width: "clamp(140px,22vw,300px)", height: "clamp(140px,22vw,300px)", display: showGift ? "flex" : "none" }}>
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="36" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3.5" />
            <circle ref={timerFillRef} cx="45" cy="45" r="36" fill="none"
              stroke={currentStore?.color ?? "#FFD700"} strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={CIRC} strokeDashoffset={0}
              style={{ transform: "rotate(-90deg)", transformOrigin: "45px 45px", transition: "stroke 0.4s" }} />
          </svg>
          <div className="relative flex items-center justify-center"
            style={{ width: "clamp(110px,18vw,250px)", height: "clamp(110px,18vw,250px)",
              animation: isUrgent ? "urgencyPulse 0.38s ease-in-out infinite" : undefined }}>
            {currentItem && isBomb(currentItem) ? (
              <div className="flex items-center justify-center text-[clamp(70px,14vw,140px)] leading-none">{(currentItem as SummerBomb).emoji}</div>
            ) : currentStore ? (
              <>
                <img src={giftImg(currentStore.id)} alt={currentStore.name} className="object-contain"
                  style={{ width: "clamp(100px,17vw,240px)", height: "clamp(100px,17vw,240px)", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }} />
                <span className="absolute font-bold text-white" style={{
                  bottom: -22, left: "50%", transform: "translateX(-50%)",
                  fontSize: "clamp(7px,1.2vw,11px)", textShadow: "0 1px 4px rgba(0,0,0,1)", whiteSpace: "nowrap",
                }}>{currentStore.name}</span>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Score bar */}
      {phase !== "intro" && phase !== "email" && (
        <div className="fixed top-[18px] left-1/2 -translate-x-1/2 flex gap-6 items-center z-50 rounded-full text-white font-bold"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.18)",
            padding: "clamp(8px,1.5vw,16px) clamp(22px,3.5vw,48px)", fontSize: "clamp(14px,2.2vw,24px)" }}>
          <span>🎣 תפסת <span className="text-yellow-400 font-black" style={{ fontSize: "clamp(18px,3vw,32px)" }}>{scoreCaught}</span></span>
          <span className="text-white/25">|</span>
          <span>💨 פספסת <span className="text-yellow-400 font-black" style={{ fontSize: "clamp(18px,3vw,32px)" }}>{scoreMissed}</span></span>
          <span className="text-white/25">|</span>
          <span>🎁 נשאר <span className="text-yellow-400 font-black" style={{ fontSize: "clamp(18px,3vw,32px)" }}>{remaining}</span></span>
        </div>
      )}

      {/* Back button */}
      <button onClick={() => navigate("/")}
        className="fixed top-4 right-4 z-50 rounded-full px-4 py-2 text-sm font-bold text-white"
        style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.15)" }}>
        ← ירידים
      </button>

      {/* Miss flash */}
      <AnimatePresence>
        {showMissFlash && (
          <motion.div className="fixed inset-0 pointer-events-none z-[150]"
            style={{ background: "rgba(255,0,0,0.2)" }}
            initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[300]" />

      {/* ── Intro Overlay ── */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-5 overflow-hidden"
            style={{ backgroundImage: "url('/summerfair/beach.gif')", backgroundSize: "cover", backgroundPosition: "center" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div className="absolute inset-0" style={{ background: "rgba(0,10,30,0.45)" }} />
            <motion.img src="/summerfair/thefisher.png" alt="" className="absolute bottom-0 left-5 pointer-events-none z-[2]"
              style={{ width: "clamp(160px,24vw,320px)", filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.5))" }}
              animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity }} />
            <div className="absolute bottom-0 left-0 right-0 h-[90px] pointer-events-none"
              style={{ background: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 90'%3E%3Cpath fill='rgba(18,160,140,0.35)' d='M0,45 C240,90 480,0 720,45 C960,90 1200,0 1440,45 L1440,90 L0,90 Z'/%3E%3C/svg%3E\") center/cover no-repeat", animation: "waveDrift 5s ease-in-out infinite alternate" }} />

            <motion.h1 className="relative z-[2] font-black" style={{ fontSize: "clamp(38px,7vw,70px)", letterSpacing: 4, background: "linear-gradient(135deg, #ffe566 0%, #ffaa33 50%, #ff6b35 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 3px 14px rgba(255,160,50,0.55))" }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>יריד הקיץ</motion.h1>
            <motion.div className="relative z-[2] uppercase tracking-widest font-light" style={{ color: "rgba(255,255,255,0.45)", fontSize: "clamp(12px,1.8vw,16px)", letterSpacing: 6, marginTop: -14 }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>Summer Fair</motion.div>

            {/* Video */}
            <motion.div className="relative z-[2] w-full overflow-hidden rounded-2xl shadow-2xl"
              style={{ maxWidth: "min(88vw, 560px)", aspectRatio: "16/9", boxShadow: "0 0 0 2px rgba(255,200,60,0.4), 0 20px 70px rgba(0,0,0,0.7)" }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <iframe
                src="https://www.youtube.com/embed/usPBdPkKDCo"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full border-0 block"
              />
            </motion.div>

            {/* Step-by-step instructions */}
            <motion.div className="relative z-[2] grid grid-cols-2 gap-2 w-full"
              style={{ maxWidth: "min(88vw, 560px)" }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              {[
                { emoji: "🎁", text: "בים צפות מתנות מעסקים מדהימים" },
                { emoji: "⛵", text: "גררי את הסירה למתנה שאת רוצה" },
                { emoji: "👆", text: "לחצי על הסירה כשהיא מעל המתנה" },
                { emoji: "🎉", text: "המתנה בדרך אלייך!" },
              ].map((step, i) => (
                <motion.div key={i}
                  className="flex items-center gap-2 rounded-2xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.07 }}>
                  <span className="text-2xl flex-shrink-0">{step.emoji}</span>
                  <span className="text-white/90 font-semibold leading-snug" style={{ fontSize: "clamp(11px,1.5vw,14px)" }}>{step.text}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.button onClick={() => setPhase("email")} className="relative z-[2] font-black rounded-full border-0"
              style={{ background: "linear-gradient(135deg, #ffe566, #ff8c00)", color: "#1a0800", padding: "clamp(14px,2.5vw,32px) clamp(56px,10vw,128px)", fontSize: "clamp(20px,3.5vw,40px)", boxShadow: "0 8px 36px rgba(255,150,0,.6), 0 0 0 3px rgba(255,220,80,0.25)", letterSpacing: 1 }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.06, y: -4 }} whileTap={{ scale: 0.97 }}>
              שנתחיל
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Email Dialog (before game or after first win) ── */}
      <AnimatePresence>
        {phase === "email" && (
          <EmailDialog
            onStart={handleEmailStart}
            onSkip={phase === "email" && caughtStoresRef.current.length === 0 ? handleEmailSkip : () => handleEmailAfterFirstWin("", false)}
          />
        )}
      </AnimatePresence>

      {/* ── Win Overlay ── */}
      <AnimatePresence>
        {phase === "win" && currentStore && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(0,10,40,0.6)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute rounded-full"
              style={{ width: 720, height: 720, background: `repeating-conic-gradient(${currentStore.color}55 0deg 9deg, transparent 9deg 18deg)` }}
              animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} />
            {[1, 2, 3].map(n => (
              <motion.div key={n} className="absolute rounded-full"
                style={{ border: "2px solid rgba(255,220,50,0.22)", width: `clamp(${180 + n * 100}px, ${30 + n * 14}vw, ${320 + n * 200}px)`, height: `clamp(${180 + n * 100}px, ${30 + n * 14}vw, ${320 + n * 200}px)` }}
                animate={{ opacity: [0.8, 0], scale: [0.8, 1.1] }} transition={{ duration: 2, repeat: Infinity, delay: (n - 1) * 0.65 }} />
            ))}
            <motion.div className="relative z-[2] rounded-[30px] text-center"
              style={{ background: "linear-gradient(150deg, #0a1628 0%, #0d3b6e 50%, #1565c0 100%)", border: `2px solid ${currentStore.color}cc`,
                padding: "clamp(28px,5vw,56px) clamp(36px,6.5vw,72px) clamp(24px,4vw,52px)", maxWidth: 520, width: "92vw",
                boxShadow: "0 0 80px rgba(255,220,50,.35), 0 30px 80px rgba(0,0,0,.6)" }}
              initial={{ scale: 0.2, y: 120, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 22, stiffness: 300, delay: 0.1 }}>
              <motion.img src={giftImg(currentStore.id)} alt="" style={{ width: 90, height: 90, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}
                className="mx-auto block mb-2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }} />
              <div className="text-white/55 uppercase tracking-widest mb-1" style={{ fontSize: "clamp(11px,1.8vw,18px)", letterSpacing: 3 }}>תפסת מתנה מ</div>
              <div className="font-black leading-tight mb-4" style={{ fontSize: "clamp(32px,5.8vw,56px)", background: "linear-gradient(135deg,#FFD700,#FFA500,#FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 20px rgba(255,200,0,.6))" }}>
                {currentStore.name}
              </div>
              <div className="h-0.5 w-[140px] mx-auto mb-4" style={{ background: "linear-gradient(90deg,transparent,rgba(255,215,0,.8),transparent)" }} />
              <div className="text-white/50 mb-2 uppercase tracking-widest" style={{ fontSize: "clamp(12px,2vw,18px)" }}>המתנה שלך</div>
              <div className="text-white font-bold" style={{ fontSize: "clamp(20px,3.5vw,38px)" }}>{currentStore.gift}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bomb Overlay ── */}
      <AnimatePresence>
        {phase === "bomb" && currentBomb && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: "rgba(20,0,0,0.65)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-col items-center gap-4">
              <motion.div className="font-black text-[#FF6B6B]" style={{ fontSize: 52, textShadow: "0 0 24px rgba(255,50,50,0.8)", letterSpacing: 2 }}
                initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 18 }}>אויששש</motion.div>
              <motion.div className="rounded-[30px] text-center"
                style={{ background: "linear-gradient(150deg, #1a0000 0%, #4a0000 50%, #7a0000 100%)", border: "2px solid rgba(255,80,80,0.7)", padding: "clamp(28px,5vw,56px) clamp(36px,6.5vw,72px) clamp(24px,4vw,52px)", maxWidth: 480, width: "92vw", boxShadow: "0 0 80px rgba(255,50,50,.4)" }}
                initial={{ scale: 0.2, y: 60, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", damping: 22, delay: 0.1 }}>
                <motion.div className="block mb-4 leading-none" style={{ fontSize: "clamp(64px,12vw,120px)" }}
                  initial={{ scale: 0, rotate: -25 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.15 }}>{currentBomb.emoji}</motion.div>
                <motion.div className="font-black text-[#FF6B6B] mb-3" style={{ fontSize: "clamp(24px,4.2vw,40px)" }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>{currentBomb.title}</motion.div>
                <motion.div className="text-white font-bold leading-relaxed" style={{ fontSize: "clamp(16px,2.8vw,28px)", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>{currentBomb.msg}</motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Finale Dialog ── */}
      <AnimatePresence>
        {phase === "finale" && (
          <FinaleDialog
            caughtStores={caughtStores}
            allStores={STORES}
            prefillEmail={userEmail}
            refParam={refParam}
            onClose={() => setPhase("playing")}
            onPlayAgain={() => {
              setPhase("intro");
              hasConsentRef.current = false;
              setUserEmail("");
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer { from { background-position: 200% center; } to { background-position: -200% center; } }
        @keyframes urgencyPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes waveDrift { from { transform: translateX(-15px); } to { transform: translateX(15px); } }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { STORES, buildQueue, giftImg, SummerItem, SummerStore, SummerBomb, MISSING_GIFT } from "./shops-data";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const DURATION_MS = 5500;
const CIRC = 2 * Math.PI * 36;

function isBomb(item: SummerItem): item is SummerBomb {
  return (item as SummerBomb).type === "bomb";
}

// ─── Parrot ───────────────────────────────────────────────────────────────────
function Parrot() {
  return (
    <motion.div
      className="absolute pointer-events-none z-[15]"
      style={{ top: "12%", right: 0 }}
      animate={{ x: ["0vw", "-120vw"], y: [0, -18, 6, -22, 0, -14, 8, -20, 0] }}
      transition={{
        x: { duration: 14, repeat: Infinity, repeatDelay: 10, ease: "linear" },
        y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <svg width="100" height="80" viewBox="0 0 100 80" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))", transform: "scaleX(-1)" }}>
        {/* Body */}
        <ellipse cx="46" cy="42" rx="20" ry="14" fill="#16a34a" />

        {/* Belly patch */}
        <ellipse cx="48" cy="46" rx="10" ry="8" fill="#86efac" />

        {/* Red chest */}
        <ellipse cx="50" cy="40" rx="7" ry="5" fill="#dc2626" />

        {/* Front wing — flaps up */}
        <motion.ellipse cx="44" cy="36" rx="28" ry="10" fill="#22c55e"
          animate={{ ry: [10, 18, 10], cy: [36, 28, 36] }}
          transition={{ duration: 0.32, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "44px 42px" }} />

        {/* Wing tip yellow */}
        <motion.ellipse cx="20" cy="34" rx="10" ry="5" fill="#facc15"
          animate={{ cy: [34, 24, 34], ry: [5, 8, 5] }}
          transition={{ duration: 0.32, repeat: Infinity, ease: "easeInOut" }} />

        {/* Head */}
        <circle cx="66" cy="28" r="14" fill="#16a34a" />

        {/* Beak upper */}
        <path d="M 77 24 Q 90 26 77 30 Z" fill="#ca8a04" />
        {/* Beak lower */}
        <path d="M 77 28 Q 88 30 77 32 Z" fill="#a16207" />

        {/* Eye white */}
        <circle cx="70" cy="24" r="4" fill="white" />
        {/* Pupil */}
        <circle cx="71" cy="24" r="2.2" fill="#111" />
        {/* Eye shine */}
        <circle cx="72" cy="23" r="0.8" fill="white" />

        {/* Head crest */}
        <motion.path d="M 64 15 Q 60 5 58 0 Q 64 8 68 14" fill="#4ade80"
          animate={{ rotate: [-8, 8, -8] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "64px 15px" }} />

        {/* Tail feathers */}
        <motion.g animate={{ rotate: [0, 5, 0, -5, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          style={{ transformOrigin: "26px 54px" }}>
          <path d="M 26 54 L 4 74" stroke="#15803d" strokeWidth="4" strokeLinecap="round" />
          <path d="M 28 56 L 10 78" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 24 52 L 2 68" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
        </motion.g>
      </svg>
    </motion.div>
  );
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
          <h2 className="font-black text-stone-800 mb-2 leading-tight" style={{ fontSize: "clamp(18px, 4vw, 24px)" }}>
            שנייה לפני שמתחילים —
          </h2>
          <p className="font-extrabold leading-snug" style={{
            fontSize: "clamp(18px, 4vw, 24px)",
            background: "linear-gradient(135deg, #0891b2, #0369a1, #7c3aed)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            שכחתם לגלות לנו לאן<br />לשלוח את המתנות? 🌊
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
                        {store.logo
                          ? <img src={store.logo} alt="" className="w-5 h-5 object-contain rounded" />
                          : <div className="w-5 h-5 rounded flex items-center justify-center bg-sky-100 text-sky-400" style={{ fontSize: 7 }}>לוגו</div>
                        }
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
                          <span className="text-sm font-semibold text-stone-800 truncate">
                            {store.gift === MISSING_GIFT ? <span className="text-amber-500 italic">חסר תיאור מתנה</span> : store.gift}
                          </span>
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
  const [introStep, setIntroStep] = useState(0);

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

  // Intro animation steps
  useEffect(() => {
    if (phase !== "intro") { setIntroStep(0); return; }
    const timers = [
      setTimeout(() => setIntroStep(1), 1300),
      setTimeout(() => setIntroStep(2), 2600),
      setTimeout(() => setIntroStep(3), 4000),
      setTimeout(() => setIntroStep(4), 4500),
      setTimeout(() => setIntroStep(5), 5000),
      setTimeout(() => setIntroStep(6), 5500),
      setTimeout(() => setIntroStep(7), 6000),
      setTimeout(() => setIntroStep(8), 6800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

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

      {/* Parrot */}
      {(phase === "intro" || phase === "playing" || phase === "win" || phase === "bomb") && <Parrot />}

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
          display: phase === "finale" ? "none" : "block" }} />

      {/* Gift preview HUD */}
      <AnimatePresence>
        {(phase === "playing" || phase === "win") && showGift && currentStore && (
          <motion.div
            className="fixed top-[60px] left-1/2 text-center z-50 pointer-events-none"
            style={{ transform: "translateX(-50%)", width: "90vw", maxWidth: 700 }}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            {currentStore.logo ? (
              <motion.img src={currentStore.logo} alt="" className="block mx-auto mb-2 object-contain rounded-xl"
                style={{ width: "clamp(64px,11vw,128px)", height: "clamp(64px,11vw,128px)", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
                animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
            ) : (
              <motion.div className="mx-auto mb-2 rounded-xl flex items-center justify-center text-white/50 text-xs border border-white/20"
                style={{ width: "clamp(64px,11vw,128px)", height: "clamp(64px,11vw,128px)", background: "rgba(255,255,255,0.08)" }}
                animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                חסר לוגו
              </motion.div>
            )}
            <span className="block font-black leading-tight mb-2" style={{
              fontSize: "clamp(36px,6vw,62px)",
              color: "#fff",
              textShadow: `0 0 28px ${currentStore.color}, 0 0 12px ${currentStore.color}99, 0 2px 10px rgba(0,0,0,0.85)`,
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
              <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                {currentStore.logo ? (
                  <img src={currentStore.logo} alt={currentStore.name} className="object-contain rounded-lg"
                    style={{ width: "clamp(48px,8vw,110px)", height: "clamp(48px,8vw,110px)", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }} />
                ) : (
                  <div className="rounded-lg flex items-center justify-center text-white/50 border border-white/20"
                    style={{ width: "clamp(48px,8vw,110px)", height: "clamp(48px,8vw,110px)", background: "rgba(255,255,255,0.08)", fontSize: "clamp(8px,1.2vw,12px)" }}>
                    חסר לוגו
                  </div>
                )}
                <img src={giftImg(currentStore.id)} alt="" className="object-contain"
                  style={{ width: "clamp(44px,7vw,100px)", height: "clamp(44px,7vw,100px)", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }} />
              </div>
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
          <motion.div className="fixed inset-0 z-[400] flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            <AnimatePresence mode="wait">
              {introStep < 3 ? (
                /* ── Welcome phase ── */
                <motion.div key="welcome" className="relative z-[2] text-center px-6 py-8 flex flex-col gap-4"
                  style={{ maxWidth: "min(90vw,580px)" }}
                  exit={{ opacity: 0, y: -20, transition: { duration: 0.5 } }}>
                  <motion.h1 className="font-black leading-tight"
                    style={{ fontSize: "clamp(28px,5vw,56px)", color: "#1e40af", textShadow: "0 2px 12px rgba(255,255,255,0.9), 0 0 30px rgba(255,255,255,0.6)" }}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                    ברוכים הבאים למשחק דייג המתנות 🎣
                  </motion.h1>

                  <AnimatePresence>
                    {introStep >= 1 && (
                      <motion.p className="font-bold leading-relaxed"
                        style={{ fontSize: "clamp(17px,2.8vw,34px)", color: "#1d4ed8", textShadow: "0 2px 10px rgba(255,255,255,0.9), 0 0 24px rgba(255,255,255,0.5)" }}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        תעלו על סירת הדייגים ותתחילו לדוג... מתנות!<br />
                        המתנות שתצליחו לדוג יארזו וישלחו אליכם<br />
                        ישירות לתיבת המייל
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {introStep >= 2 && (
                      <motion.p className="font-black"
                        style={{ fontSize: "clamp(20px,3.5vw,42px)", color: "#1e3a8a", textShadow: "0 2px 12px rgba(255,255,255,0.9), 0 0 30px rgba(255,255,255,0.6)" }}
                        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        בואו נראה כמה אתם דיגים מומחים 😄
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                /* ── Instructions phase ── */
                <motion.div key="instructions" className="relative z-[2] text-center px-6 py-8 flex flex-col gap-3"
                  style={{ maxWidth: "min(90vw,520px)" }}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                  {[
                    { emoji: "⛵", text: "עומדים על הסירה", highlight: true },
                    { emoji: "🖱️", text: "גוררים עם העכבר לכיוון המתנה" },
                    { emoji: "👆", text: "לוחצים על הסירה כשהיא מעל המתנה" },
                    { emoji: "🎁", text: "הצלחתם? זכיתם במתנה!" },
                  ].map((step, i) => (
                    <AnimatePresence key={i}>
                      {introStep >= 4 + i && (
                        <motion.div className="flex items-center gap-3 px-2 py-1 text-right"
                          style={{ background: "transparent" }}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                          <span className="text-2xl flex-shrink-0">{step.emoji}</span>
                          <span className={`font-${step.highlight ? "black" : "bold"} leading-snug`}
                            style={{ fontSize: "clamp(18px,3vw,36px)", color: step.highlight ? "#1e3a8a" : "#1d4ed8", textShadow: "0 2px 8px rgba(255,255,255,0.9)" }}>
                            {step.text}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  ))}

                  <AnimatePresence>
                    {introStep >= 8 && (
                      <motion.button onClick={() => setPhase("email")}
                        className="mt-2 font-black rounded-full border-0 self-center"
                        style={{ background: "linear-gradient(135deg,#ffe566,#ff8c00)", color: "#1a0800", padding: "clamp(12px,2vw,20px) clamp(40px,7vw,90px)", fontSize: "clamp(18px,3vw,32px)", boxShadow: "0 6px 28px rgba(255,150,0,.6)" }}
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 18 }}
                        whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}>
                        שנתחיל!
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
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
              {currentStore.logo ? (
                <motion.img src={currentStore.logo} alt={currentStore.name}
                  style={{ width: 90, height: 90, objectFit: "contain", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))" }}
                  className="mx-auto block mb-2 rounded-xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }} />
              ) : (
                <motion.div className="mx-auto mb-2 rounded-xl flex items-center justify-center text-white/40 text-xs border border-white/20"
                  style={{ width: 90, height: 90, background: "rgba(255,255,255,0.06)" }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.3 }}>
                  חסר לוגו
                </motion.div>
              )}
              <div className="text-white/55 uppercase tracking-widest mb-1" style={{ fontSize: "clamp(11px,1.8vw,18px)", letterSpacing: 3 }}>תפסת מתנה מ</div>
              <div className="font-black leading-tight mb-4" style={{ fontSize: "clamp(32px,5.8vw,56px)", background: "linear-gradient(135deg,#FFD700,#FFA500,#FFD700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 20px rgba(255,200,0,.6))" }}>
                {currentStore.name}
              </div>
              <div className="h-0.5 w-[140px] mx-auto mb-4" style={{ background: "linear-gradient(90deg,transparent,rgba(255,215,0,.8),transparent)" }} />
              <div className="text-white/50 mb-2 uppercase tracking-widest" style={{ fontSize: "clamp(12px,2vw,18px)" }}>המתנה שלך</div>
              <div className="text-white font-bold" style={{ fontSize: "clamp(20px,3.5vw,38px)" }}>
                {currentStore.gift === MISSING_GIFT ? <span className="text-yellow-400/60 text-lg">חסר תיאור מתנה</span> : currentStore.gift}
              </div>
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

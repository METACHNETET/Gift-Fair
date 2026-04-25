import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimationControls } from "motion/react";
import { Store, LogIn, LogOut, ChevronLeft, Share2, Users, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "./lib/AuthContext";
import { auth, db } from "./lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { collection, addDoc, query, onSnapshot, serverTimestamp, where } from "firebase/firestore";
import { Shop, Lead } from "./types";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const SHOP_SPACING = 2100;
const ROAD_START = 240;
const CAR_RIGHT_OFFSET = 28;
const CAR_VISUAL_WIDTH = 540;
const HOUSE_SCALE = 5;
const TRAVEL_SPEED_PX_PER_SEC = 240;
const WORLD_MOVE_DURATION_SEC = SHOP_SPACING / TRAVEL_SPEED_PX_PER_SEC;
const WORLD_MOVE_INTERVAL_MS = Math.round(WORLD_MOVE_DURATION_SEC * 1000);
const ROAD_DASH_SHIFT_PX = 80;
const ROAD_DASH_DURATION_SEC = ROAD_DASH_SHIFT_PX / TRAVEL_SPEED_PX_PER_SEC;

// ─── Cloud ────────────────────────────────────────────────────────────────────
function Cloud({ xPct, yPct, w, dur }: { xPct: number; yPct: number; w: number; dur: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      animate={{ x: [0, 50, 0] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="relative" style={{ width: w, height: w * 0.45 }}>
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white rounded-full opacity-90" />
        <div className="absolute bottom-1/4 left-1/4 w-1/2 h-full bg-white rounded-full opacity-90" />
        <div className="absolute bottom-1/4 left-[15%] w-[65%] h-3/4 bg-white rounded-full opacity-90" />
      </div>
    </motion.div>
  );
}

const HOUSE_IMAGES = ["/houses/house-1.png", "/houses/house-2.png", "/houses/house-3.png"];

const DEMO_SHOPS: Shop[] = [
  {
    id: "demo-shop-1",
    fairId: "main_fair",
    businessId: "biz-1",
    businessName: "Bloom Beauty",
    giftName: "ערכת גלואו מיני",
    giftDescription: "ערכת התנסות יוקרתית לעור זוהר עם סרום ומסכת לילה.",
    giftImageUrl: "https://picsum.photos/seed/giftfair1/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-2",
    fairId: "main_fair",
    businessId: "biz-2",
    businessName: "Luna Jewelry",
    giftName: "צמיד כוכב מתנה",
    giftDescription: "צמיד עדין מצופה זהב באריזת מתנה נוצצת.",
    giftImageUrl: "https://picsum.photos/seed/giftfair2/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-3",
    fairId: "main_fair",
    businessId: "biz-3",
    businessName: "Maya Cakes",
    giftName: "קופסת מקרונים",
    giftDescription: "מארז טעימות פרימיום באריזה צבעונית.",
    giftImageUrl: "https://picsum.photos/seed/giftfair3/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-4",
    fairId: "main_fair",
    businessId: "biz-4",
    businessName: "Urban Style",
    giftName: "אקססורי אופנה",
    giftDescription: "פריט סטייל לבחירה מתוך קולקציית האביב החדשה.",
    giftImageUrl: "https://picsum.photos/seed/giftfair4/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-5",
    fairId: "main_fair",
    businessId: "biz-5",
    businessName: "Green Ritual",
    giftName: "נר ארומתרפי",
    giftDescription: "נר טבעי בריח וניל-לבנדר לשדרוג האווירה בבית.",
    giftImageUrl: "https://picsum.photos/seed/giftfair5/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-6",
    fairId: "main_fair",
    businessId: "biz-6",
    businessName: "Silk Hair Lab",
    giftName: "מסכת שיער פרו",
    giftDescription: "מסכת שיקום עמוקה לשיער רך ומבריק במיוחד.",
    giftImageUrl: "https://picsum.photos/seed/giftfair6/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-7",
    fairId: "main_fair",
    businessId: "biz-7",
    businessName: "Aura Home",
    giftName: "סט תחתיות מעוצב",
    giftDescription: "סט דקורטיבי לשולחן אירוח במראה מודרני.",
    giftImageUrl: "https://picsum.photos/seed/giftfair7/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-8",
    fairId: "main_fair",
    businessId: "biz-8",
    businessName: "Pure Scent",
    giftName: "בושם כיס",
    giftDescription: "ניחוח פרשי במהדורה מוקטנת לנשיאה בתיק.",
    giftImageUrl: "https://picsum.photos/seed/giftfair8/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-9",
    fairId: "main_fair",
    businessId: "biz-9",
    businessName: "Noya Studio",
    giftName: "שובר סדנת יצירה",
    giftDescription: "שובר אישי לסדנת DIY חווייתית.",
    giftImageUrl: "https://picsum.photos/seed/giftfair9/600/360",
    leadsCount: 0,
  },
  {
    id: "demo-shop-10",
    fairId: "main_fair",
    businessId: "biz-10",
    businessName: "Glow Nails",
    giftName: "טיפוח ציפורניים",
    giftDescription: "ערכת פינוק ביתית לציפורניים מטופחות וזוהרות.",
    giftImageUrl: "https://picsum.photos/seed/giftfair10/600/360",
    leadsCount: 0,
  },
];

// ─── ShopBuilding ─────────────────────────────────────────────────────────────
function ShopBuilding({
  shop, idx, isActive, isCollected,
}: {
  shop: Shop; idx: number; isActive: boolean; isCollected: boolean;
}) {
  const houseImage = HOUSE_IMAGES[idx % HOUSE_IMAGES.length];

  return (
    <div className="flex flex-col items-center select-none" style={{ width: 190 }}>
      {/* floating gift / collected badge */}
      <div className="h-16 flex items-end justify-center pb-2">
        {isActive && !isCollected && (
          <motion.div
            animate={{ y: [-5, 5, -5], rotate: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            className="text-6xl"
            style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,.35))" }}
            title="עצרי ליד הבית כדי לאסוף את המתנה"
          >🎁</motion.div>
        )}
        {isCollected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shadow-md text-lg"
          >✓</motion.div>
        )}
      </div>

      {/* house image */}
      <div className="relative w-full h-[190px]">
        <img
          src={houseImage}
          alt={`בית ${idx + 1}`}
          className="w-full h-full object-contain"
          style={{ transform: `scale(${HOUSE_SCALE})`, transformOrigin: "bottom center" }}
          draggable={false}
        />
        {isActive && !isCollected && (
          <motion.div
            className="absolute inset-5 rounded-2xl"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)" }}
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ repeat: Infinity, duration: 0.9 }}
          />
        )}
      </div>

    </div>
  );
}

// ─── GiftClaimDialog ──────────────────────────────────────────────────────────
function GiftClaimDialog({ shop, onClose, onClaimed }: {
  shop: Shop; onClose: () => void; onClaimed: (id: string) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addDoc(collection(db, "fairs", "main_fair", "shops", shop.id, "leads"), {
        ...form, shopId: shop.id, claimedAt: serverTimestamp(),
      });
      toast.success("המתנה בדרך אלייך! 🎉", { description: "פרטי המתנה נשלחו לאימייל שלך." });
      onClaimed(shop.id);
    } catch {
      toast.error("שגיאה ברישום", { description: "אנא נסי שנית מאוחר יותר." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl"
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          dir="rtl"
        >
          <div className="relative h-40 rounded-2xl overflow-hidden mb-5 bg-stone-100">
            <img
              src={shop.giftImageUrl || `https://picsum.photos/seed/${shop.id}/400/200`}
              alt={shop.giftName} className="w-full h-full object-cover" referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 right-3 bg-amber-400 rounded-full px-3 py-1 text-xs font-bold text-stone-800 shadow">
              🎁 מתנה חינמית
            </div>
          </div>
          <h2 className="text-3xl font-display mb-1">{shop.giftName}</h2>
          <p className="text-brand-accent font-semibold text-sm mb-3">{shop.businessName}</p>
          <p className="text-stone-600 leading-relaxed mb-6 text-sm">{shop.giftDescription}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold block mb-1">שם מלא</label>
              <Input required placeholder="הכניסי את שמך" className="rounded-xl"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">אימייל</label>
              <Input required type="email" placeholder="example@email.com" className="rounded-xl"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <Button type="submit" disabled={busy}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 rounded-xl py-6 text-lg font-bold">
              {busy ? "שולח..." : "שלחי לי את המתנה! 🎁"}
            </Button>
          </form>
          <p className="text-[10px] text-center text-stone-400 mt-3 leading-tight">
            בלחיצה על שליחה את מאשרת הרשמה לרשימת הדיוור של {shop.businessName || "בעלת העסק"}.
          </p>
          <button onClick={onClose} className="block mx-auto mt-3 text-stone-400 text-sm hover:text-stone-600">
            אולי מאוחר יותר
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── FinaleDialog ─────────────────────────────────────────────────────────────
function FinaleDialog({ collectedCount, shopIds, onClose }: {
  collectedCount: number; shopIds: string[]; onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const CONFETTI = ["🎁","🎀","🌟","✨","🎊","🎉","💝","🌸","🏆","🦋"];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addDoc(collection(db, "fairs", "main_fair", "finale_leads"), {
        email,
        shopIds,
        claimedAt: serverTimestamp(),
      });
      setSent(true);
    } catch {
      toast.error("שגיאה קטנה", { description: "אנא נסי שנית." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "radial-gradient(ellipse at 50% 60%, #7c3aed88 0%, #1e1b4b99 60%, #000000cc 100%)" }}
    >
      {/* floating confetti */}
      {CONFETTI.map((emoji, i) => (
        <motion.span
          key={i}
          className="fixed text-3xl pointer-events-none select-none"
          style={{ left: `${8 + i * 9}%`, top: "-6%" }}
          animate={{ y: ["0vh", "110vh"], rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)], opacity: [1, 1, 0] }}
          transition={{ duration: 3.5 + i * 0.3, repeat: Infinity, delay: i * 0.25, ease: "linear" }}
        >
          {emoji}
        </motion.span>
      ))}

      <motion.div
        className="relative w-full max-w-lg mx-4 rounded-[2rem] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,.7)]"
        initial={{ scale: 0.7, y: 60, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 18, stiffness: 260 }}
        dir="rtl"
      >
        {/* gradient header */}
        <div className="relative px-8 pt-10 pb-6 text-center"
          style={{ background: "linear-gradient(135deg, #7c3aed, #db2777, #f59e0b)" }}>
          <motion.div
            className="text-7xl mb-3"
            animate={{ scale: [1, 1.18, 1], rotate: [-6, 6, -6] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          >🏆</motion.div>

          <motion.h1
            className="text-3xl font-extrabold text-white leading-tight mb-1"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            אואוו כמה מתנות בחרת!
          </motion.h1>
          <motion.p
            className="text-white/90 text-lg font-semibold"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            {collectedCount} מתנות מחכות לך 🎁
          </motion.p>
        </div>

        {/* body */}
        <div className="bg-white px-8 py-7">
          {!sent ? (
            <>
              <p className="text-stone-600 text-center leading-relaxed mb-1 text-base font-medium">
                עבדת קשה
              </p>
              <p className="text-stone-500 text-center text-sm leading-relaxed mb-1">
                עכשיו שבי, תנוחי
              </p>
              <p className="text-stone-500 text-center text-sm leading-relaxed mb-6">
                אנחנו כבר נדאג למשלוח 😊
              </p>

              <p className="text-center font-bold text-stone-800 text-base mb-4">
                לאיפה לשלוח לך את הכבודה? 📦
              </p>

              <form onSubmit={handleSend} className="space-y-4">
                <Input
                  required
                  type="email"
                  placeholder="הכניסי את האימייל שלך"
                  className="rounded-xl text-center text-base py-6 border-2 border-violet-200 focus:border-violet-500"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  dir="ltr"
                />
                {/* consent checkbox */}
                <label className="flex items-start gap-3 cursor-pointer group select-none" onClick={() => setAgreed(p => !p)}>
                  <div className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    agreed ? "bg-violet-600 border-violet-600" : "border-stone-300 group-hover:border-violet-400"
                  }`}>
                    {agreed && (
                      <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}
                        viewBox="0 0 10 8" fill="none" className="w-3 h-3">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </motion.svg>
                    )}
                  </div>
                  <span className="text-sm text-stone-600 leading-snug pt-0.5">
                    ברור שאני מאשרת דיוור — מהעסקים שהזמנתי מהם מתנות ומדבורי זילברשטיין מנהלת יריד המתנות.
                  </span>
                </label>

                <motion.button
                  type="submit"
                  disabled={busy || !agreed}
                  className="w-full py-4 rounded-xl font-extrabold text-white text-lg shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(90deg, #7c3aed, #db2777)" }}
                  whileHover={agreed ? { scale: 1.03 } : {}}
                  whileTap={agreed ? { scale: 0.97 } : {}}
                >
                  {busy ? "שולחת..." : "שלחו לי את המתנות! 🚀"}
                </motion.button>
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
                פרטי כל המתנות נשלחו לאימייל שלך.<br/>
                תהני מהמתנות! ✨
              </p>
              <button
                onClick={onClose}
                className="text-violet-500 font-semibold hover:underline text-sm"
              >
                חזרה ליריד
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── FairLanding — Road Game ─────────────────────────────────────────────────
function FairLanding({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [cardOpen, setCardOpen] = useState(false);
  const [showFinale, setShowFinale] = useState(false);
  const [isDriving, setIsDriving] = useState(false);
  const [stopFx, setStopFx] = useState<{ shopId: string; nonce: number } | null>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const lastControlAtRef = useRef(0);
  // Accumulated driving ms on the current shop leg (resets on each shop advance)
  const legAccumulatedMsRef = useRef(0);
  // Wall-clock time when the current drive session started (null = not driving)
  const legDriveStartRef = useRef<number | null>(null);
  const worldControls = useAnimationControls();
  const dashControls = useAnimationControls();
  const wasDrivingRef = useRef(false);
  const wasDashDrivingRef = useRef(false);
  const collectedRef = useRef(collected);
  const isDrivingRef = useRef(isDriving);
  const shopsRef = useRef(shops);
  const currentIdxRef = useRef(currentIdx);

  useEffect(() => { collectedRef.current = collected; }, [collected]);
  useEffect(() => { isDrivingRef.current = isDriving; }, [isDriving]);
  useEffect(() => { shopsRef.current = shops; }, [shops]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  const collectGiftOnStop = (shop: Shop) => {
    if (collectedRef.current.has(shop.id)) return;

    setCollected(prev => {
      const next = new Set(prev);
      next.add(shop.id);
      return next;
    });
    setCardOpen(true);
    setStopFx({ shopId: shop.id, nonce: Date.now() });
    toast.success("המתנה נוספה לסל!", {
      description: `${shop.businessName} • ${shop.giftName}`,
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([40, 20, 80]);
    }
  };

  const setDriveState = (nextState: boolean) => {
    const now = Date.now();
    if (now - lastControlAtRef.current < 250) return;
    lastControlAtRef.current = now;

    if (!nextState && isDrivingRef.current) {
      // Total ms driven on this leg = accumulated + time since this drive session started
      const totalDriven = legAccumulatedMsRef.current +
        (legDriveStartRef.current !== null ? Date.now() - legDriveStartRef.current : 0);
      // Allow collection after 50% of the leg has been driven continuously
      if (totalDriven >= WORLD_MOVE_DURATION_SEC * 500) {
        const shop = shopsRef.current[currentIdxRef.current - 1];
        if (shop) collectGiftOnStop(shop);
      }
    }

    setIsDriving(prev => {
      if (prev === nextState) return prev;
      return nextState;
    });
  };

  const shopXOffset = (idx: number) => ((idx % 3) - 1) * 26;

  // ── world offset — shops approach from LEFT, move rightward past car ──────
  const worldX = (() => {
    const vpW = gameRef.current?.clientWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1200);
    const carX = vpW - CAR_RIGHT_OFFSET - CAR_VISUAL_WIDTH / 2;
    const totalW = ROAD_START + (shops.length + 2) * SHOP_SPACING;
    if (currentIdx < 0) return carX - totalW + 60;            // show start sign at car
    return carX - totalW + ROAD_START + currentIdx * SHOP_SPACING + shopXOffset(currentIdx);
  })();

  useEffect(() => {
    const q = query(collection(db, "fairs", "main_fair", "shops"));
    return onSnapshot(q, snap => {
      const liveShops = snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
      setShops(liveShops.length > 0 ? liveShops : DEMO_SHOPS);
    });
  }, []);

  // Auto-drive — advances one shop per WORLD_MOVE_INTERVAL_MS of ACTUAL drive time.
  // Pausing/resuming does not reset the countdown for the current leg.
  useEffect(() => {
    if (!isDriving || shops.length === 0 || showFinale) return;

    legDriveStartRef.current = Date.now();
    let active = true;
    let nextTid: number;

    const advance = () => {
      if (!active) return;
      // Reset leg accumulator and mark new leg start
      legAccumulatedMsRef.current = 0;
      legDriveStartRef.current = Date.now();
      setCurrentIdx(prev => {
        // Allow currentIdx to reach shops.length so the last shop (N-1) can arrive
        if (prev >= shops.length) {
          setIsDriving(false);
          setTimeout(() => setShowFinale(true), 1200);
          active = false;
          return prev;
        }
        setCardOpen(true);
        return prev + 1;
      });
      if (active) {
        nextTid = window.setTimeout(advance, WORLD_MOVE_INTERVAL_MS);
      }
    };

    // Resume: wait only the remaining portion of this leg
    const remaining = Math.max(50, WORLD_MOVE_INTERVAL_MS - legAccumulatedMsRef.current);
    nextTid = window.setTimeout(advance, remaining);

    return () => {
      active = false;
      window.clearTimeout(nextTid);
      // Accumulate drive time when stopping so resume picks up where we left off
      if (legDriveStartRef.current !== null) {
        legAccumulatedMsRef.current += Date.now() - legDriveStartRef.current;
        legDriveStartRef.current = null;
      }
    };
  }, [isDriving, shops.length, showFinale]);


  useEffect(() => {
    if (!stopFx) return;
    const id = window.setTimeout(() => setStopFx(null), 1200);
    return () => window.clearTimeout(id);
  }, [stopFx]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
      if (isTyping) return;

      const key = event.key.toLowerCase();
      if (key === "s") setDriveState(true);
      if (key === "x") setDriveState(false);
      if (event.key === " ") {
        event.preventDefault();
        setDriveState(!isDriving);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDriving]);

  useEffect(() => {
    if (isDriving) {
      worldControls.start({
        x: worldX,
        transition: { duration: WORLD_MOVE_DURATION_SEC, ease: "linear" },
      });
    } else if (wasDrivingRef.current) {
      worldControls.stop();
    } else {
      worldControls.set({ x: worldX });
    }

    wasDrivingRef.current = isDriving;
  }, [isDriving, worldX, worldControls]);

  useEffect(() => {
    if (isDriving) {
      dashControls.start({
        backgroundPositionX: [0, ROAD_DASH_SHIFT_PX],
        transition: { repeat: Infinity, duration: ROAD_DASH_DURATION_SEC, ease: "linear" },
      });
    } else if (wasDashDrivingRef.current) {
      dashControls.stop();
    } else {
      dashControls.set({ backgroundPositionX: 0 });
    }

    wasDashDrivingRef.current = isDriving;
  }, [isDriving, dashControls]);

  const totalWorldW = ROAD_START + (shops.length + 2) * SHOP_SPACING;
  // currentIdx=N means shop N-1 has arrived at the car
  const currentShop = currentIdx > 0 && currentIdx <= shops.length ? shops[currentIdx - 1] : null;

  return (
    <div className="min-h-screen flex flex-col" dir="ltr" style={{ userSelect: "none" }}>

      {/* ── Floating header ────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center px-5 py-3 pointer-events-none">
        <motion.div className="flex items-center gap-3 pointer-events-auto"
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-2xl md:text-3xl font-display text-white drop-shadow-lg" dir="rtl">
            🎁 מפליקצית fairgifts
          </span>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur" dir="rtl">
            {shops.length} מתנות
          </Badge>
        </motion.div>
        <Button variant="outline" size="sm" onClick={onOpenDashboard}
          className="pointer-events-auto border-white/70 text-white hover:bg-white/20 backdrop-blur rounded-full" dir="rtl">
          אני בעלת עסק
        </Button>
      </div>

      {/* ── Game canvas ────────────────────────────────────────────────────── */}
      <div ref={gameRef} className="relative flex-1 overflow-hidden" style={{ minHeight: 540 }}>

        {/* sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-600 via-sky-300 to-blue-100" />

        {/* sun */}
        <div className="absolute top-10 right-10 w-16 h-16 rounded-full bg-yellow-300"
          style={{ boxShadow: "0 0 60px 24px rgba(253,224,71,.55)" }} />

        {/* clouds */}
        <Cloud xPct={4}  yPct={12} w={130} dur={32} />
        <Cloud xPct={28} yPct={7}  w={170} dur={44} />
        <Cloud xPct={58} yPct={14} w={110} dur={25} />
        <Cloud xPct={78} yPct={6}  w={150} dur={38} />

        {/* ── Moving world ───────────────────────────────────────────────── */}
        <motion.div
          className="absolute bottom-0"
          animate={worldControls}
          style={{ width: totalWorldW, height: 320, zIndex: 6 }}
        >
          {/* start sign — rightmost in world (first to approach from left) */}
          <div className="absolute flex flex-col items-center" style={{ left: totalWorldW - 90, bottom: 138 }}>
            <div className="bg-green-500 text-white font-bold text-sm px-3 py-1 rounded shadow border border-green-700">
              ▶ START
            </div>
            <div className="w-2 bg-stone-400 mt-0" style={{ height: 40 }} />
          </div>

          {/* finish sign — leftmost in world */}
          <div className="absolute flex flex-col items-center" style={{ left: 60, bottom: 138 }}>
            <div className="bg-red-600 text-white font-bold text-sm px-3 py-1 rounded shadow border border-red-800">
              🏁 FINISH
            </div>
            <div className="w-2 bg-stone-400" style={{ height: 40 }} />
          </div>

          {/* trees along the road */}
          {Array.from({ length: Math.ceil(totalWorldW / 160) }).map((_, i) => (
            <div key={i} className="absolute flex flex-col items-center pointer-events-none"
              style={{ left: i * 160 + 30, bottom: 138 }}>
              <div className="w-0 h-0" style={{
                borderLeft: "12px solid transparent", borderRight: "12px solid transparent",
                borderBottom: "22px solid #16a34a",
              }} />
              <div className="bg-amber-900 rounded-sm" style={{ width: 6, height: 14 }} />
            </div>
          ))}

          {/* shops — laid right-to-left so shop 0 is rightmost (first to arrive) */}
          {shops.map((shop, i) => (
            <div key={shop.id} className="absolute flex flex-col items-center"
              style={{ left: totalWorldW - ROAD_START - (i + 1) * SHOP_SPACING + shopXOffset(i) - 95, bottom: 96 }}>
              <ShopBuilding
                shop={shop} idx={i}
                isActive={i === currentIdx - 1}
                isCollected={collected.has(shop.id)}
              />
            </div>
          ))}
        </motion.div>

        {/* ── Full-width road (fixed, behind everything scrollable) ─────── */}
        {/* green ground strip */}
        <div className="absolute left-0 right-0 bg-gradient-to-b from-green-500 to-green-700 pointer-events-none"
          style={{ bottom: 120, height: 160, zIndex: 5 }} />

        {/* sidewalk */}
        <div className="absolute left-0 right-0 bg-stone-300 border-t border-stone-400 pointer-events-none"
          style={{ bottom: 120, height: 18, zIndex: 5 }} />

        {/* road */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-700 pointer-events-none" style={{ height: 120, zIndex: 5 }}>
          {/* edge lines */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gray-500" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-500" />
            {/* centre dashes */}
            <motion.div
              className="absolute inset-x-0 rounded"
              style={{
                top: "50%",
                marginTop: -3,
                height: 6,
                backgroundImage:
                  "repeating-linear-gradient(to right, #facc15 0 44px, transparent 44px 80px)",
              }}
              animate={dashControls}
            />
        </div>

        {/* ── Car (fixed in viewport) ───────────────────────────────────── */}
        <div className="absolute z-10"
          style={{ right: CAR_RIGHT_OFFSET, bottom: 4 }}>
          <img
            src="/houses/car.png"
            alt="רכב מתנות"
            className="w-[260px] md:w-[320px] h-auto select-none pointer-events-none"
            style={{
              filter: "drop-shadow(2px 6px 10px rgba(0,0,0,.4))",
              transform: "scale(4)",
              transformOrigin: "bottom right",
            }}
            draggable={false}
          />
        </div>

        {/* ── Shop popup card ───────────────────────────────────────────── */}
        <AnimatePresence>
          {currentShop && cardOpen && (
            <motion.div
              className="absolute z-20 bg-white/96 backdrop-blur-sm rounded-2xl shadow-2xl p-4 w-[260px]"
              style={{ top: 72, right: CAR_RIGHT_OFFSET + 120 }}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={stopFx?.shopId === currentShop.id
                ? { opacity: 1, scale: [1, 1.08, 1], y: [0, -4, 0], rotate: [0, -0.8, 0.8, 0] }
                : { opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 8 }}
              transition={{ duration: 0.55 }}
              dir="rtl"
            >
              <button onClick={() => setCardOpen(false)}
                className="absolute top-2 left-3 text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
              <div className="text-center">
                <div className="text-3xl mb-1">🎁</div>
                <p className="text-xs text-brand-accent font-bold mb-1">{currentShop.businessName}</p>
                <h3 className="font-display text-lg leading-tight mb-2">{currentShop.giftName}</h3>
                <p className="text-xs text-stone-500 mb-3 line-clamp-2 leading-relaxed">{currentShop.giftDescription}</p>
                {collected.has(currentShop.id)
                  ? <div className="bg-green-100 text-green-700 rounded-full px-4 py-2 text-sm font-bold">✓ נאספה!</div>
                  : <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                      עצרי ליד הבית כדי להוסיף את המתנה לסל ✨
                    </div>
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stopFx && (
            <motion.div
              key={`${stopFx.shopId}-${stopFx.nonce}`}
              className="absolute inset-0 z-25 pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 220,
                  height: 220,
                  right: CAR_RIGHT_OFFSET + 150,
                  bottom: 80,
                  background: "radial-gradient(circle, rgba(250,204,21,0.65) 0%, rgba(250,204,21,0.15) 45%, rgba(250,204,21,0) 72%)",
                }}
                initial={{ scale: 0.2, opacity: 0.4 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
              {Array.from({ length: 14 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute text-2xl"
                  style={{ right: CAR_RIGHT_OFFSET + 220, bottom: 140 }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.8 }}
                  animate={{
                    x: Math.cos((i / 14) * Math.PI * 2) * 150,
                    y: Math.sin((i / 14) * Math.PI * 2) * 70 - 50,
                    opacity: 0,
                    scale: 1.25,
                    rotate: (i % 2 === 0 ? 1 : -1) * 160,
                  }}
                  transition={{ duration: 0.95, ease: "easeOut" }}
                >
                  {i % 3 === 0 ? "🎁" : i % 3 === 1 ? "✨" : "💛"}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {shops.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="bg-white/80 backdrop-blur rounded-2xl p-8 text-center shadow-xl max-w-xs" dir="rtl">
              <div className="text-5xl mb-4">🏗️</div>
              <p className="font-display text-xl mb-2">היריד עומד להיפתח</p>
              <p className="text-stone-500 text-sm">בעלות עסקים מוזמנות להצטרף</p>
            </motion.div>
          </div>
        )}

        {/* ── Drive controls ─────────────────────────────────────────────── */}
        <div className="absolute z-30 left-1/2 -translate-x-1/2" style={{ bottom: 136 }} dir="rtl">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2 shadow-xl border border-white/70">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setDriveState(true)}
                aria-pressed={isDriving}
                className={`rounded-xl px-4 min-h-11 transition-all ${
                  isDriving
                    ? "bg-emerald-600 hover:bg-emerald-600 text-white shadow-lg"
                    : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                }`}
              >
                <Play className="w-4 h-4 ml-1" /> סע
              </Button>

              <Button
                type="button"
                onClick={() => setDriveState(false)}
                aria-pressed={!isDriving}
                className={`rounded-xl px-4 min-h-11 transition-all ${
                  !isDriving
                    ? "bg-rose-600 hover:bg-rose-600 text-white shadow-lg"
                    : "bg-rose-100 hover:bg-rose-200 text-rose-800"
                }`}
              >
                <Pause className="w-4 h-4 ml-1" /> עצור
              </Button>

              <div className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold min-h-11 flex items-center">
                {isDriving ? "נוסע" : "עצור"}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 px-1 text-center">קיצורים: S לסע, X לעצור, Space להחלפה</p>
          </div>
        </div>
      </div>

      {/* ── HUD — progress bar ─────────────────────────────────────────────── */}
      <div className="bg-brand-primary text-white px-6 py-3 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">{collected.size} / {shops.length} מתנות נאספו</span>
          {collected.size === shops.length && shops.length > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-yellow-400 font-bold text-sm">
              🎉 כל המתנות נאספו!
            </motion.span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {shops.map((shop, i) => (
            <motion.div key={shop.id}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                collected.has(shop.id) ? "bg-yellow-400 border-yellow-300"
                : i === currentIdx ? "bg-white/50 border-white"
                : "bg-white/20 border-white/30"}`}
              animate={i === currentIdx ? { scale: [1, 1.3, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              title={shop.giftName}
            />
          ))}
        </div>
      </div>

      {/* ── Finale popup ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFinale && (
          <FinaleDialog
            collectedCount={collected.size}
            shopIds={Array.from(collected)}
            onClose={() => { setShowFinale(false); setCurrentIdx(0); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Business Dashboard Component ────────────────────────────────────────────
function BusinessDashboard({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Fetch user's shop in this fair
    const q = query(collection(db, "fairs", "main_fair", "shops"), where("businessId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const foundShop = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Shop;
        setShop(foundShop);

        // Fetch leads for this shop
        const leadsQ = query(collection(db, "fairs", "main_fair", "shops", foundShop.id, "leads"));
        onSnapshot(leadsQ, (leadsSnapshot) => {
          setLeads(leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
        });
      } else {
        setShop(null);
      }
    });

    return unsubscribe;
  }, [user]);

  const handleCreateShop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      fairId: "main_fair",
      businessId: user.uid,
      businessName: user.displayName || "בעלת עסק",
      giftName: formData.get("giftName") as string,
      giftDescription: formData.get("giftDescription") as string,
      giftImageUrl: formData.get("giftImageUrl") as string,
      leadsCount: 0,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "fairs", "main_fair", "shops"), data);
      toast.success("החנות נוצרה בהצלחה!");
      setIsEditing(false);
    } catch (err) {
      toast.error("שגיאה ביצירת החנות");
    }
  };

  const handleLogin = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <Card className="w-full max-w-md p-8 text-center rounded-3xl shadow-xl">
          <Store className="w-16 h-16 mx-auto text-brand-primary mb-6" />
          <h2 className="text-3xl font-display mb-4">ניהול החנות שלי</h2>
          <p className="text-stone-600 mb-8">כדי להצטרף ליריד ולנהל את הלידים שלך, עלייך להתחבר למערכת.</p>
          <Button onClick={handleLogin} className="w-full py-6 rounded-2xl bg-brand-primary text-lg">
            <LogIn className="ml-2 w-5 h-5" />
            התחברי עם גוגל
          </Button>
          <Button variant="ghost" onClick={onBack} className="mt-4 text-stone-400">חזרה ליריד</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}><ChevronLeft /></Button>
          <h1 className="text-2xl font-display">אזור אישי: {user.displayName}</h1>
        </div>
        <Button variant="outline" onClick={() => signOut(auth)} size="sm">יציאה</Button>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Tabs defaultValue="overview">
          <TabsList className="bg-stone-200 p-1 mb-8">
            <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
            <TabsTrigger value="leads">לידים ({leads.length})</TabsTrigger>
            <TabsTrigger value="settings">הגדרות מתנה</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 bg-brand-primary text-white">
                <p className="text-sm opacity-80 mb-2">סה"כ לידים</p>
                <p className="text-5xl font-display">{leads.length}</p>
              </Card>
              <Card className="p-6 col-span-2">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Share2 className="w-4 h-4 ml-2" />
                  קישור לשיתוף היריד
                </h3>
                <div className="bg-stone-100 p-3 rounded-xl flex items-center justify-between">
                  <code className="text-sm truncate mr-2">{window.location.origin}?ref={user.uid}</code>
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?ref=${user.uid}`);
                    toast.success("הקישור הועתק!");
                  }}>העתקה</Button>
                </div>
                <p className="text-xs text-stone-400 mt-4">
                  טיפ: ככל שתשתפי את היריד עם יותר אנשים, החשיפה של כל המשתתפות (וגם שלך) תגדל!
                </p>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-display">הלידים שנאספו</h3>
                <Button size="sm" onClick={() => {
                  const csv = "Name,Email,Date\n" + leads.map(l => `${l.name},${l.email},${new Date(l.claimedAt?.seconds * 1000).toLocaleDateString()}`).join("\n");
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'leads.csv';
                  a.click();
                }}>ייצוא ל-CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-stone-50 text-stone-500 text-sm">
                    <tr>
                      <th className="p-4 font-medium">שם</th>
                      <th className="p-4 font-medium">אימייל</th>
                      <th className="p-4 font-medium">תאריך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} className="border-t">
                        <td className="p-4 font-semibold">{lead.name}</td>
                        <td className="p-4 text-stone-600">{lead.email}</td>
                        <td className="p-4 text-stone-400 italic text-sm">
                          {lead.claimedAt ? new Date(lead.claimedAt.seconds * 1000).toLocaleDateString('he-IL') : '---'}
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-12 text-center text-stone-400">עדיין אין לידים. זמן להתחיל לשתף!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="p-8">
              {!shop ? (
                <div className="text-center py-10">
                  <h3 className="text-2xl font-display mb-4">עדיין לא הצטרפת ליריד?</h3>
                  <p className="text-stone-500 mb-8">צרי את המתנה הדיגיטלית שלך עכשיו וקבלי חשיפה למאות לקוחות פוטנציאלים.</p>
                  <form onSubmit={handleCreateShop} className="max-w-xl mx-auto space-y-6 text-right">
                    <div className="space-y-2">
                      <label className="font-semibold">שם המתנה (לדוגמה: מדריך חינמי לעיצוב הבית)</label>
                      <Input name="giftName" required placeholder="שם קליט ומושך" className="py-6 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-semibold">תיאור קצר (מה הם יקבלו?)</label>
                      <textarea 
                        name="giftDescription" 
                        required 
                        className="w-full min-h-[120px] p-4 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder="פרטי מה הערך של המתנה שלך..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-semibold">קישור לתמונה (אופציונלי)</label>
                      <Input name="giftImageUrl" placeholder="https://..." className="py-6 rounded-xl" />
                    </div>
                    <Button type="submit" className="w-full py-6 rounded-xl bg-brand-accent text-lg">
                      הוספת המתנה שלי ליריד
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-2xl font-display">פרטי היריד שלך</h3>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">פעיל ביריד</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-stone-400 mb-1">שם המתנה</p>
                      <p className="text-lg font-semibold mb-4">{shop.giftName}</p>
                      
                      <p className="text-sm text-stone-400 mb-1">תיאור</p>
                      <p className="text-stone-600 leading-relaxed italic">{shop.giftDescription}</p>
                    </div>
                    <div className="bg-stone-100 rounded-2xl p-4 flex items-center justify-center">
                      <img 
                        src={shop.giftImageUrl || "https://picsum.photos/seed/" + shop.id + "/400/250"} 
                        alt="Gift Preview" 
                        className="rounded-xl max-h-48 object-cover shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <div className="pt-6 border-t mt-8">
                    <p className="text-stone-500 text-sm italic">
                      * כדי לעדכן את הפרטים המופיעים כאן, אנא פני למנהלת היריד.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-brand-secondary">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl font-display text-brand-primary"
        >
          מפליקצית fairgifts...
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {view === "landing" ? (
        <motion.div 
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <FairLanding onOpenDashboard={() => setView("dashboard")} />
        </motion.div>
      ) : (
        <motion.div 
          key="dashboard"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <BusinessDashboard onBack={() => setView("landing")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

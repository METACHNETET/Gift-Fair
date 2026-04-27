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

// Speed levels: multipliers × base speed (1 = 240 px/s)
const SPEED_LEVELS = [0.4, 1, 2, 3.5, 6] as const;
const SPEED_KMH    = [40, 60, 90, 120, 160] as const;

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
    logoUrl: "/logos/shop-1.png",
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
    // Outer wrapper — tall enough for the gift emoji + building
    <div className="relative select-none" style={{ width: 460, height: 340 }}>

      {/* ── House image — anchored to bottom ─────────────────────── */}
      <div className="absolute bottom-0 w-full h-[190px]" style={{ zIndex: 1 }}>
        <img
          src={houseImage}
          alt={`בית ${idx + 1}`}
          className="w-full h-full object-contain"
          style={{ transform: `scale(${HOUSE_SCALE})`, transformOrigin: "bottom center" }}
          draggable={false}
        />
      </div>

      {/* ── Business sign — in front of house ────────────────────── */}
      <div
        className="absolute flex flex-col items-center"
        style={{ bottom: 190, zIndex: 10, right: -580 }}
      >
        {/* board */}
        <div
          className="relative flex items-center justify-center rounded-xl overflow-hidden"
          style={{
            width: 440, height: 192,
            background: "linear-gradient(135deg,#fffdf7 60%,#fef3c7)",
            border: "12px solid #78350f",
            boxShadow: "0 8px 32px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.7)",
          }}
        >
          {/* decorative top stripe */}
          <div className="absolute top-0 left-0 right-0" style={{ height: 8, background: "#92400e" }} />
          {shop.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt={shop.businessName}
              className="w-full h-full object-contain"
              style={{ padding: "20px 12px 8px" }}
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 mt-4">
              <div className="rounded-full bg-stone-300" style={{ width: 200, height: 22 }} />
              <div className="rounded-full bg-stone-200" style={{ width: 140, height: 16 }} />
            </div>
          )}
        </div>
        {/* post */}
        <div style={{ width: 20, height: 100, background: "#78350f", borderRadius: 4 }} />
      </div>

    </div>
  );
}

// ─── FireworksOverlay ─────────────────────────────────────────────────────────
const FX_COLORS = [
  "#ff6b6b","#ffd43b","#69db7c","#4dabf7","#da77f2",
  "#ff8787","#ffa94d","#a9e34b","#74c0fc","#f783ac",
  "#ffe066","#63e6be","#748ffc","#e599f7","#ff922b",
];

function FireworksOverlay({ nonce }: { nonce: number }) {
  const data = React.useMemo(() => {
    const bursts = Array.from({ length: 9 }, () => ({
      x: 8 + Math.random() * 84,
      y: 6 + Math.random() * 52,
      delay: Math.random() * 0.8,
      color: FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)],
      particles: Array.from({ length: 24 }, (_, pi) => {
        const angle = (pi / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const dist = 90 + Math.random() * 140;
        return {
          angle, dist,
          color: FX_COLORS[Math.floor(Math.random() * FX_COLORS.length)],
          size: 5 + Math.random() * 9,
          dur: 0.8 + Math.random() * 0.6,
        };
      }),
    }));
    const stars = Array.from({ length: 32 }, () => ({
      x: Math.random() * 100,
      delay: Math.random() * 2.0,
      dur: 1.4 + Math.random() * 1.0,
      emoji: ["⭐","✨","🌟","💫","🎊","🎉","💥","🥳","⚡","🌈"][Math.floor(Math.random() * 10)],
      size: 18 + Math.floor(Math.random() * 26),
      spin: (Math.random() > 0.5 ? 1 : -1) * (200 + Math.random() * 320),
    }));
    return { bursts, stars };
  }, [nonce]);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Soft screen flash */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 65%)" }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />

      {data.bursts.map((burst, bi) => (
        <React.Fragment key={bi}>
          {/* Rocket shooting upward */}
          <motion.div
            className="absolute rounded-full"
            style={{
              left: `${burst.x}vw`,
              bottom: 0,
              width: 5, height: 5,
              background: burst.color,
              boxShadow: `0 0 10px 5px ${burst.color}`,
            }}
            initial={{ y: 0, opacity: 1, scaleY: 1 }}
            animate={{ y: `-${(100 - burst.y) * 1.05}vh`, opacity: 0.3, scaleY: 4 }}
            transition={{ duration: 0.38 + burst.delay * 0.3, ease: "easeOut", delay: burst.delay }}
          />

          {/* Glow flash at burst point */}
          <motion.div
            className="absolute rounded-full"
            style={{
              left: `${burst.x}vw`,
              top: `${burst.y}vh`,
              transform: "translate(-50%, -50%)",
              width: 24, height: 24,
              background: burst.color,
              boxShadow: `0 0 80px 40px ${burst.color}`,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 7, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: burst.delay + 0.36 }}
          />

          {/* Particles */}
          {burst.particles.map((p, pi) => (
            <motion.div
              key={pi}
              className="absolute rounded-full"
              style={{
                left: `${burst.x}vw`,
                top: `${burst.y}vh`,
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.size}px ${p.color}99`,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(p.angle) * p.dist,
                y: Math.sin(p.angle) * p.dist * 0.55 + p.dist * 0.25,
                opacity: 0,
                scale: 0.15,
              }}
              transition={{ duration: p.dur, ease: [0.22, 0.61, 0.36, 1], delay: burst.delay + 0.37 }}
            />
          ))}
        </React.Fragment>
      ))}

      {/* Falling emoji stars */}
      {data.stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{ left: `${s.x}%`, top: -44, fontSize: s.size, lineHeight: 1 }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "108vh", opacity: [1, 1, 1, 0], rotate: s.spin }}
          transition={{ duration: s.dur, delay: s.delay, ease: "easeIn" }}
        />
      ))}
    </motion.div>
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

// ─── WelcomeOverlay ──────────────────────────────────────────────────────────
function WelcomeOverlay({ onStart }: { onStart: () => void }) {
  const steps = [
    { title: "עולים על ההגה", desc: "לחצו על כפתור ההתחלה או במקלדת על מקש SPACE והתחילו בנסיעה" },
    { title: "מנווטים בזהירות", desc: "סעו לאורך הכביש ותהנו מהנוף..." },
    { title: "מכווננים את הגז", desc: "השתמשו במד המהירות שמאלה כדי להגביר ולהאט — חיצי ↑↓ במקלדת או לחיצה על +/−" },
    { title: "עוצרים ומרוויחים", desc: "זיהיתם חנות בצד הדרך? עצרו לידה בדיוק בזמן!" },
    { title: "אוספים את המתנה", desc: "הצלחתם לעצור? בום! זכיתם במתנה דיגיטלית בלעדית שתקפיץ לכם את העסק." },
  ];

  const STEP_DURATION = 2200; // ms per step
  const [phase, setPhase] = useState<"title" | "steps" | "final">("title");
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    // After title shown (1.2s), start cycling steps
    const t1 = window.setTimeout(() => setPhase("steps"), 1200);
    return () => window.clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "steps") return;
    if (stepIdx < steps.length - 1) {
      const t = window.setTimeout(() => setStepIdx(i => i + 1), STEP_DURATION);
      return () => window.clearTimeout(t);
    } else {
      const t = window.setTimeout(() => setPhase("final"), STEP_DURATION);
      return () => window.clearTimeout(t);
    }
  }, [phase, stepIdx]);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-start overflow-hidden pl-[18%] md:pl-[22%] pb-[10%]"
      style={{ background: "transparent" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08, transition: { duration: 0.5, ease: "easeInOut" } }}
    >
      {/* sparkle stars */}
      {[...Array(8)].map((_, i) => (
        <motion.div key={`star-${i}`}
          className="absolute text-yellow-300 pointer-events-none select-none"
          style={{ left: `${10 + i * 11}%`, top: `${8 + (i % 3) * 18}%`, fontSize: 16 + (i % 3) * 8 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.3, 0.5], rotate: [0, 90, 0] }}
          transition={{ duration: 1.8 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
        >✦</motion.div>
      ))}

      <div className="relative max-w-xl w-full" dir="rtl">

        {/* ── Title (always visible) ── */}
        <motion.div className="text-center mb-4"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
        >
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight"
            style={{ fontFamily: "'Heebo', sans-serif", color: "#1e1b4b" }}>
            ברוכים הבאים למירוץ המתנות!
          </h1>
          <p className="text-2xl md:text-3xl font-bold mt-2"
            style={{ fontFamily: "'Heebo', sans-serif", color: "#0f172a" }}>
            מוכנים לצאת לדרך ולזכות בפרסים שווים?
          </p>
        </motion.div>

        {/* ── Cycling step ── */}
        {phase === "steps" && (
          <div className="min-h-[120px] flex flex-col justify-center text-right mb-4">
            <AnimatePresence mode="wait">
              <motion.div key={stepIdx}
                initial={{ opacity: 0, y: 40, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.95 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="text-4xl md:text-5xl font-black mb-2"
                  style={{ fontFamily: "'Heebo', sans-serif", color: "#e11d48" }}>
                  {steps[stepIdx].title}
                </div>
                <div className="text-xl md:text-2xl font-semibold"
                  style={{ fontFamily: "'Heebo', sans-serif", color: "#1e40af" }}>
                  {steps[stepIdx].desc}
                </div>
              </motion.div>
            </AnimatePresence>
            {/* dots */}
            <div className="flex gap-2 mt-4 justify-end">
              {steps.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === stepIdx ? 22 : 8, height: 8, background: i === stepIdx ? "#e11d48" : "#cbd5e1" }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Final screen after all steps ── */}
        {phase === "final" && (
          <motion.div className="text-right mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xl md:text-2xl font-black mb-1"
              style={{ fontFamily: "'Heebo', sans-serif", color: "#b45309" }}>
              הטיימר מפרגן לכם לשחק דקה אחת — נראה מה תספיקו לאסוף!
            </p>
            <p className="text-lg md:text-xl font-semibold"
              style={{ fontFamily: "'Heebo', sans-serif", color: "#7c3aed" }}>
              חגורות בטיחות? יש. יד על ההגה? יש. קדימה, צאו לדרך!
            </p>

            {/* ── Start button ── */}
            <motion.div className="flex justify-center mt-5"
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}>
              <motion.button
                onClick={onStart}
                className="relative px-14 py-4 text-2xl md:text-3xl font-black text-white rounded-full cursor-pointer overflow-hidden select-none"
                style={{
                  fontFamily: "'Heebo', sans-serif",
                  background: "linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6, #10b981, #f59e0b)",
                  backgroundSize: "300%",
                  border: "3px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 0 40px rgba(139,92,246,0.6), 0 0 80px rgba(245,158,11,0.3)",
                }}
                animate={{ backgroundPositionX: ["0%", "300%"] }}
                transition={{ backgroundPositionX: { duration: 3, repeat: Infinity, ease: "linear" } }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                יאללה, צאו לדרך!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Speedometer ─────────────────────────────────────────────────────────────
function Speedometer({ speed, onSpeedChange }: { speed: number; onSpeedChange: (s: number) => void }) {
  const cx = 60, cy = 66, r = 50;
  const fullArcLen = Math.PI * r;
  const filledLen = ((speed - 1) / 4) * fullArcLen;
  // Needle: 180° at speed 1 (left) → 0° at speed 5 (right)
  const needleAngleDeg = 180 - ((speed - 1) / 4) * 180;
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const nr = r * 0.74;
  const nx = cx + nr * Math.cos(needleRad);
  const ny = cy - nr * Math.sin(needleRad);
  const ticks = [0, 1, 2, 3, 4].map(i => {
    const aRad = (180 - (i / 4) * 180) * Math.PI / 180;
    return {
      x1: cx + (r - 3) * Math.cos(aRad), y1: cy - (r - 3) * Math.sin(aRad),
      x2: cx + (r + 5) * Math.cos(aRad), y2: cy - (r + 5) * Math.sin(aRad),
      active: i === speed - 1,
    };
  });
  const colors = ["#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444"];
  const col = colors[speed - 1];
  return (
    <div className="flex flex-col items-center justify-between select-none" style={{
      background: "rgba(8,10,22,0.80)", backdropFilter: "blur(14px)",
      border: "1px solid rgba(255,255,255,0.13)", borderRadius: 20,
      padding: "8px 10px 8px",
      boxShadow: "0 4px 28px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)",
      width: 144, height: 144,
    }}>
      <svg viewBox="0 0 120 72" width="120" height="72" overflow="visible">
        <defs>
          <linearGradient id="sgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#22c55e" />
            <stop offset="40%"  stopColor="#facc15" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {/* background arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" strokeLinecap="round" />
        {/* filled arc */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="url(#sgGrad)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${filledLen} ${fullArcLen + 10}`}
          style={{ transition: "stroke-dasharray 0.35s ease" }} />
        {/* tick marks */}
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={t.active ? "white" : "rgba(255,255,255,0.35)"}
            strokeWidth={t.active ? 2.5 : 1.5} />
        ))}
        {/* needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={col} strokeWidth="2.5" strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 5px ${col})`,
            transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }} />
        {/* center cap */}
        <circle cx={cx} cy={cy} r="4.5" fill="#1e293b" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
        {/* km/h value */}
        <text x={cx} y={cy - 18} textAnchor="middle" fill={col} fontSize="15" fontWeight="bold"
          style={{ filter: `drop-shadow(0 0 7px ${col})`, transition: "fill 0.3s" }}>
          {SPEED_KMH[speed - 1]}
        </text>
        <text x={cx} y={cy - 6} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="7">km/h</text>
      </svg>
      {/* ± controls */}
      <div className="flex items-center gap-2">
        <button onClick={() => onSpeedChange(Math.max(1, speed - 1))} disabled={speed <= 1}
          style={{
            width: 30, height: 30, borderRadius: "50%", fontSize: 18, fontWeight: "bold",
            background: speed <= 1 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.18)", color: "white",
            opacity: speed <= 1 ? 0.3 : 1, cursor: speed <= 1 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
          }}>−</button>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: i < speed ? col : "rgba(255,255,255,0.18)",
              boxShadow: i === speed - 1 ? `0 0 7px ${col}` : "none",
              transition: "all 0.25s",
            }} />
          ))}
        </div>
        <button onClick={() => onSpeedChange(Math.min(5, speed + 1))} disabled={speed >= 5}
          style={{
            width: 30, height: 30, borderRadius: "50%", fontSize: 18, fontWeight: "bold",
            background: speed >= 5 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.18)", color: "white",
            opacity: speed >= 5 ? 0.3 : 1, cursor: speed >= 5 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
          }}>+</button>
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>↑↓ מהירות</div>
    </div>
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
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showBizPopup, setShowBizPopup] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShowBizPopup(true), 10000);
    return () => window.clearTimeout(t);
  }, []);
  const showWelcomeRef = useRef(showWelcome);
  useEffect(() => { showWelcomeRef.current = showWelcome; }, [showWelcome]);
  const TIMER_TOTAL = 1 * 60;
  const [timeLeft, setTimeLeft] = useState(TIMER_TOTAL);
  const [timerStarted, setTimerStarted] = useState(false);

  // Start timer on first drive
  useEffect(() => {
    if (isDriving && !timerStarted) setTimerStarted(true);
  }, [isDriving, timerStarted]);

  useEffect(() => {
    if (!timerStarted || timeLeft <= 0) return;
    const tid = window.setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => window.clearInterval(tid);
  }, [timerStarted, timeLeft]);

  const timerMins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const timerSecs = String(timeLeft % 60).padStart(2, "0");
  const timerPct = timeLeft / TIMER_TOTAL;
  const timerColor = "#ef4444";
  const gameRef = useRef<HTMLDivElement>(null);
  const lastControlAtRef = useRef(0);
  // Speed: 1-5. Default = level 2 (1× base speed)
  const [speed, setSpeed] = useState(2);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  // base-speed-equivalent ms driven on the current shop leg (resets on each advance)
  const legEquivMsRef = useRef(0);
  // wall-clock time when the current drive segment started (null = not driving)
  const legSegStartRef = useRef<number | null>(null);
  // speed multiplier that was active when the current segment started
  const legSegSpeedRef = useRef<number>(SPEED_LEVELS[1]);
  const worldControls = useAnimationControls();
  const wasDrivingRef = useRef(false);
  const collectedRef = useRef(collected);
  const isDrivingRef = useRef(isDriving);
  const shopsRef = useRef(shops);
  const currentIdxRef = useRef(currentIdx);

  useEffect(() => { collectedRef.current = collected; }, [collected]);
  useEffect(() => { isDrivingRef.current = isDriving; }, [isDriving]);
  useEffect(() => { shopsRef.current = shops; }, [shops]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // Commit the running segment into equiv ms, then switch speed
  const changeSpeed = (newSpd: number) => {
    if (newSpd < 1 || newSpd > 5) return;
    if (isDrivingRef.current && legSegStartRef.current !== null) {
      legEquivMsRef.current += (Date.now() - legSegStartRef.current) * legSegSpeedRef.current;
      legSegStartRef.current = Date.now();
      legSegSpeedRef.current = SPEED_LEVELS[newSpd - 1];
    }
    setSpeed(newSpd);
  };

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
      // Total equiv ms driven = accumulated + current segment at its speed
      const equivDriven = legEquivMsRef.current +
        (legSegStartRef.current !== null ? (Date.now() - legSegStartRef.current) * legSegSpeedRef.current : 0);
      // Allow collection after 50% of the leg (in base-speed time)
      if (equivDriven >= WORLD_MOVE_INTERVAL_MS * 0.5) {
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

  // Auto-drive — advances one shop per full leg at current speed.
  // Pausing/resuming/changing speed all preserve the exact leg progress.
  useEffect(() => {
    if (!isDriving || shops.length === 0 || showFinale) return;

    const speedMult = SPEED_LEVELS[speed - 1];
    legSegStartRef.current = Date.now();
    legSegSpeedRef.current = speedMult;
    let active = true;
    let nextTid: number;

    const advance = () => {
      if (!active) return;
      // Reset leg and mark new segment
      legEquivMsRef.current = 0;
      legSegStartRef.current = Date.now();
      legSegSpeedRef.current = SPEED_LEVELS[speedRef.current - 1];
      setCurrentIdx(prev => {
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
        // Schedule next advance at current speed (use ref for latest speed)
        nextTid = window.setTimeout(advance, WORLD_MOVE_INTERVAL_MS / SPEED_LEVELS[speedRef.current - 1]);
      }
    };

    // First start (equiv=0): fire immediately; resume: wait remaining equiv / speed
    const remainingEquiv = legEquivMsRef.current > 0
      ? Math.max(50, WORLD_MOVE_INTERVAL_MS - legEquivMsRef.current)
      : 0;
    const remainingReal = remainingEquiv > 0 ? remainingEquiv / speedMult : 0;
    nextTid = window.setTimeout(advance, remainingReal);

    return () => {
      active = false;
      window.clearTimeout(nextTid);
      // Commit elapsed equiv ms when stopping
      if (legSegStartRef.current !== null) {
        legEquivMsRef.current += (Date.now() - legSegStartRef.current) * legSegSpeedRef.current;
        legSegStartRef.current = null;
      }
    };
  }, [isDriving, shops.length, showFinale, speed]);


  useEffect(() => {
    if (!stopFx) return;
    const id = window.setTimeout(() => setStopFx(null), 3200);
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
      if (event.key === "ArrowUp")   { event.preventDefault(); changeSpeed(Math.min(5, speedRef.current + 1)); }
      if (event.key === "ArrowDown") { event.preventDefault(); changeSpeed(Math.max(1, speedRef.current - 1)); }
      if (event.key === " ") {
        event.preventDefault();
        if (showWelcomeRef.current) { setShowWelcome(false); return; }
        setDriveState(!isDriving);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDriving]);

  useEffect(() => {
    if (isDriving) {
      // Remaining real seconds = remaining equiv ms / current speed multiplier
      const speedMult = SPEED_LEVELS[speed - 1];
      const remainingEquiv = legEquivMsRef.current > 0
        ? Math.max(50, WORLD_MOVE_INTERVAL_MS - legEquivMsRef.current)
        : WORLD_MOVE_INTERVAL_MS;
      const durationS = Math.max(0.05, remainingEquiv / speedMult / 1000);
      worldControls.start({
        x: worldX,
        transition: { duration: durationS, ease: "linear" },
      });
    } else if (wasDrivingRef.current) {
      worldControls.stop();
    } else {
      worldControls.set({ x: worldX });
    }

    wasDrivingRef.current = isDriving;
  }, [isDriving, worldX, worldControls, speed]);

  const totalWorldW = ROAD_START + (shops.length + 2) * SHOP_SPACING;
  // currentIdx=N means shop N-1 has arrived at the car
  const currentShop = currentIdx > 0 && currentIdx <= shops.length ? shops[currentIdx - 1] : null;

  return (
    <div className="min-h-screen flex flex-col" dir="ltr" style={{ userSelect: "none" }}>

      {/* ── Floating header ────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 flex justify-between items-center px-5 py-3 pointer-events-none">
        <motion.div className="flex items-center gap-3 pointer-events-auto"
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        </motion.div>
        <Button variant="outline" size="sm" onClick={onOpenDashboard}
          className="pointer-events-auto border-white/70 text-white hover:bg-white/20 backdrop-blur rounded-full" dir="rtl">
          אני בעלת עסק
        </Button>
      </div>

      {/* ── Biz popup modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showBizPopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-end pointer-events-auto"
            style={{ background: "transparent", pointerEvents: "none" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative rounded-3xl shadow-2xl px-8 py-10 text-center pointer-events-auto"
              style={{
                background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #db2777 100%)",
                border: "2px solid rgba(255,255,255,0.25)",
                maxWidth: 380,
                width: "calc(100% - 40px)",
                margin: "0 20px 80px 0",
              }}
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowBizPopup(false)}
                className="absolute top-4 left-4 text-white/60 hover:text-white text-2xl leading-none font-bold"
                aria-label="סגור"
              >×</button>

              <div className="text-5xl mb-4">🎁</div>

              <h2 className="text-white font-extrabold text-2xl mb-2 leading-snug">
                היריד רק דמה
              </h2>
              <p className="text-white/80 text-base mb-1">עדיין לא פועל</p>

              <div className="my-6 h-px bg-white/20" />

              <p className="text-white font-bold text-lg mb-1">בעל עסק ורוצה להשתתף</p>
              <p className="text-white/90 text-base mb-6">ולהרוויח מלא לידים?</p>

              <p className="text-white/80 text-sm mb-3">פנה אלי</p>

              <div
                className="flex items-center justify-between rounded-2xl px-4 py-3 cursor-pointer"
                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.35)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText("d0527181611@gmail.com");
                  setEmailCopied(true);
                  setTimeout(() => setEmailCopied(false), 2000);
                }}
              >
                <span className="text-white font-mono text-base">d0527181611@gmail.com</span>
                {emailCopied && (
                  <span className="text-white/70 text-xs mr-3">✓ הועתק!</span>
                )}
              </div>

              <p className="text-yellow-300 font-extrabold text-base mt-6">מהרו — המקום כמעט נגמר! 🔥</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {!showWelcome && shops.map((shop, i) => (
            <div key={shop.id} className="absolute flex flex-col items-center"
              style={{ left: totalWorldW - ROAD_START - (i + 1) * SHOP_SPACING + shopXOffset(i) - 95, bottom: 96 }}>
              <ShopBuilding
                shop={shop} idx={i}
                isActive={i === currentIdx - 1}
                isCollected={collected.has(shop.id)}
              />
            </div>
          ))}

          {/* vegetation strip — moves with the world */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: 0,
              right: -600,
              bottom: -50,
              height: 560,
              zIndex: 7,
              backgroundImage: "url('/vegetation.png')",
              backgroundRepeat: "repeat-x",
              backgroundSize: "auto 560px",
              backgroundPosition: "bottom center",
            }}
          />
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
            {/* centre dashes — CSS animation so play-state resumes from exact position */}
            <div
              className="absolute inset-x-0 rounded"
              style={{
                top: "50%",
                marginTop: -3,
                height: 6,
                backgroundImage:
                  "repeating-linear-gradient(to right, #facc15 0 44px, transparent 44px 80px)",
                backgroundSize: `${ROAD_DASH_SHIFT_PX}px 6px`,
                animationName: "roadDash",
                animationDuration: `${ROAD_DASH_DURATION_SEC / SPEED_LEVELS[speed - 1]}s`,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
                animationPlayState: isDriving ? "running" : "paused",
              }}
            />
        </div>

        {/* ── Car (fixed in viewport) ───────────────────────────────────── */}
        <div className="absolute z-10"
          style={{ right: CAR_RIGHT_OFFSET, bottom: 4 }}>

          {/* exhaust smoke — shown only while driving */}
          {isDriving && [0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 40,
                height: 40,
                right: 320,
                bottom: 158,
                background: "radial-gradient(circle, rgba(90,90,90,0.75) 0%, rgba(130,130,130,0.2) 55%, rgba(150,150,150,0) 75%)",
                filter: "blur(6px)",
              }}
              animate={{
                x: [0, (10 + i * 8), (22 + i * 16), (36 + i * 22)],
                y: [0, -(8 + i * 5), -(18 + i * 9), -(30 + i * 13)],
                opacity: [0, 0.85, 0.5, 0],
                scale: [0.6, 1.2 + i * 0.2, 2.0 + i * 0.3, 3.0 + i * 0.4],
              }}
              transition={{
                duration: 2.2,
                delay: i * 0.55,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.2, 0.6, 1],
              }}
            />
          ))}

          {/* scaled car + wheels wrapper */}
          <div style={{ position: "relative", display: "inline-block", transform: "scale(4)", transformOrigin: "bottom right" }}>
            <img
              src="/houses/car.png"
              alt="רכב מתנות"
              className="w-[260px] md:w-[320px] h-auto select-none pointer-events-none"
              style={{
                filter: "drop-shadow(2px 6px 10px rgba(0,0,0,.4))",
                display: "block",
              }}
              draggable={false}
            />
            {/* front wheel (left side) */}
            <motion.div
              style={{ position: "absolute", left: 100, bottom: 22, width: 38, height: 38, borderRadius: "50%", overflow: "hidden", pointerEvents: "none", opacity: isDriving ? 1 : 0 }}
              animate={{ rotate: isDriving ? 360 : 0 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
            >
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "rgba(50,50,50,0.45)", transform: "translateY(-50%)" }} />
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "rgba(50,50,50,0.45)", transform: "translateX(-50%)" }} />
            </motion.div>
            {/* rear wheel (right side) */}
            <motion.div
              style={{ position: "absolute", left: 188, bottom: 22, width: 38, height: 38, borderRadius: "50%", overflow: "hidden", pointerEvents: "none", opacity: isDriving ? 1 : 0 }}
              animate={{ rotate: isDriving ? 360 : 0 }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
            >
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "rgba(50,50,50,0.45)", transform: "translateY(-50%)" }} />
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "rgba(50,50,50,0.45)", transform: "translateX(-50%)" }} />
            </motion.div>
          </div>
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
            <FireworksOverlay key={`${stopFx.shopId}-${stopFx.nonce}`} nonce={stopFx.nonce} />
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

        {/* ── Left side panel: Timer + Speedometer + Checkout ──────────── */}
        <div
          className="absolute z-30 flex flex-col items-center py-4 px-3"
          style={{
            left: 0, top: 0, bottom: 0, width: 168,
            background: "rgba(8,10,22,0.72)",
            backdropFilter: "blur(18px)",
            borderRight: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "4px 0 32px rgba(0,0,0,0.45)",
          }}
        >
          {/* ─ Squares ────────────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3 mt-auto mb-3">
          {/* ─ Timer ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center justify-center"
            style={{
              width: 144, height: 144,
              background: "rgba(8,10,22,0.80)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.13)", borderRadius: 20,
              boxShadow: "0 4px 28px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
          >
            <span className="text-[10px] text-white/40 font-semibold tracking-widest uppercase mb-1">זמן</span>
            <div className="relative" style={{ width: 100, height: 100 }}>
              <svg width="100" height="100" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="50" cy="50" r="42" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
                <motion.circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - timerPct)}
                  style={{ filter: "drop-shadow(0 0 10px #ef4444)" }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={timeLeft}
                    className="font-display font-black leading-none"
                    style={{ fontSize: 34, color: timeLeft <= 10 ? "#ff2020" : "#ef4444", textShadow: `0 0 ${timeLeft <= 10 ? 20 : 14}px #ef4444, 0 2px 8px rgba(0,0,0,0.7)` }}
                    initial={{ opacity: 0, scale: 1.5, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.6, y: 6 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {timeLeft === 0 ? "🔴" : timeLeft}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[9px] text-white/40">{timeLeft === 0 ? "נגמר" : timerStarted ? "שניות" : "60"}</span>
              </div>
            </div>
          </motion.div>

          {/* ─ Speedometer ────────────────────────────────────────────── */}
          <Speedometer speed={speed} onSpeedChange={changeSpeed} />

          {/* ─ Collected counter ──────────────────────────────────────── */}
          <motion.div
            dir="rtl"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl"
            style={{
              width: 144, height: 144,
              background: collected.size > 0
                ? "linear-gradient(135deg, rgba(250,204,21,0.18) 0%, rgba(251,146,60,0.18) 100%)"
                : "rgba(8,10,22,0.80)",
              border: collected.size > 0
                ? "1.5px solid rgba(250,204,21,0.45)"
                : "1px solid rgba(255,255,255,0.13)",
              boxShadow: collected.size > 0 ? "0 2px 16px rgba(250,204,21,0.18)" : "0 4px 28px rgba(0,0,0,0.65)",
              backdropFilter: "blur(14px)",
            }}
            animate={collected.size > 0 ? { scale: [1, 1.06, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            <span style={{ fontSize: 26, lineHeight: 1 }}>🎁</span>
            <span className="font-black leading-none" style={{ fontSize: 28, color: collected.size > 0 ? "#facc15" : "rgba(255,255,255,0.2)", textShadow: collected.size > 0 ? "0 0 12px rgba(250,204,21,0.6)" : "none" }}>
              {collected.size}
            </span>
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.4)" }}>
              פרסים נאספו
            </span>
          </motion.div>

          {/* ─ Checkout button ────────────────────────────────────────── */}
          <motion.button
            onClick={() => { if (collected.size > 0) { setIsDriving(false); setShowCheckoutConfirm(true); } }}
            disabled={collected.size === 0}
            dir="rtl"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl font-extrabold transition-all"
            style={{
              width: 144, height: 144,
              background: collected.size > 0
                ? "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)"
                : "rgba(255,255,255,0.06)",
              border: collected.size > 0
                ? "1.5px solid rgba(255,255,255,0.25)"
                : "1.5px solid rgba(255,255,255,0.09)",
              boxShadow: collected.size > 0 ? "0 4px 24px rgba(124,58,237,0.45)" : "none",
              color: collected.size > 0 ? "white" : "rgba(255,255,255,0.22)",
              opacity: collected.size === 0 ? 0.5 : 1,
              cursor: collected.size === 0 ? "not-allowed" : "pointer",
            }}
            whileHover={collected.size > 0 ? { scale: 1.05 } : {}}
            whileTap={collected.size > 0 ? { scale: 0.95 } : {}}
          >
            <span style={{ fontSize: 34 }}>🛒</span>
            <span className="text-center leading-tight" style={{ fontSize: 11 }}>קחי אותי<br />למשלוחן</span>
            {collected.size > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.25)" }}>
                {collected.size} מתנות
              </span>
            )}
          </motion.button>
          </div>{/* end squares wrapper */}
        </div>{/* end left panel */}

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

        {/* ── Welcome overlay ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {showWelcome && (
            <WelcomeOverlay onStart={() => setShowWelcome(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* ── HUD — progress bar ─────────────────────────────────────────────── */}
      <div className="bg-brand-primary text-white px-4 py-3 flex items-center justify-between gap-3" dir="rtl">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-bold text-sm whitespace-nowrap">{collected.size} / {shops.length} מתנות נאספו</span>
          {collected.size === shops.length && shops.length > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-yellow-400 font-bold text-sm">
              🎉 כל המתנות נאספו!
            </motion.span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap justify-end flex-1">
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
        {collected.size > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setIsDriving(false); setShowCheckoutConfirm(true); }}
            className="flex-shrink-0 bg-yellow-400 hover:bg-yellow-300 text-stone-900 font-extrabold text-sm px-4 py-2 rounded-full shadow-lg transition-all whitespace-nowrap"
            dir="rtl"
          >
            🛒 יאלה קחי אותי למשלחן
          </motion.button>
        )}
      </div>

      {/* ── Checkout confirm dialog ───────────────────────────────────────── */}
      <AnimatePresence>
        {showCheckoutConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
              initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              dir="rtl"
            >
              <div className="text-5xl mb-4">🤔</div>
              <h2 className="text-2xl font-extrabold text-stone-800 mb-2">בטוחה שאת לא רוצה עוד מתנות?</h2>
              <p className="text-stone-500 text-sm mb-6">נאספת {collected.size} מתנות עד כאן 🎁</p>
              <div className="flex flex-col gap-3">
                <motion.button
                  onClick={() => { setShowCheckoutConfirm(false); setShowFinale(true); }}
                  className="w-full py-4 rounded-2xl font-extrabold text-white text-base shadow-lg"
                  style={{ background: "linear-gradient(90deg, #7c3aed, #db2777)" }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                >
                  📦 תארזי לי את המתנות הביתה!
                </motion.button>
                <motion.button
                  onClick={() => setShowCheckoutConfirm(false)}
                  className="w-full py-3 rounded-2xl font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 text-sm transition-colors"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                >
                  🚗 ברור שכן — תחזירי אותי לכביש!
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

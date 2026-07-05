import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

interface FairCard {
  id: string;
  path: string;
  title: string;
  subtitle: string;
  emoji: string;
  description: string;
  gradient: string;
  accentColor: string;
  available: boolean;
}

const FAIRS: FairCard[] = [
  {
    id: "giftfair",
    path: "/giftfair",
    title: "יריד המתנות",
    subtitle: "Gift Fair",
    emoji: "🎁",
    description: "קחי את הרכב, נסעי בין החנויות ואספי מתנות מעסקים מדהימים",
    gradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a78bfa 100%)",
    accentColor: "#c4b5fd",
    available: true,
  },
  {
    id: "summerfair",
    path: "/summerfair",
    title: "יריד הקיץ",
    subtitle: "Summer Fair",
    emoji: "🌊",
    description: "גררי את הסירה, תפסי מתנות מהים ותהני מירידי הקיץ",
    gradient: "linear-gradient(135deg, #0369a1 0%, #0891b2 50%, #38bdf8 100%)",
    accentColor: "#7dd3fc",
    available: true,
  },
];

const COMING_SOON: { title: string; subtitle: string; emoji: string }[] = [
  { title: "יריד החורף", subtitle: "Winter Fair", emoji: "❄️" },
  { title: "יריד האוכל", subtitle: "Food Fair", emoji: "🍕" },
];

export default function FairHub() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      dir="rtl"
      style={{
        background: "linear-gradient(160deg, #0f0c29 0%, #1a0a2e 40%, #302b63 70%, #24243e 100%)",
      }}
    >
      {/* Stars background */}
      {Array.from({ length: 60 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            width: Math.random() * 2.5 + 0.5,
            height: Math.random() * 2.5 + 0.5,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.6 + 0.1,
          }}
          animate={{ opacity: [null, Math.random() * 0.8 + 0.1, null] }}
          transition={{
            duration: 2 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}

      {/* Floating emoji decorations */}
      {["🎉", "✨", "🎀", "🌟", "🎊", "💫"].map((emoji, i) => (
        <motion.div
          key={emoji}
          className="absolute text-3xl pointer-events-none select-none opacity-20"
          style={{
            left: `${8 + i * 15}%`,
            top: `${10 + (i % 3) * 25}%`,
          }}
          animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.7 }}
        >
          {emoji}
        </motion.div>
      ))}

      <div className="relative z-10 w-full max-w-4xl px-4 py-12 flex flex-col items-center gap-10">
        {/* Header */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, type: "spring", damping: 20 }}
        >
          <motion.div
            className="text-7xl mb-4"
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            🎪
          </motion.div>
          <h1
            className="font-black mb-2"
            style={{
              fontSize: "clamp(36px, 7vw, 72px)",
              background: "linear-gradient(135deg, #fde68a 0%, #fbbf24 40%, #f97316 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 2px 16px rgba(251,191,36,0.4))",
            }}
          >
            ירידי המתנות
          </h1>
          <p className="text-purple-200 text-lg font-medium tracking-widest uppercase opacity-70">
            בחרי את הירייד שלך
          </p>
        </motion.div>

        {/* Fair cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {FAIRS.map((fair, i) => (
            <motion.button
              key={fair.id}
              onClick={() => navigate(fair.path)}
              className="relative rounded-3xl overflow-hidden text-right cursor-pointer border-0 p-0"
              style={{
                background: fair.gradient,
                boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)`,
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, type: "spring", damping: 22 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Shine overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)",
                }}
              />

              <div className="relative p-8 flex flex-col gap-3">
                <motion.div
                  className="text-6xl"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                >
                  {fair.emoji}
                </motion.div>

                <div>
                  <div
                    className="font-black text-white leading-tight"
                    style={{ fontSize: "clamp(24px, 4vw, 36px)" }}
                  >
                    {fair.title}
                  </div>
                  <div
                    className="font-medium uppercase tracking-widest mt-1"
                    style={{ color: fair.accentColor, fontSize: 12 }}
                  >
                    {fair.subtitle}
                  </div>
                </div>

                <p className="text-white/75 text-sm leading-relaxed">{fair.description}</p>

                <div
                  className="mt-2 inline-flex items-center gap-2 font-bold text-sm px-4 py-2 rounded-full self-start"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    color: fair.accentColor,
                    border: `1px solid rgba(255,255,255,0.2)`,
                  }}
                >
                  כניסה ליריד ←
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Coming soon */}
        {COMING_SOON.length > 0 && (
          <motion.div
            className="w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-center text-purple-300/50 text-xs uppercase tracking-widest mb-4">
              בקרוב
            </p>
            <div className="grid grid-cols-2 gap-4">
              {COMING_SOON.map((fair) => (
                <div
                  key={fair.title}
                  className="rounded-2xl p-6 text-center"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="text-4xl mb-2 opacity-40">{fair.emoji}</div>
                  <div className="text-white/40 font-bold text-base">{fair.title}</div>
                  <div className="text-white/25 text-xs mt-1">{fair.subtitle}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          className="text-white/20 text-xs text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          כל הזכויות שמורות · ירידי מניפה לתנופה
        </motion.p>
      </div>
    </div>
  );
}

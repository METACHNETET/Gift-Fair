import { useNavigate } from "react-router-dom";
import PlatformerApp from "./platformer/App.jsx";

// המשחק עצמו מפותח ב-B2BFAIR/platformer-app; כאן הוא רק עטוף בתוך היריד.
// כל ה-CSS שלו ממוסגר תחת .b2b-platformer כדי שלא ידלוף לשאר הירידים.
export default function B2BFairGame() {
  const navigate = useNavigate();

  return (
    <div
      className="b2b-platformer"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        overscrollBehavior: "none",
        fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
        background: "#0d0a12",
        color: "#f4efe6",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <PlatformerApp />
      <button
        onClick={() => navigate("/")}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid rgba(241,216,150,0.5)",
          background: "rgba(13,10,18,0.75)",
          color: "#f1d896",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        ← ירידים
      </button>
    </div>
  );
}

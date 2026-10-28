import PlatformerApp from "./platformer/App.jsx";

// המשחק עצמו מפותח ב-B2BFAIR/platformer-app; כאן הוא רק עטוף בתוך היריד.
// כל ה-CSS שלו ממוסגר תחת .b2b-platformer כדי שלא ידלוף לשאר הירידים.
export default function B2BFairGame() {
  return (
    <div
      className="b2b-platformer"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        overscrollBehavior: "none",
        fontFamily: "'Heebo', system-ui, 'Segoe UI', Roboto, sans-serif",
        background: "#0d0a12",
        color: "#f4efe6",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <PlatformerApp />
    </div>
  );
}

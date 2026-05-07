import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// experimentalForceLongPolling מבטיח שFirestore עובד דרך פרוקסי (נטפרי וכדומה)
// שחוסמים WebSocket — long-polling עובד תמיד דרך HTTP רגיל
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache(),
}, firebaseConfig.firestoreDatabaseId);

export const analytics = isSupported().then((yes) =>
  yes ? getAnalytics(app) : null
);

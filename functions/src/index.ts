import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import type { Response } from "express";

admin.initializeApp();

const DB_ID = "ai-studio-10ff2116-000a-4102-9efd-29cf72c00f86";
const db = getFirestore(DB_ID);
const FAIR = "main_fair";

function cors(
  req: functions.https.Request,
  res: Response,
  next: () => void
) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  next();
}

// GET /api/shops
export const getShops = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const snap = await db.collection(`fairs/${FAIR}/shops`).get();
      const shops = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json(shops);
    } catch (e) {
      console.error("[getShops] Firestore error:", e);
      res.json([]); // client falls back to DEMO_SHOPS
    }
  });
});

// POST /api/leads  body: { shopId, name, email }
export const saveLead = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { shopId, name, email } = req.body as { shopId: string; name: string; email: string };
    if (!shopId || !name || !email) { res.status(400).json({ error: "Missing fields" }); return; }
    try {
      const existing = await db.collection(`fairs/${FAIR}/shops/${shopId}/leads`)
        .where("email", "==", email).limit(1).get();
      if (!existing.empty) { res.status(409).json({ ok: false, error: "already_registered" }); return; }
      await db.collection(`fairs/${FAIR}/shops/${shopId}/leads`).add({
        shopId,
        name,
        email,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.json({ ok: true });
    } catch (e) {
      console.error("[saveLead] Firestore error:", e);
      res.json({ ok: false, error: String(e) });
    }
  });
});

// POST /api/finale  body: { name, email, shopIds: string[] }
export const saveFinale = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { name, email, shopIds } = req.body as { name: string; email: string; shopIds: string[] };
    if (!name || !email || !Array.isArray(shopIds)) { res.status(400).json({ error: "Missing fields" }); return; }
    try {
      const batch = db.batch();
      const ts = admin.firestore.FieldValue.serverTimestamp();

      // summary
      const finalRef = db.collection(`fairs/${FAIR}/finale_leads`).doc();
      batch.set(finalRef, { name, email, shopIds, claimedAt: ts });

      // per-shop leads
      for (const shopId of shopIds) {
        const leadRef = db.collection(`fairs/${FAIR}/shops/${shopId}/leads`).doc();
        batch.set(leadRef, { shopId, name, email, claimedAt: ts });
      }

      await batch.commit();
      res.json({ ok: true });
    } catch (e) {
      console.error("[saveFinale] Firestore error:", e);
      res.json({ ok: false, error: String(e) });
    }
  });
});

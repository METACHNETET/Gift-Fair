import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

admin.initializeApp();

const DB_ID = "ai-studio-10ff2116-000a-4102-9efd-29cf72c00f86";
const db = getFirestore(DB_ID);
const FAIR = "main_fair";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// GET /api/shops
export const getShops = onRequest({ invoker: "public" }, async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.set(k, v));
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  try {
    const snap = await db.collection(`fairs/${FAIR}/shops`).get();
    const shops = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(shops);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/leads  body: { shopId, name, email }
export const saveLead = onRequest({ invoker: "public" }, async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.set(k, v));
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
  const { shopId, name, email } = req.body as { shopId: string; name: string; email: string };
  if (!shopId || !name || !email) { res.status(400).json({ error: "Missing fields" }); return; }
  try {
    await db.collection(`fairs/${FAIR}/shops/${shopId}/leads`).add({
      shopId,
      name,
      email,
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/finale  body: { name, email, shopIds: string[] }
export const saveFinale = onRequest({ invoker: "public" }, async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.set(k, v));
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
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
    res.status(500).json({ error: String(e) });
  }
});

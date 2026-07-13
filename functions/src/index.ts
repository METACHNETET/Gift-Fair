import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import type { Request, Response } from "express";

admin.initializeApp();

const DB_ID = "ai-studio-10ff2116-000a-4102-9efd-29cf72c00f86";
const db = getFirestore(DB_ID);
const FAIR = "main_fair";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "Gift Fair <onboarding@resend.dev>";
const IS_FUNCTIONS_EMULATOR = process.env.FUNCTIONS_EMULATOR === "true";
const LOCAL_EMAIL_TEST_ONLY = process.env.LOCAL_EMAIL_TEST_ONLY === "true";

type ThankYouEmailParams = {
  name: string;
  email: string;
  giftName?: string;
  businessName?: string;
};

function cors(
  req: Request,
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendThankYouEmail({ name, email, giftName, businessName }: ThankYouEmailParams) {
  if (!RESEND_API_KEY) {
    console.warn("[mail] RESEND_API_KEY is not configured; skipping thank-you email.");
    return;
  }

  const trimmedName = name.trim() || "משתתפת יקרה";
  const safeName = escapeHtml(trimmedName);
  const safeGift = giftName ? escapeHtml(giftName) : "";
  const safeBusiness = businessName ? escapeHtml(businessName) : "";
  const registrationLine = giftName
    ? `קיבלנו את ההרשמה שלך למתנה <strong>${safeGift}</strong>${safeBusiness ? ` מטעם <strong>${safeBusiness}</strong>` : ""}.`
    : "קיבלנו את ההרשמה שלך למתנות שבחרת ביריד.";
  const textRegistrationLine = giftName
    ? `קיבלנו את ההרשמה שלך למתנה ${giftName}${businessName ? ` מטעם ${businessName}` : ""}.`
    : "קיבלנו את ההרשמה שלך למתנות שבחרת ביריד.";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [email],
      subject: "קיבלנו את ההרשמה שלך ל-Gift Fair",
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#292524;background:#f5f5f0;padding:24px;border-radius:18px">
          <h1 style="margin:0 0 16px;color:#5A5A40">תודה שנרשמת, ${safeName}!</h1>
          <p>${registrationLine}</p>
          <p>הצוות שלנו מטפל בבקשות בתשומת לב, והמתנה הדיגיטלית תישלח אלייך במייל בהמשך.</p>
          <p style="margin-top:24px;color:#5A5A40">שמחות שאת איתנו,<br/>Gift Fair</p>
        </div>
      `,
      text: `תודה שנרשמת, ${trimmedName}!\n${textRegistrationLine}\nהצוות שלנו מטפל בבקשות בתשומת לב, והמתנה הדיגיטלית תישלח אלייך במייל בהמשך.\n\nשמחות שאת איתנו,\nGift Fair`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }

  const result = await response.json().catch(() => null);
  console.log("[mail] Thank-you email sent:", result?.id ?? email);
}

async function sendSummerThankYouEmail({ email }: { name: string; email: string }) {
  if (!RESEND_API_KEY) {
    console.warn("[mail] RESEND_API_KEY is not configured; skipping summer thank-you email.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: [email],
      subject: "🌊 תודה שהשתתפת ביריד חופש!",
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#0c2233;background:#eaf6fb;max-width:520px;margin:0 auto;border-radius:20px;overflow:hidden;border:1px solid #bfe3ef">
          <div style="background:linear-gradient(135deg,#0891b2,#0369a1,#0c4a6e);padding:34px 28px 26px;text-align:center">
            <div style="font-size:46px;line-height:1;margin-bottom:6px">🏆</div>
            <h1 style="margin:0;color:#ffffff;font-size:23px;font-weight:800">תודה שהשתתפת ביריד חופש</h1>
          </div>
          <div style="padding:26px 28px 30px">
            <p style="margin:0 0 14px;font-size:16px">וואווו כמה מתנות דגת! צוות יריד החופש אורז לך את המתנות בתשומת לב.</p>
            <p style="margin:0;font-size:17px;color:#0369a1;font-weight:700">הן בדרך :)</p>
          </div>
        </div>
      `,
      text: `תודה שהשתתפת ביריד חופש!\n\nוואווו כמה מתנות דגת! צוות יריד החופש אורז לך את המתנות בתשומת לב.\nהן בדרך :)`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error ${response.status}: ${body}`);
  }

  const result = await response.json().catch(() => null);
  console.log("[mail] Summer thank-you email sent:", result?.id ?? email);
}

// GET /api/shops
export const getShops = onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const snap = await db.collection(`fairs/${FAIR}/shops`).get();
      const shops = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json(shops);
    } catch (e) {
      console.error("[getShops] Firestore error:", e);
      res.json([]);
    }
  });
});

// POST /api/leads  body: { shopId, name, email }
export const saveLead = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { shopId, name, email, giftName, businessName } = req.body as {
      shopId: string;
      name: string;
      email: string;
      giftName?: string;
      businessName?: string;
    };
    if (!shopId || !name || !email) { res.status(400).json({ error: "Missing fields" }); return; }
    try {
      if (IS_FUNCTIONS_EMULATOR && LOCAL_EMAIL_TEST_ONLY) {
        await sendThankYouEmail({ name, email, giftName, businessName });
        res.json({ ok: true, localEmailTestOnly: true });
        return;
      }

      const existing = await db.collection(`fairs/${FAIR}/shops/${shopId}/leads`)
        .where("email", "==", email).limit(1).get();
      if (!existing.empty) { res.status(409).json({ ok: false, error: "already_registered" }); return; }
      const shopDoc = await db.collection(`fairs/${FAIR}/shops`).doc(shopId).get();
      const shop = shopDoc.data() as { giftName?: string; businessName?: string } | undefined;
      await db.collection(`fairs/${FAIR}/shops/${shopId}/leads`).add({
        shopId,
        name,
        email,
        claimedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      try {
        await sendThankYouEmail({
          name,
          email,
          giftName: shop?.giftName,
          businessName: shop?.businessName,
        });
      } catch (mailError) {
        console.error("[saveLead] Email error:", mailError);
      }
      res.json({ ok: true });
    } catch (e) {
      console.error("[saveLead] Firestore error:", e);
      res.json({ ok: false, error: String(e) });
    }
  });
});

// POST /api/summer-thank-you  body: { name?, email }
export const sendSummerThankYou = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { name, email } = req.body as { name?: string; email: string };
    if (!email) { res.status(400).json({ error: "Missing email" }); return; }
    try {
      await sendSummerThankYouEmail({ name: name ?? "", email });
      res.json({ ok: true });
    } catch (e) {
      console.error("[sendSummerThankYou] Email error:", e);
      res.json({ ok: false, error: String(e) });
    }
  });
});

// POST /api/finale  body: { name, email, shopIds: string[] }
export const saveFinale = onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { name, email, shopIds, ref } = req.body as { name: string; email: string; shopIds: string[]; ref?: string };
    if (!name || !email || !Array.isArray(shopIds)) { res.status(400).json({ error: "Missing fields" }); return; }
    try {
      if (IS_FUNCTIONS_EMULATOR && LOCAL_EMAIL_TEST_ONLY) {
        await sendThankYouEmail({ name, email });
        res.json({ ok: true, localEmailTestOnly: true });
        return;
      }

      const batch = db.batch();
      const ts = admin.firestore.FieldValue.serverTimestamp();

      const finalRef = db.collection(`fairs/${FAIR}/finale_leads`).doc();
      batch.set(finalRef, { name, email, shopIds, claimedAt: ts, ...(ref ? { ref } : {}) });

      for (const shopId of shopIds) {
        const leadRef = db.collection(`fairs/${FAIR}/shops/${shopId}/leads`).doc();
        batch.set(leadRef, { shopId, name, email, claimedAt: ts });
      }

      await batch.commit();
      try {
        await sendThankYouEmail({ name, email });
      } catch (mailError) {
        console.error("[saveFinale] Email error:", mailError);
      }
      res.json({ ok: true });
    } catch (e) {
      console.error("[saveFinale] Firestore error:", e);
      res.json({ ok: false, error: String(e) });
    }
  });
});

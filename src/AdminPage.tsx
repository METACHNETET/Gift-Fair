import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "./lib/AuthContext";
import { auth, db } from "./lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocsFromServer, query, orderBy, doc, setDoc, arrayUnion } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Shop } from "./types";
import GENERATED_SHOPS from "./shops-data";
import { STORES as SUMMER_STORES } from "./games/summerfair/shops-data";
import { BUSINESSES as B2B_BUSINESSES } from "./games/b2bfair/platformer/businesses";
import { RefreshCw, LogOut, Download, ChevronDown, ChevronUp } from "lucide-react";

// ─── Admin config ─────────────────────────────────────────────────────────────
const ADMIN_EMAILS = ["d0527181611@gmail.com", "dvoraz@schoolframe.net"];
const ALL_LEADS_EXPORT_KEY = "__all__";

interface ShopWithLeads extends Shop {
  leadCount: number;
}

interface SummerShopWithLeads {
  id: string;
  name: string;
  gift: string;
  leadCount: number;
}

interface RefStat {
  ref: string;
  count: number;
}

interface FinaleLead {
  name: string;
  email: string;
  shopIds: string[];
  claimedAt: { seconds: number } | null;
}

interface ShopInterest {
  shopId: string;
  email: string | null;
  collectedAt: { seconds: number } | null;
}

interface EarlySignup {
  email: string | null;
  signedUpAt: { seconds: number } | null;
}

interface AllLead {
  name: string;
  email: string;
  claimedAt: { seconds: number } | null;
  shopCount: number;
}

// ירידים "פשוטים" (יריד החופש, יריד B2B): finale_leads + early_signups, בלי shop_interests.
// אותו דשבורד משמש את שניהם — רק רשימת העסקים ושם הקובץ שונים.
type SimpleFairId = "summerfair" | "b2bfair";
type ActiveFair = "giftfair" | SimpleFairId;

const SIMPLE_FAIR_STORES: Record<SimpleFairId, { id: string; name: string; gift: string }[]> = {
  summerfair: SUMMER_STORES.map(store => ({ id: String(store.id), name: store.name, gift: store.gift })),
  b2bfair: B2B_BUSINESSES.map((b: { id: string; businessName: string; giftName: string }) => ({
    id: b.id, name: b.businessName, gift: b.giftName,
  })),
};

interface SimpleFairData {
  shops: SummerShopWithLeads[];
  finaleLeads: FinaleLead[];
  earlySignups: EarlySignup[];
  refStats: RefStat[];
  exportedByShop: Record<string, Set<string>>;
}

const EMPTY_SIMPLE_FAIR: SimpleFairData = { shops: [], finaleLeads: [], earlySignups: [], refStats: [], exportedByShop: {} };

// ─── AdminPage ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading } = useAuth();
  const [activeFair, setActiveFair] = useState<ActiveFair>("giftfair");

  // ── GiftFair state ──
  const [shops, setShops] = useState<ShopWithLeads[]>([]);
  const [finaleLeads, setFinaleLeads] = useState<FinaleLead[]>([]);
  const [shopInterests, setShopInterests] = useState<ShopInterest[]>([]);
  const [earlySignups, setEarlySignups] = useState<EarlySignup[]>([]);
  const [refStats, setRefStats] = useState<RefStat[]>([]);
  const [exportedByShop, setExportedByShop] = useState<Record<string, Set<string>>>({});

  // ── SummerFair / B2B state ──
  const [simpleFairs, setSimpleFairs] = useState<Record<SimpleFairId, SimpleFairData>>({
    summerfair: EMPTY_SIMPLE_FAIR,
    b2bfair: EMPTY_SIMPLE_FAIR,
  });

  // ── Shared UI state ──
  const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"shops" | "refs">("shops");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  // ─── Fetch GiftFair ──────────────────────────────────────────────────────────
  const fetchGiftFair = useCallback(async () => {
    const [finaleSnap, interestsSnap, earlySnap, exportedSnap] = await Promise.all([
      getDocsFromServer(query(collection(db, "fairs", "main_fair", "finale_leads"), orderBy("claimedAt", "desc"))),
      getDocsFromServer(collection(db, "fairs", "main_fair", "shop_interests")),
      getDocsFromServer(collection(db, "fairs", "main_fair", "early_signups")),
      getDocsFromServer(collection(db, "fairs", "main_fair", "exported_leads")),
    ]);

    const exportedMap: Record<string, Set<string>> = {};
    exportedSnap.docs.forEach(d => {
      exportedMap[d.id] = new Set((d.data().emails as string[] | undefined) ?? []);
    });
    setExportedByShop(exportedMap);

    const shopEmailSets: Record<string, Set<string>> = {};
    const shopAnonCounts: Record<string, number> = {};

    finaleSnap.docs.forEach(d => {
      const email = d.data().email as string | undefined;
      const docShopIds = (d.data().shopIds as string[] | undefined) ?? [];
      docShopIds.forEach(shopId => {
        if (!shopEmailSets[shopId]) shopEmailSets[shopId] = new Set();
        if (email) shopEmailSets[shopId].add(email.toLowerCase());
        else shopAnonCounts[shopId] = (shopAnonCounts[shopId] ?? 0) + 1;
      });
    });

    interestsSnap.docs.forEach(d => {
      const shopId = d.data().shopId as string | undefined;
      const email = d.data().email as string | undefined;
      if (!shopId || !email) return;
      if (!shopEmailSets[shopId]) shopEmailSets[shopId] = new Set();
      shopEmailSets[shopId].add(email.toLowerCase());
    });

    const results: ShopWithLeads[] = GENERATED_SHOPS.map(shop => ({
      ...shop,
      leadCount: shopEmailSets[shop.id]?.size ?? 0,
    }));
    results.sort((a, b) => b.leadCount - a.leadCount);
    setShops(results);

    setFinaleLeads(finaleSnap.docs.map(d => ({
      name: d.data().name as string,
      email: d.data().email as string,
      shopIds: (d.data().shopIds as string[] | undefined) ?? [],
      claimedAt: d.data().claimedAt ?? null,
    })));

    setShopInterests(interestsSnap.docs.map(d => ({
      shopId: d.data().shopId as string,
      email: (d.data().email as string | undefined) ?? null,
      collectedAt: d.data().collectedAt ?? null,
    })));

    setEarlySignups(earlySnap.docs.map(d => ({
      email: (d.data().email as string | undefined) ?? null,
      signedUpAt: d.data().signedUpAt ?? null,
    })));

    const refMap: Record<string, number> = {};
    finaleSnap.docs.forEach(d => {
      const r = (d.data().ref as string | undefined) ?? "(ישיר)";
      refMap[r] = (refMap[r] ?? 0) + 1;
    });
    setRefStats(Object.entries(refMap).map(([ref, count]) => ({ ref, count })).sort((a, b) => b.count - a.count));
  }, []);

  // ─── Fetch SummerFair / B2B ──────────────────────────────────────────────────
  const fetchSimpleFair = useCallback(async (fairId: SimpleFairId) => {
    const [finaleSnap, earlySnap, exportedSnap] = await Promise.all([
      getDocsFromServer(collection(db, "fairs", fairId, "finale_leads")),
      getDocsFromServer(collection(db, "fairs", fairId, "early_signups")),
      getDocsFromServer(collection(db, "fairs", fairId, "exported_leads")),
    ]);

    const exportedMap: Record<string, Set<string>> = {};
    exportedSnap.docs.forEach(d => {
      exportedMap[d.id] = new Set((d.data().emails as string[] | undefined) ?? []);
    });

    const shopEmailSets: Record<string, Set<string>> = {};
    finaleSnap.docs.forEach(d => {
      const email = d.data().email as string | undefined;
      const docShopIds = (d.data().shopIds as string[] | undefined) ?? [];
      docShopIds.forEach(shopId => {
        if (!shopEmailSets[shopId]) shopEmailSets[shopId] = new Set();
        if (email) shopEmailSets[shopId].add(email.toLowerCase());
      });
    });

    const shopsWithLeads: SummerShopWithLeads[] = SIMPLE_FAIR_STORES[fairId].map(store => ({
      ...store,
      leadCount: shopEmailSets[store.id]?.size ?? 0,
    }));
    shopsWithLeads.sort((a, b) => b.leadCount - a.leadCount);

    const refMap: Record<string, number> = {};
    finaleSnap.docs.forEach(d => {
      const r = (d.data().ref as string | undefined) || "(ישיר)";
      refMap[r] = (refMap[r] ?? 0) + 1;
    });

    const data: SimpleFairData = {
      shops: shopsWithLeads,
      finaleLeads: finaleSnap.docs.map(d => ({
        name: d.data().name as string,
        email: d.data().email as string,
        shopIds: (d.data().shopIds as string[] | undefined) ?? [],
        claimedAt: d.data().claimedAt ?? null,
      })),
      earlySignups: earlySnap.docs.map(d => ({
        email: (d.data().email as string | undefined) ?? null,
        signedUpAt: d.data().signedUpAt ?? null,
      })),
      refStats: Object.entries(refMap).map(([ref, count]) => ({ ref, count })).sort((a, b) => b.count - a.count),
      exportedByShop: exportedMap,
    };
    setSimpleFairs(prev => ({ ...prev, [fairId]: data }));
  }, []);

  // ─── Fetch all ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    const errors: string[] = [];
    await Promise.all([
      fetchGiftFair().catch(err => { console.error("fetchGiftFair failed:", err); errors.push("יריד המתנות: " + (err instanceof Error ? err.message : String(err))); }),
      fetchSimpleFair("summerfair").catch(err => { console.error("fetchSummerFair failed:", err); errors.push("יריד החופש: " + (err instanceof Error ? err.message : String(err))); }),
      fetchSimpleFair("b2bfair").catch(err => { console.error("fetchB2BFair failed:", err); errors.push("יריד B2B: " + (err instanceof Error ? err.message : String(err))); }),
    ]);
    if (errors.length) setFetchError(errors.join(" | "));
    setLastUpdated(new Date());
    setFetching(false);
  }, [fetchGiftFair, fetchSimpleFair]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // ─── Auth handlers ────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "auth/cancelled-popup-request" && code !== "auth/popup-closed-by-user") {
        console.error("Login failed:", err);
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError(null);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err: unknown) {
      setLoginError("אימייל או סיסמא שגויים");
      console.error("Email login failed:", err);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => { await signOut(auth); };

  // ─── GiftFair helpers ─────────────────────────────────────────────────────────
  const downloadShopLeads = (shop: ShopWithLeads) => {
    const seenEmails = new Set<string>();
    type CsvRow = { name: string; email: string; date: string; source: string };
    const rows: CsvRow[] = [];
    finaleLeads.filter(l => l.shopIds.includes(shop.id)).forEach(l => {
      const key = l.email?.toLowerCase();
      if (key && seenEmails.has(key)) return;
      if (key) seenEmails.add(key);
      const date = l.claimedAt ? new Date(l.claimedAt.seconds * 1000).toLocaleDateString("he-IL") : "";
      rows.push({ name: l.name, email: l.email, date, source: "הגמר" });
    });
    shopInterests.filter(l => l.shopId === shop.id && l.email).forEach(l => {
      const key = l.email!.toLowerCase();
      if (seenEmails.has(key)) return;
      seenEmails.add(key);
      const date = l.collectedAt ? new Date(l.collectedAt.seconds * 1000).toLocaleDateString("he-IL") : "";
      rows.push({ name: "", email: l.email!, date, source: "עצר" });
    });
    downloadCsv(rows, `leads-${shop.businessName ?? shop.id}.csv`);
  };

  const getNewLeadsForShop = (shop: ShopWithLeads) => {
    const exported = exportedByShop[shop.id] ?? new Set<string>();
    const seenEmails = new Set<string>();
    type CsvRow = { name: string; email: string; date: string; source: string };
    const rows: CsvRow[] = [];
    finaleLeads.filter(l => l.shopIds.includes(shop.id)).forEach(l => {
      const key = l.email?.toLowerCase();
      if (!key || seenEmails.has(key)) return;
      seenEmails.add(key);
      if (exported.has(key)) return;
      const date = l.claimedAt ? new Date(l.claimedAt.seconds * 1000).toLocaleDateString("he-IL") : "";
      rows.push({ name: l.name, email: l.email, date, source: "הגמר" });
    });
    shopInterests.filter(l => l.shopId === shop.id && l.email).forEach(l => {
      const key = l.email!.toLowerCase();
      if (seenEmails.has(key)) return;
      seenEmails.add(key);
      if (exported.has(key)) return;
      const date = l.collectedAt ? new Date(l.collectedAt.seconds * 1000).toLocaleDateString("he-IL") : "";
      rows.push({ name: "", email: l.email!, date, source: "עצר" });
    });
    return rows;
  };

  const handleDownloadNewShopLeads = async (shop: ShopWithLeads) => {
    const rows = getNewLeadsForShop(shop);
    if (rows.length === 0) return;
    downloadCsv(rows, `leads-חדשים-${shop.businessName ?? shop.id}.csv`);
    const emails = rows.map(r => r.email.toLowerCase());
    await setDoc(doc(db, "fairs", "main_fair", "exported_leads", shop.id), { emails: arrayUnion(...emails) }, { merge: true });
    setExportedByShop(prev => {
      const next = new Set(prev[shop.id] ?? []);
      emails.forEach(e => next.add(e));
      return { ...prev, [shop.id]: next };
    });
  };

  const gfAllLeads = useMemo((): AllLead[] => {
    const byEmail = new Map<string, AllLead>();
    finaleLeads.forEach(l => {
      const key = l.email?.toLowerCase().trim();
      if (!key) return;
      byEmail.set(key, { name: l.name, email: l.email, claimedAt: l.claimedAt, shopCount: l.shopIds.length });
    });
    shopInterests.forEach(l => {
      const key = l.email?.toLowerCase().trim();
      if (!key || byEmail.has(key)) return;
      byEmail.set(key, { name: "", email: l.email!, claimedAt: l.collectedAt, shopCount: 1 });
    });
    earlySignups.forEach(l => {
      const key = l.email?.toLowerCase().trim();
      if (!key || byEmail.has(key)) return;
      byEmail.set(key, { name: "", email: l.email!, claimedAt: l.signedUpAt, shopCount: 0 });
    });
    return Array.from(byEmail.values());
  }, [finaleLeads, shopInterests, earlySignups]);

  // ─── SummerFair / B2B helpers (פועלים על היריד הפעיל) ───────────────────────────
  const simpleFairId: SimpleFairId = activeFair === "giftfair" ? "summerfair" : activeFair;
  const sf = simpleFairs[simpleFairId];

  const downloadSfShopLeads = (shopId: string, shopName: string) => {
    const seenEmails = new Set<string>();
    type CsvRow = { name: string; email: string; date: string };
    const rows: CsvRow[] = [];
    sf.finaleLeads.filter(l => l.shopIds.includes(shopId)).forEach(l => {
      const key = l.email?.toLowerCase();
      if (key && seenEmails.has(key)) return;
      if (key) seenEmails.add(key);
      const date = l.claimedAt ? new Date(l.claimedAt.seconds * 1000).toLocaleDateString("he-IL") : "";
      rows.push({ name: l.name, email: l.email, date });
    });
    downloadCsv(rows, `leads-${shopName}.csv`);
  };

  const getNewSfLeadsForShop = (shopId: string) => {
    const exported = sf.exportedByShop[shopId] ?? new Set<string>();
    const seenEmails = new Set<string>();
    type CsvRow = { name: string; email: string; date: string };
    const rows: CsvRow[] = [];
    sf.finaleLeads.filter(l => l.shopIds.includes(shopId)).forEach(l => {
      const key = l.email?.toLowerCase();
      if (!key || seenEmails.has(key)) return;
      seenEmails.add(key);
      if (exported.has(key)) return;
      const date = l.claimedAt ? new Date(l.claimedAt.seconds * 1000).toLocaleDateString("he-IL") : "";
      rows.push({ name: l.name, email: l.email, date });
    });
    return rows;
  };

  const addExportedEmails = (fairId: SimpleFairId, key: string, emails: string[]) => {
    setSimpleFairs(prev => {
      const fair = prev[fairId];
      const next = new Set(fair.exportedByShop[key] ?? []);
      emails.forEach(e => next.add(e));
      return { ...prev, [fairId]: { ...fair, exportedByShop: { ...fair.exportedByShop, [key]: next } } };
    });
  };

  const handleDownloadNewSfShopLeads = async (shopId: string, shopName: string) => {
    const rows = getNewSfLeadsForShop(shopId);
    if (rows.length === 0) return;
    downloadCsv(rows, `leads-חדשים-${shopName}.csv`);
    const emails = rows.map(r => r.email.toLowerCase());
    await setDoc(doc(db, "fairs", simpleFairId, "exported_leads", shopId), { emails: arrayUnion(...emails) }, { merge: true });
    addExportedEmails(simpleFairId, shopId, emails);
  };

  const sfAllLeads = useMemo((): AllLead[] => {
    const byEmail = new Map<string, AllLead>();
    sf.finaleLeads.forEach(l => {
      const key = l.email?.toLowerCase().trim();
      if (!key) return;
      byEmail.set(key, { name: l.name, email: l.email, claimedAt: l.claimedAt, shopCount: l.shopIds.length });
    });
    sf.earlySignups.forEach(l => {
      const key = l.email?.toLowerCase().trim();
      if (!key || byEmail.has(key)) return;
      byEmail.set(key, { name: "", email: l.email!, claimedAt: l.signedUpAt, shopCount: 0 });
    });
    return Array.from(byEmail.values());
  }, [sf]);

  // ─── Shared CSV util ──────────────────────────────────────────────────────────
  const downloadCsv = (rows: Record<string, string>[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]).join(",");
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllLeads = (leads: AllLead[], filename: string) => {
    const rows = leads.map(l => ({
      שם: l.name,
      אימייל: l.email,
      תאריך: l.claimedAt ? new Date(l.claimedAt.seconds * 1000).toLocaleDateString("he-IL") : "",
      "מספר חנויות": String(l.shopCount),
    }));
    downloadCsv(rows, filename);
  };

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500">טוען...</p></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="w-full max-w-sm space-y-6 p-8 bg-white rounded-xl shadow">
          <h1 className="text-2xl font-bold text-center">דשבורד אדמין</h1>
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input type="email" placeholder="אימייל" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required dir="ltr"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="password" placeholder="סיסמא" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required dir="ltr"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
            <Button type="submit" className="w-full" disabled={loginBusy}>{loginBusy ? "מתחבר..." : "כניסה"}</Button>
          </form>
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <div className="flex-1 h-px bg-gray-200" /><span>או</span><div className="flex-1 h-px bg-gray-200" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogin}>התחבר עם Google</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow">
          <h1 className="text-2xl font-bold text-red-600">אין גישה</h1>
          <p className="text-gray-500 text-sm">{user.email} אינו מורשה לדף זה.</p>
          <Button variant="outline" onClick={handleLogout}><LogOut className="w-4 h-4 ml-2" />התנתק</Button>
        </div>
      </div>
    );
  }

  // ─── Current fair data ────────────────────────────────────────────────────────
  // isSummer = כל יריד "פשוט" (חופש או B2B) — אותו מבנה טבלה
  const isSummer = activeFair !== "giftfair";
  const csvFairName = isSummer ? simpleFairId : "giftfair";
  const curShops = isSummer ? sf.shops : shops;
  const curAllLeads = isSummer ? sfAllLeads : gfAllLeads;
  const curRefStats = isSummer ? sf.refStats : refStats;
  const totalLeads = curShops.reduce((s, sh) => s + sh.leadCount, 0);

  // ─── "New leads" export for the top-level all-leads button (additive; reuses exported_leads collection) ──
  const curExportedByShop = isSummer ? sf.exportedByShop : exportedByShop;
  const exportedAllLeadsEmails = curExportedByShop[ALL_LEADS_EXPORT_KEY] ?? new Set<string>();
  const newAllLeadsList = curAllLeads.filter(l => !exportedAllLeadsEmails.has(l.email.toLowerCase().trim()));

  const handleDownloadNewAllLeads = async () => {
    if (newAllLeadsList.length === 0) return;
    downloadAllLeads(newAllLeadsList, `לידים-חדשים-${csvFairName}.csv`);
    const emails = newAllLeadsList.map(l => l.email.toLowerCase().trim());
    const fairId = isSummer ? simpleFairId : "main_fair";
    await setDoc(doc(db, "fairs", fairId, "exported_leads", ALL_LEADS_EXPORT_KEY), { emails: arrayUnion(...emails) }, { merge: true });
    if (isSummer) {
      addExportedEmails(simpleFairId, ALL_LEADS_EXPORT_KEY, emails);
    } else {
      setExportedByShop(prev => {
        const next = new Set(prev[ALL_LEADS_EXPORT_KEY] ?? []);
        emails.forEach(e => next.add(e));
        return { ...prev, [ALL_LEADS_EXPORT_KEY]: next };
      });
    }
  };

  // ─── Admin dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6 bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">דשבורד לידים</h1>
            {lastUpdated && <p className="text-xs text-gray-400 mt-1">עודכן: {lastUpdated.toLocaleTimeString("he-IL")}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={fetching}>
              <RefreshCw className={`w-4 h-4 ml-2 ${fetching ? "animate-spin" : ""}`} />
              רענן
            </Button>
            <Button variant="outline" onClick={handleLogout}><LogOut className="w-4 h-4 ml-2" />התנתק</Button>
          </div>
        </div>

        {/* Fair selector */}
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveFair("giftfair"); setExpandedShopId(null); }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
              !isSummer ? "bg-blue-600 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🎁 יריד המתנות
          </button>
          <button
            onClick={() => { setActiveFair("summerfair"); setExpandedShopId(null); }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
              activeFair === "summerfair" ? "bg-sky-500 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🏖️ יריד החופש
          </button>
          <button
            onClick={() => { setActiveFair("b2bfair"); setExpandedShopId(null); }}
            className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${
              activeFair === "b2bfair" ? "bg-amber-500 text-white shadow" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            🤖 יריד B2B
          </button>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center justify-between">
            <span>שגיאה בטעינה: {fetchError}</span>
            <Button size="sm" variant="outline" onClick={fetchData} disabled={fetching}>נסה שוב</Button>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{totalLeads}</div>
            <div className="text-sm text-gray-500 mt-1">סה"כ לידים</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{curShops.filter(s => s.leadCount > 0).length}</div>
            <div className="text-sm text-gray-500 mt-1">עסקים עם לידים</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-gray-700">{curShops.length}</div>
            <div className="text-sm text-gray-500 mt-1">סה"כ עסקים</div>
          </div>
        </div>

        {/* All unique leads */}
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-3xl font-bold text-purple-600">{curAllLeads.length}</div>
            <div className="text-sm text-gray-500 mt-1">לידים ייחודיים (כפילויות הוסרו)</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadNewAllLeads} disabled={newAllLeadsList.length === 0}>
              <Download className="w-4 h-4 ml-2" />
              הורד לידים חדשים{newAllLeadsList.length > 0 ? ` (${newAllLeadsList.length})` : ""}
            </Button>
            <Button onClick={() => downloadAllLeads(curAllLeads, `כל-הלידים-${csvFairName}.csv`)}
              disabled={curAllLeads.length === 0}>
              <Download className="w-4 h-4 ml-2" />
              הורד את כל הלידים (CSV)
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button onClick={() => setActiveTab("shops")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "shops" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            לפי עסק
          </button>
          <button onClick={() => setActiveTab("refs")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "refs" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            לפי מפנה
          </button>
        </div>

        {/* Table - shops */}
        {activeTab === "shops" && (
          fetching && curShops.length === 0 ? (
            <div className="text-center py-16 text-gray-400">טוען נתונים...</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 text-right font-semibold text-gray-600 w-10">#</th>
                    <th className="p-3 text-right font-semibold text-gray-600">עסק</th>
                    <th className="p-3 text-right font-semibold text-gray-600 hidden sm:table-cell">מתנה</th>
                    <th className="p-3 text-center font-semibold text-gray-600 w-20">לידים</th>
                    <th className="p-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {isSummer ? (
                    sf.shops.map((shop, i) => {
                      const isExpanded = expandedShopId === shop.id;
                      const newCount = getNewSfLeadsForShop(shop.id).length;
                      const displayLeads = sf.finaleLeads
                        .filter(l => l.shopIds.includes(shop.id))
                        .reduce<{ name: string; email: string }[]>((acc, l) => {
                          const key = l.email?.toLowerCase();
                          if (!key || acc.some(x => x.email.toLowerCase() === key)) return acc;
                          return [...acc, { name: l.name, email: l.email }];
                        }, []);
                      return (
                        <React.Fragment key={shop.id}>
                          <tr className={`border-b transition-colors ${shop.leadCount > 0 ? "cursor-pointer hover:bg-gray-50" : ""} ${isExpanded ? "bg-sky-50" : ""}`}
                            onClick={() => shop.leadCount > 0 && setExpandedShopId(isExpanded ? null : shop.id)}>
                            <td className="p-3 text-gray-400">{i + 1}</td>
                            <td className="p-3 font-medium">{shop.name}</td>
                            <td className="p-3 text-gray-500 hidden sm:table-cell max-w-xs">
                              <span className="line-clamp-2">{shop.gift}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-white font-bold text-sm ${shop.leadCount >= 10 ? "bg-green-500" : shop.leadCount > 0 ? "bg-sky-500" : "bg-gray-300"}`}>
                                {shop.leadCount}
                              </span>
                            </td>
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {shop.leadCount > 0 && (
                                  <>
                                    <button onClick={() => handleDownloadNewSfShopLeads(shop.id, shop.name)}
                                      disabled={newCount === 0}
                                      title={`הורד לידים חדשים (${newCount})`}
                                      className={`relative p-1.5 rounded hover:bg-gray-100 transition-colors ${newCount > 0 ? "text-sky-600 hover:text-sky-700" : "text-gray-300 cursor-not-allowed"}`}>
                                      <Download className="w-4 h-4" />
                                      {newCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                          {newCount > 9 ? "9+" : newCount}
                                        </span>
                                      )}
                                    </button>
                                    <button onClick={() => downloadSfShopLeads(shop.id, shop.name)} title="הורד את כל הלידים (CSV)"
                                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setExpandedShopId(isExpanded ? null : shop.id)}
                                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-sky-50 border-b">
                              <td colSpan={5} className="px-6 pb-4 pt-2">
                                <div className="text-xs font-semibold text-sky-700 mb-2">נרשמים ({displayLeads.length})</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                                  {displayLeads.map((l, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded px-3 py-1.5 shadow-sm">
                                      {l.name && <span className="font-medium text-gray-800 truncate">{l.name}</span>}
                                      {l.name && <span className="text-gray-400">·</span>}
                                      <span className="text-gray-500 truncate" dir="ltr">{l.email || "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    shops.map((shop, i) => {
                      const isExpanded = expandedShopId === shop.id;
                      const newCount = getNewLeadsForShop(shop).length;
                      type DisplayLead = { name: string; email: string; source: "finale" | "interest" };
                      const seenEmails = new Set<string>();
                      const displayLeads: DisplayLead[] = [];
                      finaleLeads.filter((l: FinaleLead) => l.shopIds.includes(shop.id)).forEach((l: FinaleLead) => {
                        const key = l.email?.toLowerCase();
                        if (key && seenEmails.has(key)) return;
                        if (key) seenEmails.add(key);
                        displayLeads.push({ name: l.name, email: l.email, source: "finale" });
                      });
                      shopInterests.filter((l: ShopInterest) => l.shopId === shop.id && l.email).forEach((l: ShopInterest) => {
                        const key = l.email!.toLowerCase();
                        if (seenEmails.has(key)) return;
                        seenEmails.add(key);
                        displayLeads.push({ name: "", email: l.email!, source: "interest" });
                      });
                      return (
                        <React.Fragment key={shop.id}>
                          <tr className={`border-b transition-colors ${shop.leadCount > 0 ? "cursor-pointer hover:bg-gray-50" : ""} ${isExpanded ? "bg-blue-50" : ""}`}
                            onClick={() => shop.leadCount > 0 && setExpandedShopId(isExpanded ? null : shop.id)}>
                            <td className="p-3 text-gray-400">{i + 1}</td>
                            <td className="p-3 font-medium">{shop.businessName}</td>
                            <td className="p-3 text-gray-500 hidden sm:table-cell max-w-xs">
                              <span className="line-clamp-2">{shop.giftName}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-white font-bold text-sm ${shop.leadCount >= 10 ? "bg-green-500" : shop.leadCount > 0 ? "bg-blue-500" : "bg-gray-300"}`}>
                                {shop.leadCount}
                              </span>
                            </td>
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                {shop.leadCount > 0 && (
                                  <>
                                    <button onClick={() => handleDownloadNewShopLeads(shop)}
                                      disabled={newCount === 0}
                                      title={`הורד לידים חדשים (${newCount})`}
                                      className={`relative p-1.5 rounded hover:bg-gray-100 transition-colors ${newCount > 0 ? "text-green-600 hover:text-green-700" : "text-gray-300 cursor-not-allowed"}`}>
                                      <Download className="w-4 h-4" />
                                      {newCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                          {newCount > 9 ? "9+" : newCount}
                                        </span>
                                      )}
                                    </button>
                                    <button onClick={() => downloadShopLeads(shop)} title="הורד את כל הלידים (CSV)"
                                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setExpandedShopId(isExpanded ? null : shop.id)}
                                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-blue-50 border-b">
                              <td colSpan={5} className="px-6 pb-4 pt-2">
                                <div className="text-xs font-semibold text-blue-700 mb-2">נרשמים ({displayLeads.length})</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                                  {displayLeads.map((l, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded px-3 py-1.5 shadow-sm">
                                      {l.name && <span className="font-medium text-gray-800 truncate">{l.name}</span>}
                                      {l.name && <span className="text-gray-400">·</span>}
                                      <span className="text-gray-500 truncate" dir="ltr">{l.email || "—"}</span>
                                      {l.source === "interest" && <span className="text-xs text-amber-500 shrink-0">עצר</span>}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Table - refs */}
        {activeTab === "refs" && (
          fetching && curRefStats.length === 0 ? (
            <div className="text-center py-16 text-gray-400">טוען נתונים...</div>
          ) : curRefStats.length === 0 ? (
            <div className="text-center py-16 text-gray-400">אין נתוני מפנים עדיין</div>
          ) : (
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-3 text-right font-semibold text-gray-600 w-10">#</th>
                    <th className="p-3 text-right font-semibold text-gray-600">מפנה (ref)</th>
                    <th className="p-3 text-center font-semibold text-gray-600 w-28">הרשמות</th>
                  </tr>
                </thead>
                <tbody>
                  {curRefStats.map((row, i) => (
                    <tr key={row.ref} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-gray-400">{i + 1}</td>
                      <td className="p-3 font-mono font-medium text-purple-700">{row.ref}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-white font-bold text-sm bg-purple-500">{row.count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

      </div>
    </div>
  );
}

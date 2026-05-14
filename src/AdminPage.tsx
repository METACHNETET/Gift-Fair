import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./lib/AuthContext";
import { auth, db } from "./lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { collection, getDocs, query, getCountFromServer, orderBy } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Shop } from "./types";
import { RefreshCw, LogOut } from "lucide-react";

// ─── Admin config ─────────────────────────────────────────────────────────────
const ADMIN_EMAIL = "d0527181611@gmail.com";

interface ShopWithLeads extends Shop {
  leadCount: number;
}

interface RefStat {
  ref: string;
  count: number;
}

// ─── AdminPage ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading } = useAuth();
  const [shops, setShops] = useState<ShopWithLeads[]>([]);
  const [refStats, setRefStats] = useState<RefStat[]>([]);
  const [activeTab, setActiveTab] = useState<'shops' | 'refs'>('shops');
  const [fetching, setFetching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const fetchData = useCallback(async () => {
    setFetching(true);
    try {
      const [shopsSnap, finaleSnap] = await Promise.all([
        getDocs(collection(db, "fairs", "main_fair", "shops")),
        getDocs(query(collection(db, "fairs", "main_fair", "finale_leads"), orderBy("claimedAt", "desc"))),
      ]);

      const results = await Promise.all(
        shopsSnap.docs.map(async (shopDoc) => {
          const shop = { id: shopDoc.id, ...shopDoc.data() } as Shop;
          const leadsQ = query(collection(db, "fairs", "main_fair", "shops", shop.id, "leads"));
          const countSnap = await getCountFromServer(leadsQ);
          return { ...shop, leadCount: countSnap.data().count };
        })
      );
      results.sort((a, b) => b.leadCount - a.leadCount);
      setShops(results);

      // group finale_leads by ref
      const refMap: Record<string, number> = {};
      finaleSnap.docs.forEach(d => {
        const r = (d.data().ref as string | undefined) ?? "(ישיר)";
        refMap[r] = (refMap[r] ?? 0) + 1;
      });
      const refArr = Object.entries(refMap)
        .map(([ref, count]) => ({ ref, count }))
        .sort((a, b) => b.count - a.count);
      setRefStats(refArr);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("fetchData failed:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleLogin = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const totalLeads = shops.reduce((sum, s) => sum + s.leadCount, 0);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  // ── Not logged in ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow">
          <h1 className="text-2xl font-bold">דשבורד אדמין</h1>
          <p className="text-gray-500 text-sm">התחבר כדי להמשיך</p>
          <Button onClick={handleLogin}>התחבר עם Google</Button>
        </div>
      </div>
    );
  }

  // ── Not admin ────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow">
          <h1 className="text-2xl font-bold text-red-600">אין גישה</h1>
          <p className="text-gray-500 text-sm">{user.email} אינו מורשה לדף זה.</p>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 ml-2" />
            התנתק
          </Button>
        </div>
      </div>
    );
  }

  // ── Admin dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-6 bg-gray-50" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">דשבורד לידים</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-1">
                עודכן: {lastUpdated.toLocaleTimeString("he-IL")}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData} disabled={fetching}>
              <RefreshCw className={`w-4 h-4 ml-2 ${fetching ? "animate-spin" : ""}`} />
              רענן
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 ml-2" />
              התנתק
            </Button>
          </div>
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{totalLeads}</div>
            <div className="text-sm text-gray-500 mt-1">סה"כ לידים</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {shops.filter((s) => s.leadCount > 0).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">עסקים עם לידים</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-3xl font-bold text-gray-700">{shops.length}</div>
            <div className="text-sm text-gray-500 mt-1">סה"כ עסקים</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('shops')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'shops' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            לפי עסק
          </button>
          <button
            onClick={() => setActiveTab('refs')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'refs' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            לפי מפנה
          </button>
        </div>

        {/* Table - shops */}
        {activeTab === 'shops' && (
          fetching && shops.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop, i) => (
                    <tr key={shop.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-gray-400">{i + 1}</td>
                      <td className="p-3 font-medium">{shop.businessName}</td>
                      <td className="p-3 text-gray-500 hidden sm:table-cell max-w-xs">
                        <span className="line-clamp-2">{shop.giftName}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-white font-bold text-sm ${
                            shop.leadCount >= 10
                              ? "bg-green-500"
                              : shop.leadCount > 0
                              ? "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        >
                          {shop.leadCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Table - refs */}
        {activeTab === 'refs' && (
          fetching && refStats.length === 0 ? (
            <div className="text-center py-16 text-gray-400">טוען נתונים...</div>
          ) : refStats.length === 0 ? (
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
                  {refStats.map((row, i) => (
                    <tr key={row.ref} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="p-3 text-gray-400">{i + 1}</td>
                      <td className="p-3 font-mono font-medium text-purple-700">{row.ref}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-white font-bold text-sm bg-purple-500">
                          {row.count}
                        </span>
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

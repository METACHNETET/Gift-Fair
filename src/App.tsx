import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Store, Users, Share2, Plus, LogIn, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "./lib/AuthContext";
import { auth, db } from "./lib/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { collection, addDoc, query, onSnapshot, doc, getDoc, setDoc, serverTimestamp, where } from "firebase/firestore";
import { useEffect } from "react";
import { Shop, Lead } from "./types";
import { toast } from "sonner";

// Landing Page Component
function FairLanding({ onOpenDashboard }: { onOpenDashboard: () => void }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    // For now, listing all shops in a default fair "main_fair"
    const q = query(collection(db, "fairs", "main_fair", "shops"));
    return onSnapshot(q, (snapshot) => {
      const shopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopsData);
    });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-brand-primary text-white">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://picsum.photos/seed/fair/1920/1080" 
            alt="Fair Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 text-center px-4 max-w-3xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-display mb-6"
          >
            יריד המתנות הדיגיטלי
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl font-light opacity-90 leading-relaxed"
          >
            בואי לגלות עולם של ידע וכלים לצמיחת העסק שלך. 
            כל בעלת עסק כאן הכינה לך מתנה מיוחדת - כל מה שצריך זה לבחור את מה שמתאים לך.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-10 flex flex-wrap justify-center gap-4"
          >
            <Button size="lg" className="bg-brand-accent hover:bg-brand-accent/90 text-white rounded-full px-8 h-12 text-lg">
              צפי במתנות
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 rounded-full px-8 h-12 text-lg"
              onClick={onOpenDashboard}
            >
              אני בעלת עסק
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Gift Grid */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-4xl font-display">המתנות ביריד</h2>
          <Badge variant="secondary" className="px-4 py-1 text-sm">{shops.length} בעלות עסקים משתתפות</Badge>
        </div>

        {shops.length === 0 ? (
          <div className="text-center py-20 bg-stone-100 rounded-3xl border-2 border-dashed border-stone-200">
            <Gift className="mx-auto w-12 h-12 text-stone-300 mb-4" />
            <p className="text-stone-500">היריד עומד להיפתח! בעלות עסקים מוזמנות להצטרף.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shops.map((shop) => (
              <div key={shop.id}>
                <ShopCard shop={shop} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-400 py-12 px-4 text-center">
        <p className="font-display text-white text-2xl mb-4">יריד המתנות</p>
        <p>© 2026 כל הזכויות שמורות לבעלות העסקים המשתתפות</p>
      </footer>
    </div>
  );
}

const ShopCard = ({ shop }: { shop: Shop }) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "fairs", "main_fair", "shops", shop.id, "leads"), {
        ...formData,
        shopId: shop.id,
        claimedAt: serverTimestamp()
      });
      // Increment leads count (ideally in a transaction or cloud function)
      // For now we'll just show success
      toast.success("המתנה בדרך אלייך!", {
        description: "פרטי המתנה נשלחו לאימייל שלך."
      });
      setIsClaiming(false);
    } catch (err) {
      toast.error("שגיאה ברישום", { description: "אנא נסי שנית מאוחר יותר." });
    }
  };

  return (
    <motion.div layout>
      <Card className="overflow-hidden border-none shadow-lg gift-card-hover bg-white rounded-2xl h-full flex flex-col">
        <div className="h-48 bg-stone-200 overflow-hidden">
          <img 
            src={shop.giftImageUrl || "https://picsum.photos/seed/" + shop.id + "/500/300"} 
            alt={shop.giftName} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <CardHeader className="pt-6">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-semibold text-brand-accent">{shop.businessName || "בעלת עסק"}</p>
          </div>
          <CardTitle className="text-2xl font-display">{shop.giftName}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-stone-600 line-clamp-3 leading-relaxed">
            {shop.giftDescription}
          </p>
        </CardContent>
        <CardFooter className="pt-4 border-t border-stone-100 flex justify-between items-center">
          <Dialog open={isClaiming} onOpenChange={setIsClaiming}>
            <DialogTrigger asChild>
              <Button className="bg-brand-primary hover:bg-brand-primary/90 rounded-full px-6">אני רוצה את זה!</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-brand-secondary">
              <DialogHeader>
                <DialogTitle className="text-3xl font-display text-center mb-4">קבלת המתנה</DialogTitle>
                <div className="text-center text-stone-600 mb-6">
                  אנא השלימי את הפרטים והמתנה תשלח אלייך ישירות
                </div>
              </DialogHeader>
              <form onSubmit={handleClaim} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold mr-1">שם מלא</label>
                  <Input 
                    required 
                    placeholder="הכניסי את שמך" 
                    className="bg-white border-stone-200 rounded-xl py-6"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold mr-1">אימייל</label>
                  <Input 
                    required 
                    type="email" 
                    placeholder="example@email.com" 
                    className="bg-white border-stone-200 rounded-xl py-6"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full bg-brand-accent hover:bg-brand-accent/90 py-6 rounded-xl text-lg font-bold">
                  שלחי לי את המתנה
                </Button>
                <p className="text-[10px] text-center text-stone-400 mt-4 leading-tight">
                  בלחיצה על קבלת המתנה את מאשרת הרשמה לרשימת הדיוור של {shop.businessName || "בעלת העסק"}.
                </p>
              </form>
            </DialogContent>
          </Dialog>
          <div className="flex items-center text-stone-400 text-sm">
            <Users className="w-4 h-4 ml-1" />
            <span>{shop.leadsCount || 0}</span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// Business Dashboard Component
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
          יריד המתנות...
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

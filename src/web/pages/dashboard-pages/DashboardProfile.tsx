import DashboardLayout from "@/components/DashboardLayout";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Shield, Bell } from "lucide-react";
import { useState } from "react";

export default function DashboardProfile() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [form, setForm] = useState({ firstName: "Armen", lastName: "Petrosyan", email: "armen@example.com", phone: "+374 99 123 456", dob: "1998-05-15" });
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [notifs, setNotifs] = useState([true, true, false, true]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setP = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setPass(f => ({ ...f, [k]: e.target.value }));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) { showToast(t("fillRequired"), "error"); return; }
    setSavingProfile(true);
    setTimeout(() => { setSavingProfile(false); showToast(t("profileSaved"), "success"); }, 700);
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass.current || !pass.next || !pass.confirm) { showToast(t("fillRequired"), "error"); return; }
    if (pass.next.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }
    if (pass.next !== pass.confirm) { showToast("Passwords do not match.", "error"); return; }
    setSavingPass(true);
    setTimeout(() => {
      setSavingPass(false);
      setPass({ current: "", next: "", confirm: "" });
      showToast(t("passwordUpdated"), "success");
    }, 700);
  };

  const toggleNotif = (i: number) => {
    setNotifs(n => { const copy = [...n]; copy[i] = !copy[i]; return copy; });
    showToast("Preferences updated.", "success");
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("profile")}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <Card className="p-6 border-slate-100 text-center">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-3xl mx-auto">
              {form.firstName[0]}
            </div>
            <button
              onClick={() => showToast("Photo upload coming soon.", "info")}
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 border-2 border-white"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <h3 className="font-bold text-slate-900 text-lg">{form.firstName} {form.lastName}</h3>
          <p className="text-slate-500 text-sm mt-0.5">{form.email}</p>
          <Badge className="mt-3 bg-blue-100 text-blue-700">Standard Package</Badge>
          <div className="mt-6 space-y-2.5 text-left">
            {[
              { label: "Member since", value: "March 2026" },
              { label: "Lessons completed", value: "4 / 18" },
              { label: "Instructor", value: "Armen Petrosyan" },
            ].map((r, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-slate-50 pb-2">
                <span className="text-slate-500">{r.label}</span>
                <span className="font-medium text-slate-900">{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-5">Personal Information</h3>
            <form onSubmit={handleSaveProfile}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("firstName")}</label>
                  <Input value={form.firstName} onChange={set("firstName")} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("lastName")}</label>
                  <Input value={form.lastName} onChange={set("lastName")} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("emailAddress")}</label>
                  <Input type="email" value={form.email} onChange={set("email")} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("phoneNumber")}</label>
                  <Input type="tel" value={form.phone} onChange={set("phone")} className="h-10" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of Birth</label>
                  <Input type="date" value={form.dob} onChange={set("dob")} className="h-10" />
                </div>
              </div>
              <Button type="submit" disabled={savingProfile} className="mt-5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70">
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Card>

          <Card className="p-6 border-slate-100">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Change Password</h3>
            </div>
            <form onSubmit={handlePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
                <Input type="password" value={pass.current} onChange={setP("current")} placeholder="••••••••" className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                <Input type="password" value={pass.next} onChange={setP("next")} placeholder="Min. 8 characters" className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                <Input type="password" value={pass.confirm} onChange={setP("confirm")} placeholder="Repeat new password" className="h-10" />
              </div>
              <Button type="submit" disabled={savingPass} variant="outline" className="border-slate-200 disabled:opacity-70">
                {savingPass ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Card>

          <Card className="p-6 border-slate-100">
            <div className="flex items-center gap-2 mb-5">
              <Bell className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-900">Notification Preferences</h3>
            </div>
            <div className="space-y-4">
              {[
                "Email reminders before lessons",
                "SMS notifications",
                "Promotional emails",
                "Lesson cancellations",
              ].map((opt, i) => (
                <label key={i} className="flex items-center justify-between cursor-pointer group">
                  <span className="text-sm text-slate-700">{opt}</span>
                  <div className="relative" onClick={() => toggleNotif(i)}>
                    <div className={`w-10 h-5 rounded-full transition-colors ${notifs[i] ? "bg-blue-600" : "bg-slate-200"}`} />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifs[i] ? "translate-x-5" : ""}`} />
                  </div>
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

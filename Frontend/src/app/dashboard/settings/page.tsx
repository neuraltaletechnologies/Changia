"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/dashboard/ui/button";
import { Input } from "@/components/dashboard/ui/input";
import { Label } from "@/components/dashboard/ui/label";
import { Textarea } from "@/components/dashboard/ui/textarea";
import { Switch } from "@/components/dashboard/ui/switch";
import { Separator } from "@/components/dashboard/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/dashboard/ui/select";
import { PasswordInput } from "@/components/dashboard/ui/password-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import { Building2, Bell, Shield, Globe, Percent } from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { ApiClientError, changePasswordRequest } from "@/lib/api-client";
import {
  organizationApi,
  settingsApi,
  type OrgNotificationPrefs,
  type OrgSettings,
  type OrgSettingsUpdate,
} from "@/lib/dashboard/api";

const allTabs = [
  { value: "organisation", label: "Organisation", icon: Building2, permission: "settings:org" as const },
  { value: "notifications", label: "Notifications", icon: Bell, permission: "settings:org" as const },
  { value: "localisation", label: "Localisation", icon: Globe, permission: "settings:org" as const },
  // Password change is per-account, so every role sees the Security tab.
  { value: "security", label: "Security", icon: Shield },
];

const NOTIFICATION_ITEMS: { key: keyof OrgNotificationPrefs; label: string; desc: string }[] = [
  {
    key: "notifyOnDonation",
    label: "New donation received",
    desc: "Email the organisation every time a donation is confirmed",
  },
  {
    key: "notifyOnCampaignStatus",
    label: "Campaign status changes",
    desc: "Notify when a campaign is submitted, approved, paused or completed",
  },
  {
    key: "notifyOnUserInvite",
    label: "Team member invites",
    desc: "Notify when a new user is invited to the organisation",
  },
];

export default function SettingsPage() {
  const { hasPermission } = useRole();
  const canManageOrg = hasPermission("settings:org");

  const tabs = allTabs.filter((t) => !t.permission || hasPermission(t.permission));

  // ─── Organisation settings (org admin+, backed by /settings/org) ────────────
  const [loading, setLoading] = useState(canManageOrg);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [orgName, setOrgName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [defaultChannel, setDefaultChannel] =
    useState<OrgSettings["defaultChannel"]>("SMS");

  const [notifications, setNotifications] = useState<OrgNotificationPrefs>({
    notifyOnDonation: true,
    notifyOnCampaignStatus: true,
    notifyOnUserInvite: true,
  });

  const [currency, setCurrency] = useState<OrgSettings["currency"]>("TZS");
  const [language, setLanguage] = useState<OrgSettings["language"]>("en");
  const [timezone, setTimezone] = useState<OrgSettings["timezone"]>("eat");
  const [dateFormat, setDateFormat] = useState<OrgSettings["dateFormat"]>("dmy");

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<{ section: string; message: string } | null>(
    null
  );

  const applySettings = (s: OrgSettings) => {
    setOrgName(s.orgName ?? "");
    setRegistrationNumber(s.registrationNumber ?? "");
    setPrimaryEmail(s.primaryEmail ?? "");
    setPhone(s.phone ?? "");
    setDescription(s.description ?? "");
    setDefaultChannel(s.defaultChannel ?? "SMS");
    setNotifications({
      notifyOnDonation: s.notifications?.notifyOnDonation ?? true,
      notifyOnCampaignStatus: s.notifications?.notifyOnCampaignStatus ?? true,
      notifyOnUserInvite: s.notifications?.notifyOnUserInvite ?? true,
    });
    setCurrency(s.currency ?? "TZS");
    setLanguage(s.language ?? "en");
    setTimezone(s.timezone ?? "eat");
    setDateFormat(s.dateFormat ?? "dmy");
  };

  useEffect(() => {
    if (!canManageOrg) return;
    setLoading(true);
    setLoadError(null);
    settingsApi
      .getOrg()
      .then(applySettings)
      .catch(() => setLoadError("Failed to load your organisation settings."))
      .finally(() => setLoading(false));
  }, [canManageOrg]);

  const saveSection = async (section: string, patch: OrgSettingsUpdate) => {
    setSectionError(null);
    setSavedSection(null);
    setSavingSection(section);
    try {
      const updated = await settingsApi.updateOrg(patch);
      applySettings(updated);
      setSavedSection(section);
      setTimeout(
        () => setSavedSection((current) => (current === section ? null : current)),
        3000
      );
    } catch (err) {
      setSectionError({
        section,
        message: err instanceof ApiClientError ? err.message : "Failed to save changes.",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const sectionButtonLabel = (section: string, idle: string) =>
    savingSection === section ? "Saving…" : savedSection === section ? "Saved!" : idle;

  // ─── Campaign service fee (Organisation tab) ───────────────────────────────
  // The % added on top of every campaign's goal by default — see computeFees()
  // in Backend/modules/campaign/service.js. Uses its own endpoint.
  const [feePercent, setFeePercent] = useState("5");
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [feeSaved, setFeeSaved] = useState(false);

  useEffect(() => {
    if (!canManageOrg) return;
    setFeeLoading(true);
    organizationApi
      .getMine()
      .then((org) => setFeePercent(String(org.defaultServiceFeePercent)))
      .catch(() => setFeeError("Failed to load the current service fee."))
      .finally(() => setFeeLoading(false));
  }, [canManageOrg]);

  const handleSaveFee = async () => {
    setFeeError(null);
    setFeeSaved(false);
    const value = Number(feePercent);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setFeeError("Enter a percentage between 0 and 100.");
      return;
    }
    setFeeSaving(true);
    try {
      const org = await organizationApi.updateMine({ defaultServiceFeePercent: value });
      setFeePercent(String(org.defaultServiceFeePercent));
      setFeeSaved(true);
      setTimeout(() => setFeeSaved(false), 3000);
    } catch (err) {
      setFeeError(err instanceof ApiClientError ? err.message : "Failed to update the service fee.");
    } finally {
      setFeeSaving(false);
    }
  };

  // ─── Password change (Security tab) ─────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordServerError, setPasswordServerError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async () => {
    setPasswordServerError(null);
    setPasswordSuccess(false);

    const nextErrors: Record<string, string> = {};
    if (!currentPassword) nextErrors.currentPassword = "Current password is required.";
    if (!newPassword || newPassword.length < 8) {
      nextErrors.newPassword = "New password must be at least 8 characters.";
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPasswordLoading(true);
    try {
      await changePasswordRequest({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordServerError(
        err instanceof ApiClientError ? err.message : "Failed to update password."
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const errorFor = (section: string) =>
    sectionError && sectionError.section === section ? sectionError.message : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organisation preferences and account settings
        </p>
      </div>

      <Tabs defaultValue={tabs[0]?.value ?? "security"}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs gap-1.5 data-[state=active]:bg-card"
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ─── Organisation ─────────────────────────────────────────────── */}
        {canManageOrg && (
          <TabsContent value="organisation" className="space-y-6">
            {loadError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            ) : loading ? (
              <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
            ) : (
              <>
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
                  <h2 className="text-sm font-semibold text-foreground">Organisation Profile</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Organisation Name</Label>
                      <Input
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        maxLength={150}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Registration Number</Label>
                      <Input
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        maxLength={100}
                        placeholder="e.g. NGO-TZ-2021-004872"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Primary Email</Label>
                      <Input
                        value={primaryEmail}
                        onChange={(e) => setPrimaryEmail(e.target.value)}
                        type="email"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+255 7XX XXX XXX"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                  {errorFor("org") && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {errorFor("org")}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={savingSection === "org"}
                      onClick={() => {
                        const patch: OrgSettingsUpdate = {
                          orgName: orgName.trim(),
                          registrationNumber: registrationNumber.trim() || null,
                          description: description.trim(),
                        };
                        if (primaryEmail.trim()) patch.primaryEmail = primaryEmail.trim();
                        if (phone.trim()) patch.phone = phone.trim();
                        saveSection("org", patch);
                      }}
                    >
                      {sectionButtonLabel("org", "Save Changes")}
                    </Button>
                  </div>
                </div>

                {/* Campaign service fee */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Percent className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Campaign Service Fee</h2>
                      <p className="text-xs text-muted-foreground">
                        Added on top of every campaign&apos;s goal amount (goal + fee = public
                        target). Campaign managers see this rate applied when they set a goal — only
                        an organisation admin can change it here.
                      </p>
                    </div>
                  </div>
                  <div className="max-w-[220px] space-y-1.5">
                    <Label className="text-xs">Service Fee (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={feePercent}
                        onChange={(e) => setFeePercent(e.target.value)}
                        disabled={feeLoading || feeSaving}
                        className="h-9 text-sm pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      e.g. a 5,000,000 TZS goal at 5% shows donors a public target of 5,250,000 TZS.
                    </p>
                  </div>
                  {feeError && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {feeError}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSaveFee} disabled={feeLoading || feeSaving}>
                      {feeSaving ? "Saving…" : feeSaved ? "Saved!" : "Save Fee"}
                    </Button>
                  </div>
                </div>

                {/* Donor defaults */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                  <h2 className="text-sm font-semibold text-foreground">Donor Defaults</h2>
                  <div className="max-w-[280px] space-y-1.5">
                    <Label className="text-xs">Default Communication Channel</Label>
                    <Select
                      value={defaultChannel}
                      onValueChange={(v) =>
                        setDefaultChannel((v as OrgSettings["defaultChannel"]) ?? "SMS")
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMS">SMS</SelectItem>
                        <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                        <SelectItem value="EMAIL">Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      The channel pre-selected when you send a reminder to a donor pool.
                    </p>
                  </div>
                  {errorFor("channel") && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {errorFor("channel")}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={savingSection === "channel"}
                      onClick={() => saveSection("channel", { defaultChannel })}
                    >
                      {sectionButtonLabel("channel", "Save Changes")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        )}

        {/* ─── Notifications ────────────────────────────────────────────── */}
        {canManageOrg && (
          <TabsContent value="notifications" className="space-y-4">
            {loadError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            ) : loading ? (
              <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
                <h2 className="text-sm font-semibold text-foreground">Email Notifications</h2>
                {NOTIFICATION_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(v) =>
                        setNotifications((prev) => ({ ...prev, [item.key]: Boolean(v) }))
                      }
                    />
                  </div>
                ))}
                {errorFor("notifications") && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {errorFor("notifications")}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={savingSection === "notifications"}
                    onClick={() => saveSection("notifications", { notifications })}
                  >
                    {sectionButtonLabel("notifications", "Save Changes")}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* ─── Localisation ─────────────────────────────────────────────── */}
        {canManageOrg && (
          <TabsContent value="localisation" className="space-y-4">
            {loadError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {loadError}
              </div>
            ) : loading ? (
              <div className="h-64 rounded-xl bg-muted/60 animate-pulse" />
            ) : (
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Localisation &amp; Currency</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Currency</Label>
                    <Select
                      value={currency}
                      onValueChange={(v) => setCurrency((v as OrgSettings["currency"]) ?? "TZS")}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TZS">TZS – Tanzanian Shilling</SelectItem>
                        <SelectItem value="USD">USD – US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR – Euro</SelectItem>
                        <SelectItem value="GBP">GBP – British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Language</Label>
                    <Select
                      value={language}
                      onValueChange={(v) => setLanguage((v as OrgSettings["language"]) ?? "en")}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="sw">Kiswahili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Timezone</Label>
                    <Select
                      value={timezone}
                      onValueChange={(v) => setTimezone((v as OrgSettings["timezone"]) ?? "eat")}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eat">EAT – East Africa Time (UTC+3)</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date Format</Label>
                    <Select
                      value={dateFormat}
                      onValueChange={(v) => setDateFormat((v as OrgSettings["dateFormat"]) ?? "dmy")}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {errorFor("localisation") && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {errorFor("localisation")}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={savingSection === "localisation"}
                    onClick={() =>
                      saveSection("localisation", { currency, language, timezone, dateFormat })
                    }
                  >
                    {sectionButtonLabel("localisation", "Save Changes")}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* ─── Security ─────────────────────────────────────────────────── */}
        <TabsContent value="security" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Current Password</Label>
                <PasswordInput
                  className={`h-9 text-sm ${passwordErrors.currentPassword ? "border-destructive" : ""}`}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                />
                {passwordErrors.currentPassword ? (
                  <p role="alert" className="text-xs text-destructive">
                    {passwordErrors.currentPassword}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New Password</Label>
                <PasswordInput
                  className={`h-9 text-sm ${passwordErrors.newPassword ? "border-destructive" : ""}`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                />
                {passwordErrors.newPassword ? (
                  <p role="alert" className="text-xs text-destructive">
                    {passwordErrors.newPassword}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">8+ characters required</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirm New Password</Label>
                <PasswordInput
                  className={`h-9 text-sm ${passwordErrors.confirmPassword ? "border-destructive" : ""}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                />
                {passwordErrors.confirmPassword ? (
                  <p role="alert" className="text-xs text-destructive">
                    {passwordErrors.confirmPassword}
                  </p>
                ) : null}
              </div>
              {passwordServerError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {passwordServerError}
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Password updated successfully.
                </div>
              )}
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button size="sm" onClick={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? "Updating…" : "Update Password"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

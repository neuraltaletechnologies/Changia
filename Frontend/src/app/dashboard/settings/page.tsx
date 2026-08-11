"use client";

import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/dashboard/ui/tabs";
import {
  Building2,
  Bell,
  Shield,
  Globe,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

const tabs = [
  { value: "organisation", label: "Organisation", icon: Building2 },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "security", label: "Security", icon: Shield },
  { value: "localisation", label: "Localisation", icon: Globe },
];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-[800px]">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your organisation preferences and account settings
        </p>
      </div>

      <Tabs defaultValue="organisation">
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

        {/* Organisation */}
        <TabsContent value="organisation" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-foreground">
              Organisation Profile
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Organisation Name</Label>
                <Input
                  defaultValue="Changia Foundation TZ"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registration Number</Label>
                <Input
                  defaultValue="NGO-TZ-2021-004872"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Email</Label>
                <Input
                  defaultValue="hello@changia.tz"
                  type="email"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  defaultValue="+255 22 000 0000"
                  className="h-9 text-sm"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Website</Label>
                <Input
                  defaultValue="https://changia.tz"
                  className="h-9 text-sm"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  defaultValue="Changia Foundation TZ is a Tanzanian fundraising platform connecting donors with verified NGOs and community projects."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave}>
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Donor defaults */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Donor Defaults
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Default Consent Status</Label>
                <Select defaultValue="pending">
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="consented">Consented</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Communication Channel</Label>
                <Select defaultValue="email">
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave}>
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-foreground">
              Email Notifications
            </h2>
            {[
              {
                label: "New donation received",
                desc: "Get notified every time a donation is recorded",
                defaultChecked: true,
              },
              {
                label: "Campaign  milestone reached",
                desc: "Notify when a Campaign  reaches 25%, 50%, 75% and 100%",
                defaultChecked: true,
              },
              {
                label: "Donor consent changes",
                desc: "Alert when a donor's consent status is updated",
                defaultChecked: true,
              },
              {
                label: "Team member activity",
                desc: "Summaries of team logins and key actions",
                defaultChecked: false,
              },
              {
                label: "Weekly digest",
                desc: "A weekly summary of donation activity and Campaign  progress",
                defaultChecked: true,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-semibold text-foreground">
              Password & Authentication
            </h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Current Password</Label>
                <Input type="password" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New Password</Label>
                <Input type="password" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Confirm New Password</Label>
                <Input type="password" className="h-9 text-sm" />
              </div>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Two-Factor Authentication
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add an extra layer of security with 2FA via authenticator app
                </p>
              </div>
              <Switch defaultChecked={false} />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-foreground">
                  Session timeout
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Automatically sign out after inactivity
                </p>
              </div>
              <Select defaultValue="60">
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave}>
                Update Password
              </Button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-card border border-destructive/30 rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Danger Zone
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  These actions are irreversible. Please be certain.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Delete Organisation
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Permanently delete this organisation and all its data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Localisation */}
        <TabsContent value="localisation" className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Localisation & Currency
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Currency</Label>
                <Select defaultValue="TZS">
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
                <Select defaultValue="en">
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
                <Select defaultValue="eat">
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
                <Select defaultValue="dmy">
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
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave}>
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

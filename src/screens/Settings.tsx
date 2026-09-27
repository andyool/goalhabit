import { Bell, Database, Download, Palette, Sparkles, Trash, Upload, User } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Button, Card, inputCls, List, PageHeader, Row, SectionTitle, Segmented, Toggle } from "../components/ui";
import { APP_NAME } from "../lib/brand";
import { requestNotificationPermission } from "../lib/notifications";
import { snapshot, useStore } from "../lib/store";
import type { AppState } from "../lib/types";
import { navigate, toast } from "../lib/ui";
import { ApiKeySetup } from "./Coach";

function Label({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon} {children}
    </span>
  );
}

export function Settings() {
  const state = useStore();
  const { profile, updateProfile } = state;
  const [name, setName] = useState(profile.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const data = { ...snapshot(), profile: { ...profile, apiKey: "" } };
    const blob = new Blob([JSON.stringify({ app: APP_NAME, version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${APP_NAME.toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Backup downloaded", "good");
  };

  const importData = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      const data = (json.data ?? json) as AppState;
      if (!Array.isArray(data.habits) || !Array.isArray(data.goals) || typeof data.logs !== "object") throw new Error("Not a valid backup file");
      if (!confirm("Replace all current data with this backup?")) return;
      state.importData({ ...data, profile: { ...data.profile, apiKey: profile.apiKey, onboarded: true } });
      toast("Backup restored", "good");
      navigate({ name: "today" }, { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed", "warn");
    }
  };

  return (
    <div>
      <PageHeader title="Settings" back={{ name: "profile" }} />

      <SectionTitle>
        <Label icon={<User size={13} />}>Profile</Label>
      </SectionTitle>
      <Card className="flex gap-2 p-3">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <Button
          variant="secondary"
          disabled={name.trim() === profile.name}
          onClick={() => {
            updateProfile({ name: name.trim() });
            toast("Saved", "good");
          }}
        >
          Save
        </Button>
      </Card>

      <SectionTitle>
        <Label icon={<Palette size={13} />}>Appearance</Label>
      </SectionTitle>
      <Segmented
        value={profile.theme}
        onChange={(theme) => updateProfile({ theme })}
        options={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "system", label: "System" },
        ]}
      />

      <SectionTitle>
        <Label icon={<Bell size={13} />}>Notifications</Label>
      </SectionTitle>
      <List>
        <Row>
          <div className="flex-1">
            <div className="text-[15px] font-medium">Habit reminders</div>
            <div className="text-xs text-fg-3">At each habit's reminder time, while {APP_NAME} is open or installed</div>
          </div>
          <Toggle
            checked={profile.remindersEnabled}
            onChange={async (v) => {
              if (v) {
                const ok = await requestNotificationPermission();
                if (!ok) return toast("Notifications are blocked in your browser settings", "warn");
              }
              updateProfile({ remindersEnabled: v });
            }}
          />
        </Row>
        <Row>
          <div className="flex-1">
            <div className="text-[15px] font-medium">Goal off-track alerts</div>
            <div className="text-xs text-fg-3">Get notified once a day when a goal falls behind</div>
          </div>
          <Toggle checked={profile.offTrackAlerts} onChange={(v) => updateProfile({ offTrackAlerts: v })} />
        </Row>
      </List>

      <SectionTitle>
        <Label icon={<Sparkles size={13} />}>AI Agent</Label>
      </SectionTitle>
      <ApiKeySetup compact />
      {profile.apiKey && (
        <button type="button" onClick={() => updateProfile({ apiKey: "" })} className="mt-2 w-full py-2 text-center text-sm font-medium text-bad">
          Remove API key
        </button>
      )}

      <SectionTitle>
        <Label icon={<Database size={13} />}>Data</Label>
      </SectionTitle>
      <List>
        <Row onClick={exportData}>
          <Download size={18} className="text-fg-3" />
          <span className="flex-1 text-[15px] font-medium">Export backup</span>
        </Row>
        <Row onClick={() => fileRef.current?.click()}>
          <Upload size={18} className="text-fg-3" />
          <span className="flex-1 text-[15px] font-medium">Import backup</span>
        </Row>
        <Row
          onClick={() => {
            if (!confirm("Load demo data? This replaces everything you have now.")) return;
            const key = profile.apiKey;
            state.loadDemo();
            updateProfile({ apiKey: key, theme: profile.theme });
            toast("Demo data loaded", "good");
            navigate({ name: "today" }, { replace: true });
          }}
        >
          <Sparkles size={18} className="text-fg-3" />
          <span className="flex-1 text-[15px] font-medium">Load demo data</span>
        </Row>
        <Row
          onClick={() => {
            if (!confirm("Delete all goals, habits and history? This can't be undone.")) return;
            state.resetAll();
            navigate({ name: "today" }, { replace: true });
          }}
        >
          <Trash size={18} className="text-bad" />
          <span className="flex-1 text-[15px] font-medium text-bad">Reset everything</span>
        </Row>
      </List>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importData(f);
          e.target.value = "";
        }}
      />

      <p className="mt-8 text-center text-xs text-fg-3">
        {APP_NAME} · all data stays on this device
      </p>
    </div>
  );
}

import { useState } from "react";
import { Chat } from "@/components/chat";
import { PinyinInput } from "@/components/pinyin-input";
import { PolishInput } from "@/components/polish-input";
import { SettingsPanel } from "@/components/settings-panel";
import { FlowBackground } from "@/components/flow-background";
import { SettingsProvider } from "@/hooks/use-settings";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SettingsProvider>
      <FlowBackground />
      <div className="relative flex min-h-svh items-center justify-center gap-6 p-4">
        <Chat />
        <PinyinInput />
        <PolishInput />
        <SettingsPanel open={settingsOpen} onToggle={() => setSettingsOpen((v) => !v)} />
      </div>
    </SettingsProvider>
  );
}

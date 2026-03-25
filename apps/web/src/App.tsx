import { useState } from "react";
import { Chat } from "@/components/chat";
import { PinyinInput } from "@/components/pinyin-input";
import { SettingsSheet } from "@/components/settings-sheet";
import { SettingsProvider } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <SettingsProvider>
      <div className="relative flex min-h-svh items-end justify-center gap-6 bg-background p-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={() => setSettingsOpen(true)}
          title="Settings"
        >
          <Settings className="size-5" />
        </Button>

        <Chat />
        <PinyinInput />

        <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </SettingsProvider>
  );
}

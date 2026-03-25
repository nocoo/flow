import { useStreamingPredict } from "@/hooks/use-streaming-predict";
import { StreamingCard } from "@/components/streaming-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";
import { API_BASE } from "@/lib/api";

export function PinyinInput() {
  const predict = useStreamingPredict({
    apiUrl: `${API_BASE}/api/pinyin`,
    buildBody: (text, context) => ({ text, context }),
  });

  return (
    <StreamingCard
      predict={predict}
      header={{
        icon: <Keyboard className="size-5 text-primary" />,
        title: "Pinyin Input",
        subtitle: "AI-powered IME",
      }}
      emptyState={{
        icon: <Keyboard className="size-10" />,
        text: "Type pinyin to start",
        subtext: "Space or Enter to commit",
      }}
      placeholder="Type pinyin... (Space/Enter to commit)"
      inputClassName="font-mono"
      commitKeys={[" ", "Enter"]}
      renderEntry={(entry) => (
        <Card className="px-4 py-3">
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-1.5 font-mono text-xs">
              {entry.input}
            </Badge>
            <p className="text-lg leading-snug">{entry.output}</p>
          </div>
        </Card>
      )}
      renderDraft={(draft) => (
        <Card className="px-4 py-3 border-dashed border-primary/30">
          <div className="min-w-0">
            <Badge variant="outline" className="mb-1.5 font-mono text-xs">
              {draft.input}
            </Badge>
            <p className="text-lg leading-snug text-foreground/80">
              {draft.output}
            </p>
          </div>
        </Card>
      )}
    />
  );
}

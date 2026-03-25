import { useStreamingPredict } from "@/hooks/use-streaming-predict";
import { StreamingCard } from "@/components/streaming-card";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { API_BASE } from "@/lib/api";

export function PolishInput() {
  const predict = useStreamingPredict({
    apiUrl: `${API_BASE}/api/polish`,
    buildBody: (text, context) => ({ text, context }),
  });

  return (
    <StreamingCard
      predict={predict}
      header={{
        icon: <Sparkles className="size-5 text-primary" />,
        title: "Polish",
        subtitle: "盘古之白",
      }}
      emptyState={{
        icon: <Sparkles className="size-10" />,
        text: "Type text to polish",
        subtext: "Enter to commit",
      }}
      placeholder="Type text to polish... (Enter to commit)"
      commitKeys={["Enter"]}
      renderEntry={(entry) => (
        <Card className="px-4 py-3 space-y-1.5">
          <p className="text-xs text-muted-foreground line-through decoration-muted-foreground/40">
            {entry.input}
          </p>
          <p className="text-lg leading-snug">{entry.output}</p>
        </Card>
      )}
      renderDraft={(draft) => (
        <Card className="px-4 py-3 space-y-1.5 border-dashed border-primary/30">
          <p className="text-xs text-muted-foreground line-through decoration-muted-foreground/40">
            {draft.input}
          </p>
          <p className="text-lg leading-snug text-foreground/80">
            {draft.output}
          </p>
        </Card>
      )}
    />
  );
}

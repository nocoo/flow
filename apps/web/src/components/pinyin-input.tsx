import { useRef, useEffect, useState } from "react";
import { usePinyin } from "@/hooks/use-pinyin";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Loader2, X } from "lucide-react";

interface CommittedEntry {
  id: string;
  pinyin: string;
  chinese: string;
}

const AUTO_SNAPSHOT_INTERVAL_MS = 1000;

export function PinyinInput() {
  const [input, setInput] = useState("");
  // Frozen entries from previous "上屏" operations
  const [entries, setEntries] = useState<CommittedEntry[]>([]);
  // The live draft that auto-updates every second while user is typing
  const [draft, setDraft] = useState<{ pinyin: string; chinese: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSnapshotRef = useRef("");

  const { prediction, isPredicting, error, predict, cancel } = usePinyin();

  // On every input change, send the full input to LLM
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (value.trim()) {
      predict(value, entries.map((e) => e.chinese));
    } else {
      cancel();
      setDraft(null);
      lastSnapshotRef.current = "";
    }
  };

  // Space / Enter = 上屏: freeze current prediction as a committed entry, clear input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      (e.key === " " || e.key === "Enter") &&
      input.trim() &&
      prediction.trim()
    ) {
      e.preventDefault();
      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          pinyin: input.trim(),
          chinese: prediction.trim(),
        },
      ]);
      setInput("");
      setDraft(null);
      lastSnapshotRef.current = "";
      cancel();
    }
  };

  // Auto-snapshot every second: update the draft card with latest prediction
  // Does NOT clear the input — user keeps typing
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        input.trim() &&
        prediction.trim() &&
        !isPredicting &&
        prediction.trim() !== lastSnapshotRef.current
      ) {
        setDraft({ pinyin: input.trim(), chinese: prediction.trim() });
        lastSnapshotRef.current = prediction.trim();
      }
    }, AUTO_SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [input, prediction, isPredicting]);

  // Auto-scroll on new entries or draft updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, draft]);

  // Clear everything
  const clearAll = () => {
    setEntries([]);
    setInput("");
    setDraft(null);
    cancel();
    lastSnapshotRef.current = "";
    inputRef.current?.focus();
  };

  return (
    <div className="flex w-full max-w-xl flex-col rounded-xl border bg-card shadow-lg h-[80svh]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Keyboard className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Pinyin Input</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          AI-powered IME
        </span>
      </div>

      {/* Committed entries + live draft */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-3 py-4">
          {entries.length === 0 && !draft && !prediction && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <Keyboard className="size-10" />
              <p className="text-sm">Type pinyin to start</p>
              <p className="text-xs">Space or Enter to commit</p>
            </div>
          )}

          {/* Frozen entries */}
          {entries.map((entry) => (
            <Card key={entry.id} className="px-4 py-3">
              <div className="min-w-0">
                <Badge variant="secondary" className="mb-1.5 font-mono text-xs">
                  {entry.pinyin}
                </Badge>
                <p className="text-lg leading-snug">{entry.chinese}</p>
              </div>
            </Card>
          ))}

          {/* Live draft — auto-updated every second, visually distinct */}
          {draft && (
            <Card className="px-4 py-3 border-dashed border-primary/30">
              <div className="min-w-0">
                <Badge variant="outline" className="mb-1.5 font-mono text-xs">
                  {draft.pinyin}
                </Badge>
                <p className="text-lg leading-snug text-foreground/80">
                  {draft.chinese}
                </p>
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Prediction display — shows live streaming result */}
      <div className="border-t bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2 min-h-8">
          <p className="text-lg leading-snug text-foreground">
            {prediction || (
              <span className="text-sm text-muted-foreground">
                {input.trim()
                  ? "Waiting for prediction..."
                  : "Prediction will appear here"}
              </span>
            )}
          </p>
          {isPredicting && (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type pinyin..."
            className="font-mono"
            autoFocus
          />
          {(entries.length > 0 || draft) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearAll}
              title="Clear all"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Space / Enter to commit
        </p>
      </div>
    </div>
  );
}

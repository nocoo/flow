import { useRef, useEffect, useState, useCallback } from "react";
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
  timestamp: number;
}

const MAX_CONTEXT_ENTRIES = 5;
const AUTO_COMMIT_INTERVAL_MS = 1000;

export function PinyinInput() {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<CommittedEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastAutoCommitRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { prediction, isPredicting, error, predict, cancel } = usePinyin();

  // Build context from recent committed entries
  const getContext = useCallback(
    () =>
      entries.slice(-MAX_CONTEXT_ENTRIES).map((e) => e.chinese),
    [entries]
  );

  // Commit current prediction as an entry
  const commit = useCallback(
    (pinyin: string, chinese: string) => {
      if (!pinyin.trim() || !chinese.trim()) return;
      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          pinyin: pinyin.trim(),
          chinese: chinese.trim(),
          timestamp: Date.now(),
        },
      ]);
      lastAutoCommitRef.current = chinese.trim();
    },
    []
  );

  // On every input change, trigger prediction
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    predict(value, getContext());
  };

  // Space commits current prediction
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " && input.trim() && prediction.trim()) {
      e.preventDefault();
      commit(input, prediction);
      setInput("");
      cancel();
      predict("");
    }
  };

  // Auto-commit every 1 second if prediction changed
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        input.trim() &&
        prediction.trim() &&
        !isPredicting &&
        prediction.trim() !== lastAutoCommitRef.current
      ) {
        commit(input, prediction);
        setInput("");
        cancel();
        predict("");
      }
    }, AUTO_COMMIT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [input, prediction, isPredicting, commit, cancel, predict]);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  // Clear all entries
  const clearAll = () => {
    setEntries([]);
    setInput("");
    cancel();
    predict("");
    lastAutoCommitRef.current = "";
    inputRef.current?.focus();
  };

  return (
    <div className="flex w-full max-w-md flex-col rounded-xl border bg-card shadow-lg h-[80svh]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Keyboard className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Pinyin Input</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          AI-powered IME
        </span>
      </div>

      {/* Committed entries */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-3 py-4">
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <Keyboard className="size-10" />
              <p className="text-sm">Type pinyin to start</p>
              <p className="text-xs">Press Space to commit</p>
            </div>
          )}

          {entries.map((entry) => (
            <Card key={entry.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Badge variant="secondary" className="mb-1.5 font-mono text-xs">
                    {entry.pinyin}
                  </Badge>
                  <p className="text-lg leading-snug">{entry.chinese}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Prediction display */}
      <div className="border-t bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2 min-h-8">
          <p className="text-lg leading-snug text-foreground">
            {prediction || (
              <span className="text-sm text-muted-foreground">
                {input.trim() ? "Waiting for prediction..." : "Prediction will appear here"}
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
          {entries.length > 0 && (
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
          Space to commit · Auto-saves every second
        </p>
      </div>
    </div>
  );
}

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

const AUTO_COMMIT_INTERVAL_MS = 1000;

export function PinyinInput() {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<CommittedEntry[]>([]);
  const [committedPinyin, setCommittedPinyin] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCommittedChineseRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { prediction, isPredicting, error, predict, cancel } = usePinyin();

  // Full pinyin = all previously committed pinyin + current input
  const getFullPinyin = useCallback(
    (currentInput: string) => {
      const parts = [committedPinyin, currentInput].filter(Boolean);
      return parts.join("");
    },
    [committedPinyin]
  );

  // Commit: snapshot the current full prediction as an entry
  const commit = useCallback(
    (currentInput: string, chinese: string) => {
      if (!currentInput.trim() || !chinese.trim()) return;

      const fullPinyin = committedPinyin + currentInput.trim();

      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          pinyin: fullPinyin,
          chinese: chinese.trim(),
          timestamp: Date.now(),
        },
      ]);
      setCommittedPinyin(fullPinyin);
      lastCommittedChineseRef.current = chinese.trim();
    },
    [committedPinyin]
  );

  // On every input change, send full accumulated pinyin to LLM
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    const fullPinyin = getFullPinyin(value);
    predict(fullPinyin);
  };

  // Space commits current prediction
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " && input.trim() && prediction.trim()) {
      e.preventDefault();
      commit(input, prediction);
      setInput("");
      cancel();
      // Don't clear prediction — keep showing last result
    }
  };

  // Auto-commit every 1 second if prediction changed
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        input.trim() &&
        prediction.trim() &&
        !isPredicting &&
        prediction.trim() !== lastCommittedChineseRef.current
      ) {
        commit(input, prediction);
        setInput("");
        cancel();
      }
    }, AUTO_COMMIT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [input, prediction, isPredicting, commit, cancel]);

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
    setCommittedPinyin("");
    cancel();
    predict("");
    lastCommittedChineseRef.current = "";
    inputRef.current?.focus();
  };

  // The latest entry's chinese is the "full text so far"
  const latestChinese = entries.length > 0 ? entries[entries.length - 1].chinese : "";

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
          {entries.length === 0 && !prediction && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <Keyboard className="size-10" />
              <p className="text-sm">Type pinyin to start</p>
              <p className="text-xs">Press Space to commit</p>
            </div>
          )}

          {entries.map((entry, index) => (
            <Card key={entry.id} className="px-4 py-3">
              <div className="min-w-0">
                <Badge variant="secondary" className="mb-1.5 font-mono text-xs">
                  {index > 0
                    ? entry.pinyin.slice(entries[index - 1].pinyin.length)
                    : entry.pinyin}
                </Badge>
                <p className="text-lg leading-snug">{entry.chinese}</p>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Prediction display — shows live full-text prediction */}
      <div className="border-t bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2 min-h-8">
          <p className="text-lg leading-snug text-foreground">
            {prediction || latestChinese || (
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

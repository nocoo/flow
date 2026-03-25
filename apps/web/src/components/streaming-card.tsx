import { useRef, useEffect, useState, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Loader2, X } from "lucide-react";
import type { UseStreamingPredictReturn } from "@/hooks/use-streaming-predict";

export interface StreamingCardEntry {
  id: string;
  input: string;
  output: string;
}

export interface StreamingCardProps {
  /** Streaming predict hook (created externally) */
  predict: UseStreamingPredictReturn;
  /** Header configuration */
  header: {
    icon: ReactNode;
    title: string;
    subtitle?: string;
  };
  /** Empty state configuration */
  emptyState: {
    icon: ReactNode;
    text: string;
    subtext?: string;
  };
  /** Render a committed entry */
  renderEntry: (entry: StreamingCardEntry) => ReactNode;
  /** Render the live draft */
  renderDraft: (draft: { input: string; output: string }) => ReactNode;
  /** Input placeholder */
  placeholder: string;
  /** Extra className for the input (e.g. "font-mono") */
  inputClassName?: string;
  /** Keys that trigger commit. Default: [" ", "Enter"] */
  commitKeys?: string[];
  /** Extract context string from an entry. Default: entry => entry.output */
  entryToContext?: (entry: StreamingCardEntry) => string;
}

const AUTO_SNAPSHOT_INTERVAL_MS = 1000;

export function StreamingCard({
  predict: hook,
  header,
  emptyState,
  renderEntry,
  renderDraft,
  placeholder,
  inputClassName,
  commitKeys = [" ", "Enter"],
  entryToContext = (entry) => entry.output,
}: StreamingCardProps) {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<StreamingCardEntry[]>([]);
  const [draft, setDraft] = useState<{ input: string; output: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSnapshotRef = useRef("");

  const { prediction, isPredicting, isThinking, error, predict, cancel } = hook;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    if (value.trim()) {
      predict(value, entries.map(entryToContext));
    } else {
      cancel();
      setDraft(null);
      lastSnapshotRef.current = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      commitKeys.includes(e.key) &&
      input.trim() &&
      prediction.trim()
    ) {
      e.preventDefault();
      setEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          input: input.trim(),
          output: prediction.trim(),
        },
      ]);
      setInput("");
      setDraft(null);
      lastSnapshotRef.current = "";
      cancel();
    }
  };

  // Auto-snapshot every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (
        input.trim() &&
        prediction.trim() &&
        !isPredicting &&
        prediction.trim() !== lastSnapshotRef.current
      ) {
        setDraft({ input: input.trim(), output: prediction.trim() });
        lastSnapshotRef.current = prediction.trim();
      }
    }, AUTO_SNAPSHOT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [input, prediction, isPredicting]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, draft]);

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
        {header.icon}
        <h1 className="text-lg font-semibold">{header.title}</h1>
        {header.subtitle && (
          <span className="ml-auto text-xs text-muted-foreground">
            {header.subtitle}
          </span>
        )}
      </div>

      {/* Entries + draft */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-3 py-4">
          {entries.length === 0 && !draft && !prediction && (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground h-[calc(80svh-12rem)]">
              {emptyState.icon}
              <p className="text-sm">{emptyState.text}</p>
              {emptyState.subtext && (
                <p className="text-xs">{emptyState.subtext}</p>
              )}
            </div>
          )}

          {entries.map((entry) => (
            <div key={entry.id}>{renderEntry(entry)}</div>
          ))}

          {draft && renderDraft(draft)}
        </div>
      </ScrollArea>

      {/* Prediction bar */}
      <div className="border-t bg-muted/50 px-4 py-3">
        <div className="flex items-center justify-between gap-2 min-h-8">
          {isThinking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BrainCircuit className="size-4 shrink-0 text-primary animate-pulse" />
              <span>Thinking...</span>
            </div>
          ) : (
            <p className="text-lg leading-snug text-foreground">
              {prediction || (
                <span className="text-sm text-muted-foreground">
                  {input.trim()
                    ? "Waiting for prediction..."
                    : "Prediction will appear here"}
                </span>
              )}
            </p>
          )}
          {isPredicting && !isThinking && (
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

      {/* Input */}
      <div className="flex items-center gap-2 border-t px-4 py-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`h-10 ${inputClassName || ""}`}
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
    </div>
  );
}

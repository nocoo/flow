import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/api";

const DEFAULT_API_URL = `${API_BASE}/api/pinyin`;
const DEFAULT_DEBOUNCE_MS = 200;

interface UsePinyinOptions {
  debounceMs?: number;
  apiUrl?: string;
}

interface UsePinyinReturn {
  /** Current streaming/completed prediction */
  prediction: string;
  /** Whether a prediction request is in flight */
  isPredicting: boolean;
  /** Whether the model is currently in thinking/reasoning phase */
  isThinking: boolean;
  /** Error message if the last request failed */
  error: string | null;
  /** Trigger a prediction for the given text */
  predict: (text: string, context?: string[]) => void;
  /** Cancel any in-flight request and clear timers */
  cancel: () => void;
}

export function usePinyin(options: UsePinyinOptions = {}): UsePinyinReturn {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    apiUrl = DEFAULT_API_URL,
  } = options;

  const [prediction, setPrediction] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const predict = useCallback(
    (text: string, context?: string[]) => {
      // Always abort previous in-flight request immediately
      abortRef.current?.abort();
      abortRef.current = null;

      // Clear any pending debounce timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      // Empty input — clear prediction and stop
      if (!text.trim()) {
        setPrediction("");
        setIsPredicting(false);
        setIsThinking(false);
        return;
      }

      setIsPredicting(true);

      timerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, context }),
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";
          let buffer = "";
          let thinking = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete NDJSON lines
            const lines = buffer.split("\n");
            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const msg = JSON.parse(line);
                if (msg.t === "r") {
                  // Reasoning delta — signal thinking state
                  if (!thinking) {
                    thinking = true;
                    setIsThinking(true);
                  }
                } else if (msg.t === "t") {
                  // Text delta — exit thinking state, accumulate prediction
                  if (thinking) {
                    thinking = false;
                    setIsThinking(false);
                  }
                  accumulated += msg.v;
                  setPrediction(accumulated);
                } else if (msg.t === "d") {
                  // Done
                }
              } catch {
                // Malformed line, skip
              }
            }
          }

          setIsThinking(false);
          setIsPredicting(false);
          setError(null);
        } catch (err) {
          // AbortError is expected when a new request supersedes the old one
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsThinking(false);
          setIsPredicting(false);
        }
      }, debounceMs);
    },
    [apiUrl, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => () => cancel(), [cancel]);

  return { prediction, isPredicting, isThinking, error, predict, cancel };
}

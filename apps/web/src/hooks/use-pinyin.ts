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
  /** Error message if the last request failed */
  error: string | null;
  /** Trigger a prediction for the given text */
  predict: (text: string) => void;
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
    (text: string) => {
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
            body: JSON.stringify({ text }),
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setPrediction(accumulated);
          }

          setIsPredicting(false);
          setError(null);
        } catch (err) {
          // AbortError is expected when a new request supersedes the old one
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsPredicting(false);
        }
      }, debounceMs);
    },
    [apiUrl, debounceMs]
  );

  // Cleanup on unmount
  useEffect(() => () => cancel(), [cancel]);

  return { prediction, isPredicting, error, predict, cancel };
}

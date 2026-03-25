import { useState, useRef, useCallback, useEffect } from "react";

const DEFAULT_DEBOUNCE_MS = 200;

export interface UseStreamingPredictOptions {
  /** Full API endpoint URL */
  apiUrl: string;
  /** Build the fetch body from current input + context */
  buildBody: (text: string, context: string[]) => Record<string, unknown>;
  /** Debounce ms (default 200) */
  debounceMs?: number;
}

export interface UseStreamingPredictReturn {
  /** Current streaming/completed prediction */
  prediction: string;
  /** Whether a prediction request is in flight */
  isPredicting: boolean;
  /** Whether the model is currently in thinking/reasoning phase */
  isThinking: boolean;
  /** Error message if the last request failed */
  error: string | null;
  /** Trigger a prediction for the given text */
  predict: (text: string, context: string[]) => void;
  /** Cancel any in-flight request and clear timers */
  cancel: () => void;
}

export function useStreamingPredict(
  options: UseStreamingPredictOptions,
): UseStreamingPredictReturn {
  const { apiUrl, buildBody, debounceMs = DEFAULT_DEBOUNCE_MS } = options;

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

  // Keep stable references to avoid re-creating predict on every render
  const apiUrlRef = useRef(apiUrl);
  apiUrlRef.current = apiUrl;
  const buildBodyRef = useRef(buildBody);
  buildBodyRef.current = buildBody;

  const predict = useCallback(
    (text: string, context: string[]) => {
      abortRef.current?.abort();
      abortRef.current = null;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

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
          const res = await fetch(apiUrlRef.current, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildBodyRef.current(text, context)),
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

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const msg = JSON.parse(line);
                if (msg.t === "r") {
                  if (!thinking) {
                    thinking = true;
                    setIsThinking(true);
                  }
                } else if (msg.t === "t") {
                  if (thinking) {
                    thinking = false;
                    setIsThinking(false);
                  }
                  accumulated += msg.v;
                  setPrediction(accumulated);
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
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsThinking(false);
          setIsPredicting(false);
        }
      }, debounceMs);
    },
    [debounceMs],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { prediction, isPredicting, isThinking, error, predict, cancel };
}

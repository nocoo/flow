import { useStreamingPredict, type UseStreamingPredictReturn } from "./use-streaming-predict";
import { API_BASE } from "@/lib/api";

export function usePinyin(options?: { debounceMs?: number }): UseStreamingPredictReturn {
  return useStreamingPredict({
    apiUrl: `${API_BASE}/api/pinyin`,
    buildBody: (text, context) => ({ text, context }),
    debounceMs: options?.debounceMs,
  });
}

/**
 * Pinyin syllable segmenter.
 * Splits a continuous pinyin string (no spaces/tones) into space-separated syllables.
 * Uses DP longest-match from a complete pinyin syllable table.
 * Also provides span-level type annotations (pinyin / english_like / uncertain).
 */

// Complete set of valid pinyin syllables (without tones)
const PINYIN_SYLLABLES = new Set([
  // a
  "a", "ai", "an", "ang", "ao",
  // b
  "ba", "bai", "ban", "bang", "bao", "bei", "ben", "beng", "bi", "bian", "biao", "bie", "bin", "bing", "bo", "bu",
  // c
  "ca", "cai", "can", "cang", "cao", "ce", "cen", "ceng", "cha", "chai", "chan", "chang", "chao", "che", "chen", "cheng", "chi", "chong", "chou", "chu", "chua", "chuai", "chuan", "chuang", "chui", "chun", "chuo", "ci", "cong", "cou", "cu", "cuan", "cui", "cun", "cuo",
  // d
  "da", "dai", "dan", "dang", "dao", "de", "dei", "den", "deng", "di", "dia", "dian", "diao", "die", "ding", "diu", "dong", "dou", "du", "duan", "dui", "dun", "duo",
  // e
  "e", "ei", "en", "eng", "er",
  // f
  "fa", "fan", "fang", "fei", "fen", "feng", "fo", "fou", "fu",
  // g
  "ga", "gai", "gan", "gang", "gao", "ge", "gei", "gen", "geng", "gong", "gou", "gu", "gua", "guai", "guan", "guang", "gui", "gun", "guo",
  // h
  "ha", "hai", "han", "hang", "hao", "he", "hei", "hen", "heng", "hong", "hou", "hu", "hua", "huai", "huan", "huang", "hui", "hun", "huo",
  // j
  "ji", "jia", "jian", "jiang", "jiao", "jie", "jin", "jing", "jiong", "jiu", "ju", "juan", "jue", "jun",
  // k
  "ka", "kai", "kan", "kang", "kao", "ke", "kei", "ken", "keng", "kong", "kou", "ku", "kua", "kuai", "kuan", "kuang", "kui", "kun", "kuo",
  // l
  "la", "lai", "lan", "lang", "lao", "le", "lei", "leng", "li", "lia", "lian", "liang", "liao", "lie", "lin", "ling", "liu", "lo", "long", "lou", "lu", "luan", "lun", "luo", "lv", "lve",
  // m
  "ma", "mai", "man", "mang", "mao", "me", "mei", "men", "meng", "mi", "mian", "miao", "mie", "min", "ming", "miu", "mo", "mou", "mu",
  // n
  "na", "nai", "nan", "nang", "nao", "ne", "nei", "nen", "neng", "ni", "nian", "niang", "niao", "nie", "nin", "ning", "niu", "nong", "nou", "nu", "nuan", "nun", "nuo", "nv", "nve",
  // o
  "o", "ou",
  // p
  "pa", "pai", "pan", "pang", "pao", "pei", "pen", "peng", "pi", "pian", "piao", "pie", "pin", "ping", "po", "pou", "pu",
  // q
  "qi", "qia", "qian", "qiang", "qiao", "qie", "qin", "qing", "qiong", "qiu", "qu", "quan", "que", "qun",
  // r
  "ran", "rang", "rao", "re", "ren", "reng", "ri", "rong", "rou", "ru", "rua", "ruan", "rui", "run", "ruo",
  // s
  "sa", "sai", "san", "sang", "sao", "se", "sen", "seng", "sha", "shai", "shan", "shang", "shao", "she", "shei", "shen", "sheng", "shi", "shou", "shu", "shua", "shuai", "shuan", "shuang", "shui", "shun", "shuo", "si", "song", "sou", "su", "suan", "sui", "sun", "suo",
  // t
  "ta", "tai", "tan", "tang", "tao", "te", "tei", "teng", "ti", "tian", "tiao", "tie", "ting", "tong", "tou", "tu", "tuan", "tui", "tun", "tuo",
  // w
  "wa", "wai", "wan", "wang", "wei", "wen", "weng", "wo", "wu",
  // x
  "xi", "xia", "xian", "xiang", "xiao", "xie", "xin", "xing", "xiong", "xiu", "xu", "xuan", "xue", "xun",
  // y
  "ya", "yan", "yang", "yao", "ye", "yi", "yin", "ying", "yo", "yong", "you", "yu", "yuan", "yue", "yun",
  // z
  "za", "zai", "zan", "zang", "zao", "ze", "zei", "zen", "zeng", "zha", "zhai", "zhan", "zhang", "zhao", "zhe", "zhei", "zhen", "zheng", "zhi", "zhong", "zhou", "zhu", "zhua", "zhuai", "zhuan", "zhuang", "zhui", "zhun", "zhuo", "zi", "zong", "zou", "zu", "zuan", "zui", "zun", "zuo",
]);

// Maximum syllable length in the table
const MAX_SYLLABLE_LEN = 6; // "zhuang", "shuang", "chuang"

/**
 * Segment a continuous pinyin string into space-separated syllables.
 * Uses dynamic programming to find the segmentation that maximizes
 * the number of characters covered by valid syllables.
 * Non-alpha characters are passed through as-is.
 */
export function segmentPinyin(input: string): string {
  const lower = input.toLowerCase().trim();
  if (!lower) return "";

  // Extract contiguous alpha runs and non-alpha segments
  const segments: { text: string; isAlpha: boolean }[] = [];
  let buf = "";
  let bufIsAlpha = false;

  for (let i = 0; i < lower.length; i++) {
    const isAlpha = /[a-z]/.test(lower[i]);
    if (i === 0) {
      buf = lower[i];
      bufIsAlpha = isAlpha;
    } else if (isAlpha === bufIsAlpha) {
      buf += lower[i];
    } else {
      segments.push({ text: buf, isAlpha: bufIsAlpha });
      buf = lower[i];
      bufIsAlpha = isAlpha;
    }
  }
  if (buf) segments.push({ text: buf, isAlpha: bufIsAlpha });

  // Process each segment
  const result: string[] = [];
  for (const seg of segments) {
    if (!seg.isAlpha) {
      result.push(seg.text);
      continue;
    }
    result.push(...segmentAlpha(seg.text).parts);
  }

  return result.join(" ");
}

/**
 * DP-based segmentation for a purely alphabetic string.
 * Finds the segmentation that covers the most characters with valid syllables.
 * Tiebreaker: fewer syllables (= longer syllables) preferred.
 * Returns parts array and coverage ratio.
 */
function segmentAlpha(s: string): { parts: string[]; coverage: number } {
  const n = s.length;

  // dp[i] = { covered: max chars covered, parts: min syllable count } for s[0..i-1]
  const dp: { covered: number; parts: number }[] = Array.from({ length: n + 1 }, () => ({
    covered: -1,
    parts: 0,
  }));
  const parent = new Array<number>(n + 1).fill(-1);
  dp[0] = { covered: 0, parts: 0 };

  function isBetter(newCovered: number, newParts: number, j: number): boolean {
    if (dp[j].covered === -1) return true;
    if (newCovered > dp[j].covered) return true;
    if (newCovered === dp[j].covered && newParts < dp[j].parts) return true;
    return false;
  }

  for (let i = 0; i < n; i++) {
    if (dp[i].covered === -1) continue;

    // Try all possible syllable lengths from position i
    const maxLen = Math.min(MAX_SYLLABLE_LEN, n - i);
    for (let len = 1; len <= maxLen; len++) {
      const candidate = s.slice(i, i + len);
      const j = i + len;

      if (PINYIN_SYLLABLES.has(candidate)) {
        const newCovered = dp[i].covered + len;
        const newParts = dp[i].parts + 1;
        if (isBetter(newCovered, newParts, j)) {
          dp[j] = { covered: newCovered, parts: newParts };
          parent[j] = i;
        }
      }
    }

    // Also allow skipping one character (for non-matchable chars)
    const newParts = dp[i].parts + 1;
    if (isBetter(dp[i].covered, newParts, i + 1)) {
      dp[i + 1] = { covered: dp[i].covered, parts: newParts };
      parent[i + 1] = -(i + 1); // negative = single skipped char
    }
  }

  // Backtrack to find the segmentation
  const parts: string[] = [];
  let pos = n;

  // If we couldn't reach the end via DP, fall back for the tail
  if (dp[n].covered === -1) {
    // Find the furthest reachable position
    let best = 0;
    for (let i = n; i >= 0; i--) {
      if (dp[i].covered !== -1) { best = i; break; }
    }
    // Append remaining as individual characters
    for (let i = best; i < n; i++) {
      parts.push(s[i]);
    }
    pos = best;
  }

  while (pos > 0) {
    const from = parent[pos];
    if (from < 0) {
      // Skipped single character
      parts.push(s[pos - 1]);
      pos = pos - 1;
    } else {
      parts.push(s.slice(from, pos));
      pos = from;
    }
  }

  parts.reverse();

  const covered = dp[n].covered === -1 ? 0 : dp[n].covered;
  const coverage = n > 0 ? covered / n : 1;

  return { parts, coverage };
}

/** Span type: pinyin (high confidence), uncertain (ambiguous), english_like (low coverage) */
export type SpanType = "pinyin" | "uncertain" | "english_like";

export interface Span {
  text: string;
  type: SpanType;
}

export interface SegmentResult {
  /** Space-separated segmented string */
  segmented: string;
  /** Annotated spans with type info */
  spans: Span[];
}

/**
 * Check if a DP segmentation has ambiguous boundaries.
 * Re-runs DP allowing alternative paths and checks if multiple
 * distinct segmentations yield the same optimal score.
 */
function hasAmbiguousBoundaries(s: string): boolean {
  const n = s.length;

  // Count how many optimal paths reach each position
  const dp: { covered: number; parts: number; pathCount: number }[] =
    Array.from({ length: n + 1 }, () => ({ covered: -1, parts: 0, pathCount: 0 }));
  dp[0] = { covered: 0, parts: 0, pathCount: 1 };

  for (let i = 0; i < n; i++) {
    if (dp[i].covered === -1) continue;

    const maxLen = Math.min(MAX_SYLLABLE_LEN, n - i);
    for (let len = 1; len <= maxLen; len++) {
      const candidate = s.slice(i, i + len);
      const j = i + len;
      if (!PINYIN_SYLLABLES.has(candidate)) continue;

      const newCovered = dp[i].covered + len;
      const newParts = dp[i].parts + 1;

      if (dp[j].covered === -1 ||
          newCovered > dp[j].covered ||
          (newCovered === dp[j].covered && newParts < dp[j].parts)) {
        dp[j] = { covered: newCovered, parts: newParts, pathCount: dp[i].pathCount };
      } else if (newCovered === dp[j].covered && newParts === dp[j].parts) {
        dp[j].pathCount += dp[i].pathCount;
      }
    }

    // Skip path
    const newParts = dp[i].parts + 1;
    const skipCovered = dp[i].covered;
    if (dp[i + 1].covered === -1 ||
        skipCovered > dp[i + 1].covered ||
        (skipCovered === dp[i + 1].covered && newParts < dp[i + 1].parts)) {
      dp[i + 1] = { covered: skipCovered, parts: newParts, pathCount: dp[i].pathCount };
    } else if (skipCovered === dp[i + 1].covered && newParts === dp[i + 1].parts) {
      dp[i + 1].pathCount += dp[i].pathCount;
    }
  }

  return dp[n].pathCount > 1;
}

/**
 * Segment a continuous pinyin string with span-level type annotations.
 * Each alpha segment is classified as:
 * - "english_like": coverage < 0.6 (too many unmatched chars)
 * - "uncertain": multiple valid segmentations exist
 * - "pinyin": clean single-best segmentation
 */
export function segmentPinyinWithSpans(input: string): SegmentResult {
  const lower = input.toLowerCase().trim();
  if (!lower) return { segmented: "", spans: [] };

  // Extract contiguous alpha runs and non-alpha segments
  const segments: { text: string; isAlpha: boolean }[] = [];
  let buf = "";
  let bufIsAlpha = false;

  for (let i = 0; i < lower.length; i++) {
    const isAlpha = /[a-z]/.test(lower[i]);
    if (i === 0) {
      buf = lower[i];
      bufIsAlpha = isAlpha;
    } else if (isAlpha === bufIsAlpha) {
      buf += lower[i];
    } else {
      segments.push({ text: buf, isAlpha: bufIsAlpha });
      buf = lower[i];
      bufIsAlpha = isAlpha;
    }
  }
  if (buf) segments.push({ text: buf, isAlpha: bufIsAlpha });

  const allParts: string[] = [];
  const spans: Span[] = [];

  for (const seg of segments) {
    if (!seg.isAlpha) {
      allParts.push(seg.text);
      spans.push({ text: seg.text, type: "pinyin" });
      continue;
    }

    const { parts, coverage } = segmentAlpha(seg.text);

    if (coverage < 0.6) {
      // Too many unmatched chars — likely English
      allParts.push(seg.text);
      spans.push({ text: seg.text, type: "english_like" });
    } else if (hasAmbiguousBoundaries(seg.text)) {
      // Multiple valid segmentations — mark uncertain
      allParts.push(...parts);
      spans.push({ text: parts.join(" "), type: "uncertain" });
    } else {
      allParts.push(...parts);
      spans.push({ text: parts.join(" "), type: "pinyin" });
    }
  }

  return { segmented: allParts.join(" "), spans };
}

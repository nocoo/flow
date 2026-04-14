import { describe, expect, test } from "bun:test";
import { segmentPinyin, segmentPinyinWithSpans } from "./pinyin-segmenter";

describe("segmentPinyin", () => {
	test("basic pinyin segmentation", () => {
		expect(segmentPinyin("nihao")).toBe("ni hao");
		expect(segmentPinyin("woaini")).toBe("wo ai ni");
		expect(segmentPinyin("zhongguoren")).toBe("zhong guo ren");
	});

	test("empty and whitespace input", () => {
		expect(segmentPinyin("")).toBe("");
		expect(segmentPinyin("  ")).toBe("");
	});

	test("single syllables", () => {
		expect(segmentPinyin("a")).toBe("a");
		expect(segmentPinyin("zhuang")).toBe("zhuang");
		expect(segmentPinyin("shuang")).toBe("shuang");
	});

	test("lv/nv syllables", () => {
		expect(segmentPinyin("lvse")).toBe("lv se");
		expect(segmentPinyin("nvren")).toBe("nv ren");
	});

	test("non-alpha passthrough", () => {
		expect(segmentPinyin("ni3hao3")).toBe("ni 3 hao 3");
	});

	test("case insensitive", () => {
		expect(segmentPinyin("NiHao")).toBe("ni hao");
		expect(segmentPinyin("ZHONGGUO")).toBe("zhong guo");
	});

	test("longer sentences", () => {
		const result = segmentPinyin("jintiantiaqihenhao");
		// Should segment into valid pinyin syllables
		expect(result.split(" ").length).toBeGreaterThan(3);
	});

	test("maximizes coverage", () => {
		// DP should prefer covering more chars with valid syllables
		const result = segmentPinyin("xian");
		expect(result).toBe("xian"); // "xian" (4 covered) > "xi an" (4 covered, but 2 parts vs 1)
	});
});

describe("segmentPinyinWithSpans", () => {
	test("returns segmented string and spans", () => {
		const result = segmentPinyinWithSpans("nihao");
		expect(result.segmented).toBe("ni hao");
		expect(result.spans).toHaveLength(1);
		expect(result.spans[0].type).toBe("pinyin");
	});

	test("empty input", () => {
		const result = segmentPinyinWithSpans("");
		expect(result.segmented).toBe("");
		expect(result.spans).toHaveLength(0);
	});

	test("detects english-like spans with low coverage", () => {
		// "xyz" has no valid pinyin syllables → coverage ≈ 0
		const result = segmentPinyinWithSpans("xyzqwk");
		expect(result.spans.some((s) => s.type === "english_like")).toBe(true);
	});

	test("detects uncertain spans with multiple DP paths", () => {
		// "guangangchu" has multiple valid segmentations:
		// "guan gang chu" vs "guang ang chu" — same coverage and parts
		const result = segmentPinyinWithSpans("guangangchu");
		expect(result.spans.some((s) => s.type === "uncertain")).toBe(true);
	});

	test("pure pinyin is classified as pinyin type", () => {
		const result = segmentPinyinWithSpans("jianzhijiushikeyishuo");
		expect(result.spans).toHaveLength(1);
		expect(result.spans[0].type).toBe("pinyin");
	});

	test("non-alpha segments are treated as pinyin type", () => {
		const result = segmentPinyinWithSpans("ni3hao3");
		// "ni", "3", "hao", "3" — non-alpha segments pass through
		expect(result.spans.length).toBeGreaterThanOrEqual(1);
	});

	test("coverage ratio calculation", () => {
		// All valid pinyin → high coverage → pinyin type
		const good = segmentPinyinWithSpans("woaini");
		expect(good.spans[0].type).toBe("pinyin");

		// Gibberish → low coverage → english_like type
		const bad = segmentPinyinWithSpans("bdfghjk");
		expect(bad.spans[0].type).toBe("english_like");
	});

	test("mixed content preserves structure", () => {
		const result = segmentPinyinWithSpans("hello123nihao");
		// Should have multiple spans: alpha, non-alpha, alpha
		expect(result.spans.length).toBeGreaterThanOrEqual(2);
	});
});

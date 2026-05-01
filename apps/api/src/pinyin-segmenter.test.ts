import { describe, expect, test } from "vitest";
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
		expect(result.split(" ").length).toBeGreaterThan(3);
	});

	test("maximizes coverage", () => {
		const result = segmentPinyin("xian");
		expect(result).toBe("xian");
	});

	test("handles unmatched leading chars via skip path", () => {
		const result = segmentPinyin("xnihao");
		expect(result).toContain("ni");
		expect(result).toContain("hao");
	});

	test("handles trailing unmatched chars", () => {
		const result = segmentPinyin("nihaox");
		expect(result).toContain("ni");
		expect(result).toContain("hao");
	});

	test("punctuation between pinyin", () => {
		const result = segmentPinyin("ni,hao");
		expect(result).toContain("ni");
		expect(result).toContain("hao");
	});

	test("pure unmatched alpha sequence", () => {
		const result = segmentPinyin("xxxxx");
		expect(typeof result).toBe("string");
	});

	test("very long pinyin string", () => {
		const result = segmentPinyin("woshizhongguorenwoaiwodezuguo");
		expect(result.split(" ").length).toBeGreaterThan(5);
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

	test("whitespace-only input", () => {
		const result = segmentPinyinWithSpans("   ");
		expect(result.segmented).toBe("");
		expect(result.spans).toHaveLength(0);
	});

	test("detects english-like spans with low coverage", () => {
		const result = segmentPinyinWithSpans("xyzqwk");
		expect(result.spans.some((s) => s.type === "english_like")).toBe(true);
	});

	test("detects uncertain spans with multiple DP paths", () => {
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
		expect(result.spans.length).toBeGreaterThanOrEqual(1);
	});

	test("coverage ratio calculation", () => {
		const good = segmentPinyinWithSpans("woaini");
		expect(good.spans[0].type).toBe("pinyin");
		const bad = segmentPinyinWithSpans("bdfghjk");
		expect(bad.spans[0].type).toBe("english_like");
	});

	test("mixed content preserves structure", () => {
		const result = segmentPinyinWithSpans("hello123nihao");
		expect(result.spans.length).toBeGreaterThanOrEqual(2);
	});

	test("starts with non-alpha", () => {
		const result = segmentPinyinWithSpans("123nihao");
		expect(result.spans.length).toBeGreaterThanOrEqual(2);
		expect(result.spans[0].text).toBe("123");
	});

	test("alternating alpha/non-alpha", () => {
		const result = segmentPinyinWithSpans("ni1hao2wo3");
		expect(result.spans.length).toBeGreaterThanOrEqual(5);
	});

	test("ambiguous segmentation with skip-path tie", () => {
		const result = segmentPinyinWithSpans("xguangangchu");
		expect(result.spans.length).toBeGreaterThanOrEqual(1);
	});

	test("borderline coverage classification", () => {
		const result = segmentPinyinWithSpans("nihaoxyz");
		expect(["pinyin", "uncertain", "english_like"]).toContain(
			result.spans[0].type,
		);
	});

	test("single character alpha", () => {
		const result = segmentPinyinWithSpans("a");
		expect(result.spans).toHaveLength(1);
	});

	test("single non-alpha character", () => {
		const result = segmentPinyinWithSpans("5");
		expect(result.spans).toHaveLength(1);
		expect(result.spans[0].text).toBe("5");
	});

	test("uppercase mixed input", () => {
		const result = segmentPinyinWithSpans("NiHaoWoAiNi");
		expect(result.segmented).toContain("ni");
	});
});

import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_SETTINGS, type DeepPartial, type Settings } from "./types";

const DB_PATH = join(dirname(import.meta.dir), "data", "settings.db");

function openDb(): Database {
	mkdirSync(dirname(DB_PATH), { recursive: true });
	const db = new Database(DB_PATH);
	db.run("PRAGMA journal_mode = WAL");
	db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id   INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    )
  `);
	db.run("INSERT OR IGNORE INTO settings (id, data) VALUES (1, ?)", [
		JSON.stringify(DEFAULT_SETTINGS),
	]);
	return db;
}

const db = openDb();

export function getSettings(): Settings {
	const row = db.query("SELECT data FROM settings WHERE id = 1").get() as {
		data: string;
	} | null;
	if (!row) return { ...DEFAULT_SETTINGS };
	return JSON.parse(row.data) as Settings;
}

const MASKED_RE = /^\S{0,4}\*{4,}$/;

function deepMerge(
	target: Record<string, unknown>,
	source: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...target };
	for (const key of Object.keys(source)) {
		const val = source[key];
		if (val === undefined) continue;
		if (
			val !== null &&
			typeof val === "object" &&
			!Array.isArray(val) &&
			typeof result[key] === "object" &&
			result[key] !== null
		) {
			result[key] = deepMerge(
				result[key] as Record<string, unknown>,
				val as Record<string, unknown>,
			);
		} else {
			result[key] = val;
		}
	}
	return result;
}

export function updateSettings(partial: DeepPartial<Settings>): Settings {
	const current = getSettings();

	// Preserve masked apiKey values — don't overwrite real keys with masked strings
	if (partial.local?.apiKey && MASKED_RE.test(partial.local.apiKey)) {
		delete partial.local.apiKey;
	}
	if (partial.cloud?.apiKey && MASKED_RE.test(partial.cloud.apiKey)) {
		delete partial.cloud.apiKey;
	}

	const merged = deepMerge(
		current as unknown as Record<string, unknown>,
		partial as unknown as Record<string, unknown>,
	) as unknown as Settings;
	db.run("UPDATE settings SET data = ? WHERE id = 1", [JSON.stringify(merged)]);
	return merged;
}

export function maskApiKey(key: string): string {
	if (!key) return "";
	if (key.length <= 4) return "****";
	return `${key.slice(0, 4)}****`;
}

export function maskSettings(settings: Settings): Settings {
	return {
		...settings,
		local: { ...settings.local, apiKey: maskApiKey(settings.local.apiKey) },
		cloud: { ...settings.cloud, apiKey: maskApiKey(settings.cloud.apiKey) },
	};
}

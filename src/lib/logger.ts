import {
  appendFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import type OpenAI from "openai";

// ─── Config ──────────────────────────────────────────────────────────────────

const LOG_DIR = join(process.cwd(), "logs");

/** Override via OPENAI_DAILY_BUDGET_USD in .env  (default $5.00) */
const DAILY_BUDGET_USD = parseFloat(
  process.env.OPENAI_DAILY_BUDGET_USD ?? "5.00"
);

const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini":    { input: 0.15  / 1_000_000, output: 0.60  / 1_000_000 },
  "gpt-4o":         { input: 2.50  / 1_000_000, output: 10.00 / 1_000_000 },
  "gpt-4-turbo":    { input: 10.00 / 1_000_000, output: 30.00 / 1_000_000 },
  "gpt-4":          { input: 30.00 / 1_000_000, output: 60.00 / 1_000_000 },
  "gpt-3.5-turbo":  { input: 0.50  / 1_000_000, output: 1.50  / 1_000_000 },
};

// ─── Daily cost tracker ───────────────────────────────────────────────────────

interface DailyCost {
  date: string;
  requests: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUSD: number;
}

function costFilePath(date: string) {
  return join(LOG_DIR, `cost-${date}.json`);
}

function readDailyCost(date: string): DailyCost {
  const file = costFilePath(date);
  if (!existsSync(file)) {
    return {
      date,
      requests: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      totalCostUSD: 0,
    };
  }
  return JSON.parse(readFileSync(file, "utf-8")) as DailyCost;
}

function writeDailyCost(cost: DailyCost) {
  writeFileSync(costFilePath(cost.date), JSON.stringify(cost, null, 2));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureLogDir() {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function logFilePath() {
  return join(LOG_DIR, `completions-${today()}.log`);
}

/** Strip date suffix added by OpenAI (e.g. "gpt-4o-mini-2024-07-18" → "gpt-4o-mini") */
function normalizeModel(model: string) {
  return model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

function calcRequestCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const rates = PRICING[normalizeModel(model)] ?? PRICING["gpt-4o-mini"];
  return promptTokens * rates.input + completionTokens * rates.output;
}

function usd(n: number) {
  return `$${n.toFixed(6)}`;
}

function pct(used: number, budget: number) {
  return `${((used / budget) * 100).toFixed(2)}%`;
}

/** Pretty-print JSON, indented for readability */
function indentJSON(content: string | null, pad = "    "): string {
  if (!content) return `${pad}(empty)`;
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
      .split("\n")
      .map((l) => pad + l)
      .join("\n");
  } catch {
    return content
      .split("\n")
      .map((l) => pad + l)
      .join("\n");
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CompletionLogEntry {
  address: string;
  completion: OpenAI.Chat.ChatCompletion;
  durationMs: number;
}

/**
 * Returns true when today's accumulated cost has already reached or exceeded
 * the daily budget. Call this BEFORE making an OpenAI request.
 */
export function isDailyBudgetExceeded(): boolean {
  try {
    ensureLogDir();
    const daily = readDailyCost(today());
    return daily.totalCostUSD >= DAILY_BUDGET_USD;
  } catch {
    return false; // fail open — don't block on a read error
  }
}

/**
 * Logs the full completion to a daily file and updates the cost tracker.
 */
export function logCompletion({
  address,
  completion,
  durationMs,
}: CompletionLogEntry): void {
  try {
    ensureLogDir();

    const date = today();
    const timestamp = new Date().toISOString();
    const choice = completion.choices[0];
    const usage = completion.usage;

    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const requestCost = calcRequestCost(
      completion.model,
      promptTokens,
      completionTokens
    );

    // ── Update daily cost tracker ─────────────────────────────────────────
    const daily = readDailyCost(date);
    daily.requests += 1;
    daily.totalPromptTokens += promptTokens;
    daily.totalCompletionTokens += completionTokens;
    daily.totalTokens += promptTokens + completionTokens;
    daily.totalCostUSD += requestCost;
    writeDailyCost(daily);

    const overBudget = daily.totalCostUSD >= DAILY_BUDGET_USD;
    const budgetStatus = overBudget
      ? `⚠️  BUDGET EXCEEDED  (${usd(daily.totalCostUSD)} / ${usd(DAILY_BUDGET_USD)})`
      : `✅ Within budget   (${pct(daily.totalCostUSD, DAILY_BUDGET_USD)} used)`;

    // ── Build log entry ───────────────────────────────────────────────────
    const RULE = "═".repeat(80);
    const rule = "─".repeat(80);

    const lines = [
      "",
      RULE,
      `  ${timestamp}`,
      RULE,
      "",
      `  ADDRESS        : ${address}`,
      `  MODEL          : ${completion.model}`,
      `  DURATION       : ${durationMs} ms`,
      `  FINISH REASON  : ${choice.finish_reason}`,
      `  COMPLETION ID  : ${completion.id}`,
      "",
      `  ${rule}`,
      `  TOKEN USAGE`,
      `  ${rule}`,
      `  Prompt tokens     : ${promptTokens}`,
      `  Completion tokens : ${completionTokens}`,
      `  Total tokens      : ${promptTokens + completionTokens}`,
      "",
      `  ${rule}`,
      `  COST GUARDRAIL`,
      `  ${rule}`,
      `  This request      : ${usd(requestCost).padEnd(14)} (${promptTokens} prompt + ${completionTokens} completion tokens)`,
      `  Daily total       : ${usd(daily.totalCostUSD).padEnd(14)} across ${daily.requests} request${daily.requests !== 1 ? "s" : ""} today`,
      `  Daily budget      : ${usd(DAILY_BUDGET_USD)}`,
      `  Status            : ${budgetStatus}`,
      "",
      `  ${rule}`,
      `  RESPONSE CONTENT`,
      `  ${rule}`,
      indentJSON(choice.message.content),
      "",
      `  ${rule}`,
      `  RAW COMPLETION OBJECT`,
      `  ${rule}`,
      JSON.stringify(completion, null, 2)
        .split("\n")
        .map((l) => "  " + l)
        .join("\n"),
      "",
    ];

    appendFileSync(logFilePath(), lines.join("\n") + "\n");
  } catch (err) {
    // Never let a logging failure crash the API route
    console.error("[logger] Failed to write log:", err);
  }
}

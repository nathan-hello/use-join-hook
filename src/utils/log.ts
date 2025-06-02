import { LogFunction } from "@/types.js";

export function logger(
  params: Parameters<LogFunction>[0],
  globalLogger: LogFunction | boolean | undefined,
) {
  const { direction, join, options, value } = params;
  if (
    options.log === false ||
    (globalLogger === false && options.log === undefined)
  )
    return;

  if (typeof globalLogger === "function") {
    const ret = globalLogger(params);
    if (ret === undefined) {
      return;
    }
    console.log(ret);
    return;
  }

  const t = rightPad(options.type, "boolean".length, " ");
  const j = leftPad(join, 3, "0");
  const d = leftPad(direction, "received".length, " ");
  const v = rightPad(value.toString(), "false".length, " ");
  const k = options.key
    ? "index" in params
      ? `${options.key}[${params.index}]`
      : options.key
    : "";

  console.log(`${t}:${j} ${d} value: ${v} ${k}`);
}

function rightPad(s: string, len: number, char: string) {
  if (s.length >= len) return s;
  return s + char.repeat(len - s.length);
}

function leftPad(s: string, len: number, char: string) {
  if (s.length >= len) return s;
  return char.repeat(len - s.length) + s;
}

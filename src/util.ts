export function rightPad(s: string, len: number, char: string) {
  if (s.length >= len) return s;
  return s + char.repeat(len - s.length);
}

export function leftPad(s: string, len: number, char: string) {
  if (s.length >= len) return s;
  return char.repeat(len - s.length) + s;
}

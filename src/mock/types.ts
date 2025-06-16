export type SignalMap = { boolean: boolean; number: number; string: string };

// ======== SECTION 1: EFFICIENT TYPE-LEVEL ARITHMETIC (Corrected) ========
// Replaces tuple-based addition with a string-based algorithm that
// is significantly more performant for large numbers.

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type ReverseString<S extends string> = S extends `${infer F}${infer R}`
  ? `${ReverseString<R>}${F}`
  : "";

type DigitMap = {
  "0": [];
  "1": [0];
  "2": [0, 0];
  "3": [0, 0, 0];
  "4": [0, 0, 0, 0];
  "5": [0, 0, 0, 0, 0];
  "6": [0, 0, 0, 0, 0, 0];
  "7": [0, 0, 0, 0, 0, 0, 0];
  "8": [0, 0, 0, 0, 0, 0, 0, 0];
  "9": [0, 0, 0, 0, 0, 0, 0, 0, 0];
};

// CORRECTED: Sums all three digits in a single operation.
type SumWithCarry<
  A extends Digit,
  B extends Digit,
  C extends Digit,
  S = [...DigitMap[`${A}`], ...DigitMap[`${B}`], ...DigitMap[`${C}`]]["length"],
> = S extends number ? `${S}` : "0";

type AddRec<
  A extends string,
  B extends string,
  Carry extends string = "0",
  Result extends string = "",
> = A extends `${infer DA extends Digit}${infer RA}`
  ? B extends `${infer DB extends Digit}${infer RB}`
    ? SumWithCarry<
        DA,
        DB,
        Carry extends `${infer C extends Digit}` ? C : 0
      > extends
        | `${infer D extends Digit}`
        | `${infer C extends Digit}${infer D extends Digit}`
      ? AddRec<RA, RB, `${C}`, `${Result}${D}`>
      : never
    : `${AddRec<A, "0", Carry, Result>}`
  : B extends ""
    ? Carry extends "0"
      ? Result
      : `${Result}${Carry}`
    : `${AddRec<B, "0", Carry, Result>}`;

type PadStart<
  S extends string,
  L extends number,
  C extends string = "0",
> = S["length"] extends L ? S : PadStart<`${C}${S}`, L>;

type StringToNumber<S extends string> = S extends `${infer N extends number}`
  ? N
  : never;

type Add<A extends number, B extends number> = `${A}` extends infer SA extends
  string
  ? `${B}` extends infer SB extends string
    ? SA["length"] extends infer AL extends number
      ? SB["length"] extends infer BL extends number
        ? AL extends BL
          ? ReverseString<
              AddRec<ReverseString<SA>, ReverseString<SB>>
            > extends `${infer N extends number}`
            ? N
            : 0
          : BL extends AL
            ? Add<B, A>
            : Add<A, StringToNumber<PadStart<SB, AL>>>
        : 0
      : 0
    : 0
  : 0;

// ======== SECTION 2: SAFE AND EFFICIENT RANGE GENERATION ========
// Generates a full string union for small ranges but gracefully falls
// back to `${number}` for large ranges to prevent compiler slowdowns.

type EnumerateInclusive<
  N extends number,
  Acc extends number[] = [],
> = Acc["length"] extends N
  ? [...Acc, N][number]
  : EnumerateInclusive<N, [...Acc, Acc["length"]]>;

type RangeInclusive<F extends number, T extends number> =
  | Exclude<EnumerateInclusive<T>, EnumerateInclusive<F>>
  | F;

// A reasonable limit to prevent performance degradation.
type MAX_ENUMERABLE_NUMBER = 200;

type SafeRangeToStringUnion<Start extends number, End extends number> =
  End extends EnumerateInclusive<MAX_ENUMERABLE_NUMBER>
    ? `${RangeInclusive<Start, End>}`
    : `\${number}`;

// ======== SECTION 3: FINAL INTEGRATED LOGIC ========
// The user-facing types that now leverage the efficient helpers.

type GetOffsetValue<
  O extends number | { boolean?: number; number?: number; string?: number },
  T extends keyof SignalMap,
> = O extends number
  ? O
  : O extends { [K in T]?: number }
    ? O[T] extends number
      ? O[T]
      : 0
    : 0;

type AddOffset<
  N extends number,
  O extends number | { boolean?: number; number?: number; string?: number },
  T extends keyof SignalMap,
> = Add<N, GetOffsetValue<O, T>>;

type JoinValueToStringUnion<
  J,
  O extends number | { boolean?: number; number?: number; string?: number } = 0,
  T extends keyof SignalMap = keyof SignalMap,
> = J extends string
  ? J
  : J extends number
    ? `${AddOffset<J, O, T>}`
    : J extends { start: infer S extends number; end: infer E extends number }
      ? SafeRangeToStringUnion<AddOffset<S, O, T>, AddOffset<E, O, T>>
      : J extends (infer U)[]
        ? JoinValueToStringUnion<U, O, T>
        : never;

export type ExtractJoinsFromJoinMapOfType<
  J,
  T extends keyof SignalMap,
> = J extends readonly (infer U)[]
  ? ExtractJoinsFromJoinMapOfType<U, T>
  : J extends object
    ? J extends {
        type: T;
        join: infer K;
        offset?: infer O extends
          | number
          | { boolean?: number; number?: number; string?: number };
      }
      ? JoinValueToStringUnion<K, O, T>
      : { [P in keyof J]: ExtractJoinsFromJoinMapOfType<J[P], T> }[keyof J]
    : never;

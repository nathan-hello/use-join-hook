import { SignalMap } from "@/types.js";

type EnumerateInclusive<
  N extends number,
  Acc extends number[] = [],
> = Acc["length"] extends N
  ? [...Acc, N][number]
  : EnumerateInclusive<N, [...Acc, Acc["length"]]>;

type RangeInclusive<F extends number, T extends number> =
  | Exclude<EnumerateInclusive<T>, EnumerateInclusive<F>>
  | F;

type RangeToStringUnion<
  Start extends number,
  End extends number,
> = `${RangeInclusive<Start, End>}`;

type JoinValueToStringUnion<J> = J extends string
  ? J
  : J extends number
    ? `${J}`
    : J extends { start: infer S extends number; end: infer E extends number }
      ? RangeToStringUnion<S & number, E & number>
      : J extends (infer U)[]
        ? JoinValueToStringUnion<U>
        : never;

export type ExtractJoinsFromJoinMapOfType<
  J,
  T extends keyof SignalMap,
> = J extends readonly (infer U)[]
  ? ExtractJoinsFromJoinMapOfType<U, T>
  : J extends object
    ? J extends { type: T; join: infer K }
      ? JoinValueToStringUnion<K>
      : { [P in keyof J]: ExtractJoinsFromJoinMapOfType<J[P], T> }[keyof J]
    : never;

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

type BuildTuple<L extends number, T extends any[] = []> = T["length"] extends L
  ? T
  : BuildTuple<L, [...T, any]>;

type Add<A extends number, B extends number> = [
  ...BuildTuple<A>,
  ...BuildTuple<B>,
]["length"];

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
    ? `${AddOffset<J, O, T> & number}`
    : J extends { start: infer S extends number; end: infer E extends number }
      ? RangeToStringUnion<
          AddOffset<S & number, O, T> & number,
          AddOffset<E & number, O, T> & number
        >
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

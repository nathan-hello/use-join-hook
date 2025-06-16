import { SignalMap, SingleJoin, MultiJoin } from "@/types.js";

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

export type JoinMapKeysToStringUnion<
  J,
  T extends string,
  JoinType extends SingleJoin | MultiJoin | never = never,
  Prefix extends string = "",
> = {
  [K in keyof J]: J[K] extends { type: T; join: JoinType }
    ? Prefix extends ""
      ? JoinType extends SingleJoin
        ? K & string
        : JoinType extends MultiJoin
          ? JoinType extends (infer U)[]
            ? `${K & string}[${number}]`
            : JoinType extends {
                  start: infer S extends number;
                  end: infer E extends number;
                }
              ? RangeToStringUnion<S, E> extends infer R
                ? R extends number
                  ? `${K & string}[${R}]`
                  : never
                : never
              : never
          : never
      : `${Prefix}.${K & string}`
    : J[K] extends Array<any>
      ? JoinMapKeysToStringUnion<
          J[K],
          T,
          JoinType,
          Prefix extends "" ? K & string : `${Prefix}[${K & string}]`
        >
      : J[K] extends object
        ? JoinMapKeysToStringUnion<
            J[K],
            T,
            JoinType,
            Prefix extends "" ? K & string : `${Prefix}.${K & string}`
          >
        : never;
}[keyof J];

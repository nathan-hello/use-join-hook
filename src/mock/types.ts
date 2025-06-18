import { J } from "@/test.js";

export type SignalMap = { boolean: boolean; number: number; string: string };

type NumberLike = string | number | bigint;

/**
 * ToString<3> = '3'.
 */
type ToString<N extends NumberLike> = `${N}`;

/**
 * Split<'foo'> = ['f', 'o', 'o'].
 */
type Split<S extends string> = S extends `${infer Letter}${infer Rest}`
  ? [Letter, ...Split<Rest>]
  : [];

/**
 * SumMod10[2][3] = 5.
 * SumMod10[7][4] = 1.
 */
type SumMod10 = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
  [2, 3, 4, 5, 6, 7, 8, 9, 0, 1],
  [3, 4, 5, 6, 7, 8, 9, 0, 1, 2],
  [4, 5, 6, 7, 8, 9, 0, 1, 2, 3],
  [5, 6, 7, 8, 9, 0, 1, 2, 3, 4],
  [6, 7, 8, 9, 0, 1, 2, 3, 4, 5],
  [7, 8, 9, 0, 1, 2, 3, 4, 5, 6],
  [8, 9, 0, 1, 2, 3, 4, 5, 6, 7],
  [9, 0, 1, 2, 3, 4, 5, 6, 7, 8],
];

/**
 * TenOfSumOfTwoDigits[2][3] = 0.
 * TenOfSumOfTwoDigits[4][8] = 1.
 */
type TenOfSumOfTwoDigits = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

type Digit = ToString<SumMod10[0][number]>;

type Tuple = readonly Digit[];

/**
 * Last<['2', '3']> = '3'.
 */
type Last<T extends Tuple> = T extends []
  ? 0
  : T extends [...infer Head, infer Element]
    ? Element extends Digit
      ? Element
      : "0"
    : "0";

/**
 * Pop<['2', '3', '4']> = ['2', '3'].
 */
type Pop<T extends Tuple> = T extends []
  ? []
  : T extends [...infer Head, infer Last]
    ? Head
    : [];

/**
 * Join<['1', '2']> = '12'.
 */
type Join<T extends Tuple> = T extends [] ? "" : `${Join<Pop<T>>}${Last<T>}`;

/**
 * TenOfSum<T, A, B> = (T + A + B) > 9 ? 1 : 0.
 */
type TenOfSum<
  Ten extends 0 | 1,
  A extends Digit,
  B extends Digit,
> = TenOfSumOfTwoDigits[A][B] extends 1
  ? 1
  : [SumMod10[A][B], Ten] extends [9, 1]
    ? 1
    : 0;

/**
 * TuplesAreEmpty<[], []> = true.
 * TuplesAreEmpty<[], ['1']> = false.
 */
type TuplesAreEmpty<A extends Tuple, B extends Tuple> = A extends []
  ? B extends []
    ? true
    : false
  : false;

/**
 * SumOfTuple<['2', '3'], ['9']> = ['3', '2'].
 */
type SumOfTuple<
  A extends Tuple,
  B extends Tuple,
  Ten extends 0 | 1 = 0,
  Result extends Tuple = [],
> =
  TuplesAreEmpty<A, B> extends true
    ? Ten extends 1
      ? ["1", ...Result]
      : Result
    : SumOfTuple<
        Pop<A>,
        Pop<B>,
        // @ts-expect-error
        TenOfSum<Ten, Last<A>, Last<B>>,
        [ToString<SumMod10[Ten][SumMod10[Last<A>][Last<B>]]>, ...Result]
      >;

/**
 * Sum<112, 82> = '194'.
 */
type Sum<A extends NumberLike, B extends NumberLike> = Join<
  SumOfTuple<Split<ToString<A>>, Split<ToString<B>>>
>;

type Asdf = Sum<1, 2>;

type JoinToUnion<
  J,
  O extends number | { boolean?: number; number?: number; string?: number },
  T extends keyof SignalMap = keyof SignalMap,
> = J extends string
  ? J
  : J extends number
    ? O extends number
      ? `${Sum<J, O>}`
      : O extends { boolean?: number; number?: number; string?: number }
        ? O[T] extends number
          ? `${Sum<J, O[T]>}`
          : J
        : J
    : J extends (number | string)[]
      ? J[number] extends infer U
        ? JoinToUnion<U, O, T>
        : never
      : J extends { start: number; end: number }
        ? any
        : never;

export type ExtractJoinsFromJoinMapOfType<
  J,
  T extends keyof SignalMap,
> = J extends object
  ? J extends {
      type: T;
      join: infer K;
      offset?: infer O extends
        | number
        | { boolean?: number; number?: number; string?: number };
    }
    ? JoinToUnion<K, O, T>
    : {
        [K in keyof J]: ExtractJoinsFromJoinMapOfType<J[K], T>;
      }[keyof J]
  : never;

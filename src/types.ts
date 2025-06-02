import { _MockCrComLib } from "@/mock/store.js";

export type PUseJoin<
  T extends keyof SignalMap = keyof SignalMap,
  K extends SingleJoin | MultiJoin = SingleJoin | MultiJoin,
> = {
  /**
   * `"boolean" | "number" | "string"`. The CrComLib.publishEvent function
   * allows for many more options than this but here it's constrained so it's easier to grep.
   */
  type: T;
  /**
   * Subscribe to a specific join: `number | string`
   *
   * Subscribe to multiple joins: `(number | string)[]`
   * - `[10, 12, "Room.PowerOn"]` will be an array with length 3 of whatever type specified in `type`.
   * - The returned array will coorespond with the order of the joins.
   * - If you publish over this array, for example `pubRoomPower([false, true, true])`, it will also be in order.
   * - Publish `undefined` in place of any other value to not update that value.
   *   - If you wanted to update join 10 and 12, but not Room.PowerOn, you would use
   *     `pubRoomPower([false, true, undefined])`
   *
   * Subscribe to multiple joins (shortcut): `{start: number; end: number}`
   * - `{start: 10, end: 17}` is completely equivalent to `[10, 11, 12, 13, 14, 15, 16, 17]`.
   */
  join: K;
  /**
   * Offset is a tool for composition. Its value is added to join numbers (not strings).
   * If of type `number`, then the offset will apply to all join types equally.
   *
   * `{type: "string", join: 5, offset: 50}`, the real join number subscribed to will be `55`.
   * `{type: "boolean", join: {start: 10, end: 15}, offset: {boolean: 12}}` will result in the
   * array being `[22, 23, 24, 25, 26, 27]`
   *
   */
  offset?: number | { boolean?: number; number?: number; string?: number };
  /**
   * Used for logging and your own documentation.
   */
  key?: string;
  /**
   * Unused param. Still useful for your own documentation.
   */
  dir?: "input" | "output" | "bidirectional";
  /**
   * Effects is an object which affects how the publish function works.
   */
  effects?: {
    /**
     * A number of milliseconds that the function will wait before publishing a new value.
     * For example, if you want to constrain a touch-settable volume slider to only publish once
     * every `10`ms.
     */
    debounce?: number;
    /**
     * A number of milliseconds after which the falsey value of the relevant type will be published.
     * Boolean types will send `false`, number types will send `0`, and string types will send an empty string.
     */
    resetAfterMs?: number;
  };
  /**
   * Overwrites GlobalParams.logger. Set this if you have logging enabled/disabled globally
   * but you want to change that for just this join.
   * This does not support passing LogFunction like GlobalParams.logger does.
   */
  log?: boolean;
};

// Apparently the generics in State and Publisher aren't enough so we have to
// contrain the type manually, even though the "output" is syntactically the same.
export type RUseJoin<
  T extends keyof SignalMap,
  K extends SingleJoin | MultiJoin,
> = K extends SingleJoin
  ? [SignalMap[T], Publisher<T, K>]
  : K extends MultiJoin
    ? [SignalMap[T][], Publisher<T, K>]
    : never;

/**
 * (number | string)[] will subscribe to those joins in order.
 *
 * Pass `{start: number; end: number}` to subscribe to that range of joins, inclusively.
 * `{start: 10, end: 15}` will evaluate to [10, 11, 12, 13, 14, 15]
 */
export type MultiJoin = (number | string)[] | { start: number; end: number };
export type SingleJoin = number | string;

export type SignalMap = { boolean: boolean; number: number; string: string };

export type State<
  T extends keyof SignalMap,
  K extends SingleJoin | MultiJoin,
> = K extends SingleJoin
  ? SignalMap[T]
  : K extends MultiJoin
    ? SignalMap[T][]
    : never;

export type Publisher<
  T extends keyof SignalMap,
  K extends SingleJoin | MultiJoin,
> = K extends SingleJoin
  ? React.Dispatch<React.SetStateAction<SignalMap[T]>>
  : K extends MultiJoin
    ? React.Dispatch<React.SetStateAction<(SignalMap[T] | undefined)[]>>
    : never;

export type LogFunction<
  T extends keyof SignalMap = any,
  K extends SingleJoin | MultiJoin = any,
> = (
  args: {
    options: PUseJoin<T, K>;
    join: string;
    direction: "sent" | "recieved";
    value: SignalMap[T];
  } & (K extends MultiJoin ? { index: number } : {}),
) => string | void;

/**
 * A type helper to make it easier to store all of your joins in one object.
 * Leaf nodes are type checked to be valid params to useJoin.
 * Use this for organizing all of your joins in one place.
 *
 * Note the `as const satisfies JoinMap`. You have to do it this way for TS reasons.
 *
 *Example usage:
 *```ts
 * const J = {
 *   Join1: { type: "boolean", join: 1, key: "Asdf" },
 *   Group1: {
 *     Join2: { type: "number", join: 2, key: "Fdsa" },
 *   },
 *   Group2: {
 *     Join3: { type: "string", join: 3, key: "Zxcv" },
 *   },
 *   Group3: [
 *     { type: "string", join: 4, key: "Vcxz" },
 *     { type: "number", join: 5, key: "Qwer" },
 *   ],
 * } as const satisfies JoinMap;
 *
 *  function useAsdf() {
 *    const [asdf, pubAsdf] = useJoin(J.Group1.Join2);
 *  }
 * ```
 */
export type JoinMap =
  | JoinLeaf<SingleJoin | MultiJoin>
  | readonly JoinLeaf<SingleJoin | MultiJoin>[]
  | { readonly [key: string]: JoinMap };

// This union instead of PUseJoin because that helps with
// inference when making the logicWave function's `value` arg's type narrowing
type JoinLeaf<K extends SingleJoin | MultiJoin> =
  | PUseJoin<"boolean", K>
  | PUseJoin<"number", K>
  | PUseJoin<"string", K>;

export type MockLogicWave<T extends keyof SignalMap = keyof SignalMap> = (
  value: SignalMap[T],
  getJoin: <G extends keyof SignalMap>(
    type: G,
    join: number | string,
  ) => SignalMap[G],
  pubJoin: <G extends keyof SignalMap>(
    type: G,
    join: string | number,
    value: SignalMap[G],
  ) => void,
) => SignalMap[T];

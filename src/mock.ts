import type { SignalMap } from "./index.js";

export interface CrComLibInterface {
  subscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    callback: any,
  ): string;
  unsubscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    id: string,
  ): void;
  publishEvent<T extends keyof SignalMap>(
    type: T,
    join: string,
    value: SignalMap[T],
  ): void;
}

export class MockCrComLib implements CrComLibInterface {
  private _store = new Map<string, any>();
  private _subs = new Map<string, Set<(value: any) => void>>();
  private _mocks: TMock<keyof SignalMap, keyof SignalMap>[];

  constructor(mocks: TMock<keyof SignalMap, keyof SignalMap>[]) {
    this._mocks = mocks;
  }

  subscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    callback: (value: SignalMap[T]) => void,
  ): string {
    if (!this._subs.has(join)) {
      this._subs.set(join, new Set());
      this._store.set(join, { boolean: false, number: 0, string: "" }[type]);
    }
    this._subs.get(join)!.add(callback as (value: any) => void);
    callback(this._store.get(join));
    return Date.now().toString();
  }

  unsubscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    id: string,
  ): void {
    return;
  }

  publishEvent<T extends keyof SignalMap>(
    type: T,
    join: string,
    value: SignalMap[T],
  ): void {
    this._store.set(join, value);
    this._subs.get(join)?.forEach((cb) => cb(value));
    this.processInterdependencies(type, join, value);
  }

  private processInterdependencies<T extends keyof SignalMap>(
    type: T,
    join: string,
    value: SignalMap[T],
  ) {
    // Iterate through our global Mocks
    this._mocks.forEach((mock) => {
      if (
        mock.trigger.type === type &&
        mock.trigger.join === join &&
        mock.trigger.condition(value)
      ) {
        mock.effects.forEach((effect) => {
          // Get current value for the effect join, if any.
          const currentValue =
            this._store.get(effect.join) ??
            { boolean: false, number: 0, string: "" }[effect.type];
          const newValue = effect.compute(value, currentValue);
          this.publishEvent(effect.type, effect.join, newValue);
        });
      }
    });
  }
}

/**
 * Create a mock control system in Typescript. Example:
 * ```ts
 * const Mocks = [
 *  mock({
 *    trigger: {
 *      type: "boolean",
 *      join: "1",
 *      condition: (value) => value === true,
 *    },
 *    effects: [
 *      {
 *        type: "number",
 *        join: "5",
 *        compute: (v, curr) => curr + 5,
 *      },
 *    ],
 *  }),
 * ];
 * ```
 */
export function mock<T extends keyof SignalMap, E extends keyof SignalMap>(
  v: TMock<T, E>,
): TMock<T, E> {
  return v;
}

export type TMock<T extends keyof SignalMap, E extends keyof SignalMap> = {
  trigger: {
    type: T;
    join: string;
    condition: (value: SignalMap[T]) => boolean;
  };
  effects: [
    {
      type: E;
      join: string;
      compute: (
        triggerValue: SignalMap[T],
        currentValue: SignalMap[E],
      ) => SignalMap[E];
    },
  ];
};

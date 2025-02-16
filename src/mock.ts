import { SignalMap } from "@/hook.js";

export * from "./context.js";

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

type Store<T extends keyof SignalMap> = [
  SignalMap[T],
  (v: SignalMap[T]) => void,
];

export class MockCrComLib implements CrComLibInterface {
  private _digital = new Map<string, [boolean, (v: boolean) => void]>();
  private _analog = new Map<string, [number, (v: number) => void]>();
  private _string = new Map<string, [string, (v: string) => void]>();

  private _mocks: TMock<keyof SignalMap, keyof SignalMap>[];

  constructor(mocks: TMock<keyof SignalMap, keyof SignalMap>[]) {
    this._mocks = mocks;
  }

  subscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    callback: (value: SignalMap[T]) => void,
  ): string {
    if (type === "boolean") {
      if (!this._digital.has(join)) {
        this._digital.set(join, [false, callback as any]);
      }
    }

    if (type === "number") {
      if (!this._analog.has(join)) {
        this._analog.set(join, [0, callback as any]);
      }
    }

    if (type === "string") {
      if (!this._string.has(join)) {
        this._string.set(join, ["", callback as any]);
      }
    }

    return `${type} ${join}`;
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
    const t = this.subscribeState(type, join, () => {
      throw Error("this function should not be ran");
    }).split(" ") as [string, string];

    // @ts-ignore-next-line
    let f: Store<T> = [];

    if (t[0] === "boolean") {
      f = this._digital.get(t[1])! as unknown as Store<T>;
    }

    if (t[0] === "number") {
      f = this._analog.get(t[1])! as unknown as Store<T>;
    }

    if (t[0] === "string") {
      f = this._string.get(t[1])! as unknown as Store<T>;
    }

    if (f === undefined) {
    }

    if (f === undefined) {
      throw Error("join not found!");
    }

    f[1](value);

    this.processInterdependencies(type, join, value);
  }

  private processInterdependencies<T extends keyof SignalMap>(
    type: T,
    join: string,
    value: SignalMap[T],
  ) {
    const defaults: SignalMap = { boolean: false, number: 0, string: "" };
    this._mocks.forEach((mock) => {
      if (
        mock.trigger.type === type &&
        mock.trigger.join === join &&
        mock.trigger.condition(value)
      ) {
        mock.effects.forEach((effect) => {
          const digitals = this._store.get(effect.join);
          if (!join) {
            throw Error(
              `tried to compute effect for join ${effect.join} and it was undefined`,
            );
          }

          const newValue = effect.compute(
            value,
            join[0],
            (join, type) => this._store.get(join)[0],
          );
          this.publishEvent(effect.type, effect.join, newValue);
        });
      }
    });
  }
}

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
        getValue: <K extends keyof SignalMap>(
          join: string,
          type: K,
        ) => SignalMap[K],
      ) => SignalMap[E];
    },
  ];
};

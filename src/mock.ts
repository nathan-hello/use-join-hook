import { SignalMap } from "@/hook.js";

export type CrComLibInterface = {
  subscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    callback: (value: SignalMap[T]) => void,
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
};

type JoinStore = {
  value: SignalMap[keyof SignalMap];
  type: keyof SignalMap;
  callbacks: Set<(value: any) => void>;
};

export class MockCrComLib implements CrComLibInterface {
  private store = new Map<string, JoinStore>();
  private mocks: TMock<keyof SignalMap, keyof SignalMap>[];

  constructor(mocks: TMock<keyof SignalMap, keyof SignalMap>[]) {
    this.mocks = mocks;
  }

  subscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    callback: (value: SignalMap[T]) => void,
  ): string {
    const key = join;

    if (!this.store.has(key)) {
      this.store.set(key, {
        value: this.getDefaultValue(type),
        type,
        callbacks: new Set(),
      });
    }

    const store = this.store.get(key)!;
    store.callbacks.add(callback);

    // Initial value callback
    callback(store.value as SignalMap[T]);

    return key;
  }

  unsubscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    id: string,
  ): void {
    const store = this.store.get(id);
    if (store) {
      store.callbacks.clear();
    }
  }

  publishEvent<T extends keyof SignalMap>(
    type: T,
    join: string,
    value: SignalMap[T],
  ): void {
    const key = join;

    if (!this.store.has(key)) {
      this.store.set(key, {
        value,
        type,
        callbacks: new Set(),
      });
    }

    const store = this.store.get(key)!;
    store.value = value;

    // Notify all callbacks
    store.callbacks.forEach((callback) => callback(value));

    // Process interdependencies
    this.processInterdependencies(type, join, value);
  }

  private getDefaultValue<T extends keyof SignalMap>(type: T): SignalMap[T] {
    const defaults: SignalMap = {
      boolean: false,
      number: 0,
      string: "",
    };
    return defaults[type];
  }

  private processInterdependencies<T extends keyof SignalMap>(
    type: T,
    join: string,
    value: SignalMap[T],
  ): void {
    this.mocks.forEach((mock) => {
      if (
        mock.trigger.type === type &&
        mock.trigger.join === join &&
        mock.trigger.condition(value)
      ) {
        mock.effects.forEach((effect) => {
          const store = this.store.get(effect.join);
          if (!store) {
            this.store.set(effect.join, {
              value: this.getDefaultValue(effect.type),
              type: effect.type,
              callbacks: new Set(),
            });
          }

          const currentValue = this.store.get(effect.join)
            ?.value as SignalMap[typeof effect.type];
          const newValue = effect.compute(
            value,
            currentValue,
            (join, type) =>
              (this.store.get(join)?.value ??
                this.getDefaultValue(type)) as SignalMap[typeof type],
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
  effects: Array<{
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
  }>;
};

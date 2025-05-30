import { SignalMap, MockLogicWave } from "@/types.js";

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

interface StoreState {
  values: {
    [T in keyof SignalMap]?: {
      [join: string]: SignalMap[T];
    };
  };
  subscribers: {
    [T in keyof SignalMap]?: {
      [join: string]: {
        [id: string]: (value: SignalMap[T]) => void;
      };
    };
  };
  logicWaves: {
    [T in keyof SignalMap]?: {
      [join: string]: MockLogicWave<T>;
    };
  };
}

export class _MockCrComLib implements CrComLibInterface {
  private store: StoreState = {
    values: {},
    subscribers: {},
    logicWaves: {},
  };

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  public getState<T extends keyof SignalMap>(
    type: T,
    join: number | string,
  ): SignalMap[T] | undefined {
    return this.store.values[type]?.[join.toString()];
  }

  public subscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    callback: (value: SignalMap[T]) => void,
  ): string {
    if (!this.store.subscribers[type]) {
      this.store.subscribers[type] = {};
    }

    if (!this.store.subscribers[type][join]) {
      this.store.subscribers[type][join] = {};
    }

    const id = this.generateId();
    this.store.subscribers[type]![join][id] = callback;

    // Call with current value if it exists
    const currentValue = this.getState(type, join);
    if (currentValue !== undefined) {
      callback(currentValue);
    }

    return id;
  }

  public unsubscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    id: string,
  ): void {
    if (
      this.store.subscribers[type] &&
      this.store.subscribers[type]![join] &&
      this.store.subscribers[type]![join][id]
    ) {
      delete this.store.subscribers[type]![join][id];
    }
  }

  public publishEvent<T extends keyof SignalMap>(
    type: T,
    join: string | number,
    value: SignalMap[T],
  ): void {
    // Apply transformer if exists
    const joinStr = join.toString();
    let finalValue = value;
    const transformer = this.store.logicWaves[type]?.[joinStr];
    if (transformer) {
      finalValue = transformer(value, this.getState, this.publishEvent);
    }

    // Update store
    if (!this.store.values[type]) {
      this.store.values[type] = {};
    }
    this.store.values[type][joinStr] = finalValue;

    // Notify subscribers
    if (this.store.subscribers[type]?.[joinStr]) {
      Object.values(this.store.subscribers[type][joinStr]).forEach(
        (callback) => {
          callback(finalValue);
        },
      );
    }
  }

  public registerMock<T extends keyof SignalMap>(
    type: T,
    join: string,
    logicWave: MockLogicWave<T>,
  ): void {
    if (!this.store.logicWaves[type]) {
      this.store.logicWaves[type] = {};
    }
    this.store.logicWaves[type][join] = logicWave;
  }
}

export const MockCrComLib = new _MockCrComLib();

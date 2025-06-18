import { MockLogicWave, SignalMap } from "@/types.js";

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
  getState<T extends keyof SignalMap>(type: T, join: string): SignalMap[T];
};

// We have the make this type have ? for the values or else typescript gets annoying
// Also we can't use Record<keyof SignalMap, SignalMap[T]> or anything like that because where does T come from?
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
    values: {
      boolean: {},
      number: {},
      string: {},
    },
    subscribers: {
      boolean: {},
      number: {},
      string: {},
    },
    logicWaves: {
      boolean: {},
      number: {},
      string: {},
    },
  };

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Arrow function so it gets a proper closer for when we pass this function into logicWave()
  public getState = <T extends keyof SignalMap>(
    type: T,
    join: number | string,
  ): SignalMap[T] => {
    const val = this.store.values?.[type]?.[join.toString()];
    if (val === undefined) {
      return { boolean: false, number: 0, string: "" }[type];
    }
    return val;
  };

  public subscribeState<T extends keyof SignalMap>(
    type: T,
    join: string,
    callback: (value: SignalMap[T]) => void,
  ): string {
    // This case is never hit but if I get rid of it, typescript complains.
    if (!this.store.subscribers[type]) {
      this.store.subscribers[type] = {};
    }

    if (!this.store.subscribers[type][join]) {
      this.store.subscribers[type][join] = {};
    }

    const id = this.generateId();
    this.store.subscribers[type][join][id] = callback;

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
      this.store.subscribers[type][join] &&
      this.store.subscribers[type][join][id]
    ) {
      delete this.store.subscribers[type][join][id];
    }
  }

  // Arrow function so it gets a proper closer for when we pass this function into logicWave()
  public publishEvent = <T extends keyof SignalMap>(
    type: T,
    join: string | number,
    value: SignalMap[T],
  ): void => {
    // Apply logicWave if exists
    const joinStr = join.toString();
    let finalValue = value;
    const logicWave = this.store.logicWaves[type]?.[joinStr];
    if (logicWave) {
      const wave = logicWave(value, this.getState, this.publishEvent);
      finalValue = wave !== undefined ? wave : this.getState(type, join);
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
  };

  public registerMock<T extends keyof SignalMap>(
    type: T,
    join: string,
    logicWave: MockLogicWave<T> | undefined,
    initalValue: SignalMap[T] | undefined,
  ): void {
    if (!this.store.logicWaves[type]) {
      this.store.logicWaves[type] = {};
    }

    if (logicWave) {
      this.store.logicWaves[type][join] = logicWave;
    }

    if (!this.store.values[type]) {
      this.store.values[type] = {};
    }
    if (initalValue !== undefined) {
      this.store.values[type][join] = initalValue;
    }
  }
}

export const MockCrComLib = new _MockCrComLib();
if (window !== undefined) {
  // @ts-ignore-next-line
  window.MockCrComLib = MockCrComLib;
}

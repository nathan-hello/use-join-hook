import {
  MockLogicWave,
  SignalMap,
  JoinMap,
  JoinMapKeysToStringUnion,
} from "@/types.js";

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

interface StoreState<J extends JoinMap> {
  values: {
    [T in keyof SignalMap]?: {
      [key in JoinMapKeysToStringUnion<J, T>]?: SignalMap[T];
    };
  };
  subscribers: {
    [T in keyof SignalMap]?: {
      [key in JoinMapKeysToStringUnion<J, T>]?: {
        [id: string]: (value: SignalMap[T]) => void;
      };
    };
  };
  logicWaves: {
    [T in keyof SignalMap]?: {
      [key in JoinMapKeysToStringUnion<J, T>]?: MockLogicWave<J, T>;
    };
  };
}

export class _MockCrComLib<J extends JoinMap> implements CrComLibInterface {
  private store: StoreState<J>;

  constructor(joinMap: J) {
    this.store = {
      values: {},
      subscribers: {},
      logicWaves: {},
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Arrow function so it gets a proper closer for when we pass this function into logicWave()
  public getState = <T extends keyof SignalMap>(
    type: T,
    join: JoinMapKeysToStringUnion<J, T>,
  ): SignalMap[T] => {
    const val = this.store.values?.[type]?.[join];
    if (val === undefined) {
      return { boolean: false, number: 0, string: "" }[type];
    }
    return val;
  };

  public subscribeState<T extends keyof SignalMap>(
    type: T,
    join: JoinMapKeysToStringUnion<J, T>,
    callback: (value: SignalMap[T]) => void,
  ): string {
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
    join: JoinMapKeysToStringUnion<J, T>,
    id: string,
  ): void {
    if (this.store.subscribers[type]?.[join]?.[id]) {
      delete this.store.subscribers[type][join][id];
    }
  }

  // Arrow function so it gets a proper closer for when we pass this function into logicWave()
  public publishEvent = <T extends keyof SignalMap>(
    type: T,
    join: JoinMapKeysToStringUnion<J, T>,
    value: SignalMap[T],
  ): void => {
    let finalValue = value;
    const logicWave = this.store.logicWaves[type]?.[join];
    if (logicWave) {
      const wave = logicWave(value, this.getState, this.publishEvent);
      finalValue = wave !== undefined ? wave : this.getState(type, join);
    }

    // Update store
    if (!this.store.values[type]) {
      this.store.values[type] = {};
    }
    this.store.values[type][join] = finalValue;

    if (this.store.subscribers[type]?.[join]) {
      Object.values(this.store.subscribers[type][join]).forEach((callback) => {
        callback(finalValue);
      });
    }
  };

  public registerMock<T extends keyof SignalMap>(
    type: T,
    join: JoinMapKeysToStringUnion<J, T>,
    logicWave: MockLogicWave<J, T> | undefined,
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

export function createMockCrComLib<J extends JoinMap>(
  joinMap: J,
): _MockCrComLib<J> {
  return new _MockCrComLib(joinMap);
}

import { SignalMap, MockTransformer, MockTriggers } from "@/types.js";

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
  transformers: {
    [T in keyof SignalMap]?: {
      [join: string]: MockTransformer<T>;
    };
  };
  triggers: {
    [T in keyof SignalMap]?: {
      [join: string]: MockTriggers<T>;
    };
  };
}

export class _MockCrComLib implements CrComLibInterface {
  private store: StoreState = {
    values: {},
    subscribers: {},
    transformers: {},
    triggers: {},
  };

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  public getState<T extends keyof SignalMap>(
    type: T,
    join: string,
  ): SignalMap[T] | undefined {
    return this.store.values[type]?.[join];
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
    join: string,
    value: SignalMap[T],
  ): void {
    // Apply transformer if exists
    let finalValue = value;
    const transformer = this.store.transformers[type]?.[join];
    if (transformer) {
      finalValue = transformer(value, this.getState);
    }

    // Update store
    if (!this.store.values[type]) {
      this.store.values[type] = {};
    }
    this.store.values[type][join] = finalValue;

    // Notify subscribers
    if (this.store.subscribers[type]?.[join]) {
      Object.values(this.store.subscribers[type]![join]).forEach((callback) => {
        callback(finalValue);
      });
    }

    // Check triggers
    const triggers = this.store.triggers[type]?.[join];
    if (triggers) {
      triggers.forEach((trigger) => {
        if (trigger.condition(finalValue)) {
          trigger.action();
        }
      });
    }
  }

  public registerTransformer<T extends keyof SignalMap>(
    type: T,
    join: string,
    transformer: MockTransformer<T>,
  ): void {
    if (!this.store.transformers[type]) {
      this.store.transformers[type] = {};
    }
    this.store.transformers[type][join] = transformer;
  }

  public registerTrigger<T extends keyof SignalMap>(
    type: T,
    join: string,
    condition: (value: SignalMap[T]) => boolean,
    action: () => void,
  ): void {
    if (!this.store.triggers[type]) {
      this.store.triggers[type] = {};
    }
    if (!this.store.triggers[type][join]) {
      this.store.triggers[type][join] = [];
    }
    this.store.triggers[type][join]?.push({ condition, action });
  }
}

export const MockCrComLib = new _MockCrComLib();

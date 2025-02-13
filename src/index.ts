import { useState, useEffect, useRef } from "react";
import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";

export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T>,
): RUseJoin<T> {
  const join = getJoin(options);

  const [state, setState] = useState<SignalMap[T]>(
    getInitialState(options.type, options?.mock?.initialValue),
  );
  useEffect(() => {
    const id = CrComLib.subscribeState(options.type, join, setState as any);
    return () => {
      CrComLib.unsubscribeState(options.type, join, id);
    };
  }, []);

  let pubState = (v: SignalMap[T]) => {
    CrComLib.publishEvent(options.type, join, v);
    triggerLog(options, join, false, v);
  };

  if (!isCrestronDevice() && options?.mock?.fn) {
    // Assigning options.mock.fn to a variable because typescript thinks it is "potentially undefined" otherwise.
    const mockFn = options.mock.fn;
    pubState = (v: SignalMap[T]) => {
      const value = mockFn(v);
      triggerLog(options, join, true, v);
      if (value) {
        setState(value);
      }
    };
  }

  if (options?.effects?.resetAfterMs) {
    const realPublish = pubState;
    const wrapPublish = (v: SignalMap[T]) => {
      realPublish(v);
      setTimeout(
        () =>
          realPublish({ boolean: false, number: 0, string: "" }[options.type]),
        options?.effects?.resetAfterMs,
      );
    };
    pubState = wrapPublish;
  }

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (options?.effects?.debounce) {
    const realPublish = pubState;
    const wrapPublish = (v: SignalMap[T]) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        realPublish(v);
      }, options?.effects?.debounce ?? 0);
    };
    pubState = wrapPublish;
  }

  return [state, pubState];
}

function triggerLog<T extends keyof SignalMap>(
  options: PUseJoin<T>,
  join: string,
  isMock: boolean,
  value: SignalMap[T],
) {
  if (options.log === undefined || options.log === false) {
    return;
  }
  let str = "";

  if (isMock === true) {
    str += "mock: ";
  }
  if (typeof options.log === "function") {
    const ret = options.log(join, value, isMock, options.key);
    if (ret === undefined) {
      return;
    } else {
      str += ret;
    }
  }

  if (options.log === true) {
    if (options.key !== undefined) {
      str += `key ${options.key} `;
    }
    str += `join ${join} sent value: ${value}`;
  }

  console.log(str);
}

function getJoin<T extends keyof SignalMap>(options: PUseJoin<T>): string {
  let join = options.join;
  if (typeof join === "string") {
    return join;
  }
  if (options.offset === undefined) {
    return join.toString();
  }

  if (typeof options.offset === "number") {
    join = join + options.offset;
  } else {
    const offset = options.offset[options.type];
    if (offset) {
      join = offset + join;
    }
  }
  return join.toString();
}

type SignalMap = {
  boolean: boolean;
  number: number;
  string: string;
};

export type PUseJoin<T extends keyof SignalMap> = {
  /**
   * Join number / string over which the Crestron system is going to subscribe/publish.
   */
  join: number | string;
  /**
   * Offset is used for join numbers such that you can have a default join number
   * and then apply offsets. Suggested practice is to put these in a utils.ts file
   * and have it available to export. An example of this is in examples/joins.ts
   */
  offset?: number | { boolean?: number; number?: number; string?: number };
  /**
   * `"boolean" | "number" | "string"`. The CrComLib.publishEvent function
   * allows for many more options than this but here it's constrained so it's easier to grep.
   */
  type: T;
  /**
   * Mock allows you to set an initialValue as if the Crestron system set it to this at startup,
   * as well as making a function that should emulate the behavior of your Crestron program.
   * In the future, this could be useful for a testing framework.
   * Mocks are only used if `CrComLib.isCrestronTouchpanel()` and `CrComLib.isIosDevice()`
   * are both false and the mock object is defined.
   */
  mock?: {
    /**
     * Set the value of this variable to something on initialization. This will be redone
     * every time the React component that calls `useJoin()` unrenders and rerenders.
     */
    initialValue?: SignalMap[T];
    /**
     * A function that takes the value in `type`. If you return a value from this function,
     * the state will update to that value.
     */
    fn?: (v: SignalMap[T]) => SignalMap[T] | void;
  };
  /**
   * If `log` is true, then it will console.log() a default string such as `key <key> join <join> sent value <value>`.
   * If `log` is a function, then that function will be supplied with four values: join, value, isMock, and key (if key is defined).
   */
  log?:
    | boolean
    | ((
        join: string,
        value: SignalMap[T],
        isMock: boolean,
        key?: string,
      ) => string | void);
  /**
   * Used for logging and your own documentation.
   */
  key?: string;
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
};

export type RUseJoin<T extends keyof SignalMap> = [
  SignalMap[T],
  (v: SignalMap[T]) => void,
];

function getInitialState<T extends keyof SignalMap>(
  signalType: T,
  initialState?: SignalMap[T],
): SignalMap[T] {
  if (!isCrestronDevice() && initialState) {
    return initialState;
  }
  return { boolean: false, number: 0, string: "" }[signalType];
}

function isCrestronDevice() {
  return CrComLib.isCrestronTouchscreen() || CrComLib.isIosDevice();
}

import { useState, useEffect } from "react";
import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { useDebouncedCallback } from "use-debounce";

export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T>,
): RUseJoin<T> {
  const join = getJoin(options);

  const [state, setState] = useState<SignalMap[T]>(
    getInitialState(options.type, options?.mock?.initialValue) as SignalMap[T],
  );
  useEffect(() => {
    const id = CrComLib.subscribeState(options.type, join, setState as any);
    return () => {
      CrComLib.unsubscribeState(options.type, join, id);
    };
  }, []);

  let pubState = crestronPublish(options, join);

  if (!isCrestronDevice() && options.mock) {
    pubState = mockPublish(options, join, setState);
  }

  if (options?.effects?.resetAfterMs) {
    const realPublish = pubState;
    const wrapPublish = (v: SignalMap[T]) => {
      realPublish(v);
      setTimeout(
        () =>
          realPublish(
            getInitialState(options.type, options?.mock?.initialValue),
          ),
        options?.effects?.resetAfterMs,
      );
    };
    pubState = wrapPublish;
  }

  // This hook is outside of the if statement to follow the Rules of React.
  const debounced = useDebouncedCallback(
    pubState,
    options?.effects?.debounce ?? 0,
  );
  if (options?.effects?.debounce) {
    pubState = debounced;
  }

  return [state, pubState];
}

function crestronPublish<T extends keyof SignalMap>(
  options: PUseJoin<T>,
  join: string,
) {
  return (v: SignalMap[T]) => {
    CrComLib.publishEvent(options.type, join, v);
    triggerLog(options, join, false, v);

    if (options?.effects?.resetAfterMs) {
      setTimeout(() => {
        CrComLib.publishEvent(
          options.type,
          join,
          getInitialState(options.type),
        );
        triggerLog(options, join, false, v);
      }, options.effects.resetAfterMs);
    }
  };
}

function mockPublish<T extends keyof SignalMap>(
  options: PUseJoin<T>,
  join: string,
  setState: React.Dispatch<React.SetStateAction<SignalMap[T]>>,
) {
  return (v: SignalMap[T]) => {
    const value = options.mock!.fn!(v);
    triggerLog(options, join, true, v);

    if (value === undefined) {
      return;
    }
    if (options?.effects?.resetAfterMs) {
      setTimeout(() => {
        setState(getInitialState(options.type));
      }, options.effects.resetAfterMs);
    }

    setState(value);
  };
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
  key?: string;
  join: number | string;
  offset?: number | { boolean?: number; number?: number; string?: number };
  type: T;
  mock?: {
    initialValue?: SignalMap[T];
    fn?: (v: SignalMap[T]) => SignalMap[T] | void;
  };
  log?:
    | boolean
    | ((
        join: string,
        value: SignalMap[T],
        isMock: boolean,
        key?: string,
      ) => string | void);
  effects?: {
    debounce?: number;
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
  return CrComLib.isCrestronTouchscreen() && CrComLib.isIosDevice;
}

import { useState, useEffect } from "react";
import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";

/**
The state variable is updated by the processor. It only updates when the processor sends the feedback to the join number.
Because of this, you should not mutate the state variable. Only publish new information to the processor and let your
program determine the state through the feedback.

The publish has a signature of (v: boolean | number | string) => void.  
As a convention, name the publish function something like pubState instead of setState.
When you use pubState(true), this is the rising edge of the digital signal. If you want the button to have a falling edge
to signify the button is no longer being pressed, make sure you do this. E.g.
```tsx
    <Button
      onTouchStart={() => pubState(true)}
      onTouchEnd={() => pubState(false)}
      onTouchCancel={() => pubState(false)}
    >...</Button>
```
Without a falling edge, the processor will constantly read the join number as high. Make sure your UI logic takes this into account.

The connection to the join number happens over the IP table. There is no IP table information in the Javascript CrCromLib library.
To connect to the processor using this Javascript, go to 
SMW -> Central Control Modules (e.g. CP4) -> Device (e.g. TS1070) -> F6 (Configure Device...) -> IP Net Address
And put the IP ID (e.g. 03) in the dropdown and set the radio button to IP ID instead of "Remap this IP ID at program upload".  
Then make an entry in your device's IP Table over the same IP ID back to the processor.
This means that the useJoin doesn't work at all unless if you're on and XPanel or phyiscal touchpanel device that is connected
to a processor. A method of mocking a processor is required for testing but is not implemented yet.
*/

export function useJoin<
  K extends string | undefined,
  T extends keyof SignalMap,
  R extends boolean = false
>(options: PUseJoin<K, T, R>): RUseJoin<K, T, R> {
  const join = options.join.toString();
  const [state, setState] = useState<SignalMap[T]>(
    getInitialState(options.type, options?.mock?.initialValue) as SignalMap[T]
  );

  useEffect(() => {
    const id = CrComLib.subscribeState(options.type, join, setState as any);
    return () => {
      CrComLib.unsubscribeState(options.type, join, id);
    };
  }, []);

  let pubState = crestronPublish(options, join);

  if (isCrestronDevice() && options.mock) {
    pubState = (v: SignalMap[T]) => {
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

  const stateKey = options.key ? options.key : "state";
  const pubKey = options.key
    ? `pub${options.key.charAt(0).toUpperCase() + options.key.slice(1)}`
    : "pubState";

  const result = {
    [stateKey]: state,
    [pubKey]: pubState,
  } as RUseJoin<K, T, R>;

  return result;
}

function crestronPublish<
  K extends string | undefined,
  T extends keyof SignalMap,
  R extends boolean = false
>(options: PUseJoin<K, T, R>, join: string) {
  return (v: SignalMap[T]) => {
    CrComLib.publishEvent(options.type, join, v);
    triggerLog(options, join, false, v);

    if (options?.effects?.resetAfterMs) {
      setTimeout(() => {
        CrComLib.publishEvent(
          options.type,
          join,
          getInitialState(options.type)
        );
        triggerLog(options, join, false, v);
      }, options.effects.resetAfterMs);
    }
  };
}

function triggerLog<
  K extends string | undefined,
  T extends keyof SignalMap,
  R extends boolean = false
>(
  options: PUseJoin<K, T, R>,
  join: string,
  isMock: boolean,
  value: SignalMap[T]
) {
  if (options.log === undefined || options.log === false) {
    return;
  }
  let str = "";

  if ((isMock = true)) {
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

type SignalMap = {
  boolean: boolean;
  number: number;
  string: string;
};

export type PUseJoin<
  K extends string | undefined,
  T extends keyof SignalMap,
  R extends boolean = false
> = {
  key: K;
  join: number | string;
  offset?: number;
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
        key: K
      ) => string | void);
  effects?: {
    readOnly?: R;
    resetAfterMs?: number;
    toggle?: boolean;
  };
};

export type JState<
  K extends string | undefined,
  T extends keyof SignalMap
> = K extends string ? { [key in K]: SignalMap[T] } : { state: SignalMap[T] };

export type JPubState<
  K extends string | undefined,
  T extends keyof SignalMap
> = K extends string
  ? { [key in `pub${Capitalize<K>}`]: (v: SignalMap[T]) => void }
  : { pubState: (v: SignalMap[T]) => void };

export type RUseJoin<
  K extends string | undefined,
  T extends keyof SignalMap,
  R extends boolean = false
> = JState<K, T> & (R extends true ? {} : JPubState<K, T>);

function getInitialState<T extends keyof SignalMap>(
  signalType: T,
  initialState?: SignalMap[T]
): SignalMap[T] {
  if (!isCrestronDevice() && initialState) {
    return initialState;
  }
  return { boolean: false, number: 0, string: "" }[signalType];
}

function isCrestronDevice() {
  return CrComLib.isCrestronTouchscreen() && CrComLib.isIosDevice;
}

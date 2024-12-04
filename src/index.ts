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

export function useJoin<T extends keyof SignalMap>(
  options: PUseJoin<T>
): RUseJoin<T> {
  const join = getJoin(options);

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

  if (!isCrestronDevice() && options.mock) {
    pubState = mockPublish(options, join, setState);
  }

  if (options?.effects?.debounce) {
    if (
      options?.effects?.resetAfterMs &&
      options?.effects?.debounce < options?.effects?.resetAfterMs
    ) {
      console.error(
        `debounce for join ${join} is ${options.effects.debounce}, resetAfterMs for join is ${options.effects.resetAfterMs}\n`,
        `setting the debounce to less than the resetAfterMs could lead to state collision issues!`
      );
    }
    let deb = createStackedDebounce<T>(options?.effects?.debounce);
    pubState = (v: SignalMap[T]) => deb(pubState, v);
  }

  return [state, pubState];
}

function crestronPublish<T extends keyof SignalMap>(
  options: PUseJoin<T>,
  join: string
) {
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

function mockPublish<T extends keyof SignalMap>(
  options: PUseJoin<T>,
  join: string,
  setState: React.Dispatch<React.SetStateAction<SignalMap[T]>>
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
  value: SignalMap[T]
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

function createStackedDebounce<T extends keyof SignalMap>(interval: number) {
  let actionStack: { fn: (v: SignalMap[T]) => void; value: SignalMap[T] }[] =
    [];
  let timer: NodeJS.Timeout | undefined = undefined;

  return function debounce(fn: (v: SignalMap[T]) => void, value: SignalMap[T]) {
    actionStack.push({ fn, value });

    if (!timer) {
      timer = setInterval(() => {
        if (actionStack.length === 0) {
          clearInterval(timer);
          timer = undefined;
          return;
        }

        const curr = actionStack.shift();
        if (curr !== undefined) {
          const { fn, value } = curr;
          fn(value);
        }
      }, interval);
    }
  };
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
        key?: string
      ) => string | void);
  effects?: {
    debounce?: number;
    readOnly?: boolean;
    resetAfterMs?: number;
    toggle?: boolean;
  };
};

export type RUseJoin<T extends keyof SignalMap> = [
  SignalMap[T],
  (v: SignalMap[T]) => void
];

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

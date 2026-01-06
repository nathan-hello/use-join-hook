import {
  _MockCrComLib,
  CrComLibInterface,
  MockCrComLib,
} from "@/mock/store.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import type {
  SignalMap,
  MultiJoin,
  PUseJoin,
  SingleJoin,
  LogFunction,
} from "@/types.js";
import { logger } from "@/utils/log.js";

export type MakeJoinResult<
  T extends keyof SignalMap = keyof SignalMap,
  K extends SingleJoin | MultiJoin = SingleJoin,
> = {
  value: K extends SingleJoin ? SignalMap[T] : SignalMap[T][];
  publish: K extends SingleJoin
    ? (value: SignalMap[T]) => void
    : (values: (SignalMap[T] | undefined)[]) => void;
  subscribe: K extends SingleJoin
    ? (callback: (value: SignalMap[T]) => void) => void
    : (callback: (values: SignalMap[T][]) => void) => void;
  cleanup: () => void;
};

export type MakeJoinParams = {
  forceMock?: boolean;
  logger?: boolean | LogFunction;
};

function joinIsArray<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): options is PUseJoin<T, MultiJoin> {
  return (
    Array.isArray(options.join) ||
    (typeof options.join === "object" && "start" in options.join)
  );
}

function getJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): string {
  if (typeof options.join === "string") {
    return options.join;
  }

  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  const joinWithOffset = options.join + offset;

  return joinWithOffset.toString();
}

function getJoins<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): string[] {
  const { join } = options;
  let offset = 0;

  if (typeof options.offset === "number") {
    offset = options.offset;
  }
  if (typeof options.offset === "object") {
    offset = options.offset[options.type] ?? 0;
  }

  if (Array.isArray(join)) {
    return join.map((j) => {
      if (typeof j === "string") return j;
      return (j + offset).toString();
    });
  } else {
    const joins: string[] = [];
    for (let i = join.start; i <= join.end; i++) {
      joins.push((i + offset).toString());
    }
    return joins;
  }
}

export function makeJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  params?: MakeJoinParams,
): MakeJoinResult<T, MultiJoin>;
export function makeJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  params?: MakeJoinParams,
): MakeJoinResult<T, SingleJoin>;
export function makeJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
  params?: MakeJoinParams,
): MakeJoinResult<T, SingleJoin | MultiJoin> {
  if (joinIsArray(options)) {
    return makeJoinMulti(options as PUseJoin<T, MultiJoin>, params);
  }
  return makeJoinSingle(options as PUseJoin<T, SingleJoin>, params);
}

function makeJoinSingle<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
  params?: MakeJoinParams,
): MakeJoinResult<T, SingleJoin> {
  const CrComLib: CrComLibInterface =
    params?.forceMock ||
    (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
      ? MockCrComLib
      : (RealCrComLib as CrComLibInterface);

  const join = getJoin(options);

  // Get initial value
  let currentValue = CrComLib.getState(options.type, join);
  if (currentValue === null) {
    currentValue = { boolean: false, number: 0, string: "" }[options.type];
  } else {
    logger(
      { options, join, direction: "init'd", value: currentValue },
      params?.logger,
    );
  }

  // Track subscription IDs
  const subscriptionIds: string[] = [];
  let userCallback: ((value: SignalMap[T]) => void) | null = null;

  // Create debounce timeout holder
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  // Create publish function
  let publish = (value: SignalMap[T]) => {
    logger({ options, join, direction: "sent", value }, params?.logger);
    CrComLib.publishEvent(options.type, join, value);
    currentValue = value;
  };

  // Apply effects
  if (options?.effects?.resetAfterMs) {
    const originalPublish = publish;
    publish = (value: SignalMap[T]) => {
      originalPublish(value);
      setTimeout(() => {
        originalPublish(
          { boolean: false, number: 0, string: "" }[options.type],
        );
      }, options.effects?.resetAfterMs);
    };
  }

  if (options?.effects?.debounce) {
    const originalPublish = publish;
    publish = (value: SignalMap[T]) => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        originalPublish(value);
      }, options.effects?.debounce);
    };
  }

  // Subscribe function
  const subscribe = (callback: (value: SignalMap[T]) => void) => {
    userCallback = callback;

    const id = CrComLib.subscribeState(
      options.type,
      join,
      (value: SignalMap[T]) => {
        logger({ options, join, direction: "recieved", value }, params?.logger);
        currentValue = value;
        if (userCallback) {
          userCallback(value);
        }
      },
    );
    subscriptionIds.push(id);
  };

  // Cleanup function
  const cleanup = () => {
    subscriptionIds.forEach((id) => {
      CrComLib.unsubscribeState(options.type, join, id);
    });
    subscriptionIds.length = 0;
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
  };

  return {
    value: currentValue,
    publish,
    subscribe,
    cleanup,
  };
}

function makeJoinMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
  params?: MakeJoinParams,
): MakeJoinResult<T, MultiJoin> {
  const CrComLib: CrComLibInterface =
    params?.forceMock ||
    (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
      ? MockCrComLib
      : (RealCrComLib as CrComLibInterface);

  const joins = getJoins(options);

  // Get initial values
  const currentValues = joins.map((join, index) => {
    const value = CrComLib.getState(options.type, join);
    const initialValue =
      value !== null
        ? value
        : { boolean: false, number: 0, string: "" }[options.type];

    if (value !== null) {
      logger(
        { options, join, direction: "init'd", value: initialValue, index },
        params?.logger,
      );
    }

    return initialValue;
  });

  // Track subscription IDs
  const subscriptionIds: string[] = [];
  let userCallback: ((values: SignalMap[T][]) => void) | null = null;

  // Create debounce timeout holder
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  // Create publish function
  let publish = (values: (SignalMap[T] | undefined)[]) => {
    values.forEach((value, index) => {
      if (value !== undefined) {
        const j = joins[index];
        if (j === undefined) {
          console.error(
            "[use-join]: Publish array was longer than original join array:",
            {
              valuesLength: values.length,
              joinLength: joins.length,
              value,
              index,
              originalValues: values,
              originalJoins: joins,
            },
          );
          return;
        }
        logger(
          { options, join: j, direction: "sent", value, index },
          params?.logger,
        );
        CrComLib.publishEvent(options.type, j, value);
        currentValues[index] = value;
      }
    });
  };

  // Apply effects
  if (options?.effects?.resetAfterMs) {
    const originalPublish = publish;
    publish = (values: (SignalMap[T] | undefined)[]) => {
      originalPublish(values);
      setTimeout(() => {
        const resetValues = new Array(joins.length).fill(
          { boolean: false, number: 0, string: "" }[options.type],
        );
        originalPublish(resetValues);
      }, options.effects?.resetAfterMs);
    };
  }

  if (options?.effects?.debounce) {
    const originalPublish = publish;
    publish = (values: (SignalMap[T] | undefined)[]) => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        originalPublish(values);
      }, options.effects?.debounce);
    };
  }

  // Subscribe function
  const subscribe = (callback: (values: SignalMap[T][]) => void) => {
    userCallback = callback;

    joins.forEach((join, index) => {
      const id = CrComLib.subscribeState(
        options.type,
        join,
        (value: SignalMap[T]) => {
          logger(
            { options, join, direction: "recieved", value, index },
            params?.logger,
          );
          currentValues[index] = value;
          if (userCallback) {
            userCallback([...currentValues]);
          }
        },
      );
      subscriptionIds.push(id);
    });
  };

  // Cleanup function
  const cleanup = () => {
    joins.forEach((join, index) => {
      if (subscriptionIds[index]) {
        CrComLib.unsubscribeState(options.type, join, subscriptionIds[index]);
      }
    });
    subscriptionIds.length = 0;
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
  };

  return {
    value: currentValues,
    publish,
    subscribe,
    cleanup,
  };
}

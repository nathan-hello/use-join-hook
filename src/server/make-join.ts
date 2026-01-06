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
  JoinParams,
  MakeJoinResult,
} from "@/types.js";
import { logger } from "@/utils/log.js";
import { getJoin, getJoins, joinIsArray } from "@/utils/join.js";
import { getJoinValue } from "@/utils/state.js";

let globalParams: JoinParams | undefined = undefined;

/**
 * Set global parameters for all makeJoin calls.
 * Similar to JoinParamsProvider in the React hook version.
 *
 * @example
 * ```ts
 * setMakeJoinParams({
 *   logger: true,
 *   forceMock: true
 * });
 * ```
 */
export function setMakeJoinParams(params: JoinParams | undefined): void {
  globalParams = params;
}

export function makeJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): MakeJoinResult<T, MultiJoin>;
export function makeJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): MakeJoinResult<T, SingleJoin>;
export function makeJoin<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin> | PUseJoin<T, MultiJoin>,
): MakeJoinResult<T, SingleJoin | MultiJoin> {
  if (joinIsArray(options)) {
    return makeJoinMulti(options);
  }
  return makeJoinSingle(options);
}

function makeJoinSingle<T extends keyof SignalMap>(
  options: PUseJoin<T, SingleJoin>,
): MakeJoinResult<T, SingleJoin> {
  const CrComLib: CrComLibInterface =
    globalParams?.forceMock ||
    (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
      ? MockCrComLib
      : (RealCrComLib as CrComLibInterface);

  const join = getJoin(options);

  // Track subscription IDs
  const subscriptionIds: string[] = [];
  let userCallback: ((value: SignalMap[T]) => void) | null = null;

  // Create debounce timeout holder
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  let currentValue = getJoinValue(join, options, globalParams);

  // Auto-subscribe to keep currentValue up-to-date
  const autoSubId = CrComLib.subscribeState(
    options.type,
    join,
    (value: SignalMap[T]) => {
      logger(
        { options, join, direction: "recieved", value },
        globalParams?.logger,
      );
      currentValue = value;
      if (userCallback) {
        userCallback(value);
      }
    },
  );
  subscriptionIds.push(autoSubId);

  // Create publish function
  let publish = (value: SignalMap[T]) => {
    logger({ options, join, direction: "sent", value }, globalParams?.logger);
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

  // Subscribe function - for adding custom side effects
  const subscribe = (callback: (value: SignalMap[T]) => void) => {
    userCallback = callback;
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
    get value() {
      return currentValue;
    },
    publish,
    subscribe,
    cleanup,
  };
}

function makeJoinMulti<T extends keyof SignalMap>(
  options: PUseJoin<T, MultiJoin>,
): MakeJoinResult<T, MultiJoin> {
  const CrComLib: CrComLibInterface =
    globalParams?.forceMock ||
    (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
      ? MockCrComLib
      : (RealCrComLib as CrComLibInterface);

  const joins = getJoins(options);

  // Get initial values
  const currentValues = joins.map((join, index) => {
    return getJoinValue(join, options, globalParams, index);
  });

  // Track subscription IDs
  const subscriptionIds: string[] = [];
  let userCallback: ((values: SignalMap[T][]) => void) | null = null;

  // Create debounce timeout holder
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  // Auto-subscribe all joins to keep currentValues up-to-date
  joins.forEach((join, index) => {
    const autoSubId = CrComLib.subscribeState(
      options.type,
      join,
      (value: SignalMap[T]) => {
        logger(
          { options, join, direction: "recieved", value, index },
          globalParams?.logger,
        );
        currentValues[index] = value;
        if (userCallback) {
          userCallback([...currentValues]);
        }
      },
    );
    subscriptionIds.push(autoSubId);
  });

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
          globalParams?.logger,
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

  // Subscribe function - for adding custom side effects
  const subscribe = (callback: (values: SignalMap[T][]) => void) => {
    userCallback = callback;
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
    get value() {
      return [...currentValues];
    },
    publish,
    subscribe,
    cleanup,
  };
}

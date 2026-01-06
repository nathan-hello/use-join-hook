import type { SignalMap, PUseJoin, JoinParams } from "@/types.js";
import {
  _MockCrComLib,
  CrComLibInterface,
  MockCrComLib,
} from "@/mock/store.js";
import { CrComLib as RealCrComLib } from "@pepperdash/ch5-crcomlib-lite";
import { logger } from "@/utils/log.js";

export function getJoinValue<T extends keyof SignalMap>(
  join: string,
  options: PUseJoin<T>,
  params: JoinParams | null | undefined,
  index?: number,
): SignalMap[T] {
  const CrComLib: CrComLibInterface =
    params?.forceMock ||
    (!RealCrComLib.isCrestronTouchscreen() && !RealCrComLib.isIosDevice())
      ? MockCrComLib
      : (RealCrComLib as CrComLibInterface);

  const crestron = CrComLib.getState(options.type, join);

  if (crestron !== null) {
    logger(
      { options, join, direction: "init'd", value: crestron, index },
      params?.logger,
    );
    return crestron;
  }

  const defaultValues: SignalMap = { boolean: false, number: 0, string: "" };
  return defaultValues[options.type];
}

import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";

type BlockProps = {
  isMock?: boolean;
  timeoutMs?: number;
};

function BlockUntilCsigSync(props?: BlockProps): Promise<void> {
  return block(
    "Csig.State_Synchronization",
    () => {
      CrComLib.publishEvent("object", "Csig.State_Synchronization", {});
    },
    props,
  );
}

function BlockUntilAllSystemsOnline(props?: BlockProps): Promise<void> {
  return block("Csig.All_Control_Systems_Online_fb", undefined, props);
}

function block(
  subscribe: string,
  publish: (() => void) | undefined,
  props: BlockProps | undefined,
): Promise<void> {
  if (props?.isMock) {
    return Promise.resolve();
  }
  let timeoutId: ReturnType<typeof setTimeout>;
  let ms = props?.timeoutMs ?? 10000;

  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`${subscribe}: ${ms}ms timeout reached, proceeding anyway`);
      resolve();
    }, ms);
  });

  const syncPromise = new Promise<void>((resolve) => {
    const id = CrComLib.subscribeState("object", subscribe, (value: any) => {
      if (value?.state === "EndOfUpdate") {
        CrComLib.unsubscribeState("object", subscribe, id);
        console.log(`${subscribe}: EndOfUpdate. Success.`);
        clearTimeout(timeoutId);
        resolve();
      }
    });
    publish?.();
  });

  return Promise.race([syncPromise, timeoutPromise]);
}

export { BlockUntilCsigSync, BlockUntilAllSystemsOnline };

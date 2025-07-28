import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";

type BlockProps = {
  isMock?: boolean;
  timeoutMs?: number;
};

function BlockUntilCsigSync(props?: BlockProps): Promise<void> {
  if (props?.isMock) {
    return Promise.resolve();
  }
  let timeoutId: ReturnType<typeof setTimeout>;
  let ms = props?.timeoutMs ?? 10000;

  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(
        `Csig.State_Synchronization: ${ms}ms timeout reached, proceeding anyway`,
      );
      resolve();
    }, ms);
  });

  const syncPromise = new Promise<void>((resolve) => {
    const id = CrComLib.subscribeState(
      "object",
      "Csig.State_Synchronization",
      (value: any) => {
        if (value?.state === "EndOfUpdate") {
          CrComLib.unsubscribeState("object", "Csig.State_Synchronization", id);
          console.log(`"Csig.State_Synchronization: EndOfUpdate. Success.`);
          clearTimeout(timeoutId);
          resolve();
        }
      },
    );
    CrComLib.publishEvent("object", "Csig.State_Synchronization", {});
  });

  return Promise.race([syncPromise, timeoutPromise]);
}

export { BlockUntilCsigSync };

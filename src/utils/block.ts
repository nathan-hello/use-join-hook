import { CrComLib } from "@pepperdash/ch5-crcomlib-lite";

function BlockUntilCsigSync(isMock?: boolean): Promise<void> {
  if (isMock) {
    return Promise.resolve();
  }

  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(
        "BlockUntilCsigSync: 10 second timeout reached, proceeding anyway",
      );
      resolve();
    }, 10000);
  });

  const syncPromise = new Promise<void>((resolve) => {
    const id = CrComLib.subscribeState(
      "object",
      "Csig.State_Synchronization",
      (value: any) => {
        if (value?.state === "EndOfUpdate") {
          CrComLib.unsubscribeState("object", "Csig.State_Synchronization", id);
          console.log(
            "BlockUntilCsigSync: Csig.State_Synchronization: EndOfUpdate. Success.",
          );
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

# use-join-hook

A React hook for interacting with Crestron processors.

### Install

```bash
npm install use-join
```
```bash
bun install use-join
```

Alternatively, because the hook is ~200 lines of typescript, feel free to copy+paste `src/index.ts`
into a `hooks/` folder and import it from within your project. 

The only dependencies are React itself and `@pepperdash/ch5-crcomlib-lite`. 
Because the latter is just a truncation of the proper `@crestron/ch5-crcomlib`, if you
already have that as a dependency you can easily update the hook to use that instead. 

If you go this route, all I ask if that you put in an issue/PR for any patches you make 
that could be useful to others.

If you do use `npm/bun install` then this hook has everything required to talk to a Crestron processor. 
This fact has only been tested with the vite config as per `examples/vite/vite.config.ts`. If you
have this working differently in vite, or in another bundler, please cut an issue/PR!

# Parameters

`useJoin` takes in an object because of the number of potential arguments, future exansion, and
the ability to abstract into a large object, as in `examples/vite/joins.ts`.

The object is of type:

```ts
{
  /**
   * `"boolean" | "number" | "string"`. The CrComLib.publishEvent function
   * allows for many more options than this but here it's constrained so it's easier to grep.
   */
  type: "boolean" | "number" | "string";
  /**
   * Join number/string over which the Crestron system is going to subscribe/publish.
   */
  join: number | string;
  /**
   * Offset is used for join numbers such that you can have a default join number
   * and then apply offsets. 
   */
  offset?: number | { boolean?: number; number?: number; string?: number };
  /**
   * Mock allows you to set an initialValue as if the Crestron system set it at startup,
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
    initialValue?: boolean | number | string;
    /**
     * A function that takes a value of type `type`. If you return a value from this function,
     * the state will update to that value.
     */
    fn?: (v: boolean | number | string) => boolean | number | string | void;
  };
  /**
   * If `log` is true, then it will console.log() a default string such as 
   * `key <key> join <join> sent value <value>`.
   * If `log` is a function, then that function will be supplied with four values: 
   * join, value, isMock, and key (if key is defined).
   */
  log?:
    | boolean
    | ((
        join: string,
        value: boolean | number | string,
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
     * For example, if you want to constrain a touch-settable volume slider 
     * to only publish once every `10`ms.
     */
    debounce?: number;
    /**
     * A number of milliseconds after which the falsey value of the relevant type 
     * will be published. Boolean types will send `false`, number types will send `0`, 
     * and string types will send an empty string.
     */
    resetAfterMs?: number;
  };
};
```

#### Note: Type Inference
The type above is slightly edited for brevity. The real type uses inference to constrain
all `boolean | number | string` types into whichever is put in `type:`. For example, if you made
`useJoin({join: 1, type: "string"})`, then wanted to give a function for `mock.fn`, that function would 
be inferred as type `(v: string) => string | void`.

The same is the case for the returning `[state, pubState]`, where `state` would be of type `string`,
and `pubState` would be of type `(v: string) => void;`. If you gave `pubState(true)` in this situation,
Typescript would be very angry at you.

# Example

An example is in `examples/vite/main.tsx`. This is not meant to be a fully fleshed starting point. 
For example, the hook and example has nothing to do with webXPanel support, PWA support, or contracts (other
than the fact you can supply any string as the `join` value). For these things you may want to follow
[jphillipsCrestron/ch5-react-ts-template](https://github.com/jphillipsCrestron/ch5-react-ts-template).




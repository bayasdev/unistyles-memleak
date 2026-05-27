type GlobalWithReactNativeDevFlag = typeof globalThis & {
  __DEV__?: boolean;
};

(globalThis as GlobalWithReactNativeDevFlag).__DEV__ =
  process.env.NODE_ENV !== "production";

export {};

"use client";

import "@/unistyles";

import { useServerInsertedHTML } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useRef } from "react";
import { useServerUnistyles } from "react-native-unistyles/server";

export function Style({ children }: PropsWithChildren) {
  const isServerInserted = useRef(false);
  const unistyles = useServerUnistyles();

  useServerInsertedHTML(() => {
    if (isServerInserted.current) {
      return null;
    }

    isServerInserted.current = true;

    return unistyles;
  });

  return <>{children}</>;
}

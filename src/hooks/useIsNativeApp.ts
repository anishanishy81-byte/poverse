"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";

/**
 * Client-safe native platform detection.
 * Defaults to false on first render to match SSR/static HTML,
 * then updates after mount to avoid hydration mismatches.
 */
export const useIsNativeApp = (): boolean => {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  return native;
};

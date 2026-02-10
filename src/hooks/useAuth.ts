import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, useHasHydrated } from "@/store";

interface UseAuthOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
  requiredRoles?: string[];
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo = "/login", redirectIfFound = false, requiredRoles } = options;
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  // Stabilize requiredRoles to prevent infinite re-renders from inline arrays
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableRequiredRoles = useMemo(() => requiredRoles, [JSON.stringify(requiredRoles)]);
  const { isAuthenticated, user } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for hydration
    if (!hasHydrated) {
      return;
    }

    // After hydration, check auth state
    if (!isAuthenticated) {
      if (!redirectIfFound) {
        router.push(redirectTo);
      } else {
        setIsLoading(false);
        setIsAuthorized(true);
      }
      return;
    }

    // User is authenticated
    if (redirectIfFound) {
      // This is for pages like login that should redirect away if user is found
      // Route based on role
      if (user?.role === "superadmin") {
        router.push("/superadmin");
      } else if (user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      return;
    }

    // Check required roles if specified
    if (stableRequiredRoles && stableRequiredRoles.length > 0) {
      if (!user?.role || !stableRequiredRoles.includes(user.role)) {
        router.push("/dashboard"); // Redirect to dashboard if not authorized
        return;
      }
    }

    setIsLoading(false);
    setIsAuthorized(true);
  }, [hasHydrated, isAuthenticated, user?.role, redirectTo, redirectIfFound, stableRequiredRoles, router]);

  return {
    isLoading: !hasHydrated || isLoading,
    isAuthenticated,
    isAuthorized,
    user,
  };
}

export default useAuth;

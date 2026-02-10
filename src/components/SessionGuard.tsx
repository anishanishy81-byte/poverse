"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  CircularProgress,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DevicesIcon from "@mui/icons-material/Devices";
import { useAppStore, useHasHydrated } from "@/store";
import { isNativeApp } from "@/lib/platform";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, user, logout, sessionError, setSessionError } = useAppStore();
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  
  // Use local mounted state to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);

    // CRITICAL: Unregister any stale service workers when running in Capacitor.
    // The service worker caches old JS bundles with stale hashes, which causes
    // React hydration to fail silently — making the UI visible but completely
    // unresponsive to clicks/navigation. Capacitor serves files locally so
    // no SW caching is needed.
    if (isNativeApp() && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log("[SessionGuard] Unregistered stale service worker");
          });
        }
      }).catch((err) => {
        console.warn("[SessionGuard] Failed to unregister service workers:", err);
      });
    }
  }, []);

  // Handle session invalidation
  const handleSessionInvalid = useCallback((reason: string) => {
    setSessionMessage(reason);
    setShowSessionDialog(true);
  }, []);

  // Session validation - with error boundary
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setIsValidating(false);
      return;
    }

    // Session is valid as long as user is authenticated locally
    setIsValidating(false);
  }, [hasHydrated, isAuthenticated, user?.id]);

  // Handle session error from store
  useEffect(() => {
    if (sessionError) {
      handleSessionInvalid(sessionError);
      setSessionError(null);
    }
  }, [sessionError, handleSessionInvalid, setSessionError]);

  // Handle dialog close - force logout
  const handleDialogClose = () => {
    setShowSessionDialog(false);
    try {
      logout(true);
    } catch (e) {
      console.warn("Logout during session close failed:", e);
    }
    router.push("/login");
  };

  // Redirect unauthenticated users from protected routes
  const pathname = usePathname() ?? "";
  const publicRoutes = ["/", "/login", "/setup"];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    if (!isMounted || !hasHydrated) return;
    if (!isAuthenticated && !isPublicRoute) {
      router.push("/login");
    }
  }, [isMounted, hasHydrated, isAuthenticated, isPublicRoute, router]);

  // Only show loading state after client mount to prevent hydration mismatch
  if (isMounted && !hasHydrated && !isPublicRoute) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f5f5f5",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {children}
      
      {/* Session Invalid Dialog */}
      <Dialog
        open={showSessionDialog}
        onClose={() => {}} // Don't allow closing by clicking outside
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ textAlign: "center", pt: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "#ff9800",
              mx: "auto",
              mb: 2,
            }}
          >
            <DevicesIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" component="span" fontWeight={700}>
            Session Ended
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 2,
                color: "#f57c00",
              }}
            >
              <WarningAmberIcon />
              <Typography variant="body1" fontWeight={500}>
                You have been logged out
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {sessionMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              For security reasons, only one device can be logged in at a time.
              Please log in again to continue using this device.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 4, px: 4 }}>
          <Button
            variant="contained"
            onClick={handleDialogClose}
            fullWidth
            size="large"
            sx={{
              borderRadius: 2,
              py: 1.5,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            OK, Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

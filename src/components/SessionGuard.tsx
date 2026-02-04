"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { subscribeToSessionChanges, validateSession } from "@/lib/session";

export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const { isAuthenticated, user, logout, sessionError, setSessionError } = useAppStore();
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [isValidating, setIsValidating] = useState(true);

  // Handle session invalidation
  const handleSessionInvalid = useCallback((reason: string) => {
    setSessionMessage(reason);
    setShowSessionDialog(true);
  }, []);

  // Validate session on mount and subscribe to changes
  useEffect(() => {
    // Wait for hydration before validating
    if (!hasHydrated) {
      return;
    }

    // If not authenticated after hydration, no need to validate
    if (!isAuthenticated || !user?.id) {
      setIsValidating(false);
      return;
    }

    // Validate session
    const checkSession = async () => {
      try {
        const result = await validateSession(user.id);
        if (!result.valid) {
          // Add a small delay to show graceful message
          setTimeout(() => {
            handleSessionInvalid(result.reason || "Session invalid");
          }, 500);
        }
      } catch (error) {
        console.error("Session validation error:", error);
        // Don't log out on validation error
      } finally {
        setIsValidating(false);
      }
    };
    
    checkSession();

    // Subscribe to realtime session changes
    const unsubscribe = subscribeToSessionChanges(user.id, handleSessionInvalid);

    return () => unsubscribe();
  }, [hasHydrated, isAuthenticated, user?.id, handleSessionInvalid]);

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
    logout(true); // Silent logout - don't clear server session
    router.push("/login");
  };

  // Show loading while hydrating or validating (but only on protected routes)
  // Don't show loading on public routes like login, setup, home
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const publicRoutes = ["/", "/login", "/setup"];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!hasHydrated && !isPublicRoute) {
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

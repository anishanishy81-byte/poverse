"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import SecurityIcon from "@mui/icons-material/Security";
import MyLocationIcon from "@mui/icons-material/MyLocation";

interface LocationPermissionDialogProps {
  open: boolean;
  onRequestPermission: () => void;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
  permissionStatus?: PermissionState | null;
}

export function LocationPermissionDialog({
  open,
  onRequestPermission,
  onClose,
  loading = false,
  error,
  permissionStatus,
}: LocationPermissionDialogProps) {
  const isDenied = permissionStatus === "denied";
  // On mobile, permission might show as "prompt" or null - both mean we can try to request
  const canRequest = !isDenied;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LocationOnIcon sx={{ color: "white", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Enable Location Services
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Required for field tracking
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        {error && !isDenied && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isDenied && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Location permission was denied.
            </Typography>
            <Typography variant="body2">
              To enable location:
              <br />• <strong>On Mobile:</strong> Go to Settings → Apps → Browser → Permissions → Location → Allow
              <br />• <strong>On Desktop:</strong> Click the lock icon in the address bar → Site settings → Location → Allow
              <br />• Then refresh this page
            </Typography>
          </Alert>
        )}

        <Typography variant="body1" color="text.secondary" paragraph>
          PO-VERSE needs access to your location to track your field activities and provide accurate check-ins.
        </Typography>

        <Stack spacing={2} sx={{ mt: 3 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <GpsFixedIcon sx={{ color: "primary.main", mt: 0.5 }} />
            <Box>
              <Typography fontWeight={500}>Real-time Location Tracking</Typography>
              <Typography variant="body2" color="text.secondary">
                Track your current position for field assignments and check-ins
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <MyLocationIcon sx={{ color: "primary.main", mt: 0.5 }} />
            <Box>
              <Typography fontWeight={500}>Activity Verification</Typography>
              <Typography variant="body2" color="text.secondary">
                Verify your presence at assigned locations automatically
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <SecurityIcon sx={{ color: "primary.main", mt: 0.5 }} />
            <Box>
              <Typography fontWeight={500}>Privacy Protected</Typography>
              <Typography variant="body2" color="text.secondary">
                Your location data is encrypted and only shared with your company admin
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "grey.50",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "grey.200",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            <strong>Note:</strong> You can disable location access at any time from your browser settings. 
            Location tracking only occurs while you are using the app.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          {isDenied ? "Close" : "Not Now"}
        </Button>
        <Button
          onClick={onRequestPermission}
          variant="contained"
          disabled={loading || !canRequest}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LocationOnIcon />}
          sx={{
            background: canRequest 
              ? "linear-gradient(135deg, #667eea 0%, #a855f7 100%)"
              : undefined,
            px: 3,
          }}
        >
          {loading ? "Getting Location..." : isDenied ? "Permission Denied" : "Enable Location"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LocationPermissionDialog;

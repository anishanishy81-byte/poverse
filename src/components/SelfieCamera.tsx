"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Chip,
  Paper,
  Alert,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FlipCameraIosIcon from "@mui/icons-material/FlipCameraIos";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import FaceIcon from "@mui/icons-material/Face";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

interface SelfieCameraProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
  latitude?: number | null;
  longitude?: number | null;
  showLocationTime?: boolean;
}

export function SelfieCamera({
  onCapture,
  onClose,
  latitude,
  longitude,
  showLocationTime = true,
}: SelfieCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          aspectRatio: { ideal: 16 / 9 },
        },
        audio: false,
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsLoading(false);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please grant camera permissions and try again.");
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const captureWithCountdown = () => {
    setCountdown(3);
  };

  // Handle countdown
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      capturePhoto();
      setCountdown(null);
    }
  }, [countdown]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame
    if (facingMode === "user") {
      // Flip horizontally for selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    // Reset transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Add timestamp and location overlay
    if (showLocationTime) {
      const now = new Date();
      const timeStr = now.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      // Semi-transparent overlay at bottom
      const overlayHeight = 60;
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

      // Time text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Arial";
      ctx.fillText(`📅 ${timeStr}`, 10, canvas.height - 35);

      // Location text
      if (latitude && longitude) {
        ctx.font = "14px Arial";
        ctx.fillText(`📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, 10, canvas.height - 12);
      }

      // Add "PO-VERSE" watermark
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "right";
      ctx.fillText("PO-VERSE Attendance", canvas.width - 10, canvas.height - 12);
      ctx.textAlign = "left";
    }

    // Convert to data URL with good quality
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [facingMode, latitude, longitude, showLocationTime]);

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "black",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "rgba(0,0,0,0.5)",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" color="white" fontWeight={600}>
          <FaceIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Take Selfie
        </Typography>
        <Box sx={{ width: 40 }} /> {/* Spacer */}
      </Box>

      {/* Camera View / Captured Image */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {isLoading && !capturedImage && (
          <CircularProgress sx={{ color: "white" }} />
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {/* Video Preview */}
        {!capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: facingMode === "user" ? "scaleX(-1)" : "none",
              display: isLoading ? "none" : "block",
            }}
          />
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured selfie"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        )}

        {/* Face Guide Overlay */}
        {!capturedImage && !isLoading && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 220,
              height: 280,
              border: "3px dashed rgba(255,255,255,0.5)",
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 20,
            }}
          >
            <Typography
              variant="h1"
              sx={{
                color: "white",
                fontSize: 120,
                fontWeight: 700,
                textShadow: "0 0 20px rgba(0,0,0,0.8)",
              }}
            >
              {countdown}
            </Typography>
          </Box>
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </Box>

      {/* Time & Location Info Bar */}
      {showLocationTime && !capturedImage && (
        <Paper
          sx={{
            position: "absolute",
            bottom: 120,
            left: 16,
            right: 16,
            bgcolor: latitude && longitude ? "rgba(0,0,0,0.7)" : "rgba(244,67,54,0.9)",
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
            <Chip
              icon={<AccessTimeIcon />}
              label={formatTime(currentTime)}
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
            />
            <Chip
              icon={<LocationOnIcon />}
              label={
                latitude && longitude
                  ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                  : "⚠️ Location required"
              }
              size="small"
              sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
            />
          </Stack>
          <Typography
            variant="caption"
            display="block"
            textAlign="center"
            sx={{ color: "rgba(255,255,255,0.7)", mt: 0.5 }}
          >
            {formatDate(currentTime)}
          </Typography>
        </Paper>
      )}

      {/* Controls */}
      <Box
        sx={{
          p: 3,
          bgcolor: "rgba(0,0,0,0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
        }}
      >
        {!capturedImage ? (
          <>
            {/* Switch Camera */}
            <IconButton
              onClick={switchCamera}
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              }}
            >
              <FlipCameraIosIcon fontSize="large" />
            </IconButton>

            {/* Capture Button */}
            <IconButton
              onClick={captureWithCountdown}
              disabled={isLoading || countdown !== null}
              sx={{
                bgcolor: "white",
                color: "black",
                width: 72,
                height: 72,
                "&:hover": { bgcolor: "#f5f5f5" },
                "&:disabled": { bgcolor: "grey.500" },
                boxShadow: "0 0 20px rgba(255,255,255,0.3)",
              }}
            >
              <CameraAltIcon fontSize="large" />
            </IconButton>

            {/* Instant Capture (no countdown) */}
            <IconButton
              onClick={capturePhoto}
              disabled={isLoading}
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              }}
            >
              <Typography variant="caption" sx={{ fontSize: 10 }}>
                INSTANT
              </Typography>
            </IconButton>
          </>
        ) : (
          <>
            {/* Retake */}
            <IconButton
              onClick={retake}
              sx={{
                color: "white",
                bgcolor: "rgba(255,255,255,0.1)",
                px: 3,
                borderRadius: 2,
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
              }}
            >
              <RefreshIcon sx={{ mr: 1 }} />
              <Typography>Retake</Typography>
            </IconButton>

            {/* Confirm */}
            <IconButton
              onClick={confirmCapture}
              sx={{
                bgcolor: "#4caf50",
                color: "white",
                px: 3,
                borderRadius: 2,
                "&:hover": { bgcolor: "#388e3c" },
              }}
            >
              <CheckCircleIcon sx={{ mr: 1 }} />
              <Typography>Use Photo</Typography>
            </IconButton>
          </>
        )}
      </Box>
    </Box>
  );
}

export default SelfieCamera;

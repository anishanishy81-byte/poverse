"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Stack,
  Divider,
  Grid2 as Grid,
  Chip,
  CircularProgress,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import ShieldIcon from "@mui/icons-material/Shield";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sora, Manrope } from "next/font/google";
import { useAppStore, useHasHydrated } from "@/store";
import GetAppIcon from "@mui/icons-material/GetApp";
import { isNativeApp } from "@/lib/platform";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAppStore();
  const hasHydrated = useHasHydrated();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Redirect if already logged in (Instagram-like behavior)
  useEffect(() => {
    if (!hasHydrated) return;
    
    if (isAuthenticated && user) {
      setIsRedirecting(true);
      // Redirect based on user role
      if (user.role === "superadmin") {
        router.replace("/superadmin");
      } else if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(data.username, data.password);
      if (result.success && result.user) {
        if (result.user.role === "superadmin") {
          router.push("/superadmin");
        } else if (result.user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(result.error || "Invalid username or password");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth status or redirecting
  if (!hasHydrated || isRedirecting) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#070a14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: "#1bd4c8" }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#070a14",
        color: "white",
        fontFamily: manrope.style.fontFamily,
        position: "relative",
        overflow: "hidden",
        "--accent": "#1bd4c8",
        "--accent-2": "#47a3ff",
      }}
    >
      {/* Background */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(900px 500px at 5% 10%, rgba(27,212,200,0.14), transparent 70%), radial-gradient(900px 600px at 95% 10%, rgba(71,163,255,0.16), transparent 70%), radial-gradient(700px 500px at 50% 90%, rgba(255,180,87,0.1), transparent 70%), #070a14",
          "&::after": {
            content: "\"\"",
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage:
              "radial-gradient(circle at 50% 0%, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 75%)",
          },
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, py: { xs: 6, md: 10 } }}>
        <Grid container spacing={{ xs: 4, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <MotionBox initial="hidden" animate="visible" variants={fadeUp}>
              <Stack spacing={3}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: 2,
                      p: 0.7,
                      background: "linear-gradient(135deg, rgba(27,212,200,0.25), rgba(71,163,255,0.3))",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Image src="/logo.png" alt="PO-VERSE Logo" width={28} height={28} />
                  </Box>
                  <Typography sx={{ fontFamily: sora.style.fontFamily, fontWeight: 700, letterSpacing: "0.02em" }}>
                    PO-VERSE
                  </Typography>
                </Stack>

                <Typography
                  variant="h2"
                  sx={{
                    fontFamily: sora.style.fontFamily,
                    fontWeight: 700,
                    fontSize: { xs: "2rem", sm: "2.4rem", md: "3rem" },
                    lineHeight: 1.1,
                  }}
                >
                  Secure access to your
                  <Box component="span" sx={{ display: "block", color: "var(--accent)" }}>
                    Field Command Center
                  </Box>
                </Typography>

                <Typography sx={{ color: "rgba(255,255,255,0.7)", maxWidth: 480 }}>
                  Sign in to manage attendance, targets, routes, and performance insights in real time.
                </Typography>

                <Stack spacing={2}>
                  {[
                    { icon: <LocationOnIcon />, text: "Live location and visit intelligence" },
                    { icon: <AutoGraphIcon />, text: "Executive dashboards and team analytics" },
                    { icon: <CloudDoneIcon />, text: "Offline-first sync with 99.9% uptime" },
                  ].map((item, index) => (
                    <Stack key={index} direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          bgcolor: "rgba(27,212,200,0.18)",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--accent)",
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>{item.text}</Typography>
                    </Stack>
                  ))}
                </Stack>

                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Chip
                    icon={<ShieldIcon sx={{ color: "var(--accent)" }} />}
                    label="Enterprise-grade security"
                    sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "white" }}
                  />
                  <Chip
                    label="SOC 2 Ready"
                    sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "white" }}
                  />
                </Stack>
              </Stack>
            </MotionBox>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <MotionBox initial="hidden" animate="visible" variants={fadeUp}>
              <Paper
                elevation={18}
                sx={{
                  p: { xs: 3, sm: 4 },
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.96)",
                  backdropFilter: "blur(14px)",
                  boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
                }}
              >
                <Stack spacing={2.5}>
                  <Box>
                    <Typography
                      variant="h4"
                      component="h1"
                      sx={{
                        fontFamily: sora.style.fontFamily,
                        fontWeight: 700,
                        color: "#0b1220",
                      }}
                    >
                      Welcome back
                    </Typography>
                    <Typography color="text.secondary">
                      Use your PO-VERSE credentials to continue.
                    </Typography>
                  </Box>

                  {error && <Alert severity="error">{error}</Alert>}

                  <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Stack spacing={2.5}>
                      <TextField
                        {...register("username")}
                        label="Username"
                        fullWidth
                        autoComplete="username"
                        autoFocus
                        error={!!errors.username}
                        helperText={errors.username?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PersonIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        {...register("password")}
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        fullWidth
                        autoComplete="current-password"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LockIcon color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={isLoading}
                        sx={{
                          py: 1.4,
                          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                          color: "#071118",
                          fontWeight: 700,
                          textTransform: "none",
                          borderRadius: 2.5,
                          boxShadow: "0 16px 40px rgba(27,212,200,0.3)",
                          "&:hover": {
                            background: "linear-gradient(135deg, #27e0d3, #5bb0ff)",
                            boxShadow: "0 18px 50px rgba(27,212,200,0.4)",
                          },
                        }}
                      >
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </Stack>
                  </Box>

                  <Divider />

                  <Stack spacing={1.5} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Need access? Contact your company admin.
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center" width="100%">
                      <MuiLink component={Link} href="/" underline="hover" color="text.primary">
                        {"<- Back to Home"}
                      </MuiLink>
                    </Stack>
                    {!isNativeApp() && (
                      <Button
                        component="a"
                        href="/downloads/po-verse.apk"
                        download
                        startIcon={<GetAppIcon />}
                        variant="outlined"
                        size="small"
                        sx={{
                          mt: 1,
                          color: "var(--accent)",
                          borderColor: "var(--accent)",
                          "&:hover": {
                            borderColor: "var(--accent-2)",
                            color: "var(--accent-2)",
                            bgcolor: "rgba(27,212,200,0.08)",
                          },
                        }}
                      >
                        Download Mobile App
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            </MotionBox>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

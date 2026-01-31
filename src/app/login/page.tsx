"use client";

import { useState } from "react";
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
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonIcon from "@mui/icons-material/Person";
import Image from "next/image";
import Link from "next/link";
import { useAppStore } from "@/store";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        // Redirect based on role
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #a855f7 100%)",
        py: 4,
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background: "url(/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.15,
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Paper 
          elevation={24} 
          sx={{ 
            p: { xs: 3, sm: 5 }, 
            borderRadius: 4,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
              <Image
                src="/logo.png"
                alt="PO-VERSE Logo"
                width={80}
                height={80}
                style={{ objectFit: "contain" }}
              />
            </Box>
            <Typography 
              variant="h4" 
              component="h1" 
              fontWeight={700} 
              gutterBottom
              sx={{
                background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Welcome to PO-VERSE
            </Typography>
            <Typography color="text.secondary">
              Sign in with your credentials
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
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
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
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
                py: 1.5, 
                mt: 1,
                background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #5a6fd6 0%, #9645e0 100%)",
                },
              }}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <MuiLink component={Link} href="/" underline="hover">
              ← Back to Home
            </MuiLink>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

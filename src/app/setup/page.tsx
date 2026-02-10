"use client";

import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRouter } from "next/navigation";
import { createUser, superadminExists } from "@/lib/auth";

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSeedSuperAdmin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const exists = await superadminExists();
      if (exists) {
        setError("Superadmin already exists");
        return;
      }

      const result = await createUser(
        {
          username: "anish",
          password: "anishkrishnaverse",
          name: "Anish (Super Admin)",
          role: "superadmin",
        },
        "system"
      );

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to create superadmin");
      }
    } catch (err) {
      setError("An error occurred. Make sure Firebase is configured correctly.");
      console.error(err);
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
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          {success ? (
            <>
              <CheckCircleIcon
                sx={{ fontSize: 80, color: "success.main", mb: 2 }}
              />
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Setup Complete!
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Superadmin account has been created successfully.
                <br />
                You can now login with your credentials.
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push("/login")}
                sx={{
                  background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
                  px: 4,
                }}
              >
                Go to Login
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Initial Setup
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4 }}>
                Click the button below to create the superadmin account.
                <br />
                This can only be done once.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
                  {error}
                </Alert>
              )}

              <Alert severity="info" sx={{ mb: 3, textAlign: "left" }}>
                <strong>Important:</strong> Make sure you have configured your
                Firebase credentials in the .env.local file before proceeding.
              </Alert>

              <Button
                variant="contained"
                size="large"
                onClick={handleSeedSuperAdmin}
                disabled={isLoading}
                sx={{
                  background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
                  px: 4,
                  py: 1.5,
                  "&:hover": {
                    background: "linear-gradient(135deg, #5a6fd6 0%, #9645e0 100%)",
                  },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Create Superadmin Account"
                )}
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

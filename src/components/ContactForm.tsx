"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import { useState } from "react";
import { contactFormSchema, type ContactFormData } from "@/lib/schemas";

export default function ContactForm() {
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log("Form submitted:", data);
      setSubmitStatus("success");
      reset();
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitStatus("error");
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 4, maxWidth: 600, mx: "auto" }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Contact Us
      </Typography>
      
      {submitStatus === "success" && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Thank you! Your message has been sent successfully.
        </Alert>
      )}
      
      {submitStatus === "error" && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Something went wrong. Please try again.
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          {...register("name")}
          label="Name"
          fullWidth
          error={!!errors.name}
          helperText={errors.name?.message}
        />

        <TextField
          {...register("email")}
          label="Email"
          type="email"
          fullWidth
          error={!!errors.email}
          helperText={errors.email?.message}
        />

        <TextField
          {...register("subject")}
          label="Subject"
          fullWidth
          error={!!errors.subject}
          helperText={errors.subject?.message}
        />

        <TextField
          {...register("message")}
          label="Message"
          multiline
          rows={4}
          fullWidth
          error={!!errors.message}
          helperText={errors.message?.message}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          sx={{ mt: 1 }}
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </Button>
      </Box>
    </Paper>
  );
}

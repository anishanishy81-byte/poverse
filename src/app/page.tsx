"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Container,
  Typography,
  Box,
  Button,
  Stack,
  Card,
  CardContent,
  Grid2 as Grid,
  AppBar,
  Toolbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import GroupsIcon from "@mui/icons-material/Groups";
import BarChartIcon from "@mui/icons-material/BarChart";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import ShieldIcon from "@mui/icons-material/Shield";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import GetAppIcon from "@mui/icons-material/GetApp";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sora, Manrope } from "next/font/google";
import { isNativeApp } from "@/lib/platform";

const sora = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// Motion components
const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);
const MotionCard = motion.create(Card);

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const fadeIn = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const pillars = [
  {
    icon: <LocationOnIcon sx={{ fontSize: 28 }} />,
    title: "Live Ops Map",
    description: "See every field agent and visit in real time with precision tracking and route history.",
  },
  {
    icon: <AssignmentTurnedInIcon sx={{ fontSize: 28 }} />,
    title: "Verified Attendance",
    description: "Geo-fenced check-in/out with selfie verification and audit-ready logs.",
  },
  {
    icon: <TrackChangesIcon sx={{ fontSize: 28 }} />,
    title: "Target Intelligence",
    description: "Smart targets with outcomes, follow-ups, and performance insights in one view.",
  },
  {
    icon: <NotificationsActiveIcon sx={{ fontSize: 28 }} />,
    title: "Instant Alerts",
    description: "Push alerts for deadlines, escalations, and critical field events.",
  },
  {
    icon: <AutoGraphIcon sx={{ fontSize: 28 }} />,
    title: "Executive Analytics",
    description: "Leaderboards, heatmaps, and conversion data that drive better decisions.",
  },
  {
    icon: <ShieldIcon sx={{ fontSize: 28 }} />,
    title: "Secure by Design",
    description: "Enterprise-grade encryption with granular access control and compliance-ready storage.",
  },
];

const highlights = [
  { value: "500+", label: "Companies" },
  { value: "50,000+", label: "Field Agents" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.8?", label: "Customer Rating" },
];

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Sales Director",
    company: "ABC Enterprises",
    content:
      "PO-VERSE replaced our spreadsheets overnight. The live map alone saved us hours every day.",
  },
  {
    name: "Priya Sharma",
    role: "Operations Manager",
    company: "XYZ Marketing",
    content:
      "We finally have a single source of truth for attendance, targets, and visits. The team loves it.",
  },
  {
    name: "Amit Patel",
    role: "CEO",
    company: "FastTrack Solutions",
    content:
      "Our field conversion rate jumped within a month. The dashboards show exactly where to focus.",
  },
];

const faqs = [
  {
    question: "Is PO-VERSE built for large teams?",
    answer:
      "Yes. The platform is designed to scale across cities, teams, and regions with role-based access and analytics.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Absolutely. Agents can work offline, log visits, and sync automatically once connectivity returns.",
  },
  {
    question: "How secure is location data?",
    answer:
      "We use secure storage, encrypted traffic, and granular access controls to protect location and customer data.",
  },
  {
    question: "Can we start quickly?",
    answer:
      "You can be live in days, not weeks. Our onboarding team helps you move from setup to rollout fast.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const nativeApp = isNativeApp();
  const headingFont = sora.style.fontFamily;
  const bodyFont = manrope.style.fontFamily;

  useEffect(() => {
    if (nativeApp) {
      router.replace("/login");
    }
  }, [nativeApp, router]);

  if (nativeApp) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#070a14" }} />
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#070a14",
        color: "white",
        fontFamily: bodyFont,
        position: "relative",
        overflow: "hidden",
        "--accent": "#1bd4c8",
        "--accent-2": "#47a3ff",
        "--accent-3": "#ffb457",
      }}
    >
      {/* Atmospheric background */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background:
            "radial-gradient(1200px 600px at 15% 0%, rgba(27,212,200,0.12), transparent 70%), radial-gradient(900px 500px at 90% 15%, rgba(71,163,255,0.14), transparent 70%), radial-gradient(800px 500px at 40% 90%, rgba(255,180,87,0.12), transparent 70%), #070a14",
          "&::after": {
            content: "\"\"",
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(circle at 50% 0%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.15) 70%, transparent 100%)",
          },
        }}
      />

      {/* Navigation */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "rgba(7,10,20,0.65)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Toolbar sx={{ py: { xs: 0.5, md: 1 }, px: { xs: 1.5, md: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                p: 0.5,
                background: "linear-gradient(135deg, rgba(27,212,200,0.3), rgba(71,163,255,0.3))",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Image src="/logo.png" alt="PO-VERSE Logo" width={24} height={24} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: headingFont,
                fontWeight: 700,
                letterSpacing: "0.02em",
                display: { xs: "none", sm: "block" },
              }}
            >
              PO-VERSE
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              component="a"
              href="/downloads/po-verse.apk"
              download
              variant="outlined"
              size="small"
              startIcon={<GetAppIcon />}
              sx={{
                color: "white",
                borderColor: "rgba(27,212,200,0.4)",
                textTransform: "none",
                borderRadius: 2,
                px: 2.5,
                "&:hover": { 
                  borderColor: "var(--accent)", 
                  bgcolor: "rgba(27,212,200,0.1)" 
                },
              }}
            >
              Download App
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="outlined"
              size="small"
              sx={{
                color: "white",
                borderColor: "rgba(255,255,255,0.2)",
                textTransform: "none",
                borderRadius: 2,
                px: 2.5,
                "&:hover": { borderColor: "rgba(255,255,255,0.5)", bgcolor: "rgba(255,255,255,0.05)" },
              }}
            >
              Sign In
            </Button>
            <Button
              component={Link}
              href="/login"
              variant="contained"
              size="small"
              sx={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#071118",
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                boxShadow: "0 10px 30px rgba(27,212,200,0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #27e0d3, #5bb0ff)",
                  boxShadow: "0 14px 40px rgba(27,212,200,0.45)",
                },
              }}
            >
              Get Started
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        {/* Hero */}
        <Box sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={{ xs: 2, md: 3 }}>
                  <MotionBox initial="hidden" animate="visible" variants={fadeIn}>
                    <Chip
                      label="Premium Field Force Platform"
                      sx={{
                        bgcolor: "rgba(27,212,200,0.15)",
                        color: "white",
                        border: "1px solid rgba(27,212,200,0.3)",
                        fontWeight: 600,
                        px: 1.5,
                      }}
                    />
                  </MotionBox>
                  <MotionTypography
                    variant="h1"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                    sx={{
                      fontFamily: headingFont,
                      fontWeight: 700,
                      fontSize: { xs: "2rem", sm: "2.6rem", md: "3.5rem", lg: "4.25rem" },
                      lineHeight: 1.1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Orchestrate
                    <Box component="span" sx={{ display: "block", color: "var(--accent)" }}>
                      Elite Field Teams
                    </Box>
                    With Live Intelligence
                  </MotionTypography>
                  <MotionTypography
                    variant="h6"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                    sx={{
                      color: "rgba(255,255,255,0.72)",
                      fontSize: { xs: "0.95rem", sm: "1.05rem", md: "1.15rem" },
                      lineHeight: 1.7,
                      maxWidth: 520,
                    }}
                  >
                    PO-VERSE turns field operations into a real-time command center.
                    Track attendance, optimize routes, and accelerate conversions across every city.
                  </MotionTypography>
                  <MotionBox initial="hidden" animate="visible" variants={fadeInUp}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <Button
                        component={Link}
                        href="/login"
                        variant="contained"
                        size="large"
                        sx={{
                          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                          color: "#071118",
                          textTransform: "none",
                          fontWeight: 700,
                          borderRadius: 3,
                          px: 4,
                          py: 1.4,
                          boxShadow: "0 18px 45px rgba(27,212,200,0.35)",
                          "&:hover": {
                            background: "linear-gradient(135deg, #27e0d3, #5bb0ff)",
                            transform: "translateY(-2px)",
                            boxShadow: "0 22px 55px rgba(27,212,200,0.45)",
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        Launch Dashboard
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        sx={{
                          borderColor: "rgba(255,255,255,0.2)",
                          color: "white",
                          textTransform: "none",
                          fontWeight: 600,
                          borderRadius: 3,
                          px: 4,
                          py: 1.4,
                          "&:hover": {
                            borderColor: "rgba(255,255,255,0.6)",
                            bgcolor: "rgba(255,255,255,0.04)",
                          },
                        }}
                      >
                        Request Demo
                      </Button>
                    </Stack>
                  </MotionBox>
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: 18, color: "var(--accent)" }} />}
                      label="SOC 2 Ready"
                      sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "white" }}
                    />
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: 18, color: "var(--accent-3)" }} />}
                      label="GDPR Compliant"
                      sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "white" }}
                    />
                    <Chip
                      icon={<CloudDoneIcon sx={{ fontSize: 18, color: "var(--accent-2)" }} />}
                      label="99.9% Uptime"
                      sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "white" }}
                    />
                  </Stack>
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <MotionBox initial="hidden" animate="visible" variants={fadeInUp}>
                  <Box
                    sx={{
                      position: "relative",
                      borderRadius: 6,
                      p: { xs: 2, sm: 3 },
                      border: "1px solid rgba(255,255,255,0.12)",
                      background:
                        "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                      boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        top: -60,
                        right: -80,
                        width: 240,
                        height: 240,
                        background: "radial-gradient(circle, rgba(27,212,200,0.35), transparent 70%)",
                      }}
                    />
                    <Stack spacing={2}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          bgcolor: "rgba(8,14,24,0.7)",
                          borderRadius: 3,
                          px: 2,
                          py: 1.5,
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <Stack>
                          <Typography sx={{ fontWeight: 600, fontFamily: headingFont }}>
                            Live Field Overview
                          </Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                            126 agents online
                          </Typography>
                        </Stack>
                        <Chip
                          label="Real-time"
                          sx={{
                            bgcolor: "rgba(27,212,200,0.2)",
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Card
                            sx={{
                              height: "100%",
                              bgcolor: "rgba(10,16,28,0.8)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 3,
                            }}
                          >
                            <CardContent>
                              <Stack spacing={1}>
                                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                                  Attendance
                                </Typography>
                                <Typography sx={{ fontFamily: headingFont, fontSize: "1.6rem", fontWeight: 700 }}>
                                  93%
                                </Typography>
                                <Typography sx={{ color: "var(--accent)", fontSize: "0.85rem" }}>
                                  +12% vs last week
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Card
                            sx={{
                              height: "100%",
                              bgcolor: "rgba(10,16,28,0.8)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 3,
                            }}
                          >
                            <CardContent>
                              <Stack spacing={1}>
                                <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                                  Targets Closed
                                </Typography>
                                <Typography sx={{ fontFamily: headingFont, fontSize: "1.6rem", fontWeight: 700 }}>
                                  268
                                </Typography>
                                <Typography sx={{ color: "var(--accent-3)", fontSize: "0.85rem" }}>
                                  18 due today
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                      <Card
                        sx={{
                          bgcolor: "rgba(10,16,28,0.8)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 3,
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                bgcolor: "rgba(71,163,255,0.2)",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              <PhoneAndroidIcon sx={{ color: "var(--accent-2)" }} />
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography sx={{ fontWeight: 600 }}>Agent App</Typography>
                              <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                                Offline-first tracking and check-ins
                              </Typography>
                            </Box>
                            <Chip
                              label="Syncing"
                              sx={{
                                bgcolor: "rgba(71,163,255,0.18)",
                                color: "white",
                                fontWeight: 600,
                              }}
                            />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Stack>
                  </Box>
                </MotionBox>
              </Grid>
            </Grid>
          </Container>
        </Box>
        {/* Pillars */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontFamily: headingFont,
                  fontWeight: 700,
                  fontSize: { xs: "1.7rem", sm: "2.2rem", md: "3rem" },
                }}
              >
                The Premium Stack for Field Excellence
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.65)",
                  maxWidth: 640,
                  mx: "auto",
                  mt: 1.5,
                }}
              >
                Built for leaders who need clarity, speed, and control across distributed teams.
              </Typography>
            </MotionBox>

            <MotionBox initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}>
              <Grid container spacing={{ xs: 2, md: 3 }}>
                {pillars.map((pillar, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <MotionCard
                      variants={fadeInUp}
                      sx={{
                        height: "100%",
                        background: "rgba(12,18,30,0.7)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 4,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: { xs: "none", md: "translateY(-6px)" },
                          borderColor: "rgba(27,212,200,0.4)",
                          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2.5,
                            bgcolor: "rgba(27,212,200,0.15)",
                            display: "grid",
                            placeItems: "center",
                            color: "var(--accent)",
                            mb: 2,
                          }}
                        >
                          {pillar.icon}
                        </Box>
                        <Typography sx={{ fontFamily: headingFont, fontWeight: 600, mb: 1 }}>
                          {pillar.title}
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.95rem" }}>
                          {pillar.description}
                        </Typography>
                      </CardContent>
                    </MotionCard>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* Highlights */}
        <Box sx={{ py: { xs: 6, md: 8 } }}>
          <Container maxWidth="lg">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                gap: { xs: 2, md: 3 },
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 4,
                p: { xs: 2.5, md: 3.5 },
                background: "rgba(12,18,30,0.6)",
              }}
            >
              {highlights.map((item, index) => (
                <Box key={index}>
                  <Typography sx={{ fontFamily: headingFont, fontWeight: 700, fontSize: { xs: "1.4rem", md: "1.8rem" } }}>
                    {item.value}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>
        {/* Workflow */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: headingFont,
                    fontWeight: 700,
                    fontSize: { xs: "1.6rem", md: "2.4rem" },
                    mb: 2,
                  }}
                >
                  A Workflow That Feels Effortless
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.65)", mb: 3 }}>
                  From assignment to completion, every step is built to reduce friction and increase visibility.
                </Typography>
                <Stack spacing={2}>
                  {[
                    "Assign targets with deadlines and auto reminders",
                    "Guide agents with live maps and optimized routes",
                    "Capture outcomes and sync analytics instantly",
                  ].map((item, index) => (
                    <Stack key={index} direction="row" spacing={1.5} alignItems="flex-start">
                      <CheckCircleIcon sx={{ color: "var(--accent)", mt: 0.3 }} />
                      <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>{item}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <Box
                  sx={{
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(12,18,30,0.6)",
                    p: { xs: 2.5, md: 3.5 },
                  }}
                >
                  <Stack spacing={2}>
                    {[
                      { title: "Plan", desc: "Distribute targets with priority and SLAs.", icon: <GroupsIcon /> },
                      { title: "Execute", desc: "Track attendance, visits, and live routes.", icon: <LocationOnIcon /> },
                      { title: "Optimize", desc: "Analyze performance and automate follow-ups.", icon: <BarChartIcon /> },
                    ].map((step, index) => (
                      <Box key={index} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            borderRadius: 2,
                            bgcolor: "rgba(71,163,255,0.2)",
                            display: "grid",
                            placeItems: "center",
                            color: "var(--accent-2)",
                          }}
                        >
                          {step.icon}
                        </Box>
                        <Box>
                          <Typography sx={{ fontFamily: headingFont, fontWeight: 600 }}>{step.title}</Typography>
                          <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem" }}>
                            {step.desc}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>
        {/* Testimonials */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="lg">
            <Typography
              variant="h3"
              sx={{
                fontFamily: headingFont,
                fontWeight: 700,
                fontSize: { xs: "1.6rem", md: "2.4rem" },
                textAlign: "center",
                mb: { xs: 3, md: 5 },
              }}
            >
              Trusted by High-Performance Teams
            </Typography>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {testimonials.map((testimonial, index) => (
                <Grid size={{ xs: 12, md: 4 }} key={index}>
                  <Card
                    sx={{
                      height: "100%",
                      background: "rgba(12,18,30,0.7)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 4,
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                      <Typography sx={{ color: "rgba(255,255,255,0.8)", mb: 3 }}>
                        “{testimonial.content}”
                      </Typography>
                      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />
                      <Typography sx={{ fontFamily: headingFont, fontWeight: 600 }}>
                        {testimonial.name}
                      </Typography>
                      <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                        {testimonial.role} · {testimonial.company}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* FAQ */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="md">
            <Typography
              variant="h3"
              sx={{
                fontFamily: headingFont,
                fontWeight: 700,
                fontSize: { xs: "1.6rem", md: "2.4rem" },
                textAlign: "center",
                mb: { xs: 3, md: 5 },
              }}
            >
              Questions, Answered
            </Typography>
            <Stack spacing={2}>
              {faqs.map((faq, index) => (
                <Accordion
                  key={index}
                  sx={{
                    background: "rgba(12,18,30,0.7)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "14px !important",
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "var(--accent)" }} />}>
                    <Typography sx={{ fontFamily: headingFont, fontWeight: 600 }}>{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography sx={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                      {faq.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Container>
        </Box>

        {/* CTA */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Container maxWidth="md">
            <Box
              sx={{
                p: { xs: 3, md: 5 },
                borderRadius: 4,
                background: "linear-gradient(135deg, rgba(27,212,200,0.16), rgba(71,163,255,0.16))",
                border: "1px solid rgba(255,255,255,0.15)",
                textAlign: "center",
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontFamily: headingFont,
                  fontWeight: 700,
                  fontSize: { xs: "1.5rem", md: "2.2rem" },
                  mb: 1.5,
                }}
              >
                Ready to Run Field Operations Like a Premium Brand?
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.7)", mb: 3 }}>
                Launch PO-VERSE in minutes. No credit card required.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                <Button
                  component={Link}
                  href="/login"
                  variant="contained"
                  size="large"
                  sx={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "#071118",
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 3,
                    px: 4,
                    py: 1.4,
                  }}
                >
                  Start Free Trial
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    borderColor: "rgba(255,255,255,0.35)",
                    color: "white",
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 3,
                    px: 4,
                    py: 1.4,
                  }}
                >
                  Talk to Sales
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>

        {/* Footer */}
        <Box sx={{ py: { xs: 3, md: 4 }, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Container>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 1.5, sm: 0 }}
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Image src="/logo.png" alt="PO-VERSE Logo" width={22} height={22} />
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
                  © 2026 PO-VERSE. All rights reserved.
                </Typography>
              </Stack>
              <Stack direction="row" spacing={3}>
                <Typography
                  component="a"
                  href="#"
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    "&:hover": { color: "white" },
                  }}
                >
                  Privacy
                </Typography>
                <Typography
                  component="a"
                  href="#"
                  sx={{
                    color: "rgba(255,255,255,0.5)",
                    textDecoration: "none",
                    fontSize: "0.85rem",
                    "&:hover": { color: "white" },
                  }}
                >
                  Terms
                </Typography>
              </Stack>
            </Stack>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}


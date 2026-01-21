"use client";

import { useState } from "react";
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
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  Chip,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import GroupsIcon from "@mui/icons-material/Groups";
import BarChartIcon from "@mui/icons-material/BarChart";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StarIcon from "@mui/icons-material/Star";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AndroidIcon from "@mui/icons-material/Android";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

// Motion components
const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);
const MotionCard = motion.create(Card);

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60, filter: "blur(10px)" },
  visible: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }
  }
};

const fadeIn = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  visible: { 
    opacity: 1, 
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
};

const features = [
  {
    icon: <LocationOnIcon sx={{ fontSize: 48 }} />,
    title: "Live GPS Tracking",
    description: "Track your marketing agents in real-time across all cities with precise location updates.",
  },
  {
    icon: <AssignmentTurnedInIcon sx={{ fontSize: 48 }} />,
    title: "Attendance Management",
    description: "Automated check-in/check-out with geo-fencing and photo verification.",
  },
  {
    icon: <TrackChangesIcon sx={{ fontSize: 48 }} />,
    title: "Target Tracking",
    description: "Set, monitor, and achieve sales targets with real-time progress dashboards.",
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 48 }} />,
    title: "Team Management",
    description: "Organize agents by city, region, or team with hierarchical access control.",
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 48 }} />,
    title: "Performance Analytics",
    description: "Comprehensive reports and insights to optimize your field operations.",
  },
  {
    icon: <NotificationsActiveIcon sx={{ fontSize: 48 }} />,
    title: "Smart Notifications",
    description: "Instant alerts for attendance, target achievements, and important updates.",
  },
];

const benefits = [
  "Manage 1000+ agents across multiple cities",
  "Real-time location tracking with route history",
  "Automated daily attendance reports",
  "Custom target setting for individuals & teams",
  "Expense tracking and reimbursement",
  "Offline mode for low connectivity areas",
];

const stats = [
  { value: "500+", label: "Companies Trust Us", description: "across industries" },
  { value: "50,000+", label: "Active Field Agents", description: "tracked daily" },
  { value: "99.9%", label: "Uptime Guarantee", description: "reliable service" },
  { value: "4.8★", label: "Customer Rating", description: "on app stores" },
];

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Sales Director",
    company: "ABC Enterprises",
    content: "PO-VERSE transformed how we manage our 200+ field agents. Real-time tracking and automated attendance saved us 40% in operational costs.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "Operations Manager",
    company: "XYZ Marketing",
    content: "The target tracking feature is a game-changer. Our team's productivity increased by 60% within the first month of using PO-VERSE.",
    rating: 5,
  },
  {
    name: "Amit Patel",
    role: "CEO",
    company: "FastTrack Solutions",
    content: "Best field force management tool we've used. The offline mode works perfectly for our agents in remote areas.",
    rating: 5,
  },
];

const useCases = [
  {
    title: "FMCG & Retail",
    description: "Track merchandisers, manage store visits, and monitor product placements across thousands of retail outlets.",
  },
  {
    title: "Pharma & Healthcare",
    description: "Manage medical representatives, track doctor visits, and ensure compliance with call schedules.",
  },
  {
    title: "Insurance & Banking",
    description: "Monitor field agents, track customer meetings, and manage policy sales targets efficiently.",
  },
  {
    title: "Telecom & Utilities",
    description: "Manage field technicians, track service calls, and optimize route planning for installations.",
  },
];

const faqs = [
  {
    question: "What is PO-VERSE?",
    answer: "PO-VERSE is a comprehensive field force management platform that helps businesses track, manage, and optimize their marketing agents and field teams across multiple cities in real-time.",
  },
  {
    question: "How does the GPS tracking work?",
    answer: "Our GPS tracking uses advanced location technology with battery optimization. Agents simply check in via the mobile app, and managers can view real-time locations, route history, and time spent at each location.",
  },
  {
    question: "Can PO-VERSE work without internet?",
    answer: "Yes! PO-VERSE features a robust offline mode. Agents can mark attendance, log visits, and record activities even without internet. Data syncs automatically when connection is restored.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use enterprise-grade encryption, secure cloud infrastructure, and comply with global data protection standards. Your data is backed up daily and never shared with third parties.",
  },
  {
    question: "How quickly can we get started?",
    answer: "You can start within minutes! Sign up, add your team members, and they can begin using the mobile app immediately. Our onboarding team provides free setup assistance for enterprise clients.",
  },
  {
    question: "What kind of support do you offer?",
    answer: "We provide 24/7 customer support via chat, email, and phone. Enterprise clients get dedicated account managers and priority support with guaranteed response times.",
  },
];

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0a0a0f", overflow: "hidden" }}>
      {/* Fixed Background with blur */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      >
        {/* Background Image */}
        <Box
          sx={{
            position: "absolute",
            top: "-5%",
            left: "-5%",
            right: "-5%",
            bottom: "-5%",
            backgroundImage: "url(/bg.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: "blur(2px)",
          }}
        />
        {/* Overlay - reduced opacity to show bg better */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(180deg, rgba(10,10,15,0.6) 0%, rgba(20,10,40,0.7) 50%, rgba(10,10,15,0.8) 100%)",
          }}
        />
      </Box>

      {/* Navigation */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          background: "rgba(10,10,15,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", py: { xs: 0.5, md: 1 }, px: { xs: 1, md: 2 }, minHeight: { xs: 56, md: 64 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 2 } }}>
            <Image
              src="/logo.png"
              alt="PO-VERSE Logo"
              width={36}
              height={36}
              style={{ borderRadius: 8 }}
            />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 700,
                fontSize: { xs: '1rem', md: '1.25rem' },
                background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: { xs: 'none', sm: 'block' },
              }}
            >
              PO-VERSE
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/login"
            variant="contained"
            size="small"
            sx={{
              background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
              color: "white",
              px: { xs: 2, md: 3 },
              py: { xs: 0.75, md: 1 },
              borderRadius: 2,
              fontWeight: 600,
              fontSize: { xs: '0.875rem', md: '1rem' },
              textTransform: "none",
              boxShadow: "0 4px 20px rgba(168,85,247,0.4)",
              "&:hover": {
                background: "linear-gradient(135deg, #9333ea 0%, #4f46e5 100%)",
                boxShadow: "0 6px 30px rgba(168,85,247,0.5)",
              },
            }}
          >
            Login
          </Button>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ position: "relative", zIndex: 1 }}>
        {/* Hero Section */}
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            pt: { xs: 12, md: 10 },
            pb: { xs: 6, md: 12 },
            px: { xs: 2, md: 0 },
          }}
        >
          <Container maxWidth="lg">
            <Stack spacing={{ xs: 2, md: 4 }} alignItems="center" textAlign="center">
              <MotionBox
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                sx={{ mb: { xs: 1, md: 2 } }}
              >
                <Box
                  sx={{
                    width: { xs: 80, sm: 100, md: 120 },
                    height: { xs: 80, sm: 100, md: 120 },
                    position: 'relative',
                  }}
                >
                  <Image
                    src="/logo.png"
                    alt="PO-VERSE Logo"
                    fill
                    style={{ borderRadius: 24, objectFit: 'contain' }}
                  />
                </Box>
              </MotionBox>
              
              <MotionTypography
                variant="h1"
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                sx={{
                  fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3.5rem", lg: "4.5rem" },
                  fontWeight: 800,
                  color: "white",
                  lineHeight: 1.2,
                  textShadow: "0 4px 30px rgba(168,85,247,0.3)",
                  px: { xs: 1, md: 0 },
                }}
              >
                Manage Your
                <Box 
                  component="span" 
                  sx={{ 
                    display: "block",
                    background: "linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #22d3ee 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Marketing Agents
                </Box>
                Across All Cities
              </MotionTypography>

              <MotionTypography
                variant="h5"
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                sx={{
                  maxWidth: 700,
                  color: "rgba(255,255,255,0.7)",
                  fontSize: { xs: "0.9rem", sm: "1rem", md: "1.25rem" },
                  lineHeight: 1.6,
                  px: { xs: 2, md: 0 },
                }}
              >
                The ultimate field force management platform. Track attendance, 
                monitor live locations, set targets, and boost productivity — 
                all from one powerful dashboard.
              </MotionTypography>

              <MotionBox
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
                  <Button
                    component={Link}
                    href="/login"
                    variant="contained"
                    size="large"
                    sx={{
                      background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                      color: "white",
                      px: { xs: 3, md: 5 },
                      py: { xs: 1.5, md: 2 },
                      fontSize: { xs: "0.95rem", md: "1.1rem" },
                      borderRadius: 3,
                      fontWeight: 600,
                      textTransform: "none",
                      boxShadow: "0 8px 30px rgba(168,85,247,0.4)",
                      width: { xs: "100%", sm: "auto" },
                      "&:hover": {
                        background: "linear-gradient(135deg, #9333ea 0%, #4f46e5 100%)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 12px 40px rgba(168,85,247,0.5)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    Get Started Free
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{
                      borderColor: "rgba(168,85,247,0.5)",
                      color: "white",
                      px: { xs: 3, md: 5 },
                      py: { xs: 1.5, md: 2 },
                      fontSize: { xs: "0.95rem", md: "1.1rem" },
                      borderRadius: 3,
                      fontWeight: 600,
                      textTransform: "none",
                      backdropFilter: "blur(10px)",
                      width: { xs: "100%", sm: "auto" },
                      "&:hover": {
                        borderColor: "#a855f7",
                        bgcolor: "rgba(168,85,247,0.1)",
                      },
                    }}
                  >
                    Watch Demo
                  </Button>
                </Stack>
              </MotionBox>
            </Stack>
          </Container>
        </Box>

        {/* Features Section */}
        <Box sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{ textAlign: "center", mb: { xs: 4, md: 8 } }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                  mb: 2,
                }}
              >
                Everything You Need to
                <Box 
                  component="span" 
                  sx={{ 
                    display: "block",
                    background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Manage Field Teams
                </Box>
              </Typography>
              <Typography 
                sx={{ 
                  color: "rgba(255,255,255,0.6)", 
                  maxWidth: 600, 
                  mx: "auto",
                  fontSize: { xs: "0.9rem", md: "1.1rem" },
                  px: { xs: 1, md: 0 },
                }}
              >
                Powerful tools designed for modern field force management
              </Typography>
            </MotionBox>

            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
            >
              <Grid container spacing={{ xs: 2, md: 3 }} justifyContent="center">
                {features.map((feature, index) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                    <MotionCard
                      variants={fadeInUp}
                      sx={{
                        height: "100%",
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: { xs: 2, md: 4 },
                        textAlign: "center",
                        transition: "all 0.4s ease",
                        "&:hover": {
                          transform: { xs: "none", md: "translateY(-8px)" },
                          background: "rgba(168,85,247,0.08)",
                          borderColor: "rgba(168,85,247,0.3)",
                          boxShadow: "0 20px 40px rgba(168,85,247,0.2)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, md: 4 }, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <Box 
                          sx={{ 
                            color: "#a855f7", 
                            mb: 2,
                            p: { xs: 1.5, md: 2 },
                            display: "inline-flex",
                            background: "rgba(168,85,247,0.1)",
                            borderRadius: 2,
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Typography 
                          variant="h6" 
                          gutterBottom 
                          sx={{ color: "white", fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: { xs: "0.875rem", md: "1rem" } }}>
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </MotionCard>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* Benefits Section */}
        <Box sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center" justifyContent="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <MotionBox
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={fadeInUp}
                  sx={{ textAlign: { xs: "center", md: "left" } }}
                >
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      color: "white",
                      fontSize: { xs: "1.5rem", sm: "1.75rem", md: "2.5rem" },
                      mb: { xs: 2, md: 3 },
                    }}
                  >
                    Why Companies Choose
                    <Box 
                      component="span" 
                      sx={{ 
                        display: "block",
                        background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      PO-VERSE?
                    </Box>
                  </Typography>
                  <Typography 
                    sx={{ 
                      color: "rgba(255,255,255,0.6)", 
                      mb: { xs: 3, md: 4 },
                      fontSize: { xs: "0.9rem", md: "1.1rem" },
                      lineHeight: 1.7,
                      maxWidth: { xs: "100%", md: "none" },
                      mx: { xs: "auto", md: 0 },
                    }}
                  >
                    Join hundreds of companies that trust PO-VERSE to manage their 
                    field marketing teams efficiently. From startups to enterprises, 
                    we scale with your needs.
                  </Typography>
                </MotionBox>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex", justifyContent: "center" }}>
                <MotionBox
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={staggerContainer}
                  sx={{ width: "100%", maxWidth: { xs: 400, md: "100%" } }}
                >
                  <Stack spacing={{ xs: 1.5, md: 2 }} alignItems="center">
                    {benefits.map((benefit, index) => (
                      <MotionBox
                        key={index}
                        variants={fadeInUp}
                        sx={{
                          p: { xs: 2, md: 2.5 },
                          background: "rgba(255,255,255,0.03)",
                          backdropFilter: "blur(10px)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          width: "100%",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            background: "rgba(168,85,247,0.08)",
                            borderColor: "rgba(168,85,247,0.3)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                            flexShrink: 0,
                            display: { xs: "none", md: "block" },
                          }}
                        />
                        <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: { xs: "0.9rem", md: "1rem" }, textAlign: "center" }}>
                          {benefit}
                        </Typography>
                      </MotionBox>
                    ))}
                  </Stack>
                </MotionBox>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* Stats Section */}
        <Box sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <Grid container spacing={{ xs: 2, md: 4 }} justifyContent="center">
                {stats.map((stat, index) => (
                  <Grid size={{ xs: 6, md: 3 }} key={index}>
                    <MotionBox
                      variants={fadeInUp}
                      sx={{
                        textAlign: "center",
                        p: { xs: 2, md: 4 },
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: { xs: 2, md: 4 },
                      }}
                    >
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
                          background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {stat.value}
                      </Typography>
                      <Typography
                        sx={{
                          color: "white",
                          fontWeight: 600,
                          fontSize: { xs: "0.85rem", md: "1rem" },
                          mt: 1,
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Typography
                        sx={{
                          color: "rgba(255,255,255,0.5)",
                          fontSize: { xs: "0.75rem", md: "0.875rem" },
                        }}
                      >
                        {stat.description}
                      </Typography>
                    </MotionBox>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* Use Cases Section */}
        <Box component="section" sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{ textAlign: "center", mb: { xs: 4, md: 8 } }}
            >
              <Typography
                component="h2"
                variant="h2"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                  mb: 2,
                }}
              >
                Trusted Across
                <Box
                  component="span"
                  sx={{
                    display: "block",
                    background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Multiple Industries
                </Box>
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.6)",
                  maxWidth: 600,
                  mx: "auto",
                  fontSize: { xs: "0.9rem", md: "1.1rem" },
                }}
              >
                PO-VERSE powers field teams across diverse industries with tailored solutions
              </Typography>
            </MotionBox>

            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
            >
              <Grid container spacing={{ xs: 2, md: 3 }} justifyContent="center">
                {useCases.map((useCase, index) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <MotionCard
                      variants={fadeInUp}
                      sx={{
                        height: "100%",
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: { xs: 2, md: 3 },
                        p: { xs: 2, md: 3 },
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "rgba(168,85,247,0.08)",
                          borderColor: "rgba(168,85,247,0.3)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: 0 }}>
                        <Stack direction="row" spacing={2} alignItems="flex-start">
                          <CheckCircleIcon sx={{ color: "#a855f7", fontSize: 28, mt: 0.5 }} />
                          <Box>
                            <Typography
                              variant="h6"
                              sx={{ color: "white", fontWeight: 600, fontSize: { xs: "1rem", md: "1.25rem" } }}
                            >
                              {useCase.title}
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: { xs: "0.85rem", md: "0.95rem" }, mt: 1 }}>
                              {useCase.description}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </MotionCard>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* How It Works Section */}
        <Box component="section" sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{ textAlign: "center", mb: { xs: 4, md: 8 } }}
            >
              <Typography
                component="h2"
                variant="h2"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                  mb: 2,
                }}
              >
                Get Started in
                <Box
                  component="span"
                  sx={{
                    display: "block",
                    background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  3 Easy Steps
                </Box>
              </Typography>
            </MotionBox>

            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
            >
              <Grid container spacing={{ xs: 3, md: 4 }} justifyContent="center">
                {[
                  { step: "01", icon: <CloudDoneIcon sx={{ fontSize: 40 }} />, title: "Sign Up & Setup", description: "Create your account in minutes. Add your company details and customize settings." },
                  { step: "02", icon: <PhoneAndroidIcon sx={{ fontSize: 40 }} />, title: "Add Your Team", description: "Invite field agents via SMS or email. They download the app and start tracking." },
                  { step: "03", icon: <BarChartIcon sx={{ fontSize: 40 }} />, title: "Track & Optimize", description: "Monitor real-time data, analyze performance, and boost productivity instantly." },
                ].map((item, index) => (
                  <Grid size={{ xs: 12, md: 4 }} key={index}>
                    <MotionBox
                      variants={fadeInUp}
                      sx={{
                        textAlign: "center",
                        p: { xs: 3, md: 4 },
                        position: "relative",
                      }}
                    >
                      <Typography
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: { xs: "4rem", md: "6rem" },
                          fontWeight: 800,
                          color: "rgba(168,85,247,0.1)",
                          lineHeight: 1,
                        }}
                      >
                        {item.step}
                      </Typography>
                      <Box
                        sx={{
                          position: "relative",
                          zIndex: 1,
                          pt: { xs: 3, md: 4 },
                        }}
                      >
                        <Box
                          sx={{
                            color: "#a855f7",
                            mb: 2,
                            p: 2,
                            display: "inline-flex",
                            background: "rgba(168,85,247,0.1)",
                            borderRadius: 3,
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{ color: "white", fontWeight: 600, mb: 1, fontSize: { xs: "1rem", md: "1.25rem" } }}
                        >
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: { xs: "0.85rem", md: "0.95rem" } }}>
                          {item.description}
                        </Typography>
                      </Box>
                    </MotionBox>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* Testimonials Section */}
        <Box component="section" sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{ textAlign: "center", mb: { xs: 4, md: 8 } }}
            >
              <Chip
                label="Customer Reviews"
                sx={{
                  mb: 2,
                  background: "rgba(168,85,247,0.2)",
                  color: "#a855f7",
                  fontWeight: 600,
                }}
              />
              <Typography
                component="h2"
                variant="h2"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                  mb: 2,
                }}
              >
                What Our Customers Say
              </Typography>
            </MotionBox>

            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
            >
              <Grid container spacing={{ xs: 2, md: 3 }} justifyContent="center">
                {testimonials.map((testimonial, index) => (
                  <Grid size={{ xs: 12, md: 4 }} key={index}>
                    <MotionCard
                      variants={fadeInUp}
                      sx={{
                        height: "100%",
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: { xs: 2, md: 4 },
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: "rgba(168,85,247,0.08)",
                          borderColor: "rgba(168,85,247,0.3)",
                        },
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                        <Rating
                          value={testimonial.rating}
                          readOnly
                          icon={<StarIcon sx={{ color: "#fbbf24" }} />}
                          emptyIcon={<StarIcon sx={{ color: "rgba(255,255,255,0.2)" }} />}
                          sx={{ mb: 2 }}
                        />
                        <Typography
                          sx={{
                            color: "rgba(255,255,255,0.85)",
                            fontSize: { xs: "0.9rem", md: "1rem" },
                            fontStyle: "italic",
                            mb: 3,
                            lineHeight: 1.7,
                          }}
                        >
                          &ldquo;{testimonial.content}&rdquo;
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: "#a855f7",
                              width: 44,
                              height: 44,
                            }}
                          >
                            {testimonial.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ color: "white", fontWeight: 600, fontSize: "0.95rem" }}>
                              {testimonial.name}
                            </Typography>
                            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>
                              {testimonial.role}, {testimonial.company}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </MotionCard>
                  </Grid>
                ))}
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* FAQ Section */}
        <Box component="section" sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="md">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{ textAlign: "center", mb: { xs: 4, md: 8 } }}
            >
              <Typography
                component="h2"
                variant="h2"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
                  mb: 2,
                }}
              >
                Frequently Asked
                <Box
                  component="span"
                  sx={{
                    display: "block",
                    background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Questions
                </Box>
              </Typography>
            </MotionBox>

            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
            >
              <Stack spacing={2}>
                {faqs.map((faq, index) => (
                  <MotionBox key={index} variants={fadeInUp}>
                    <Accordion
                      sx={{
                        background: "rgba(255,255,255,0.03)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px !important",
                        "&:before": { display: "none" },
                        "&.Mui-expanded": {
                          margin: 0,
                          borderColor: "rgba(168,85,247,0.3)",
                        },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon sx={{ color: "#a855f7" }} />}
                        sx={{
                          "& .MuiAccordionSummary-content": { my: 2 },
                        }}
                      >
                        <Typography sx={{ color: "white", fontWeight: 600, fontSize: { xs: "0.95rem", md: "1.1rem" } }}>
                          {faq.question}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, pb: 3 }}>
                        <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: { xs: "0.9rem", md: "1rem" }, lineHeight: 1.7 }}>
                          {faq.answer}
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  </MotionBox>
                ))}
              </Stack>
            </MotionBox>
          </Container>
        </Box>

        {/* Trust Badges */}
        <Box sx={{ py: { xs: 4, md: 8 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{ textAlign: "center" }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 3, md: 6 }}
                justifyContent="center"
                alignItems="center"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon sx={{ color: "#22c55e" }} />
                  <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: { xs: "0.85rem", md: "1rem" } }}>
                    ISO 27001 Certified
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon sx={{ color: "#22c55e" }} />
                  <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: { xs: "0.85rem", md: "1rem" } }}>
                    GDPR Compliant
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SupportAgentIcon sx={{ color: "#a855f7" }} />
                  <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: { xs: "0.85rem", md: "1rem" } }}>
                    24/7 Support
                  </Typography>
                </Stack>
              </Stack>
            </MotionBox>
          </Container>
        </Box>

        {/* Download App Section */}
        <Box sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="lg">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
            >
              <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      color: "white",
                      fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
                      mb: 2,
                    }}
                  >
                    Get the
                    <Box 
                      component="span" 
                      sx={{ 
                        display: "block",
                        background: "linear-gradient(135deg, #3ddc84 0%, #00c853 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      Mobile App
                    </Box>
                  </Typography>
                  <Typography 
                    sx={{ 
                      color: "rgba(255,255,255,0.7)", 
                      mb: 4,
                      fontSize: { xs: "0.95rem", md: "1.1rem" },
                      lineHeight: 1.7,
                    }}
                  >
                    The PO-VERSE mobile app for field agents is coming soon! 
                    Mark attendance, track locations, view tasks, and stay connected — 
                    all from your smartphone.
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Button
                        variant="contained"
                        size="large"
                        disabled
                        startIcon={<AndroidIcon sx={{ fontSize: 28 }} />}
                        sx={{
                          background: "linear-gradient(135deg, #3ddc84 0%, #00c853 100%)",
                          color: "white",
                          px: 4,
                          py: 2,
                          fontSize: "1.1rem",
                          borderRadius: 3,
                          fontWeight: 600,
                          textTransform: "none",
                          boxShadow: "0 8px 30px rgba(61,220,132,0.3)",
                          "&.Mui-disabled": {
                            background: "rgba(61,220,132,0.3)",
                            color: "rgba(255,255,255,0.7)",
                          },
                        }}
                      >
                        Coming Soon
                      </Button>
                    </Box>
                    <Typography 
                      sx={{ 
                        color: "rgba(255,255,255,0.5)", 
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 16, color: "#3ddc84" }} />
                      Android app in development
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box
                    sx={{
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {/* Phone mockup */}
                    <Box
                      sx={{
                        width: { xs: 200, md: 280 },
                        height: { xs: 400, md: 560 },
                        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
                        borderRadius: 6,
                        border: "8px solid #2d2d44",
                        boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 60px rgba(61,220,132,0.2)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {/* Phone notch */}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 80,
                          height: 24,
                          background: "#2d2d44",
                          borderRadius: 10,
                          zIndex: 10,
                        }}
                      />
                      {/* App screen */}
                      <Box
                        sx={{
                          flex: 1,
                          background: "linear-gradient(135deg, #667eea 0%, #a855f7 100%)",
                          m: 1,
                          mt: 5,
                          borderRadius: 3,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          p: 3,
                        }}
                      >
                        <Box
                          sx={{
                            width: 60,
                            height: 60,
                            mb: 2,
                            position: "relative",
                          }}
                        >
                          <Image
                            src="/logo.png"
                            alt="PO-VERSE"
                            fill
                            style={{ objectFit: "contain", borderRadius: 12 }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            color: "white",
                            fontWeight: 700,
                            fontSize: { xs: "1rem", md: "1.25rem" },
                            mb: 1,
                          }}
                        >
                          PO-VERSE
                        </Typography>
                        <Typography
                          sx={{
                            color: "rgba(255,255,255,0.8)",
                            fontSize: { xs: "0.7rem", md: "0.8rem" },
                            textAlign: "center",
                          }}
                        >
                          Field Agent App
                        </Typography>
                      </Box>
                    </Box>
                    {/* Floating elements */}
                    <Box
                      sx={{
                        position: "absolute",
                        top: "10%",
                        right: { xs: "5%", md: "10%" },
                        background: "rgba(61,220,132,0.2)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(61,220,132,0.3)",
                        borderRadius: 2,
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <LocationOnIcon sx={{ color: "#3ddc84", fontSize: 20 }} />
                      <Typography sx={{ color: "white", fontSize: "0.8rem", fontWeight: 500 }}>
                        Live Tracking
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: "15%",
                        left: { xs: "5%", md: "5%" },
                        background: "rgba(168,85,247,0.2)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(168,85,247,0.3)",
                        borderRadius: 2,
                        p: 1.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <CheckCircleIcon sx={{ color: "#a855f7", fontSize: 20 }} />
                      <Typography sx={{ color: "white", fontSize: "0.8rem", fontWeight: 500 }}>
                        Task Complete
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </MotionBox>
          </Container>
        </Box>

        {/* CTA Section */}
        <Box sx={{ py: { xs: 6, md: 12 }, px: { xs: 2, md: 0 } }}>
          <Container maxWidth="md">
            <MotionBox
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              sx={{
                p: { xs: 3, sm: 4, md: 8 },
                background: "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(99,102,241,0.15) 100%)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(168,85,247,0.2)",
                borderRadius: { xs: 3, md: 6 },
                textAlign: "center",
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: "white",
                  fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2.5rem" },
                  mb: { xs: 1.5, md: 2 },
                }}
              >
                Ready to Transform Your Field Operations?
              </Typography>
              <Typography 
                sx={{ 
                  color: "rgba(255,255,255,0.7)", 
                  maxWidth: 500, 
                  mx: "auto",
                  mb: { xs: 3, md: 4 },
                  fontSize: { xs: "0.9rem", md: "1.1rem" },
                }}
              >
                Start managing your marketing agents smarter today. 
                No credit card required.
              </Typography>
              <Button
                component={Link}
                href="/login"
                variant="contained"
                size="large"
                sx={{
                  background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                  color: "white",
                  px: { xs: 4, md: 6 },
                  py: { xs: 1.5, md: 2 },
                  fontSize: { xs: "0.95rem", md: "1.1rem" },
                  borderRadius: 3,
                  fontWeight: 600,
                  width: { xs: "100%", sm: "auto" },
                  textTransform: "none",
                  boxShadow: "0 8px 30px rgba(168,85,247,0.4)",
                  "&:hover": {
                    background: "linear-gradient(135deg, #9333ea 0%, #4f46e5 100%)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 12px 40px rgba(168,85,247,0.5)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                Start Free Trial
              </Button>
            </MotionBox>
          </Container>
        </Box>

        {/* Footer */}
        <Box 
          sx={{ 
            py: { xs: 3, md: 4 }, 
            textAlign: "center",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            px: { xs: 2, md: 0 },
          }}
        >
          <Container>
            <Stack 
              direction={{ xs: "column", sm: "row" }} 
              justifyContent="space-between" 
              alignItems="center"
              spacing={{ xs: 2, md: 2 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Image
                  src="/logo.png"
                  alt="PO-VERSE Logo"
                  width={24}
                  height={24}
                  style={{ borderRadius: 4 }}
                />
                <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: { xs: "0.75rem", md: "0.875rem" } }}>
                  © 2026 PO-VERSE. All rights reserved.
                </Typography>
              </Box>
              <Stack direction="row" spacing={{ xs: 2, md: 3 }}>
                <Typography 
                  component="a" 
                  href="#" 
                  sx={{ 
                    color: "rgba(255,255,255,0.5)", 
                    textDecoration: "none",
                    fontSize: { xs: "0.75rem", md: "0.875rem" },
                    "&:hover": { color: "#a855f7" },
                    transition: "color 0.3s ease",
                  }}
                >
                  Privacy Policy
                </Typography>
                <Typography 
                  component="a" 
                  href="#" 
                  sx={{ 
                    color: "rgba(255,255,255,0.5)", 
                    textDecoration: "none",
                    fontSize: { xs: "0.75rem", md: "0.875rem" },
                    "&:hover": { color: "#a855f7" },
                    transition: "color 0.3s ease",
                  }}
                >
                  Terms of Service
                </Typography>
              </Stack>
            </Stack>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Grid2 as Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import EventNoteIcon from "@mui/icons-material/EventNote";
import StarsIcon from "@mui/icons-material/Stars";
import MoneyOffIcon from "@mui/icons-material/MoneyOff";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import FaceIcon from "@mui/icons-material/Face";
import FavoriteIcon from "@mui/icons-material/Favorite";
import {
  LeaveCalendarEvent,
  LeaveType,
  LeaveStatus,
  getLeaveTypeInfo,
  getLeaveStatusColor,
} from "@/types/leave";
import { subscribeToLeaveCalendar } from "@/lib/leave";

// Leave type icon mapping
const LeaveTypeIcon: Record<LeaveType, React.ReactNode> = {
  sick: <LocalHospitalIcon fontSize="small" />,
  casual: <EventNoteIcon fontSize="small" />,
  earned: <StarsIcon fontSize="small" />,
  unpaid: <MoneyOffIcon fontSize="small" />,
  maternity: <ChildCareIcon fontSize="small" />,
  paternity: <FaceIcon fontSize="small" />,
  bereavement: <FavoriteIcon fontSize="small" />,
};

interface LeaveCalendarProps {
  companyId: string;
  onEventClick?: (event: LeaveCalendarEvent) => void;
  height?: number | string;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  companyId,
  onEventClick,
  height = 600,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<LeaveCalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");

  // Subscribe to leave calendar events
  useEffect(() => {
    if (!companyId) return;

    const unsubscribe = subscribeToLeaveCalendar(companyId, (calendarEvents) => {
      setEvents(calendarEvents);
    });

    return () => unsubscribe();
  }, [companyId]);

  // Filter events by status
  const filteredEvents = useMemo(() => {
    if (statusFilter === "all") return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  // Get calendar days for the month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: Array<{ date: Date; isCurrentMonth: boolean; events: LeaveCalendarEvent[] }> = [];
    
    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date, isCurrentMonth: false, events: [] });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];
      
      // Find events for this day
      const dayEvents = filteredEvents.filter((event) => {
        return dateStr >= event.startDate && dateStr <= event.endDate;
      });
      
      days.push({ date, isCurrentMonth: true, events: dayEvents });
    }
    
    // Next month padding
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, events: [] });
    }
    
    return days;
  }, [currentDate, filteredEvents]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <Paper sx={{ p: 2, height }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={goToPreviousMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ minWidth: 180, textAlign: "center" }}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Typography>
          <IconButton onClick={goToNextMonth}>
            <ChevronRightIcon />
          </IconButton>
          <Tooltip title="Go to today">
            <IconButton onClick={goToToday} color="primary">
              <TodayIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={2}>
          <ToggleButtonGroup
            size="small"
            value={statusFilter}
            exclusive
            onChange={(_, v) => v && setStatusFilter(v)}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="pending">
              <Badge badgeContent={events.filter((e) => e.status === "pending").length} color="warning">
                Pending
              </Badge>
            </ToggleButton>
            <ToggleButton value="approved">Approved</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Days of week header */}
      <Grid container spacing={0.5} sx={{ mb: 0.5 }}>
        {DAYS_OF_WEEK.map((day) => (
          <Grid key={day} size={{ xs: 12 / 7 }}>
            <Box
              sx={{
                textAlign: "center",
                py: 1,
                bgcolor: "grey.100",
                borderRadius: 1,
                fontWeight: "bold",
                fontSize: "0.875rem",
              }}
            >
              {day}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Calendar grid */}
      <Grid container spacing={0.5}>
        {calendarDays.map((day, index) => (
          <Grid key={index} size={{ xs: 12 / 7 }}>
            <Box
              sx={{
                minHeight: 80,
                p: 0.5,
                border: "1px solid",
                borderColor: isToday(day.date) ? "primary.main" : "grey.200",
                borderRadius: 1,
                bgcolor: day.isCurrentMonth ? "white" : "grey.50",
                opacity: day.isCurrentMonth ? 1 : 0.5,
                position: "relative",
                "&:hover": {
                  bgcolor: day.isCurrentMonth ? "grey.50" : "grey.100",
                },
              }}
            >
              {/* Date number */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isToday(day.date) ? "bold" : "normal",
                  color: isToday(day.date) ? "primary.main" : "text.primary",
                  display: "block",
                  mb: 0.5,
                }}
              >
                {day.date.getDate()}
              </Typography>

              {/* Events */}
              <Stack spacing={0.25}>
                {day.events.slice(0, 3).map((event) => {
                  const info = getLeaveTypeInfo(event.leaveType);
                  return (
                    <Tooltip
                      key={event.id}
                      title={`${event.userName} - ${info.label} (${event.totalDays} days)`}
                    >
                      <Chip
                        size="small"
                        icon={LeaveTypeIcon[event.leaveType] as React.ReactElement}
                        label={event.userName.split(" ")[0]}
                        onClick={() => onEventClick?.(event)}
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          bgcolor: event.status === "pending" ? "#fff3e0" : `${info.color}20`,
                          color: event.status === "pending" ? "#ff9800" : info.color,
                          border: event.status === "pending" ? "1px dashed #ff9800" : "none",
                          cursor: "pointer",
                          "& .MuiChip-icon": {
                            fontSize: "0.875rem",
                          },
                          "& .MuiChip-label": {
                            px: 0.5,
                          },
                        }}
                      />
                    </Tooltip>
                  );
                })}
                {day.events.length > 3 && (
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                    +{day.events.length - 3} more
                  </Typography>
                )}
              </Stack>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: "center" }}>
        {(["sick", "casual", "earned", "unpaid"] as LeaveType[]).map((type) => {
          const info = getLeaveTypeInfo(type);
          return (
            <Stack key={type} direction="row" alignItems="center" spacing={0.5}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  bgcolor: info.color,
                }}
              />
              <Typography variant="caption">{info.label}</Typography>
            </Stack>
          );
        })}
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: "2px dashed #ff9800",
            }}
          />
          <Typography variant="caption">Pending</Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default LeaveCalendar;

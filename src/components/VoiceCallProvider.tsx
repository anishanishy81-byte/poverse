"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Avatar,
  IconButton,
  Stack,
  Slide,
  Paper,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import CallIcon from "@mui/icons-material/Call";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";
import PhoneCallbackIcon from "@mui/icons-material/PhoneCallback";
import PhoneMissedIcon from "@mui/icons-material/PhoneMissed";
import { useAppStore } from "@/store";
import {
  CallData,
  CallStatus,
  CallManager,
  subscribeToIncomingCalls,
  getCallById,
  updateCallStatus,
} from "@/lib/voiceCalling";
import { saveCallRecordToChat } from "@/lib/chat";
import { CallRecord } from "@/types/chat";
import { Capacitor } from "@capacitor/core";
import NativeServices from "@/lib/nativeServices";

// Slide transition for dialogs
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Context interface
interface VoiceCallContextType {
  startCall: (receiverId: string, receiverName: string, receiverRole?: string, type?: "voice" | "video") => Promise<void>;
  startVideoCall: (receiverId: string, receiverName: string, receiverRole?: string) => Promise<void>;
  upgradeToVideo: () => Promise<boolean>;
  isInCall: boolean;
  currentCall: CallData | null;
  callStatus: CallStatus;
}

const VoiceCallContext = createContext<VoiceCallContextType | null>(null);

// Hook to use voice call
export const useVoiceCall = () => {
  const context = useContext(VoiceCallContext);
  if (!context) {
    throw new Error("useVoiceCall must be used within VoiceCallProvider");
  }
  return context;
};

// Get role icon
const getRoleIcon = (role: string) => {
  switch (role) {
    case "superadmin":
      return <AdminPanelSettingsIcon sx={{ fontSize: 40 }} />;
    case "admin":
      return <SupervisorAccountIcon sx={{ fontSize: 40 }} />;
    default:
      return <PersonIcon sx={{ fontSize: 40 }} />;
  }
};

// Get role color
const getRoleColor = (role: string) => {
  switch (role) {
    case "superadmin":
      return "#ef4444";
    case "admin":
      return "#f59e0b";
    default:
      return "#0095f6";
  }
};

// Format call duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

// Tone generator using Web Audio API
class ToneGenerator {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  start(frequency: number, pattern: "ringtone" | "outgoing") {
    this.stop();
    
    try {
      this.audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.3;

      if (pattern === "ringtone") {
        // Ringtone: alternating tones
        let isHigh = true;
        this.playTone(isHigh ? 880 : 660, 500);
        this.intervalId = setInterval(() => {
          isHigh = !isHigh;
          this.playTone(isHigh ? 880 : 660, 500);
        }, 1000);
      } else {
        // Outgoing: single beep pattern
        this.playTone(440, 1000);
        this.intervalId = setInterval(() => {
          this.playTone(440, 1000);
        }, 3000);
      }
    } catch (error) {
      console.error("ToneGenerator error:", error);
    }
  }

  private playTone(frequency: number, duration: number) {
    if (!this.audioContext || !this.gainNode) return;
    
    const osc = this.audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.value = frequency;
    osc.connect(this.gainNode);
    osc.start();
    setTimeout(() => osc.stop(), duration);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

interface VoiceCallProviderProps {
  children: React.ReactNode;
}

export default function VoiceCallProvider({ children }: VoiceCallProviderProps) {
  const { isAuthenticated, user } = useAppStore();
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUserRole, setRemoteUserRole] = useState<string>("user");
  const [callType, setCallType] = useState<"voice" | "video">("voice");
  const [isProximityNear, setIsProximityNear] = useState(false);
  
  const callManagerRef = useRef<CallManager | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const outgoingToneRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<string | null>(null);
  const callAnsweredTimeRef = useRef<string | null>(null);
  const ringtoneGeneratorRef = useRef<ToneGenerator | null>(null);
  const outgoingGeneratorRef = useRef<ToneGenerator | null>(null);
  
  // Refs to hold callback functions (to break circular dependencies)
  const answerCallRef = useRef<(() => Promise<void>) | null>(null);
  const declineCallRef = useRef<(() => Promise<void>) | null>(null);
  const endCurrentCallRef = useRef<(() => Promise<void>) | null>(null);

  // Play ringtone with fallback to generated tone
  const playRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.loop = true;
      ringtoneRef.current.volume = 1.0;
      ringtoneRef.current.play().catch(() => {
        // Fallback to generated tone
        if (!ringtoneGeneratorRef.current) {
          ringtoneGeneratorRef.current = new ToneGenerator();
        }
        ringtoneGeneratorRef.current.start(880, "ringtone");
      });
    } else {
      // Use generated tone directly
      if (!ringtoneGeneratorRef.current) {
        ringtoneGeneratorRef.current = new ToneGenerator();
      }
      ringtoneGeneratorRef.current.start(880, "ringtone");
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    if (ringtoneGeneratorRef.current) {
      ringtoneGeneratorRef.current.stop();
    }
  }, []);

  const playOutgoingTone = useCallback(() => {
    if (outgoingToneRef.current) {
      outgoingToneRef.current.loop = true;
      outgoingToneRef.current.volume = 0.5;
      outgoingToneRef.current.play().catch(() => {
        // Fallback to generated tone
        if (!outgoingGeneratorRef.current) {
          outgoingGeneratorRef.current = new ToneGenerator();
        }
        outgoingGeneratorRef.current.start(440, "outgoing");
      });
    } else {
      // Use generated tone directly
      if (!outgoingGeneratorRef.current) {
        outgoingGeneratorRef.current = new ToneGenerator();
      }
      outgoingGeneratorRef.current.start(440, "outgoing");
    }
  }, []);

  const stopOutgoingTone = useCallback(() => {
    if (outgoingToneRef.current) {
      outgoingToneRef.current.pause();
      outgoingToneRef.current.currentTime = 0;
    }
    if (outgoingGeneratorRef.current) {
      outgoingGeneratorRef.current.stop();
    }
  }, []);

  // Vibration pattern for incoming call
  const startVibration = useCallback(() => {
    if (Capacitor.isNativePlatform() && navigator.vibrate) {
      // Vibrate pattern: 500ms on, 500ms off
      vibrationIntervalRef.current = setInterval(() => {
        navigator.vibrate([500, 200, 500]);
      }, 1500);
    }
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0); // Stop vibration
    }
  }, []);

  // Handle remote stream
  const handleRemoteStream = useCallback((stream: MediaStream) => {
    console.log("Remote stream received:", stream.getTracks().map(t => t.kind));
    
    // Handle video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(console.error);
    }
    
    // Handle audio
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  // Set local video stream
  const setLocalVideoStream = useCallback(() => {
    if (callManagerRef.current && localVideoRef.current) {
      const localStream = callManagerRef.current.getLocalStream();
      if (localStream) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(console.error);
      }
    }
  }, []);

  // Initialize call manager
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      callManagerRef.current = new CallManager(user.id);
    }
    
    return () => {
      if (callManagerRef.current) {
        callManagerRef.current.endCall();
      }
    };
  }, [isAuthenticated, user?.id]);

  // Subscribe to incoming calls
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const unsubscribe = subscribeToIncomingCalls(user.id, (call) => {
      // Only show if not already in a call
      if (!currentCall && callStatus === "idle") {
        // SAFETY: Dismiss stale incoming calls older than 60 seconds
        // Prevents fullScreen Dialog from permanently blocking the UI
        // if stale call data lingered in Firebase RTDB
        const callAge = Date.now() - new Date(call.startedAt).getTime();
        if (callAge > 60000) {
          console.warn("Dismissing stale incoming call (age: " + Math.round(callAge/1000) + "s):", call.id);
          updateCallStatus(call.id, "missed");
          return;
        }

        setIncomingCall(call);
        setCallType(call.type);
        callStartTimeRef.current = call.startedAt;
        
        // Play ringtone and start vibration
        playRingtone();
        startVibration();
        
        // Show native call notification (works when app is killed)
        if (Capacitor.isNativePlatform()) {
          NativeServices.showIncomingCall({
            callId: call.id,
            callerId: call.callerId,
            callerName: call.callerName || "Unknown",
            callerPhoto: "",
            callType: call.type === "video" ? "video" : "audio",
            chatId: call.chatId || "",
          }).catch((err) => {
            console.warn("Native call notification failed:", err);
          });
        }
      } else {
        // Already in a call, decline with busy
        updateCallStatus(call.id, "busy");
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, user?.id, currentCall, callStatus]);

  // SAFETY: Auto-dismiss incoming call dialog after 45 seconds
  // Prevents stale fullScreen Dialog from permanently blocking the entire UI
  useEffect(() => {
    if (!incomingCall) return;
    const timeout = setTimeout(() => {
      console.warn("Auto-dismissing incoming call after 45s timeout:", incomingCall.id);
      updateCallStatus(incomingCall.id, "missed").catch(() => {});
      setIncomingCall(null);
      stopRingtone();
      stopVibration();
    }, 45000);
    return () => clearTimeout(timeout);
  }, [incomingCall]);

  // Save call record to chat
  const saveCallToChat = useCallback(async (call: CallData | null, finalStatus: CallStatus, duration: number) => {
    if (!call || !user) return;
    
    try {
      const callRecord: CallRecord = {
        type: call.type,
        status: finalStatus === "ended" && duration > 0 ? "completed" : 
                finalStatus === "missed" ? "missed" : 
                finalStatus === "declined" ? "declined" : "completed",
        duration: duration > 0 ? duration : undefined,
        callerId: call.callerId,
        callerName: call.callerName,
        receiverId: call.receiverId,
        receiverName: call.receiverName,
        startedAt: call.startedAt,
        endedAt: new Date().toISOString(),
      };
      
      await saveCallRecordToChat(callRecord, user.role);
      console.log("Call record saved to chat");
    } catch (error) {
      console.error("Failed to save call record:", error);
    }
  }, [user]);

  // Handle call state change
  const handleCallStateChange = useCallback((status: CallStatus) => {
    console.log("Call state changed:", status);
    setCallStatus(status);
    
    if (status === "connected") {
      // Stop ringtone and vibration
      stopRingtone();
      stopOutgoingTone();
      stopVibration();
      
      // Record answer time
      callAnsweredTimeRef.current = new Date().toISOString();
      
      // Set local video
      setLocalVideoStream();
      
      // Show ongoing call notification (native)
      if (Capacitor.isNativePlatform() && (currentCall || incomingCall)) {
        const call = currentCall || incomingCall;
        if (call) {
          NativeServices.showOngoingCall({
            callId: call.id,
            callerId: call.callerId,
            callerName: call.callerName || call.receiverName || "Call",
            callType: call.type === "video" ? "video" : "audio",
          }).catch((err) => {
            console.warn("Native ongoing call notification failed:", err);
          });
        }
      }
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    if (status === "ended" || status === "declined" || status === "missed" || status === "busy") {
      // Save call record (use the current call or incoming call)
      const callToSave = currentCall || incomingCall;
      const finalDuration = callDuration;
      
      // End native call notification
      if (Capacitor.isNativePlatform()) {
        NativeServices.endCall({
          callId: callToSave?.id || "",
        }).catch((err) => {
          console.warn("Native end call notification failed:", err);
        });
      }
      
      // Save call record to chat (async, don't wait)
      if (callToSave) {
        saveCallToChat(callToSave, status, finalDuration);
      }
      
      // Clean up
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      stopRingtone();
      stopOutgoingTone();
      stopVibration();
      
      setCallDuration(0);
      setCurrentCall(null);
      setIncomingCall(null);
      setIsMuted(false);
      setIsSpeaker(false);
      setIsVideoEnabled(true);
      setCallType("voice");
      callStartTimeRef.current = null;
      callAnsweredTimeRef.current = null;
    }
  }, [setLocalVideoStream, stopVibration, stopRingtone, stopOutgoingTone, currentCall, incomingCall, callDuration, saveCallToChat]);

  const answerCallData = useCallback(async (callData: CallData) => {
    if (!callManagerRef.current) return;

    // Stop ringtone and vibration
    stopRingtone();
    stopVibration();

    // Cancel native incoming call notification
    if (Capacitor.isNativePlatform()) {
      NativeServices.cancelIncomingCall({
        callId: callData.id,
      }).catch((err) => {
        console.warn("Failed to cancel native incoming call:", err);
      });
    }

    callAnsweredTimeRef.current = new Date().toISOString();
    callStartTimeRef.current = callData.startedAt;
    setCallType(callData.type);

    try {
      await callManagerRef.current.answerCall(
        callData,
        handleRemoteStream,
        handleCallStateChange
      );
      setCurrentCall(callData);
      setIncomingCall(null);

      if (callData.type === "video") {
        setTimeout(setLocalVideoStream, 100);
      }
    } catch (error) {
      console.error("Failed to answer call:", error);
    }
  }, [handleCallStateChange, handleRemoteStream, setLocalVideoStream, stopRingtone, stopVibration]);

  const handleNativeCallAction = useCallback(async (event: { action: string; callId?: string }) => {
    const action = event?.action;
    const callId = event?.callId;

    if (!action) return;

    if (action === "acceptCall") {
      if (incomingCall && (!callId || incomingCall.id === callId)) {
        await answerCallRef.current?.();
        return;
      }
      if (!callId) return;
      const callData = await getCallById(callId);
      if (callData) {
        await answerCallData(callData);
      }
      return;
    }

    if (action === "declineCall") {
      if (incomingCall && (!callId || incomingCall.id === callId)) {
        await declineCallRef.current?.();
        return;
      }
      if (!callId) return;
      const callData = await getCallById(callId);
      if (callData) {
        await updateCallStatus(callId, "declined");
        const callRecord: CallRecord = {
          type: callData.type,
          status: "declined",
          callerId: callData.callerId,
          callerName: callData.callerName,
          receiverId: callData.receiverId,
          receiverName: callData.receiverName,
          startedAt: callData.startedAt,
          endedAt: new Date().toISOString(),
        };
        saveCallRecordToChat(callRecord, user?.role || "user").catch(console.error);
      }
      return;
    }

    if (action === "endCall") {
      if (currentCall && (!callId || currentCall.id === callId)) {
        await endCurrentCallRef.current?.();
        return;
      }
      if (!callId) return;
      await updateCallStatus(callId, "ended");
    }
  }, [answerCallData, currentCall, incomingCall, user?.role]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = NativeServices.addListener("callAction", handleNativeCallAction);

    return () => {
      listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, [handleNativeCallAction]);

  // Start a call
  const startCall = async (
    receiverId: string, 
    receiverName: string, 
    receiverRole: string = "user",
    type: "voice" | "video" = "voice"
  ) => {
    if (!callManagerRef.current || !user) return;
    
    // Prevent starting new call if already in one
    if (callStatus !== "idle" || currentCall) {
      console.warn("Cannot start new call: already in a call");
      return;
    }
    
    setRemoteUserRole(receiverRole);
    setCallType(type);
    callStartTimeRef.current = new Date().toISOString();
    
    try {
      const callData = await callManagerRef.current.startCall(
        receiverId,
        receiverName,
        user.name,
        handleRemoteStream,
        handleCallStateChange,
        type
      );
      setCurrentCall(callData);
      setCallStatus("calling");
      
      // Play outgoing call tone
      playOutgoingTone();
      
      // Set local video for video calls
      if (type === "video") {
        setTimeout(setLocalVideoStream, 100);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  // Start video call (convenience method)
  const startVideoCall = async (receiverId: string, receiverName: string, receiverRole: string = "user") => {
    await startCall(receiverId, receiverName, receiverRole, "video");
  };

  // Answer incoming call
  const answerCall = async () => {
    if (!callManagerRef.current || !incomingCall) return;
    
    // Stop ringtone and vibration
    stopRingtone();
    stopVibration();
    
    // Cancel native incoming call notification
    if (Capacitor.isNativePlatform()) {
      NativeServices.cancelIncomingCall({
        callId: incomingCall.id,
      }).catch((err) => {
        console.warn("Failed to cancel native incoming call:", err);
      });
    }
    
    // Record answer time
    callAnsweredTimeRef.current = new Date().toISOString();
    
    try {
      await callManagerRef.current.answerCall(
        incomingCall,
        handleRemoteStream,
        handleCallStateChange
      );
      setCurrentCall(incomingCall);
      setIncomingCall(null);
      
      // Set local video for video calls
      if (incomingCall.type === "video") {
        setTimeout(setLocalVideoStream, 100);
      }
    } catch (error) {
      console.error("Failed to answer call:", error);
    }
  };

  // Decline incoming call
  const declineCall = async () => {
    if (!callManagerRef.current || !incomingCall) return;
    
    // Stop ringtone and vibration
    stopRingtone();
    stopVibration();
    
    // Cancel native incoming call notification
    if (Capacitor.isNativePlatform()) {
      NativeServices.cancelIncomingCall({
        callId: incomingCall.id,
      }).catch((err) => {
        console.warn("Failed to cancel native incoming call:", err);
      });
    }
    
    // Save declined call to chat
    if (incomingCall) {
      const callRecord: CallRecord = {
        type: incomingCall.type,
        status: "declined",
        callerId: incomingCall.callerId,
        callerName: incomingCall.callerName,
        receiverId: incomingCall.receiverId,
        receiverName: incomingCall.receiverName,
        startedAt: incomingCall.startedAt,
        endedAt: new Date().toISOString(),
      };
      saveCallRecordToChat(callRecord, user?.role || "user").catch(console.error);
    }
    
    await callManagerRef.current.declineCall(incomingCall.id);
    setIncomingCall(null);
  };

  // End current call
  const endCurrentCall = async () => {
    // Save call record before ending
    if (currentCall && callDuration > 0) {
      const callRecord: CallRecord = {
        type: currentCall.type,
        status: "completed",
        duration: callDuration,
        callerId: currentCall.callerId,
        callerName: currentCall.callerName,
        receiverId: currentCall.receiverId,
        receiverName: currentCall.receiverName,
        startedAt: currentCall.startedAt,
        endedAt: new Date().toISOString(),
      };
      saveCallRecordToChat(callRecord, user?.role || "user").catch(console.error);
    }
    
    if (callManagerRef.current) {
      await callManagerRef.current.endCall();
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    // Stop any tones
    stopOutgoingTone();
    stopVibration();
    
    setCurrentCall(null);
    setCallStatus("idle");
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeaker(false);
    setIsVideoEnabled(true);
    setCallType("voice");
    callStartTimeRef.current = null;
    callAnsweredTimeRef.current = null;
  };

  // Update refs with latest callback functions
  useEffect(() => {
    answerCallRef.current = answerCall;
    declineCallRef.current = declineCall;
    endCurrentCallRef.current = endCurrentCall;
  });

  // Upgrade voice call to video (enable camera during call)
  const upgradeToVideo = async (): Promise<boolean> => {
    if (!callManagerRef.current || callStatus !== "connected") {
      console.error("Cannot upgrade to video: not in an active call");
      return false;
    }
    
    try {
      const success = await callManagerRef.current.enableVideoInCall();
      if (success) {
        setCallType("video");
        setIsVideoEnabled(true);
        // Update local video display
        setTimeout(setLocalVideoStream, 100);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to upgrade to video:", error);
      return false;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (callManagerRef.current) {
      callManagerRef.current.setMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    if (callManagerRef.current) {
      callManagerRef.current.setSpeaker(!isSpeaker);
      setIsSpeaker(!isSpeaker);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (callManagerRef.current) {
      callManagerRef.current.setVideoEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Switch camera
  const switchCamera = async () => {
    if (callManagerRef.current) {
      await callManagerRef.current.switchCamera();
      setLocalVideoStream();
    }
  };

  const isInCall = callStatus !== "idle";
  const remoteName = currentCall?.callerId === user?.id ? currentCall?.receiverName : currentCall?.callerName;
  const isVideoCall = callType === "video" || (currentCall?.type === "video") || (incomingCall?.type === "video");

  return (
    <VoiceCallContext.Provider value={{ startCall, startVideoCall, upgradeToVideo, isInCall, currentCall, callStatus }}>
      {children}

      {/* Hidden audio/video elements */}
      <audio ref={audioRef} autoPlay playsInline />
      <audio 
        ref={ringtoneRef} 
        src="/sounds/ringtone.mp3" 
        preload="auto"
        onError={() => console.log("Ringtone file not found")} 
      />
      <audio 
        ref={outgoingToneRef} 
        src="/sounds/outgoing.mp3" 
        preload="auto"
        onError={() => console.log("Outgoing tone file not found")} 
      />

      {/* Incoming Call Dialog */}
      <Dialog
        open={!!incomingCall}
        TransitionComponent={SlideTransition}
        fullScreen
        PaperProps={{
          sx: {
            background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }
        }}
      >
        <DialogContent sx={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          color: "white",
        }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography variant="body1" sx={{ opacity: 0.8, mb: 2 }}>
              {incomingCall?.type === "video" ? "Incoming Video Call" : "Incoming Voice Call"}
            </Typography>
            
            <Box sx={{ position: "relative", display: "inline-block", mb: 3 }}>
              <Box sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.3)",
                transform: "translate(-50%, -50%)",
                animation: "ring-pulse 2s infinite",
                "@keyframes ring-pulse": {
                  "0%": { transform: "translate(-50%, -50%) scale(1)", opacity: 0.5 },
                  "100%": { transform: "translate(-50%, -50%) scale(1.5)", opacity: 0 },
                },
              }} />
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: getRoleColor("user"),
                  fontSize: 40,
                }}
              >
                {incomingCall?.type === "video" ? <VideocamIcon sx={{ fontSize: 40 }} /> : getRoleIcon("user")}
              </Avatar>
            </Box>

            <Typography variant="h4" fontWeight={600}>
              {incomingCall?.callerName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              PO-VERSE {incomingCall?.type === "video" ? "Video" : "Voice"} Call
            </Typography>
          </Box>

          <Stack direction="row" spacing={6} sx={{ mt: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <IconButton
                onClick={declineCall}
                sx={{
                  width: 70,
                  height: 70,
                  bgcolor: "#ef4444",
                  color: "white",
                  "&:hover": { bgcolor: "#dc2626" },
                }}
              >
                <CallEndIcon sx={{ fontSize: 32 }} />
              </IconButton>
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: "white" }}>
                Decline
              </Typography>
            </Box>
            
            <Box sx={{ textAlign: "center" }}>
              <IconButton
                onClick={answerCall}
                sx={{
                  width: 70,
                  height: 70,
                  bgcolor: "#22c55e",
                  color: "white",
                  "&:hover": { bgcolor: "#16a34a" },
                  animation: "pulse-green 1.5s infinite",
                  "@keyframes pulse-green": {
                    "0%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.7)" },
                    "70%": { boxShadow: "0 0 0 15px rgba(34, 197, 94, 0)" },
                    "100%": { boxShadow: "0 0 0 0 rgba(34, 197, 94, 0)" },
                  },
                }}
              >
                {incomingCall?.type === "video" ? <VideocamIcon sx={{ fontSize: 32 }} /> : <CallIcon sx={{ fontSize: 32 }} />}
              </IconButton>
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: "white" }}>
                Answer
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Active Call Dialog */}
      <Dialog
        open={!!currentCall && callStatus !== "idle"}
        TransitionComponent={SlideTransition}
        fullScreen
        PaperProps={{
          sx: {
            background: isVideoCall ? "#000" : "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }
        }}
      >
        <DialogContent sx={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "space-between",
          color: "white",
          py: 4,
          px: 2,
          position: "relative",
        }}>
          {/* Video elements for video calls */}
          {isVideoCall && (
            <>
              {/* Remote video - full screen background */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  zIndex: 0,
                  backgroundColor: "#000",
                }}
              />
              
              {/* Local video - small preview */}
              <Box
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  width: 120,
                  height: 160,
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "#333",
                  zIndex: 2,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                  }}
                />
              </Box>
            </>
          )}

          {/* Top section */}
          <Box sx={{ textAlign: "center", zIndex: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
              {callStatus === "calling" && "Calling..."}
              {callStatus === "ringing" && "Ringing..."}
              {callStatus === "connected" && formatDuration(callDuration)}
            </Typography>
          </Box>

          {/* Center section - only show avatar for voice calls */}
          {!isVideoCall && (
            <Box sx={{ textAlign: "center", zIndex: 1 }}>
              <Box sx={{ position: "relative", display: "inline-block", mb: 3 }}>
                {callStatus === "connected" && (
                  <Box sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: 130,
                    height: 130,
                    borderRadius: "50%",
                    border: "3px solid rgba(34, 197, 94, 0.5)",
                    transform: "translate(-50%, -50%)",
                    animation: "connected-pulse 2s infinite",
                    "@keyframes connected-pulse": {
                      "0%, 100%": { transform: "translate(-50%, -50%) scale(1)", opacity: 0.5 },
                      "50%": { transform: "translate(-50%, -50%) scale(1.1)", opacity: 0.8 },
                    },
                  }} />
                )}
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: getRoleColor(remoteUserRole),
                    fontSize: 48,
                  }}
                >
                  {getRoleIcon(remoteUserRole)}
                </Avatar>
              </Box>

              <Typography variant="h4" fontWeight={600}>
                {remoteName}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                {callStatus === "connected" ? "Connected" : "Voice Call"}
              </Typography>
            </Box>
          )}

          {/* For video calls, show name at bottom */}
          {isVideoCall && (
            <Box sx={{ flex: 1, display: "flex", alignItems: "flex-end", mb: 4, zIndex: 1 }}>
              <Typography variant="h5" fontWeight={600} sx={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                {remoteName}
              </Typography>
            </Box>
          )}

          {/* Bottom - Call controls */}
          <Stack direction="row" spacing={2} sx={{ zIndex: 1 }}>
            <Box sx={{ textAlign: "center" }}>
              <IconButton
                onClick={toggleMute}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: isMuted ? "white" : "rgba(255,255,255,0.2)",
                  color: isMuted ? "#1a1a2e" : "white",
                  "&:hover": { bgcolor: isMuted ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" },
                }}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                {isMuted ? "Unmute" : "Mute"}
              </Typography>
            </Box>

            {isVideoCall && (
              <>
                <Box sx={{ textAlign: "center" }}>
                  <IconButton
                    onClick={toggleVideo}
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: !isVideoEnabled ? "white" : "rgba(255,255,255,0.2)",
                      color: !isVideoEnabled ? "#1a1a2e" : "white",
                      "&:hover": { bgcolor: !isVideoEnabled ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" },
                    }}
                  >
                    {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                  </IconButton>
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                    Camera
                  </Typography>
                </Box>

                <Box sx={{ textAlign: "center" }}>
                  <IconButton
                    onClick={switchCamera}
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: "rgba(255,255,255,0.2)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                    }}
                  >
                    <CameraswitchIcon />
                  </IconButton>
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                    Flip
                  </Typography>
                </Box>
              </>
            )}

            <Box sx={{ textAlign: "center" }}>
              <IconButton
                onClick={endCurrentCall}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "#ef4444",
                  color: "white",
                  "&:hover": { bgcolor: "#dc2626" },
                }}
              >
                <CallEndIcon sx={{ fontSize: 28 }} />
              </IconButton>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                End
              </Typography>
            </Box>

            {!isVideoCall && (
              <>
                <Box sx={{ textAlign: "center" }}>
                  <IconButton
                    onClick={toggleSpeaker}
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: isSpeaker ? "white" : "rgba(255,255,255,0.2)",
                      color: isSpeaker ? "#1a1a2e" : "white",
                      "&:hover": { bgcolor: isSpeaker ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" },
                    }}
                  >
                    {isSpeaker ? <VolumeUpIcon /> : <VolumeOffIcon />}
                  </IconButton>
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                    Speaker
                  </Typography>
                </Box>
                
                {/* Enable video during voice call */}
                <Box sx={{ textAlign: "center" }}>
                  <IconButton
                    onClick={upgradeToVideo}
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: "rgba(255,255,255,0.2)",
                      color: "white",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                    }}
                  >
                    <VideocamIcon />
                  </IconButton>
                  <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                    Video
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </VoiceCallContext.Provider>
  );
}

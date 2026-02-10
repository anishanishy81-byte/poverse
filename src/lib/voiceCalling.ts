import { realtimeDb } from "./firebase";
import {
  ref,
  set,
  get,
  push,
  onValue,
  off,
  remove,
  onDisconnect,
} from "firebase/database";

// WebRTC configuration with STUN and TURN servers for better connectivity
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // Free TURN servers from Open Relay Project (for NAT traversal)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

// Realtime Database paths
const CALLS_PATH = "calls";
const CALL_OFFERS_PATH = "callOffers";
const CALL_ANSWERS_PATH = "callAnswers";
const ICE_CANDIDATES_PATH = "iceCandidates";

export type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended" | "declined" | "missed" | "busy";

export interface CallData {
  id: string;
  callerId: string;
  callerName: string;
  receiverId: string;
  receiverName: string;
  status: CallStatus;
  type: "voice" | "video";
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  duration?: number;
  chatId?: string;
}

export interface CallOffer {
  callId: string;
  sdp: string;
  type: RTCSdpType;
}

export interface CallAnswer {
  callId: string;
  sdp: string;
  type: RTCSdpType;
}

export interface IceCandidate {
  callId: string;
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
}

// Create a new call
export const initiateCall = async (
  callerId: string,
  callerName: string,
  receiverId: string,
  receiverName: string,
  type: "voice" | "video" = "voice"
): Promise<CallData> => {
  const callRef = push(ref(realtimeDb, CALLS_PATH));
  const callId = callRef.key!;
  
  const callData: CallData = {
    id: callId,
    callerId,
    callerName,
    receiverId,
    receiverName,
    status: "calling",
    type,
    startedAt: new Date().toISOString(),
  };

  await set(callRef, callData);

  // Set up auto-cleanup on disconnect
  const disconnectRef = onDisconnect(callRef);
  await disconnectRef.update({ status: "ended", endedAt: new Date().toISOString() });

  return callData;
};

// Send SDP offer
export const sendOffer = async (callId: string, offer: RTCSessionDescriptionInit): Promise<void> => {
  const offerRef = ref(realtimeDb, `${CALL_OFFERS_PATH}/${callId}`);
  await set(offerRef, {
    callId,
    sdp: offer.sdp,
    type: offer.type,
  });
};

// Send SDP answer
export const sendAnswer = async (callId: string, answer: RTCSessionDescriptionInit): Promise<void> => {
  const answerRef = ref(realtimeDb, `${CALL_ANSWERS_PATH}/${callId}`);
  await set(answerRef, {
    callId,
    sdp: answer.sdp,
    type: answer.type,
  });
};

// Send ICE candidate
export const sendIceCandidate = async (callId: string, senderId: string, candidate: RTCIceCandidate): Promise<void> => {
  const candidateRef = push(ref(realtimeDb, `${ICE_CANDIDATES_PATH}/${callId}/${senderId}`));
  await set(candidateRef, {
    callId,
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
  });
};

// Update call status
export const updateCallStatus = async (callId: string, status: CallStatus, additionalData?: Partial<CallData>): Promise<void> => {
  const callRef = ref(realtimeDb, `${CALLS_PATH}/${callId}`);
  const updateData: Partial<CallData> = { status, ...additionalData };
  
  if (status === "connected" && !additionalData?.answeredAt) {
    updateData.answeredAt = new Date().toISOString();
  }
  
  if (status === "ended" || status === "declined" || status === "missed") {
    updateData.endedAt = new Date().toISOString();
    
    // Calculate duration if call was answered
    const snapshot = await get(callRef);
    if (snapshot.exists()) {
      const callData = snapshot.val() as CallData;
      if (callData.answeredAt) {
        const answeredTime = new Date(callData.answeredAt).getTime();
        const endTime = new Date().getTime();
        updateData.duration = Math.floor((endTime - answeredTime) / 1000);
      }
    }
  }
  
  // Use update to merge data instead of replacing
  try {
    const snapshot = await get(callRef);
    if (snapshot.exists()) {
      const existingData = snapshot.val() as CallData;
      await set(callRef, { ...existingData, ...updateData });
    } else {
      await set(callRef, updateData);
    }
  } catch (error) {
    console.error("Error updating call status:", error);
  }
};

// Get call data by ID
export const getCallById = async (callId: string): Promise<CallData | null> => {
  const callRef = ref(realtimeDb, `${CALLS_PATH}/${callId}`);
  const snapshot = await get(callRef);
  if (!snapshot.exists()) return null;
  return { id: callId, ...snapshot.val() } as CallData;
};

// End call and cleanup
export const endCall = async (callId: string): Promise<void> => {
  await updateCallStatus(callId, "ended");
  
  // Clean up signaling data after a delay
  setTimeout(async () => {
    try {
      await remove(ref(realtimeDb, `${CALL_OFFERS_PATH}/${callId}`));
      await remove(ref(realtimeDb, `${CALL_ANSWERS_PATH}/${callId}`));
      await remove(ref(realtimeDb, `${ICE_CANDIDATES_PATH}/${callId}`));
    } catch (error) {
      console.error("Error cleaning up call data:", error);
    }
  }, 5000);
};

// Subscribe to incoming calls
export const subscribeToIncomingCalls = (
  userId: string,
  onCall: (call: CallData) => void
): (() => void) => {
  const callsRef = ref(realtimeDb, CALLS_PATH);
  
  const unsubscribe = onValue(callsRef, (snapshot) => {
    if (!snapshot.exists()) return;
    
    const calls = snapshot.val();
    Object.values(calls).forEach((call) => {
      const callData = call as CallData;
      if (callData.receiverId === userId && callData.status === "calling") {
        onCall(callData);
      }
    });
  });

  return () => off(callsRef);
};

// Subscribe to call status changes
export const subscribeToCall = (
  callId: string,
  onUpdate: (call: CallData | null) => void
): (() => void) => {
  const callRef = ref(realtimeDb, `${CALLS_PATH}/${callId}`);
  
  const unsubscribe = onValue(callRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate({ id: callId, ...snapshot.val() } as CallData);
    } else {
      onUpdate(null);
    }
  });

  return () => off(callRef);
};

// Subscribe to SDP offer
export const subscribeToOffer = (
  callId: string,
  onOffer: (offer: CallOffer) => void
): (() => void) => {
  const offerRef = ref(realtimeDb, `${CALL_OFFERS_PATH}/${callId}`);
  
  const unsubscribe = onValue(offerRef, (snapshot) => {
    if (snapshot.exists()) {
      onOffer(snapshot.val() as CallOffer);
    }
  });

  return () => off(offerRef);
};

// Subscribe to SDP answer
export const subscribeToAnswer = (
  callId: string,
  onAnswer: (answer: CallAnswer) => void
): (() => void) => {
  const answerRef = ref(realtimeDb, `${CALL_ANSWERS_PATH}/${callId}`);
  
  const unsubscribe = onValue(answerRef, (snapshot) => {
    if (snapshot.exists()) {
      onAnswer(snapshot.val() as CallAnswer);
    }
  });

  return () => off(answerRef);
};

// Subscribe to ICE candidates
export const subscribeToIceCandidates = (
  callId: string,
  peerId: string,
  onCandidate: (candidate: IceCandidate) => void
): (() => void) => {
  const candidatesRef = ref(realtimeDb, `${ICE_CANDIDATES_PATH}/${callId}/${peerId}`);
  
  const unsubscribe = onValue(candidatesRef, (snapshot) => {
    if (!snapshot.exists()) return;
    
    const candidates = snapshot.val();
    Object.values(candidates).forEach((candidate) => {
      onCandidate(candidate as IceCandidate);
    });
  });

  return () => off(candidatesRef);
};

// WebRTC Peer Connection Manager
export class CallManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private userId: string;
  private isCaller: boolean = false;
  private unsubscribers: (() => void)[] = [];
  private callType: "voice" | "video" = "voice";
  private pendingCandidates: RTCIceCandidate[] = [];
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallStateChangeCallback: ((state: CallStatus) => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  private setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    // Handle remote stream
    this.remoteStream = new MediaStream();
    
    this.peerConnection.ontrack = (event) => {
      console.log("Remote track received:", event.track.kind);
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream!);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === "connected") {
        // Connection established
        if (this.callId && this.onCallStateChangeCallback) {
          this.onCallStateChangeCallback("connected");
        }
      } else if (this.peerConnection?.connectionState === "disconnected" ||
                 this.peerConnection?.connectionState === "failed") {
        // Connection lost
        this.endCall();
      }
    };

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", this.peerConnection?.iceConnectionState);
      if (this.peerConnection?.iceConnectionState === "connected" || 
          this.peerConnection?.iceConnectionState === "completed") {
        console.log("ICE connection established");
      }
    };

    // Handle ICE gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", this.peerConnection?.iceGatheringState);
    };
  }

  async startCall(
    receiverId: string,
    receiverName: string,
    callerName: string,
    onRemoteStream: (stream: MediaStream) => void,
    onCallStateChange: (state: CallStatus) => void,
    type: "voice" | "video" = "voice"
  ): Promise<CallData> {
    this.isCaller = true;
    this.callType = type;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStateChangeCallback = onCallStateChange;
    
    try {
      // Get local stream based on call type
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Got local stream:", this.localStream.getTracks().map(t => t.kind));
      
      // Create peer connection
      this.setupPeerConnection();
      
      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        console.log("Adding local track:", track.kind);
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create call in Firebase
      const callData = await initiateCall(this.userId, callerName, receiverId, receiverName, type);
      this.callId = callData.id;

      // Handle ICE candidates
      this.peerConnection!.onicecandidate = (event) => {
        if (event.candidate && this.callId) {
          console.log("Sending ICE candidate");
          sendIceCandidate(this.callId, this.userId, event.candidate);
        }
      };

      // Create and send offer
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === "video",
      });
      await this.peerConnection!.setLocalDescription(offer);
      await sendOffer(this.callId, offer);
      console.log("Offer sent");

      // Subscribe to answer
      const answerUnsub = subscribeToAnswer(this.callId, async (answer) => {
        console.log("Answer received");
        if (this.peerConnection && this.peerConnection.signalingState !== "stable") {
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
              type: answer.type,
              sdp: answer.sdp,
            }));
            console.log("Remote description set");
            
            // Add any pending ICE candidates
            for (const candidate of this.pendingCandidates) {
              await this.peerConnection.addIceCandidate(candidate);
            }
            this.pendingCandidates = [];
          } catch (error) {
            console.error("Error setting remote description:", error);
          }
        }
      });
      this.unsubscribers.push(answerUnsub);

      // Subscribe to call state
      const callUnsub = subscribeToCall(this.callId, (call) => {
        if (call) {
          onCallStateChange(call.status);
        }
      });
      this.unsubscribers.push(callUnsub);

      // Subscribe to remote ICE candidates
      const iceUnsub = subscribeToIceCandidates(this.callId, receiverId, async (candidate) => {
        const iceCandidate = new RTCIceCandidate({
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        });
        
        if (this.peerConnection && this.peerConnection.remoteDescription) {
          try {
            await this.peerConnection.addIceCandidate(iceCandidate);
            console.log("Added ICE candidate from receiver");
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        } else {
          // Queue candidate for later
          this.pendingCandidates.push(iceCandidate);
        }
      });
      this.unsubscribers.push(iceUnsub);

      return callData;
    } catch (error) {
      console.error("Error starting call:", error);
      throw error;
    }
  }

  async answerCall(
    callData: CallData,
    onRemoteStream: (stream: MediaStream) => void,
    onCallStateChange: (state: CallStatus) => void
  ): Promise<void> {
    this.isCaller = false;
    this.callId = callData.id;
    this.callType = callData.type;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallStateChangeCallback = onCallStateChange;
    
    try {
      // Get local stream based on call type
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callData.type === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Got local stream for answer:", this.localStream.getTracks().map(t => t.kind));
      
      // Create peer connection
      this.setupPeerConnection();
      
      // Add local tracks
      this.localStream.getTracks().forEach(track => {
        console.log("Adding local track for answer:", track.kind);
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Handle ICE candidates
      this.peerConnection!.onicecandidate = (event) => {
        if (event.candidate && this.callId) {
          console.log("Sending ICE candidate from answerer");
          sendIceCandidate(this.callId, this.userId, event.candidate);
        }
      };

      // Subscribe to offer first
      let offerProcessed = false;
      const offerUnsub = subscribeToOffer(this.callId, async (offer) => {
        if (offerProcessed) return;
        offerProcessed = true;
        
        console.log("Offer received, processing...");
        if (this.peerConnection) {
          try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription({
              type: offer.type,
              sdp: offer.sdp,
            }));
            console.log("Remote description set from offer");
            
            // Add any pending ICE candidates
            for (const candidate of this.pendingCandidates) {
              await this.peerConnection.addIceCandidate(candidate);
            }
            this.pendingCandidates = [];
            
            // Create and send answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            await sendAnswer(this.callId!, answer);
            console.log("Answer sent");
            
            // Update call status to connected
            await updateCallStatus(this.callId!, "connected");
          } catch (error) {
            console.error("Error processing offer:", error);
          }
        }
      });
      this.unsubscribers.push(offerUnsub);

      // Subscribe to call state
      const callUnsub = subscribeToCall(this.callId, (call) => {
        if (call) {
          onCallStateChange(call.status);
        }
      });
      this.unsubscribers.push(callUnsub);

      // Subscribe to remote ICE candidates (from caller)
      const iceUnsub = subscribeToIceCandidates(this.callId, callData.callerId, async (candidate) => {
        const iceCandidate = new RTCIceCandidate({
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        });
        
        if (this.peerConnection && this.peerConnection.remoteDescription) {
          try {
            await this.peerConnection.addIceCandidate(iceCandidate);
            console.log("Added ICE candidate from caller");
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        } else {
          // Queue candidate for later
          this.pendingCandidates.push(iceCandidate);
        }
      });
      this.unsubscribers.push(iceUnsub);

    } catch (error) {
      console.error("Error answering call:", error);
      throw error;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getCallType(): "voice" | "video" {
    return this.callType;
  }

  setMuted(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  setVideoEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  setSpeaker(enabled: boolean): void {
    // This is typically handled by the browser/device
    console.log("Speaker mode:", enabled);
  }

  async switchCamera(): Promise<void> {
    if (!this.localStream || this.callType !== "video") return;
    
    // Stop current video track
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      const currentFacingMode = videoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === "user" ? "environment" : "user";
      
      videoTrack.stop();
      
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        this.localStream.removeTrack(videoTrack);
        this.localStream.addTrack(newVideoTrack);
        
        // Replace track in peer connection
        if (this.peerConnection) {
          const sender = this.peerConnection.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
        }
      } catch (error) {
        console.error("Error switching camera:", error);
      }
    }
  }

  // Enable video during an ongoing voice call (upgrade to video)
  async enableVideoInCall(): Promise<boolean> {
    if (!this.peerConnection || !this.localStream) {
      console.error("Cannot enable video: No active call");
      return false;
    }
    
    try {
      // Get video stream
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      
      const videoTrack = videoStream.getVideoTracks()[0];
      
      // Add video track to local stream
      this.localStream.addTrack(videoTrack);
      
      // Add video track to peer connection
      this.peerConnection.addTrack(videoTrack, this.localStream);
      
      // Update call type
      this.callType = "video";
      
      // Update call in Firebase to notify remote peer
      if (this.callId) {
        await updateCallStatus(this.callId, "connected", { type: "video" });
      }
      
      console.log("Video enabled in call");
      return true;
    } catch (error) {
      console.error("Error enabling video in call:", error);
      return false;
    }
  }
  
  // Disable video during a video call (downgrade to voice only)
  disableVideoInCall(): void {
    if (!this.localStream) return;
    
    const videoTracks = this.localStream.getVideoTracks();
    videoTracks.forEach(track => {
      track.stop();
      this.localStream!.removeTrack(track);
      
      // Remove from peer connection
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(s => s.track === track);
        if (sender) {
          this.peerConnection.removeTrack(sender);
        }
      }
    });
    
    this.callType = "voice";
    console.log("Video disabled in call");
  }
  
  // Check if currently in a call
  isInActiveCall(): boolean {
    return this.callId !== null && this.peerConnection !== null;
  }

  async endCall(): Promise<void> {
    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Update call status
    if (this.callId) {
      await endCall(this.callId);
      this.callId = null;
    }

    // Cleanup subscriptions
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.pendingCandidates = [];
  }

  async declineCall(callId: string): Promise<void> {
    await updateCallStatus(callId, "declined");
  }

  getCallId(): string | null {
    return this.callId;
  }
}


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneIncoming, PhoneOff } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CallRow = {
  id: string;
  order_id: string;
  caller_id: string;
  recipient_id: string;
  state: "ringing" | "accepted" | "declined" | "ended" | "missed" | "failed";
  created_at: string;
};
type SignalRow = { id: number; call_id: string; sender_id: string; signal_type: "offer" | "answer" | "ice_candidate"; signal_data: RTCSessionDescriptionInit | RTCIceCandidateInit };
type ParticipantRole = "customer" | "rider";

// Public STUN servers enable direct connections in common networks. For
// reliable calling across restrictive mobile networks, configure a backend
// to issue short-lived TURN credentials; never expose reusable TURN secrets
// in NEXT_PUBLIC_* variables.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: process.env.NEXT_PUBLIC_WEBRTC_STUN_URL || "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Order-scoped, one-to-one voice calling. No phone numbers are exchanged. */
export function DeliveryVoiceCall({ orderId, userId, role, peerName }: { orderId: string; userId: string; role: ParticipantRole; peerName: string }) {
  const client = useMemo(() => createSupabaseBrowserClient(), []);
  const [incoming, setIncoming] = useState<CallRow | null>(null);
  const [activeCall, setActiveCall] = useState<CallRow | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [muted, setMuted] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const activeRef = useRef<CallRow | null>(null);
  const incomingRef = useRef<CallRow | null>(null);
  const processedSignals = useRef(new Set<number>());
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);

  function updateActive(call: CallRow | null) {
    activeRef.current = call;
    setActiveCall(call);
  }
  function updateIncoming(call: CallRow | null) {
    incomingRef.current = call;
    setIncoming(call);
  }

  function cleanupMedia() {
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.ontrack = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (remoteAudio.current) remoteAudio.current.srcObject = null;
    pendingIce.current = [];
    processedSignals.current.clear();
  }

  async function sendSignal(callId: string, signalType: SignalRow["signal_type"], signalData: RTCSessionDescriptionInit | RTCIceCandidateInit) {
    const { error } = await client.rpc("delivery_call_send_signal", {
      p_call_id: callId,
      p_signal_type: signalType,
      p_signal_data: signalData,
    });
    if (error) throw new Error(error.message);
  }

  async function preparePeer(callId: string) {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Voice calling is not supported by this browser.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    streamRef.current = stream;
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => {
      if (remoteAudio.current) {
        remoteAudio.current.srcObject = event.streams[0];
        void remoteAudio.current.play().catch(() => setMessage("Tap the audio control if your phone blocks call audio."));
      }
    };
    peer.onicecandidate = (event) => {
      if (event.candidate) void sendSignal(callId, "ice_candidate", event.candidate.toJSON()).catch(() => setMessage("Call connection interrupted. Try ending and calling again."));
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setMessage(`Connected to ${peerName}.`);
      if (peer.connectionState === "failed") {
        setMessage("Could not connect the call. Check your network and try again.");
        void client.rpc("delivery_call_respond", { p_call_id: callId, p_action: "fail" });
      }
    };
    return peer;
  }

  async function flushIce(peer: RTCPeerConnection) {
    const candidates = pendingIce.current.splice(0);
    for (const candidate of candidates) await peer.addIceCandidate(candidate);
  }

  async function processSignal(signal: SignalRow) {
    if (processedSignals.current.has(signal.id) || signal.sender_id === userId) return;
    const peer = peerRef.current;
    if (!peer) return;
    if (signal.signal_type === "offer") return; // The recipient applies the offer after they tap Answer.
    processedSignals.current.add(signal.id);
    if (signal.signal_type === "answer") {
      await peer.setRemoteDescription(signal.signal_data as RTCSessionDescriptionInit);
      await flushIce(peer);
      if (activeRef.current) updateActive({ ...activeRef.current, state: "accepted" });
    } else {
      const candidate = signal.signal_data as RTCIceCandidateInit;
      if (peer.remoteDescription) await peer.addIceCandidate(candidate);
      else pendingIce.current.push(candidate);
    }
  }

  async function finishCall(call: CallRow, action: "end" | "fail" | "decline") {
    await client.rpc("delivery_call_respond", { p_call_id: call.id, p_action: action });
    cleanupMedia();
    updateActive(null);
    updateIncoming(null);
    setMuted(false);
    setMessage(action === "decline" ? "Call declined." : action === "fail" ? "Call ended because audio could not connect." : "Call ended.");
  }

  async function startCall() {
    setWorking(true);
    setMessage("");
    try {
      if (!window.isSecureContext) throw new Error("Voice calls require a secure HTTPS connection.");
      const { data, error } = await client.rpc("delivery_call_start", { p_order_id: orderId });
      if (error || !data) throw new Error(error?.message ?? "Could not start the call.");
      const callId = String(data);
      const call: CallRow = { id: callId, order_id: orderId, caller_id: userId, recipient_id: "", state: "ringing", created_at: new Date().toISOString() };
      updateActive(call);
      setMessage(`Calling ${peerName}…`);
      const peer = await preparePeer(callId);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (!peer.localDescription) throw new Error("Could not create the audio connection.");
      await sendSignal(callId, "offer", peer.localDescription.toJSON());
    } catch (error) {
      const call = activeRef.current;
      if (call) await finishCall(call, "fail");
      setMessage(error instanceof Error ? error.message : "Could not start the voice call.");
    } finally {
      setWorking(false);
    }
  }

  async function answerCall() {
    const call = incomingRef.current;
    if (!call) return;
    setWorking(true);
    try {
      const { error } = await client.rpc("delivery_call_respond", { p_call_id: call.id, p_action: "accept" });
      if (error) throw new Error(error.message);
      updateIncoming(null);
      updateActive({ ...call, state: "accepted" });
      const peer = await preparePeer(call.id);
      let offerSignal: SignalRow | undefined;
      for (let i = 0; i < 12 && !offerSignal; i += 1) {
        const { data, error: signalError } = await client.from("delivery_call_signals").select("id,call_id,sender_id,signal_type,signal_data").eq("call_id", call.id).eq("signal_type", "offer").order("id", { ascending: true }).limit(1);
        if (signalError) throw new Error(signalError.message);
        offerSignal = (data as SignalRow[] | null)?.[0];
        if (!offerSignal) await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      if (!offerSignal) throw new Error("The caller disconnected before audio connected.");
      processedSignals.current.add(offerSignal.id);
      await peer.setRemoteDescription(offerSignal.signal_data as RTCSessionDescriptionInit);
      await flushIce(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      if (!peer.localDescription) throw new Error("Could not answer the voice call.");
      await sendSignal(call.id, "answer", peer.localDescription.toJSON());
      setMessage(`Connecting to ${peerName}…`);
    } catch (error) {
      const failedCall = activeRef.current ?? call;
      await finishCall(failedCall, "fail");
      setMessage(error instanceof Error ? error.message : "Could not answer the call.");
    } finally {
      setWorking(false);
    }
  }

  // Incoming call state and changes are visible only to the customer and the assigned rider by RLS.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const { data } = await client.from("delivery_calls").select("id,order_id,caller_id,recipient_id,state,created_at").eq("order_id", orderId).in("state", ["ringing", "accepted"]).order("created_at", { ascending: false }).limit(1);
      if (!alive) return;
      const call = (data as CallRow[] | null)?.[0];
      if (call?.state === "ringing" && call.recipient_id === userId && !activeRef.current && Date.now() - new Date(call.created_at).getTime() < 45_000) updateIncoming(call);
      if (call?.state === "accepted" && call.caller_id === userId && activeRef.current?.id === call.id) updateActive(call);
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), 4_000);
    const channel = client.channel(`delivery-call-state-${orderId}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_calls", filter: `order_id=eq.${orderId}` }, (payload) => {
        const call = payload.new as CallRow;
        if (!call?.id) return;
        if (call.state === "ringing" && call.recipient_id === userId && !activeRef.current) updateIncoming(call);
        if (activeRef.current?.id === call.id) {
          if (call.state === "accepted") {
            if (activeRef.current) updateActive({ ...activeRef.current, state: "accepted" });
            setMessage("Call accepted. Connecting audio…");
          }
          if (["declined", "ended", "missed", "failed"].includes(call.state)) {
            cleanupMedia();
            updateActive(null);
            setMuted(false);
            setMessage(call.state === "declined" ? "The call was declined." : call.state === "missed" ? "No answer. You can try again." : "Call ended.");
          }
        }
      })
      .subscribe();
    return () => { alive = false; window.clearInterval(poll); void client.removeChannel(channel); };
    // State values are kept in refs so this subscription remains stable.
  }, [client, orderId, userId]);

  const currentCallId = activeCall?.id ?? incoming?.id;
  useEffect(() => {
    if (!currentCallId) return;
    let alive = true;
    const handle = async (raw: unknown) => {
      const signal = raw as SignalRow;
      try { if (alive) await processSignal(signal); }
      catch { setMessage("Call connection interrupted. Try ending and calling again."); }
    };
    const channel = client.channel(`delivery-call-signals-${currentCallId}-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "delivery_call_signals", filter: `call_id=eq.${currentCallId}` }, (payload) => void handle(payload.new))
      .subscribe();
    // Realtime is low latency; short polling also recovers from mobile network sleep.
    const poll = window.setInterval(async () => {
      const { data } = await client.from("delivery_call_signals").select("id,call_id,sender_id,signal_type,signal_data").eq("call_id", currentCallId).order("id", { ascending: true }).limit(100);
      for (const signal of (data ?? []) as SignalRow[]) await handle(signal);
    }, 1_500);
    return () => { alive = false; window.clearInterval(poll); void client.removeChannel(channel); };
    // Keep one subscription for this call; handlers use current refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, currentCallId, userId]);

  useEffect(() => {
    if (activeCall?.state !== "accepted") return;
    const timer = window.setInterval(() => {
      void client.rpc("delivery_call_respond", { p_call_id: activeCall.id, p_action: "heartbeat" });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [activeCall?.id, activeCall?.state, client]);

  useEffect(() => () => {
    const call = activeRef.current;
    cleanupMedia();
    if (call) void client.rpc("delivery_call_respond", { p_call_id: call.id, p_action: "end" });
    else if (incomingRef.current) void client.rpc("delivery_call_respond", { p_call_id: incomingRef.current.id, p_action: "decline" });
    // End a call when leaving its order screen and release the microphone.
  }, [client]);

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  return (
    <section aria-label="Private delivery voice call" className="rounded-2xl border border-line bg-subtle p-3">
      <audio ref={remoteAudio} autoPlay playsInline className="hidden" />
      <div className="flex flex-wrap items-center gap-2">
        {!activeCall && !incoming && (
          <button type="button" onClick={() => void startCall()} disabled={working} className="inline-flex h-11 items-center gap-2 rounded-full bg-night px-4 text-sm font-semibold text-white disabled:opacity-60">
            <Phone size={16} aria-hidden="true" /> {working ? "Starting call…" : `Call ${role === "customer" ? "rider" : "customer"}`}
          </button>
        )}
        {incoming && !activeCall && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <p className="mr-auto flex items-center gap-2 text-sm font-medium"><PhoneIncoming size={17} aria-hidden="true" /> Incoming voice call from {peerName}</p>
            <button type="button" disabled={working} onClick={() => void answerCall()} className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white"><Phone size={15} aria-hidden="true" /> Answer</button>
            <button type="button" disabled={working} onClick={() => void finishCall(incoming, "decline")} className="inline-flex h-10 items-center gap-2 rounded-full bg-rose-700 px-4 text-sm font-semibold text-white"><PhoneOff size={15} aria-hidden="true" /> Decline</button>
          </div>
        )}
        {activeCall && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <p className="mr-auto text-sm font-medium">{message || `Voice call with ${peerName}`}</p>
            <button type="button" onClick={toggleMute} aria-pressed={muted} className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold">{muted ? <MicOff size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}{muted ? "Unmute" : "Mute"}</button>
            <button type="button" onClick={() => void finishCall(activeCall, "end")} className="inline-flex h-10 items-center gap-2 rounded-full bg-rose-700 px-4 text-sm font-semibold text-white"><PhoneOff size={15} aria-hidden="true" /> End call</button>
          </div>
        )}
      </div>
      {message && !activeCall && <p role="status" className="mt-2 text-sm text-muted">{message}</p>}
    </section>
  );
}

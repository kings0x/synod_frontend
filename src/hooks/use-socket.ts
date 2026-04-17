"use client";

import { useEffect, useRef, useState } from "react";
import { buildDashboardWebSocketUrl } from "@/lib/api";

interface EventEnvelope {
  event_type: string;
  payload: Record<string, unknown>;
}

export function useSocket(token: string | null) {
  const [events, setEvents] = useState<EventEnvelope[]>([]);
  const [lastState, setLastState] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "error">("idle");
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let closedByEffect = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    const connect = (attempt: "initial" | "retry") => {
      clearReconnectTimer();
      setStatus(attempt === "initial" ? "connecting" : "reconnecting");

      const socket = new WebSocket(buildDashboardWebSocketUrl());
      ws.current = socket;

      socket.onopen = () => {
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        try {
          const envelope = JSON.parse(event.data) as EventEnvelope;
          if (!envelope.event_type) {
            return;
          }

          setEvents((prev) => [envelope, ...prev].slice(0, 50));

          switch (envelope.event_type) {
            case "WALLET_BALANCE_UPDATE":
              setLastState((prev) => ({
                ...(prev ?? {}),
                balance_update: envelope.payload,
              }));
              break;
            case "PERMIT_ISSUED":
            case "PERMIT_CONSUMED":
            case "PERMIT_EXPIRED":
              setLastState((prev) => ({
                ...(prev ?? {}),
                permit_event: envelope.payload,
              }));
              break;
            case "TREASURY_HALTED":
            case "TREASURY_RESUMED":
              setLastState((prev) => ({
                ...(prev ?? {}),
                health_event: envelope.payload,
              }));
              break;
            case "AGENT_STATUS_CHANGED":
            case "AGENT_CONNECTED":
            case "AGENT_ACTIVATED":
            case "AGENT_SUSPENDED":
              setLastState((prev) => ({
                ...(prev ?? {}),
                agent_event: envelope.payload,
              }));
              break;
            default:
              break;
          }
        } catch (err) {
          console.error("WS Parse Error:", err);
        }
      };

      socket.onerror = (err) => {
        console.error("WS Error:", err);
        setStatus("error");
      };

      socket.onclose = () => {
        if (closedByEffect) {
          return;
        }

        setStatus("reconnecting");
        reconnectTimer.current = window.setTimeout(() => connect("retry"), 3000);
      };
    };

    connect("initial");

    return () => {
      closedByEffect = true;
      clearReconnectTimer();
      ws.current?.close();
      ws.current = null;
    };
  }, [token]);

  return {
    events: token ? events : [],
    lastState: token ? lastState : null,
    status: token ? status : "idle",
  };
}

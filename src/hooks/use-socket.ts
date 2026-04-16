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
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    ws.current = new WebSocket(buildDashboardWebSocketUrl());

    ws.current.onmessage = (event) => {
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

    ws.current.onerror = (err) => {
      console.error("WS Error:", err);
    };

    return () => {
      ws.current?.close();
      ws.current = null;
    };
  }, [token]);

  return { events, lastState };
}

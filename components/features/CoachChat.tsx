"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { CoachAvatarMark } from "@/components/ui/CoachAvatarMark";
import { cn } from "@/lib/utils";

type Message = { id?: string; role: "user" | "coach"; text: string };

const STARTERS = [
  "How do I burn more calories?",
  "Analyze my week",
  "Should I accept this challenge?",
  "Generate my training plan",
];

export function CoachChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/coach/chat")
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok) setMessages((prev) => [...prev, { role: "coach", text: data.reply }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-4rem)] md:h-screen">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-10 h-10 rounded-full overflow-hidden border border-momentum/40 shrink-0">
          <CoachAvatarMark className="w-full h-full" />
        </div>
        <div>
          <h1 className="font-semibold">Coach Dhruv</h1>
          <p className="text-xs text-white/40">Your AI performance coach</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {!loaded && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
          </div>
        )}
        {loaded && messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs font-medium bg-midnight-raised border border-border-ichor px-3 py-2 rounded-full hover:border-momentum/40"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                m.role === "user" ? "bg-momentum text-midnight" : "bg-midnight-raised text-white/90",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-midnight-raised rounded-2xl px-4 py-3 inline-flex gap-1">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border-ichor">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Ask Dhruv anything..."
          className="flex-1 bg-midnight-raised border border-border-ichor rounded-full px-4 py-2.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-momentum/50"
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="bg-momentum text-midnight p-2.5 rounded-full disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
      style={{ animationDelay: delay, animationDuration: "1s" }}
    />
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { id?: string; role: "user" | "coach"; text: string };

const STARTERS = [
  "How do I burn more calories?",
  "Analyze my week",
  "Generate my training plan",
];

export function CoachWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pulse, setPulse] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setPulse(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/coach/chat")
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoaded(true));
  }, [open, loaded]);

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
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-5 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full shadow-2xl overflow-hidden border-2 border-momentum/60 hover:border-momentum transition-all hover:scale-110 active:scale-95"
        aria-label="Open AI Coach"
      >
        <Image src="/coach-avatar.png" alt="Coach Dhruv" fill className="object-cover" />
        {pulse && (
          <span className="absolute inset-0 rounded-full animate-ping bg-momentum/30 pointer-events-none" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-44 right-5 md:bottom-24 md:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-midnight border border-border-ichor rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "420px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-ichor bg-midnight-raised shrink-0">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-momentum/40 shrink-0">
              <Image src="/coach-avatar.png" alt="Coach" fill className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Coach Dhruv</div>
              <div className="text-[10px] text-momentum">AI Performance Coach · Online</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {loaded && messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-white/40 text-center">Ask me anything about your training!</p>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-xs font-medium bg-midnight-raised border border-border-ichor px-3 py-2 rounded-xl hover:border-momentum/40 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start gap-2")}>
                {m.role === "coach" && (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5">
                    <Image src="/coach-avatar.png" alt="" fill className="object-cover" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                    m.role === "user"
                      ? "bg-momentum text-midnight font-medium"
                      : "bg-midnight-raised text-white/90",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start gap-2">
                <div className="relative w-6 h-6 rounded-full overflow-hidden shrink-0">
                  <Image src="/coach-avatar.png" alt="" fill className="object-cover" />
                </div>
                <div className="bg-midnight-raised rounded-2xl px-3 py-2 inline-flex gap-1 items-center">
                  <Dot delay="0ms" /><Dot delay="150ms" /><Dot delay="300ms" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-border-ichor shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask Dhruv..."
              className="flex-1 bg-midnight-raised border border-border-ichor rounded-full px-3 py-2 text-xs placeholder:text-white/30 focus:outline-none focus:border-momentum/50"
            />
            <button
              onClick={() => send(input)}
              disabled={sending || !input.trim()}
              className="bg-momentum text-midnight p-2 rounded-full disabled:opacity-40 shrink-0"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </>
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

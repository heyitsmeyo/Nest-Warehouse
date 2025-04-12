/* eslint-disable */
"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleToggleOpen = () => setIsOpen((o) => !o);
  const handleToggleExpand = () => setIsExpanded((e) => !e);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!res.ok) throw new Error(await res.text());
      const aiText = await res.text(); // plain text
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: aiText,
      };
      setMessages((m) => [...m, aiMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "❌ Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col transition-all",
        isExpanded ? "w-[80vw] h-[80vh]" : "w-80 h-96",
        !isOpen && "h-auto"
      )}
    >
      {!isOpen ? (
        <Button
          onClick={handleToggleOpen}
          className="rounded-full p-4 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          aria-label="Open chat"
        >
          <Bot className="h-6 w-6" />
        </Button>
      ) : (
        <div className="flex flex-col h-full rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-emerald-600">
                <AvatarImage src="/bot-avatar.png" alt="AI" />
                <AvatarFallback className="bg-emerald-600 text-white">
                  AI
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-zinc-100">
                Warehouse Assistant
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleExpand}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                aria-label="Toggle size"
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleOpen}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-950">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Bot className="h-12 w-12 text-emerald-500 mb-4" />
                <h3 className="text-lg font-semibold text-zinc-100">
                  Warehouse Assistant
                </h3>
                <p className="text-zinc-400 mt-2">
                  How can I help you with your warehouse management today?
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-start gap-3 max-w-[90%]",
                    msg.role === "user" ? "ml-auto" : ""
                  )}
                >
                  {msg.role !== "user" && (
                    <Avatar className="h-8 w-8 mt-1 bg-emerald-600 flex-shrink-0">
                      <AvatarFallback className="bg-emerald-600 text-white">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-lg p-3 whitespace-pre-wrap break-words",
                      msg.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-zinc-700 text-white">
                        U
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-zinc-800 bg-zinc-900"
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                className="min-h-10 max-h-40 bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as any);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

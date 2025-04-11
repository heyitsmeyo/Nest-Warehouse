"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { Bot, Send, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col",
        isExpanded ? "w-[80vw] h-[80vh]" : "w-80 h-96",
        !isOpen && "h-auto"
      )}
    >
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full p-4 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 shadow-lg"
        >
          <Bot className="h-6 w-6" />
        </Button>
      ) : (
        <div className="flex flex-col h-full rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
          {/* Chat header */}
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
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
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
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat messages */}
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
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-start gap-3 max-w-[90%]",
                    message.role === "user" ? "ml-auto" : ""
                  )}
                >
                  {message.role !== "user" && (
                    <Avatar className="h-8 w-8 mt-1 bg-emerald-600 flex-shrink-0">
                      <AvatarFallback className="bg-emerald-600 text-white">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-lg p-3",
                      message.role === "user"
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    )}
                  >
                    {message.content}
                  </div>
                  {message.role === "user" && (
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

          {/* Chat input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-zinc-800 bg-zinc-900"
          >
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={handleInputChange}
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

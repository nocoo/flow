import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState, useMemo, type FormEvent } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SendHorizonal, Bot, User, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { API_BASE } from "@/lib/api";

const transport = new DefaultChatTransport({
  api: `${API_BASE}/api/chat`,
});

export function Chat() {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const providerLabel = useMemo(() => {
    if (!settings) return "Loading...";
    const config = settings[settings.activeProvider];
    return `${settings.activeProvider === "cloud" ? "Cloud" : "Local"} · ${config.modelId}`;
  }, [settings]);

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex w-full max-w-xl flex-col rounded-xl border bg-card shadow-lg h-[80svh]">
      {/* header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Bot className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Flow Chat</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {providerLabel}
        </span>
      </div>

      {/* messages */}
      <ScrollArea className="flex-1 px-6" ref={scrollRef}>
        <div className="space-y-6 py-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
              <Bot className="size-10" />
              <p className="text-sm">Send a message to start chatting</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <Avatar className="mt-0.5 shrink-0">
                <AvatarFallback>
                  {message.role === "user" ? (
                    <User className="size-4" />
                  ) : (
                    <Bot className="size-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <span key={`${message.id}-${i}`} className="whitespace-pre-wrap">
                        {part.text}
                      </span>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <div className="flex gap-3">
                <Avatar className="mt-0.5 shrink-0">
                  <AvatarFallback>
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
        </div>
      </ScrollArea>

      {/* error */}
      {error && (
        <div className="mx-6 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error.message}
        </div>
      )}

      {/* input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t px-4 py-3"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          className="min-h-10 max-h-32 resize-none"
          rows={1}
        />
        {isLoading ? (
          <Button type="button" variant="outline" size="icon" onClick={stop}>
            <Loader2 className="size-4 animate-spin" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <SendHorizonal className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}

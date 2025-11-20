import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import { getOrCreateSessionId } from "@/lib/session";

interface ChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatbotDialog({ open, onOpenChange }: ChatbotDialogProps) {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = getOrCreateSessionId();

  // Load chat history when dialog opens
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["/api/chat/history", sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/chat/history/${sessionId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load chat history');
      return response.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages);
    }
  }, [historyData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/message", {
        message,
        sessionId,
      });
      return response as unknown as { response: string; messages: ChatMessage[] };
    },
    onSuccess: (data) => {
      if (data?.messages) {
        setMessages(data.messages);
      }
      setInputMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history", sessionId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendMessage.isPending) return;
    sendMessage.mutate(inputMessage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Live Chat Support
          </DialogTitle>
          <DialogDescription>
            Ask questions about the platform, check order status, or get help with swaps
          </DialogDescription>
        </DialogHeader>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 pr-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Bot className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Hi! I'm your support assistant for Zk Ghost Swap.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Ask me about how the platform works, check your order status, or get help with swaps.
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`chat-message-${index}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sendMessage.isPending}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || sendMessage.isPending}
            data-testid="button-send-message"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Volume2, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<number>(Date.now());

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Continuous conversation - auto-initiate after 15 seconds of silence
  useEffect(() => {
    const checkSilence = () => {
      const timeSinceLastInteraction = Date.now() - lastInteractionRef.current;
      
      if (timeSinceLastInteraction > 15000 && !loading && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === "user") {
          initiateConversation();
        }
      }
    };

    const interval = setInterval(checkSilence, 5000);
    return () => clearInterval(interval);
  }, [messages, loading]);

  const initiateConversation = async () => {
    const starters = [
      "Hey, are you still there?",
      "Should I tell you something interesting?",
      "Want to continue our chat?",
      "I'm still here if you want to talk!",
      "What's on your mind?"
    ];
    
    const randomStarter = starters[Math.floor(Math.random() * starters.length)];
    
    const systemMessage = `The user has been silent. Start the conversation with: "${randomStarter}" and then say something relevant or interesting.`;
    
    await sendMessageInternal(systemMessage, true);
  };

  const speakText = async (text: string) => {
    if (speaking) {
      setSpeaking(false);
      return;
    }

    try {
      setSpeaking(true);
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: '9BWtsMINqrJLrRacOk9x' }
      });

      if (error) throw error;

      if (data?.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.onended = () => setSpeaking(false);
        await audio.play();
      }
    } catch (error) {
      console.error("TTS Error:", error);
      setSpeaking(false);
      
      // Fallback to Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error("Please enter an image description");
      return;
    }

    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: imagePrompt }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      const imageMessage: Message = {
        role: "assistant",
        content: `Here's the generated image:\n\n![Generated Image](${data.imageUrl})`
      };

      setMessages(prev => [...prev, imageMessage]);
      setImagePrompt("");
      
      await supabase.from('chat_messages').insert({
        content: imageMessage.content,
        role: imageMessage.role,
        user_id: (await supabase.auth.getUser()).data.user?.id
      });

      toast.success("Image generated successfully!");
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error("Failed to generate image");
    } finally {
      setGeneratingImage(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    lastInteractionRef.current = Date.now();
    await sendMessageInternal(input, false);
  };

  const sendMessageInternal = async (content: string, isAutoInitiated: boolean) => {
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast.error("Please sign in to chat");
        return;
      }

      let userMessage: Message | null = null;
      if (!isAutoInitiated) {
        userMessage = { role: "user", content };
        setMessages((prev) => [...prev, userMessage!]);
        setInput("");
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

      const messagesToSend = isAutoInitiated 
        ? [...messages, { role: "system", content }]
        : [...messages, { role: "user", content }];

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: messagesToSend.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Chat API error:", errorText);
        throw new Error("Failed to get response from AI");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              assistantMessage += content;

              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantMessage,
                };
                return newMessages;
              });
            } catch (e) {
              console.error("Error parsing streaming data:", e);
            }
          }
        }
      }

      if (userMessage) {
        await supabase.from("chat_messages").insert({
          content: userMessage.content,
          role: "user",
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      await supabase.from("chat_messages").insert({
        content: assistantMessage,
        role: "assistant",
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

      lastInteractionRef.current = Date.now();
      speakText(assistantMessage);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const renderMessageContent = (content: string) => {
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch) {
      return (
        <div className="space-y-2">
          <img
            src={imageMatch[1]}
            alt="Generated"
            className="rounded-lg max-w-full h-auto"
          />
          {content.replace(/!\[.*?\]\(.*?\)/, "").trim() && (
            <p className="text-sm">{content.replace(/!\[.*?\]\(.*?\)/, "").trim()}</p>
          )}
        </div>
      );
    }
    return <p className="whitespace-pre-wrap">{content}</p>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`rounded-lg p-4 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {renderMessageContent(message.content)}
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => speakText(message.content)}
                    disabled={speaking}
                  >
                    <Volume2 className="w-4 h-4 mr-2" />
                    {speaking ? "Stop" : "Listen"}
                  </Button>
                )}
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="rounded-lg p-4 bg-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4 bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex gap-2">
            <Input
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe an image to generate..."
              onKeyPress={(e) => e.key === "Enter" && generateImage()}
              disabled={generatingImage}
              className="flex-1"
            />
            <Button
              onClick={generateImage}
              disabled={generatingImage}
              size="icon"
            >
              {generatingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading}
              className="min-h-[60px] resize-none"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-[60px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

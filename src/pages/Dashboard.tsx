import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInterface } from "@/components/ChatInterface";
import { MemoryManager } from "@/components/MemoryManager";
import { TaskManager } from "@/components/TaskManager";
import { AutomationManager } from "@/components/AutomationManager";
import { AvatarCustomizer } from "@/components/AvatarCustomizer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bot, LogOut, MessageSquare, Brain, CheckSquare, Zap, UserCircle } from "lucide-react";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
        loadAvatar(user.id);
      }
    } catch (error) {
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadAvatar = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-bg">
        <Bot className="w-12 h-12 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={avatarUrl || ""} />
              <AvatarFallback className="bg-gradient-primary">
                <Bot className="w-6 h-6 text-white" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">DEMON AI</h1>
              <p className="text-sm text-muted-foreground">
                Welcome, {user?.email?.split("@")[0]}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl mx-auto">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Memory</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Automation</span>
            </TabsTrigger>
            <TabsTrigger value="avatar" className="gap-2">
              <UserCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Avatar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="m-0">
            <div className="bg-card rounded-xl border border-border overflow-hidden h-[calc(100vh-16rem)] shadow-card">
              <ChatInterface />
            </div>
          </TabsContent>

          <TabsContent value="memory" className="m-0">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
              <MemoryManager />
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="m-0">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
              <TaskManager />
            </div>
          </TabsContent>

          <TabsContent value="automation" className="m-0">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
              <AutomationManager />
            </div>
          </TabsContent>

          <TabsContent value="avatar" className="m-0">
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card">
              <AvatarCustomizer 
                currentAvatar={avatarUrl} 
                onAvatarUpdate={() => user && loadAvatar(user.id)} 
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;

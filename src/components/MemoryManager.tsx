import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Memory = {
  id: string;
  category: string;
  content: string;
  importance: number;
  created_at: string;
};

export const MemoryManager = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newMemory, setNewMemory] = useState({
    category: "preference",
    content: "",
    importance: 5,
  });

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch memories");
    }
  };

  const addMemory = async () => {
    if (!newMemory.content.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("memories").insert({
        user_id: user.id,
        ...newMemory,
      });

      if (error) throw error;

      toast.success("Memory added");
      setNewMemory({ category: "preference", content: "", importance: 5 });
      setShowAdd(false);
      fetchMemories();
    } catch (error: any) {
      toast.error(error.message || "Failed to add memory");
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const { error } = await supabase.from("memories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Memory deleted");
      fetchMemories();
    } catch (error: any) {
      toast.error("Failed to delete memory");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Memory
          </h2>
          <p className="text-muted-foreground mt-1">
            Store preferences and context for personalized AI interactions
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-gradient-primary hover:opacity-90 transition-smooth"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Memory
        </Button>
      </div>

      {showAdd && (
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>New Memory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newMemory.category}
                onValueChange={(value) =>
                  setNewMemory({ ...newMemory, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preference">Preference</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                  <SelectItem value="habit">Habit</SelectItem>
                  <SelectItem value="fact">Fact</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newMemory.content}
                onChange={(e) =>
                  setNewMemory({ ...newMemory, content: e.target.value })
                }
                placeholder="What should I remember?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Importance: {newMemory.importance}</Label>
              <Slider
                value={[newMemory.importance]}
                onValueChange={(value) =>
                  setNewMemory({ ...newMemory, importance: value[0] })
                }
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={addMemory}
                disabled={loading || !newMemory.content.trim()}
                className="bg-gradient-primary hover:opacity-90 transition-smooth"
              >
                Save Memory
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {memories.length === 0 ? (
          <Card className="shadow-card border-border/50">
            <CardContent className="py-12 text-center">
              <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No memories yet. Add some to personalize your AI!
              </p>
            </CardContent>
          </Card>
        ) : (
          memories.map((memory) => (
            <Card
              key={memory.id}
              className="shadow-card border-border/50 hover:border-primary/50 transition-smooth"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{memory.category}</Badge>
                      <Badge variant="outline">
                        Importance: {memory.importance}/10
                      </Badge>
                    </div>
                    <p className="text-foreground">{memory.content}</p>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(memory.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMemory(memory.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type CustomCommand = {
  id: string;
  trigger_phrase: string;
  action_type: string;
  action_config: any;
  enabled: boolean;
  created_at: string;
};

export const AutomationManager = () => {
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newCommand, setNewCommand] = useState({
    trigger_phrase: "",
    action_type: "response",
    action_config: { response: "" },
  });

  useEffect(() => {
    fetchCommands();
  }, []);

  const fetchCommands = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("custom_commands")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCommands(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch commands");
    }
  };

  const addCommand = async () => {
    if (!newCommand.trigger_phrase.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("custom_commands").insert({
        user_id: user.id,
        ...newCommand,
      });

      if (error) throw error;

      toast.success("Command created");
      setNewCommand({
        trigger_phrase: "",
        action_type: "response",
        action_config: { response: "" },
      });
      setShowAdd(false);
      fetchCommands();
    } catch (error: any) {
      toast.error(error.message || "Failed to create command");
    } finally {
      setLoading(false);
    }
  };

  const toggleCommand = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("custom_commands")
        .update({ enabled: !enabled })
        .eq("id", id);

      if (error) throw error;
      fetchCommands();
    } catch (error: any) {
      toast.error("Failed to update command");
    }
  };

  const deleteCommand = async (id: string) => {
    try {
      const { error } = await supabase.from("custom_commands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Command deleted");
      fetchCommands();
    } catch (error: any) {
      toast.error("Failed to delete command");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-accent" />
            Automation
          </h2>
          <p className="text-muted-foreground mt-1">
            Create custom commands and automation rules
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-gradient-accent hover:opacity-90 transition-smooth text-background"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Command
        </Button>
      </div>

      {showAdd && (
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>New Command</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger Phrase</Label>
              <Input
                value={newCommand.trigger_phrase}
                onChange={(e) =>
                  setNewCommand({ ...newCommand, trigger_phrase: e.target.value })
                }
                placeholder='e.g., "study mode"'
              />
            </div>

            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={newCommand.action_type}
                onValueChange={(value) =>
                  setNewCommand({ ...newCommand, action_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="response">Custom Response</SelectItem>
                  <SelectItem value="task">Create Task</SelectItem>
                  <SelectItem value="reminder">Set Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Action Configuration</Label>
              <Textarea
                value={JSON.stringify(newCommand.action_config)}
                onChange={(e) => {
                  try {
                    const config = JSON.parse(e.target.value);
                    setNewCommand({ ...newCommand, action_config: config });
                  } catch {}
                }}
                placeholder={'{"response": "I will help you focus!"}'}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Enter a JSON object with action details
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={addCommand}
                disabled={loading || !newCommand.trigger_phrase.trim()}
                className="bg-gradient-accent hover:opacity-90 transition-smooth text-background"
              >
                Create Command
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {commands.length === 0 ? (
          <Card className="shadow-card border-border/50">
            <CardContent className="py-12 text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No commands yet. Create automation to boost productivity!
              </p>
            </CardContent>
          </Card>
        ) : (
          commands.map((command) => (
            <Card
              key={command.id}
              className="shadow-card border-border/50 hover:border-accent/50 transition-smooth"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">"{command.trigger_phrase}"</h3>
                      <Badge variant="secondary">{command.action_type}</Badge>
                    </div>
                    <pre className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {JSON.stringify(command.action_config, null, 2)}
                    </pre>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={command.enabled}
                      onCheckedChange={() =>
                        toggleCommand(command.id, command.enabled)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCommand(command.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

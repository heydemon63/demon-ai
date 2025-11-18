import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Sparkles, User } from "lucide-react";

interface AvatarCustomizerProps {
  currentAvatar?: string | null;
  onAvatarUpdate?: () => void;
}

export const AvatarCustomizer = ({ currentAvatar, onAvatarUpdate }: AvatarCustomizerProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generateAvatar = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for your avatar");
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: `Professional avatar portrait: ${prompt}. High quality, centered face, neutral background` }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setPreviewUrl(data.imageUrl);
      toast.success("Avatar generated! Click 'Set as Avatar' to save it.");
    } catch (error) {
      console.error('Error generating avatar:', error);
      toast.error("Failed to generate avatar");
    } finally {
      setGenerating(false);
    }
  };

  const saveAvatar = async () => {
    if (!previewUrl) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: previewUrl })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Avatar updated successfully!");
      setPreviewUrl(null);
      setPrompt("");
      onAvatarUpdate?.();
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast.error("Failed to save avatar");
    }
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-xl font-semibold mb-4">Customize Your Avatar</h2>
      
      <div className="flex flex-col items-center gap-4">
        <Avatar className="w-32 h-32">
          <AvatarImage src={previewUrl || currentAvatar || ""} />
          <AvatarFallback className="bg-gradient-primary">
            <User className="w-16 h-16 text-white" />
          </AvatarFallback>
        </Avatar>

        <div className="w-full space-y-2">
          <Input
            placeholder="Describe your avatar (e.g., professional woman with glasses, friendly man with beard)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
          />
          
          <div className="flex gap-2">
            <Button
              onClick={generateAvatar}
              disabled={generating || !prompt.trim()}
              className="flex-1 gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Avatar
                </>
              )}
            </Button>

            {previewUrl && (
              <Button onClick={saveAvatar} variant="secondary">
                Set as Avatar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

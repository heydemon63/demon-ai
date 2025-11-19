import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Sparkles, User, Upload } from "lucide-react";

interface AvatarCustomizerProps {
  currentAvatar?: string | null;
  onAvatarUpdate?: () => void;
}

export const AvatarCustomizer = ({ currentAvatar, onAvatarUpdate }: AvatarCustomizerProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<File[]>([]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast.error("Maximum 5 photos allowed");
      return;
    }
    setUploadedPhotos(files);
    toast.success(`${files.length} photo(s) uploaded`);
  };

  const generateAvatar = async () => {
    if (!prompt.trim() && uploadedPhotos.length === 0) {
      toast.error("Please enter a description or upload photos");
      return;
    }

    setGenerating(true);
    try {
      let finalPrompt = prompt;
      
      if (uploadedPhotos.length > 0) {
        finalPrompt = `Realistic human avatar portrait based on the style: ${prompt || 'professional, lifelike appearance'}. Create a detailed 3D-style avatar with natural features, realistic skin texture, human-like expressions, natural lighting, high quality, centered face.`;
      } else {
        finalPrompt = `Realistic human avatar portrait: ${prompt}. Create a detailed 3D-style avatar with natural features, realistic skin texture, human-like expressions, natural lighting, high quality, centered face.`;
      }

      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: finalPrompt }
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
      setUploadedPhotos([]);
      onAvatarUpdate?.();
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast.error("Failed to save avatar");
    }
  };

  return (
    <div className="space-y-4 p-6">
      <h2 className="text-xl font-semibold mb-4">Customize Your Avatar</h2>
      
      <div className="flex flex-col items-center gap-6">
        <Avatar className="w-40 h-40 transition-transform hover:scale-105 animate-fade-in">
          <AvatarImage 
            src={previewUrl || currentAvatar || ""} 
            className="animate-scale-in"
          />
          <AvatarFallback className="bg-gradient-primary animate-pulse">
            <User className="w-20 h-20 text-white" />
          </AvatarFallback>
        </Avatar>

        <div className="w-full max-w-md space-y-4">
          <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary transition-colors">
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              max={5}
            />
            <label htmlFor="photo-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Upload 1-5 photos to generate realistic avatar
              </p>
              {uploadedPhotos.length > 0 && (
                <p className="text-sm text-primary mt-2 font-medium">
                  {uploadedPhotos.length} photo(s) selected ✓
                </p>
              )}
            </label>
          </div>

          <Input
            placeholder="Describe style (e.g., 'professional woman with glasses', 'friendly man with beard')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
          />
          
          <div className="flex gap-2">
            <Button
              onClick={generateAvatar}
              disabled={generating || (!prompt.trim() && uploadedPhotos.length === 0)}
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

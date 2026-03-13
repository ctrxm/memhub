import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button, Input, Badge } from "@/components/ui/shared";
import { useUploadImage, useCreatePost, CreatePostRequestType, useGetTags } from "@workspace/api-client-react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Image as ImageIcon, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: tagsData } = useGetTags();
  
  const uploadMutation = useUploadImage();
  const createPostMutation = useCreatePost({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Meme posted successfully!" });
        setLocation(`/post/${data.id}`);
      },
      onError: () => toast({ title: "Failed to post", variant: "destructive" })
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1 
  });

  const handleSubmit = async () => {
    if (!file || !title.trim()) return toast({ title: "Image and title required", variant: "destructive" });
    
    try {
      // 1. Upload image
      const uploadRes = await uploadMutation.mutateAsync({ data: { file } });
      
      // 2. Create post
      const type: CreatePostRequestType = file.type.includes('gif') ? 'gif' : 'image';
      await createPostMutation.mutateAsync({
        data: {
          title: title.trim(),
          imageUrl: uploadRes.url,
          type,
          tagIds: selectedTags
        }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  return (
    <Layout hideSidebar>
      <div className="max-w-2xl mx-auto bg-card border border-border/50 rounded-2xl p-6 shadow-xl">
        <h1 className="font-display text-3xl font-bold mb-8">Upload a Meme</h1>

        <div className="space-y-6">
          {/* Dropzone */}
          {!preview ? (
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-lg text-foreground">Click or drag image here</p>
                  <p className="text-sm">Supports JPG, PNG, GIF, WEBP</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-black/50 flex justify-center group">
              <img src={preview} alt="Preview" className="max-h-[400px] object-contain" />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
                onClick={() => { setFile(null); setPreview(null); }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-2">Title</label>
            <Input 
              placeholder="Give it a catchy title..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium placeholder:font-normal"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Tags (Optional)</label>
            <div className="flex flex-wrap gap-2 bg-secondary/30 p-4 rounded-xl border border-border/50">
              {tagsData?.tags?.map(tag => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <Badge 
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 text-sm gap-1 ${isSelected ? 'bg-primary border-primary' : 'bg-background hover:bg-secondary'}`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {isSelected && <Check className="w-3 h-3" />} {tag.name}
                  </Badge>
                );
              })}
              {!tagsData?.tags?.length && <span className="text-muted-foreground text-sm">No tags available</span>}
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 flex justify-end gap-4">
            <Button variant="ghost" onClick={() => setLocation('/')}>Cancel</Button>
            <Button 
              size="lg" 
              className="rounded-full px-10 font-bold" 
              onClick={handleSubmit}
              isLoading={uploadMutation.isPending || createPostMutation.isPending}
              disabled={!file || !title.trim()}
            >
              Post Meme
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

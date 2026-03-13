import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button, Input, Badge } from "@/components/ui/shared";
import { useUploadImage, useCreatePost, CreatePostRequestType, useGetTags } from "@workspace/api-client-react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, X, Check, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Upload() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(true);

  const { data: tagsData } = useGetTags();

  useEffect(() => {
    fetch(`${BASE}/api/communities`)
      .then(r => r.json())
      .then(d => setCommunities(d.communities || []))
      .catch(() => {})
      .finally(() => setLoadingCommunities(false));
  }, []);

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
    if (!selected) return;
    if (selected.size > MAX_FILE_BYTES) {
      toast({
        title: `File too large (${formatBytes(selected.size)})`,
        description: `Maximum allowed size is ${formatBytes(MAX_FILE_BYTES)}.`,
        variant: "destructive",
      });
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
    maxSize: MAX_FILE_BYTES,
    onDropRejected: (rejections) => {
      const err = rejections[0]?.errors[0];
      if (err?.code === "file-too-large") {
        toast({ title: "File too large", description: `Maximum allowed size is ${formatBytes(MAX_FILE_BYTES)}.`, variant: "destructive" });
      } else {
        toast({ title: "Invalid file", description: err?.message, variant: "destructive" });
      }
    }
  });

  const handleSubmit = async () => {
    if (!file || !title.trim()) return toast({ title: "Image and title required", variant: "destructive" });
    if (file.size > MAX_FILE_BYTES) {
      return toast({ title: `File too large`, description: `Max ${formatBytes(MAX_FILE_BYTES)}`, variant: "destructive" });
    }
    try {
      const uploadRes = await uploadMutation.mutateAsync({ data: { file } });
      const type: CreatePostRequestType = file.type.includes('gif') ? 'gif' : 'image';
      await createPostMutation.mutateAsync({
        data: {
          title: title.trim(),
          imageUrl: uploadRes.url,
          type,
          tagIds: selectedTags,
          communityId: selectedCommunity,
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
                  <p className="text-sm">JPG, PNG, GIF, WEBP — max {formatBytes(MAX_FILE_BYTES)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-border bg-black/50 flex justify-center group">
              <img src={preview} alt="Preview" className="max-h-[400px] object-contain" />
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-full font-medium">{formatBytes(file!.size)}</span>
                <Button
                  variant="destructive"
                  size="icon"
                  className="shadow-xl"
                  onClick={() => { setFile(null); setPreview(null); }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Title */}
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

          {/* Community selector */}
          <div>
            <label className="block text-sm font-bold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> Post to Community (Optional)
            </label>
            <div className="flex flex-wrap gap-2 bg-secondary/30 p-4 rounded-xl border border-border/50">
              <Badge
                variant={selectedCommunity === null ? "default" : "outline"}
                className={`cursor-pointer px-3 py-1.5 text-sm ${selectedCommunity === null ? 'bg-primary border-primary' : 'bg-background hover:bg-secondary'}`}
                onClick={() => setSelectedCommunity(null)}
              >
                {selectedCommunity === null && <Check className="w-3 h-3 mr-1" />} No Community
              </Badge>
              {!loadingCommunities && communities.map(c => {
                const isSelected = selectedCommunity === c.id;
                return (
                  <Badge
                    key={c.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer px-3 py-1.5 text-sm gap-1 ${isSelected ? 'bg-primary border-primary' : 'bg-background hover:bg-secondary'}`}
                    onClick={() => setSelectedCommunity(isSelected ? null : c.id)}
                  >
                    {isSelected && <Check className="w-3 h-3" />} {c.icon} {c.name}
                  </Badge>
                );
              })}
              {loadingCommunities && <span className="text-muted-foreground text-sm">Loading communities...</span>}
            </div>
          </div>

          {/* Tags */}
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

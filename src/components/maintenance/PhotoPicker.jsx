import React, { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Image as UIImage } from "@/components/ui/image";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { uploadPrivatePhoto } from "@/lib/photoStorage";

// Touch-friendly photo picker: upload one or more photos, remove with an
// always-visible button (no hover-dependent controls).
export default function PhotoPicker({ photos, onChange }) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);

  const add = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const urls = [];
    for (const f of files) {
      try {
        urls.push(await uploadPrivatePhoto(f));
      } catch (e) {}
    }
    setUploading(false);
    if (urls.length) onChange([...(photos || []), ...urls]);
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {(photos || []).map((url, i) => (
        <div key={i} className="relative aspect-square">
          <UIImage src={url} className="w-full h-full rounded-lg" fittingType="fill" />
          <button
            type="button"
            onClick={() => onChange(photos.filter((_, x) => x !== i))}
            aria-label={t("Remove photo")}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center touch-manipulation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <label className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition min-h-[44px]">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { add(Array.from(e.target.files || [])); e.target.value = ""; }} />
      </label>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function WallpaperGenerator() {
  const [prompt, setPrompt] = useState("");

  const requestGenWallpaper = async ()=> {
    const resp =await fetch("/api/gen-wallpaper",{
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description: prompt })
    })

    if (!resp.ok) {
      throw new Error("Generate wallpaper failed");
    }

    const { code, message, wallpapers } = await resp.json();

    if (code !== 0) {
      throw new Error(message);
    }

    toast.success("Generate wallpaper success");
    window.location.reload();
  }

  const handleGenerate = async () => {
    if(!prompt.trim()){
      toast.error('Please input description')
    }

    requestGenWallpaper();
  };

  return (
    <section>
      <div className="container">
        <div className="w-full max-w-4xl mx-auto">
          <Textarea
            className="w-full p-6 bg-card border rounded-lg shadow-sm min-h-[200px]"
            id="prompt"
            placeholder="What do you want to see?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex justify-end mt-4">
            <Button onClick={handleGenerate}>Generate</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

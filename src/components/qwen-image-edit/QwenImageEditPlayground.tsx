'use client';

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Share2, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Sparkles,
  Wand2
} from 'lucide-react';
import { uploadFileToR2 } from '@/lib/r2-upload';
import { createLogger } from '@/lib/logger';

// Types
interface Example {
  id: number;
  img: string;
  prompt: string;
}

const EXAMPLES: Example[] = [
  {
    id: 1,
    img: "tim-mossholder.png",
    prompt: "Change the text on the sign to read 'Welcome to AI Image Edit'"
  },
  {
    id: 2,
    img: "cat-butterfly.png",
    prompt: "Add a colorful butterfly sitting on the cat's head"
  },
  {
    id: 3,
    img: "forest-fireflies.png",
    prompt: "Transform the background into a magical forest with glowing fireflies"
  }
];

const QwenImageEditPlayground: React.FC = () => {
  const log = createLogger('qwen-image-edit-playground');
  
  // State
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Advanced Settings State
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [seed, setSeed] = useState<number>(120);
  const [randomizeSeed, setRandomizeSeed] = useState(true);
  const [guidanceScale, setGuidanceScale] = useState(4);
  const [inferenceSteps, setInferenceSteps] = useState(50);
  const [rewritePrompt, setRewritePrompt] = useState(true);

  // Default to the first example on load if desired, or empty
  useEffect(() => {
     // Optional: Load initial state
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    log.info({ name: file.name, size: file.size, type: file.type }, 'handleImageUpload called');

    // Clear any existing errors
    setUploadError(null);

    // Validate file type
    const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedFormats.includes(file.type)) {
      setUploadError('Invalid file format. Please upload JPEG, PNG, GIF, or WebP images.');
      return;
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      setUploadError(`File too large. Please upload images smaller than ${(maxFileSize / 1024 / 1024).toFixed(1)}MB.`);
      return;
    }

    setIsUploading(true);

    try {
      // Generate preview
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Image = event.target?.result as string;
        setInputImage(base64Image);
        setOutputImage(null); // Reset output on new input

        try {
          // Upload original file to R2 without compression
          const { url } = await uploadFileToR2(file);
          setUploadedImageUrl(url);
          log.info({ url }, 'Upload to R2 successful');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
          log.error({ err: error, name: file.name }, 'Upload error');
          setUploadError(errorMessage);
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        log.error({ name: file.name }, 'File read error');
        setUploadError('Failed to read file. Please try again.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      log.error({ err: error, name: file.name }, 'Image processing error');
      setUploadError('Failed to process image. Please try again.');
      setIsUploading(false);
    }
  };

  const loadExample = (example: Example) => {
    setInputImage(example.img);
    setUploadedImageUrl(example.img); // Use example image URL directly
    setPrompt(example.prompt);
    setOutputImage(null);
    setUploadError(null);
    
    // Scroll to top of playground
    const element = document.getElementById('playground-top');
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImageUrl || !prompt) return;

    setIsGenerating(true);
    
    try {
      const resp = await fetch("/api/gen-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_image_url: uploadedImageUrl,
          description: prompt,
          aspect_ratio: aspectRatio,
        }),
      });

      if (!resp.ok) {
        throw new Error("Image generation failed");
      }
      
      const result = await resp.json();
      if (result.code !== 0) {
        throw new Error(result.message || "Image generation failed");
      }

      // Extract the generated image URL from the response
      const generatedImageUrl = result.data?.outfits?.[0]?.img_url || null;
        
      if (generatedImageUrl) {
        setOutputImage(generatedImageUrl);
        log.info({ url: generatedImageUrl }, 'Image generation successful');
      } else {
        throw new Error("No generated image found in response");
      }
    } catch (error) {
      log.error({ err: error, prompt }, 'Image generation error');
      setUploadError(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (urlToDownload?: string) => {
    const targetUrl = typeof urlToDownload === 'string' ? urlToDownload : outputImage;
    if (!targetUrl) return;

    try {
      // If it's a data URL, we can download directly
      if (targetUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = `qwen-edited-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // If it's a remote URL, fetch it as a blob to force download
        const response = await fetch(targetUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qwen-edited-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback if fetch fails (e.g. CORS)
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.download = `qwen-edited-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="w-full bg-gray-50 py-16 px-4 md:px-8" id="playground-top">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header */}
        <div className="pt-10 pb-6 text-center">
          
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
               <Sparkles size={24} />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              Qwen-Image-Edit
            </span>
          </div>

          <p className="text-gray-500 mb-8">Try Qwen Image Edit AI directly in your browser - Free AI photo editor online</p>
        </div>

        {/* Main Workspace */}
        <div className="p-2 md:p-2">
          
          {/* Image Display Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            
            {/* Input Side */}
            <div className="relative group min-h-[300px] md:min-h-[400px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 font-medium animate-pulse">Uploading...</p>
                </div>
              ) : inputImage ? (
                <>
                  <img src={inputImage} alt="Input" className="w-full h-full object-contain" />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setFullScreenImage(inputImage)}
                      className="p-1 bg-white/80 rounded hover:bg-white text-gray-700"
                    >
                      <Maximize2 size={16}/>
                    </button>
                    <button 
                      className="p-1 bg-white/80 rounded hover:bg-white text-gray-700" 
                      onClick={() => {
                        setInputImage(null);
                        setUploadedImageUrl(null);
                        setOutputImage(null);
                        setUploadError(null);
                      }}
                    >
                      <RotateCcw size={16}/>
                    </button>
                  </div>
 
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Upload size={32} />
                  </div>
                  <p className="text-gray-500 font-medium mb-2">Drop Image Here</p>
                  <p className="text-gray-400 text-sm mb-4">- or -</p>
                  <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                    Click to Upload
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              )}
            </div>

            {/* Output Side */}
            <div className="relative group min-h-[300px] md:min-h-[400px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center">
              {isGenerating ? (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 font-medium animate-pulse">Generating...</p>
                </div>
              ) : outputImage ? (
                <>
                  <img src={outputImage} alt="Output" className="w-full h-full object-contain" />
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDownload()}
                      className="p-1 bg-white/80 rounded hover:bg-white text-gray-700"
                      title="Download"
                    >
                      <Download size={16}/>
                    </button>
                    <button 
                      onClick={() => setFullScreenImage(outputImage)}
                      className="p-1 bg-white/80 rounded hover:bg-white text-gray-700"
                    >
                      <Maximize2 size={16}/>
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-gray-400">
                  <Wand2 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Output will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Error Display */}
          {uploadError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <div className="text-red-500">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800">Upload Error</h4>
                  <p className="mt-1 text-sm text-red-700">{uploadError}</p>
                </div>
                <button
                  onClick={() => setUploadError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Prompt & Action Area */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to change..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
            <button 
              onClick={handleGenerate}
              disabled={!uploadedImageUrl || !prompt || isGenerating || isUploading}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all shadow-md
                ${(!uploadedImageUrl || !prompt || isGenerating || isUploading) 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-orange-500 hover:bg-orange-600 active:scale-95'
                }
              `}
            >
              {isGenerating ? 'Processing...' : 'Edit!'}
            </button>
          </div>

          {/* Advanced Settings Accordion */}
          <div className="border border-gray-200 rounded-lg mb-8">
            <button 
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-700">Advanced Settings</span>
              {isAdvancedOpen ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
            </button>
            
            {isAdvancedOpen && (
              <div className="p-6 border-t border-gray-200 bg-white space-y-6">
                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600">Aspect Ratio</label>
                  <select 
                    value={aspectRatio} 
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="1:1">Square (1:1)</option>
                    <option value="16:9">Landscape (16:9)</option>
                    <option value="9:16">Portrait (9:16)</option>
                    <option value="4:3">Standard (4:3)</option>
                    <option value="3:4">Portrait (3:4)</option>
                  </select>
                </div>

                {/* Seed Row */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-600">Seed</label>
                    <div className="flex items-center gap-2">
                       <input 
                         type="number" 
                         value={seed} 
                         onChange={(e) => setSeed(Number(e.target.value))}
                         className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                       />
                       <button 
                         className="p-1 hover:bg-gray-100 rounded"
                         onClick={() => setSeed(Math.floor(Math.random() * 9999999))}
                       >
                         <RotateCcw size={14} className="text-gray-500" />
                       </button>
                    </div>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="2147483647" 
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input 
                      type="checkbox" 
                      checked={randomizeSeed} 
                      onChange={(e) => setRandomizeSeed(e.target.checked)}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    Randomize seed
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Guidance Scale */}
                   <div className="space-y-2">
                     <div className="flex justify-between">
                       <label className="text-sm font-medium text-gray-600">True guidance scale</label>
                       <span className="text-sm text-gray-500 bg-gray-100 px-2 rounded">{guidanceScale}</span>
                     </div>
                     <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        step="0.5"
                        value={guidanceScale}
                        onChange={(e) => setGuidanceScale(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                   </div>

                   {/* Inference Steps */}
                   <div className="space-y-2">
                     <div className="flex justify-between">
                       <label className="text-sm font-medium text-gray-600">Number of inference steps</label>
                       <span className="text-sm text-gray-500 bg-gray-100 px-2 rounded">{inferenceSteps}</span>
                     </div>
                     <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        value={inferenceSteps}
                        onChange={(e) => setInferenceSteps(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                   </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input 
                      type="checkbox" 
                      checked={rewritePrompt} 
                      onChange={(e) => setRewritePrompt(e.target.checked)}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    Rewrite prompt
                </label>
              </div>
            )}
          </div>

          {/* Examples Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700">Examples</h3>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
               {/* Table Header */}
               <div className="grid grid-cols-12 bg-gray-50 p-3 text-sm font-semibold text-gray-700 border-b border-gray-200">
                  <div className="col-span-3 md:col-span-2 text-center">Input Image</div>
                  <div className="col-span-9 md:col-span-10 text-center">Prompt</div>
               </div>
               
               {/* Table Body */}
               <div className="bg-white divide-y divide-gray-100">
                 {EXAMPLES.map((ex) => (
                   <div 
                     key={ex.id} 
                     onClick={() => loadExample(ex)}
                     className="grid grid-cols-12 p-3 items-center hover:bg-blue-50 cursor-pointer transition-colors group"
                   >
                     <div className="col-span-3 md:col-span-2 flex justify-center">
                        <img src={ex.img} alt={`Example ${ex.id}`} className="w-20 h-20 object-cover rounded-md shadow-sm group-hover:shadow-md transition-shadow" />
                     </div>
                     <div className="col-span-9 md:col-span-10 px-4 text-gray-600 group-hover:text-gray-900 text-sm md:text-base">
                        {ex.prompt}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Full Screen Overlay */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-200">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
             <button 
               onClick={() => setFullScreenImage(null)}
               className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 border border-gray-200 transition-colors"
               title="Exit Full Screen"
             >
                <Minimize2 size={20} />
             </button>
             <button 
               onClick={() => handleDownload(fullScreenImage)} 
               className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 border border-gray-200 transition-colors"
               title="Download"
             >
                <Download size={20} />
             </button>
             <button 
               className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 border border-gray-200 transition-colors"
               title="Share"
             >
                <Share2 size={20} />
             </button>
          </div>
          <div className="flex-1 w-full h-full p-8 flex items-center justify-center">
             <img src={fullScreenImage} alt="Full Screen View" className="max-w-full max-h-full object-contain" />
          </div>
        </div>
      )}

    </div>
  );
};

export default QwenImageEditPlayground;
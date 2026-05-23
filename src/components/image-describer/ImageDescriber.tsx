'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';
import { useAppContext } from '@/contexts/app';
import ImageUploader from './ImageUploader';
import HistoryModal from './HistoryModal';
import { DescribeOption, HistoryItem, LANGUAGES, ErrorState } from '../../types/image-describer';
import { ImageIcon, LoadingIcon, CopyIcon, CheckIcon } from './Icons';


const ImageDescriber: React.FC = () => {
  const log = createLogger('image-describer');
  const { setShowSignModal } = useAppContext();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<DescribeOption>(DescribeOption.DETAIL);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [customQuestion, setCustomQuestion] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

  // Abort controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('img_desc_history');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Limit to 10 items and validate structure
        const validHistory = parsedHistory.slice(0, 10).filter((item: any) => 
          item && typeof item === 'object' && item.id && item.result
        );
        setHistory(validHistory);
      }
    } catch (e) {
      console.error("Failed to parse history, clearing storage:", e);
      localStorage.removeItem('img_desc_history');
      setHistory([]);
    }
  }, []);

  const saveToHistory = (text: string, img: string) => {
    try {
      // Create a smaller thumbnail for storage to avoid quota issues
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      
      image.onload = () => {
        // Create a small thumbnail (max 100x100)
        const maxSize = 100;
        let { width, height } = image;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(image, 0, 0, width, height);
        
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7); // Compressed JPEG
        
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          imagePreview: thumbnail, // Use compressed thumbnail instead of full image
          option: selectedOption,
          result: text,
        };
        
        // Keep only the last 10 items to prevent storage overflow
        const updatedHistory = [newItem, ...history].slice(0, 10);
        setHistory(updatedHistory);
        
        try {
          localStorage.setItem('img_desc_history', JSON.stringify(updatedHistory));
        } catch (storageError) {
          console.warn('Failed to save to localStorage, clearing old history:', storageError);
          // If still fails, keep only the current item
          const minimalHistory = [newItem];
          setHistory(minimalHistory);
          localStorage.setItem('img_desc_history', JSON.stringify(minimalHistory));
        }
      };
      
      image.src = img;
    } catch (error) {
      console.warn('Failed to create thumbnail, saving without image:', error);
      // Fallback: save without image preview
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        imagePreview: '', // No image to avoid storage issues
        option: selectedOption,
        result: text,
      };
      
      const updatedHistory = [newItem, ...history].slice(0, 10);
      setHistory(updatedHistory);
      localStorage.setItem('img_desc_history', JSON.stringify(updatedHistory));
    }
  };

  const handleGenerate = async () => {
    log.info(
      {
        hasImage: !!uploadedImageUrl,
        selectedOption,
        selectedLanguage,
        customQuestion: selectedOption === DescribeOption.CUSTOM ? customQuestion : undefined,
      },
      "handleGenerate called"
    );

    // Clear previous errors
    setError(null);

    // Validate
    if (!uploadedImageUrl) {
      log.warn("handleGenerate aborted: no uploaded image URL");
      setError({
        type: 'validation',
        message: 'Please upload an image first',
        suggestion: 'Upload an image to continue with description generation'
      });
      return;
    }

    setIsGenerating(true);
    setResult('');
    setHasGenerated(true);
    setCopied(false);

    try {
      // Create description prompt based on selected option
      let description = '';
      switch (selectedOption) {
        case DescribeOption.DETAIL:
          description = "Describe this image in extreme detail. Include lighting, colors, composition, subjects, and atmosphere.";
          break;
        case DescribeOption.BRIEF:
          description = "Provide a brief, one-sentence caption for this image.";
          break;
        case DescribeOption.PERSON:
          description = "Describe the people in this image. Focus on appearance, clothing, expressions, and actions. Do not hallucinate identities.";
          break;
        case DescribeOption.OBJECTS:
          description = "List all the distinct objects visible in this image.";
          break;
        case DescribeOption.ART_STYLE:
          description = "Analyze the art style, medium, and technique used in this image.";
          break;
        case DescribeOption.EXTRACT_TEXT:
          description = "Extract and transcribe all legible text found in this image.";
          break;
        case DescribeOption.GENERAL_PROMPT:
          description = "Write a high-quality text-to-image prompt that could be used to recreate this image.";
          break;
        case DescribeOption.FLUX_PROMPT:
          description = "Write a prompt optimized for the FLUX AI image generator based on this image.";
          break;
        case DescribeOption.MIDJOURNEY:
          description = "Write a detailed Midjourney prompt (v6) for this image. Include aspect ratio parameters if applicable.";
          break;
        case DescribeOption.STABLE_DIFFUSION:
          description = "Write a Stable Diffusion prompt for this image, including positive and negative prompts.";
          break;
        case DescribeOption.CUSTOM:
          description = customQuestion || "Describe this image.";
          break;
        default:
          description = "Describe this image.";
      }

      // Add language instruction
      description += `\n\nIMPORTANT: Please provide the response in ${selectedLanguage}.`;

      // Call API with uploaded image URL
      const resp = await fetch("/api/image-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_image_url: uploadedImageUrl,
          description: description,
        }),
      });

      if (!resp.ok) {
        throw new Error("Generate description failed");
      }

      const { code, message, data } = await resp.json();

      if (code !== 0) {
        throw new Error(message);
      }

      // Extract description from response
      const generatedDescription = data?.description || "Description generated successfully";
      
      setResult(generatedDescription);
      
      log.info({ 
        code, 
        baseImageUrl: uploadedImageUrl, 
        option: selectedOption 
      }, "handleGenerate success");

      // Save to history
      if (generatedDescription && selectedImage) {
        saveToHistory(generatedDescription, selectedImage);
      }

    } catch (error) {
      log.error({ err: error }, "Generation error");
      
      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      const isAuthError = errorMessage.toLowerCase().includes("sign in") || errorMessage.toLowerCase().includes("authenticated");
      const isCreditError = errorMessage.toLowerCase().includes("credit") || errorMessage.toLowerCase().includes("insufficient");
      
      let errorType: 'auth' | 'credits' | 'generation' = 'generation';
      let message = 'Failed to generate description';
      let suggestion = 'Check your connection and try again';
      
      if (isAuthError) {
        errorType = 'auth';
        message = 'Please sign in first';
        suggestion = 'Sign in to generate descriptions';
      } else if (isCreditError) {
        errorType = 'credits';
        message = errorMessage; // Use the detailed credit error message from API
        suggestion = 'Purchase more credits to continue';
      }
      
      setError({
        type: errorType,
        message,
        suggestion,
        retryAction: () => handleGenerate(),
      });
      
      setResult("Error encountered during generation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    log.info({ textLength: result.length }, "Result copied to clipboard");
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('img_desc_history');
  };

  // 错误显示组件
  const ErrorDisplay = ({ error }: { error: ErrorState | null }) => {
    if (!error) return null;

    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 mt-4">
        <div className="flex items-start gap-3">
          <div className="text-destructive">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-destructive">
              {error.message}
            </h4>
            {error.suggestion && (
              <p className="mt-1 text-sm text-destructive/80">
                {error.suggestion}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {error.type === 'auth' && (
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setShowSignModal(true)}
                >
                  Sign In
                </Button>
              )}
              {error.type === 'credits' && (
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => window.open('/pricing', '_blank')}
                >
                  Buy Credits
                </Button>
              )}
              {error.retryAction && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={error.retryAction}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex justify-center">
      <Card className="w-full max-w-6xl p-6 md:p-8 lg:p-10 shadow-xl border border-border/60">
      
      {/* Top Grid: Upload & Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Left: Uploader */}
        <div className="space-y-2">
           <ImageUploader
             onImageSelected={(base64, url) => {
               setSelectedImage(base64);
               setUploadedImageUrl(url);
               setResult('');
               setHasGenerated(false);
               setError(null);
             }}
           />
        </div>

        {/* Right: Preview */}
        <Card className="p-6 h-80 flex flex-col">
          <h2 className="text-xl font-semibold mb-4">Image Preview</h2>
          <div className="flex-1 flex items-center justify-center bg-muted/40 rounded-xl overflow-hidden border border-border relative">
            {uploadedImageUrl || selectedImage ? (
              <img 
                src={uploadedImageUrl || selectedImage || ''} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <div className="bg-primary/10 p-4 rounded-xl mb-3">
                  <ImageIcon />
                </div>
                <p>Your image will show here</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Options Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Image Describer Options</h2>
        <div className="flex flex-wrap gap-3">
          {Object.values(DescribeOption).map((option) => (
            <Button
              key={option}
              onClick={() => setSelectedOption(option)}
              variant={selectedOption === option ? "default" : "outline"}
              size="sm"
              className="rounded-full"
            >
              {option}
            </Button>
          ))}
        </div>
        
        {/* Custom Question Input */}
        {selectedOption === DescribeOption.CUSTOM && (
          <div className="mt-4 animate-fade-in">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Ask anything about the image (e.g., 'Is the dog happy?')"
              className="w-full md:w-1/2 px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring outline-none"
            />
          </div>
        )}
      </div>

      {/* Language Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <label className="text-lg font-bold">Result Language:</label>
        <select 
          className="border border-input bg-background py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
        >
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6 mb-8">
        {isGenerating ? (
          <Button 
            disabled
            size="lg"
            className="min-w-[140px]"
          >
            <LoadingIcon />
            Generating...
          </Button>
        ) : (
          <Button 
            onClick={handleGenerate}
            disabled={!selectedImage}
            size="lg"
            className="px-8"
          >
            Generate
          </Button>
        )}

        <Button 
          onClick={() => setShowHistory(true)}
          variant="ghost"
          size="lg"
        >
          View History
        </Button>
      </div>

      {/* Error Display */}
      <ErrorDisplay error={error} />

      {/* Output Area */}
      {hasGenerated && (
        <div className="animate-fade-in">
           <div className="flex items-center justify-between mb-3">
             <h3 className="text-lg font-bold">
               {isGenerating ? 'Generating Describer...' : 'Generated Describer'}
             </h3>
             {isGenerating ? (
               <Button 
                 onClick={handleStop}
                 variant="destructive"
                 size="sm"
               >
                 Stop
               </Button>
             ) : (
                <Button
                  onClick={handleCopy}
                  variant="ghost"
                  size="sm"
                  className={copied ? 'text-green-600' : ''}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
             )}
           </div>
           
           <div className="bg-muted/40 rounded-2xl p-6 min-h-[160px] border border-border shadow-inner">
             {result ? (
               <p className="leading-relaxed whitespace-pre-wrap">
                 {result}
                 {isGenerating && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle"></span>}
               </p>
             ) : (
               <div className="h-full flex items-center justify-center text-muted-foreground italic">
                 Preparing generation...
               </div>
             )}
           </div>
        </div>
      )}

        {/* History Modal */}
        <HistoryModal 
          isOpen={showHistory} 
          onClose={() => setShowHistory(false)} 
          history={history}
          onClear={handleClearHistory}
        />
      </Card>
    </div>
  );
};

export default ImageDescriber;

"use client";

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import { Download, Trash2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GeneratedImage, MyCreationsProps } from './types';
import { getMyCreations, deleteCreation, downloadImage, formatTimestamp } from './utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function MyCreations({
  title,
  description,
  maxItems,
  showViewAll = false,
  creations: propCreations,
}: MyCreationsProps) {
  const router = useRouter();
  const t = useTranslations('nano_banana_pro');
  const [creations, setCreations] = useState<GeneratedImage[]>(propCreations || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCreations, setFilteredCreations] = useState<GeneratedImage[]>([]);

  // Load creations from localStorage if not provided via props
  useEffect(() => {
    if (!propCreations) {
      const localCreations = getMyCreations();
      setCreations(localCreations);
    }
  }, [propCreations]);

  // Filter creations based on search term
  useEffect(() => {
    let filtered = creations;
    
    if (searchTerm.trim()) {
      filtered = creations.filter(creation =>
        creation.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creation.model.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply maxItems limit if specified
    if (maxItems && maxItems > 0) {
      filtered = filtered.slice(0, maxItems);
    }

    setFilteredCreations(filtered);
  }, [creations, searchTerm, maxItems]);

  const handleDelete = async (id: string) => {
    try {
      deleteCreation(id);
      setCreations(prev => prev.filter(creation => creation.id !== id));
      toast.success(t('errors.delete_success'));
    } catch (error) {
      toast.error(t('errors.delete_failed'));
      console.error('Delete error:', error);
    }
  };

  const handleDownload = (creation: GeneratedImage) => {
    const filename = `${creation.prompt.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${creation.id}.png`;
    downloadImage(creation.url, filename);
    toast.success(t('errors.download_started'));
  };

  const navigateToGenerator = () => {
    router.push('/#caricature-maker');
  };

  const navigateToFullGallery = () => {
    router.push('/#caricature-maker');
  };

  // Empty state
  if (!filteredCreations || filteredCreations.length === 0) {
    if (searchTerm.trim()) {
      return (
        <section className="mt-14">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{title || t('my_creations.title')}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {description || t('my_creations.description')}
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="text"
                  placeholder={t('my_creations.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <Search className="mx-auto text-muted-foreground" size={48} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('my_creations.no_results')}</h3>
                <p className="text-muted-foreground mb-6">
                  {t('my_creations.no_results_message')}
                </p>
                <Button 
                  onClick={() => setSearchTerm('')}
                  variant="outline"
                >
                  {t('my_creations.clear_search')}
                </Button>
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="mt-14">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <Sparkles className="mx-auto text-muted-foreground" size={48} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('my_creations.empty_state')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('my_creations.empty_message')}
              </p>
              <Button 
                onClick={navigateToGenerator}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="mr-2" size={16} />
                {t('my_creations.start_creating')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* Search Bar - Only show if not limited by maxItems */}
        {!maxItems && (
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                placeholder="Search creations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* View All Button - Only show if maxItems is set and there are more items */}
        {showViewAll && maxItems && creations.length > maxItems && (
          <div className="text-center mb-8">
            <Button 
              onClick={navigateToFullGallery}
              variant="outline"
            >
              {t('my_creations.view_all', { count: creations.length })}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCreations.map((creation) => {
            const baseName = creation.prompt.slice(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') || `creation-${creation.id}`;

            return (
              <div
                key={creation.id}
                className="group relative transition-transform hover:scale-[1.02]"
              >
                <div className="relative overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={creation.url}
                    alt={creation.prompt}
                    width={400}
                    height={500}
                    className="w-full h-auto object-cover"
                    unoptimized // Since these are external URLs from R2
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                    {/* Top: Creation Info */}
                    <div className="text-white">
                      <p className="text-xs opacity-75 mb-1">
                        {formatTimestamp(creation.createdAt)}
                      </p>
                      <p className="text-sm font-medium line-clamp-2 mb-2">
                        {creation.prompt}
                      </p>
                      <div className="flex items-center gap-2 text-xs opacity-75">
                        <span className="bg-white/20 px-2 py-1 rounded">
                          {creation.model}
                        </span>
                        <span className="bg-white/20 px-2 py-1 rounded">
                          {creation.aspectRatio}
                        </span>
                        <span className="bg-white/20 px-2 py-1 rounded">
                          {t(`my_creations.modes.${creation.mode}`)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Bottom: Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(creation);
                        }}
                        className="flex-1"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {t('my_creations.download')}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(creation.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show creation count */}
        {!maxItems && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              {t('my_creations.total_count', { count: filteredCreations.length })}
              {searchTerm.trim() && ` ${t('my_creations.search_results', { term: searchTerm })}`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

/**
 * FontRecommendation - 字体推荐组件
 * 
 * 功能：
 * 1. 字体推荐显示
 * 2. 加载状态显示
 * 3. 错误提示显示
 */

import type { FontRecommendationProps } from "@/types/font-recognizer";

export default function FontRecommendation({
  recommendations,
  isLoading,
  config,
}: FontRecommendationProps) {
  return (
    <div className="mt-4 rounded-lg border bg-background p-4">
      <h4 className="text-sm font-semibold mb-3">
        {config.title}
      </h4>

      {isLoading ? (
        // 加载状态
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-xs text-muted-foreground">
              Analyzing font...
            </p>
          </div>
        </div>
      ) : recommendations ? (
        // 显示推荐结果
        <div className="space-y-3">
          {/* 识别的字体 */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {config.detectedFontLabel}
            </p>
            <p className="text-sm font-medium">
              {recommendations.detectedFont}
            </p>
          </div>

          {/* 置信度 */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Confidence: {Math.round(recommendations.confidence * 100)}%
            </p>
          </div>

          {/* 相似字体列表 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {config.similarFontsLabel}
            </p>
            <div className="space-y-2">
              {recommendations.similarFonts.map((font, i) => (
                <a
                  key={i}
                  href={font.googleFontsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-md bg-muted hover:bg-muted/80 transition-colors group"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">
                      {font.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {font.category}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(font.similarity * 100)}%
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // 提示选择文字
        <p className="text-sm text-muted-foreground text-center py-4">
          {config.selectTextPrompt}
        </p>
      )}
    </div>
  );
}

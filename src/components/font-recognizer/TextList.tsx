"use client";

/**
 * TextList - 文字列表组件
 * 
 * 功能：
 * 1. 文字列表渲染
 * 2. 颜色指示器显示
 * 3. 点击选择功能
 * 4. 选中状态高亮
 * 5. 自动滚动到选中项
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { TextListProps } from "@/types/font-recognizer";

export default function TextList({
  ocrResults,
  selectedIndex,
  onTextSelect,
}: TextListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  /**
   * 自动滚动到选中项
   */
  useEffect(() => {
    if (selectedIndex !== null && selectedItemRef.current && listRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      console.log('[TextList] Scrolled to selected item:', selectedIndex);
    }
  }, [selectedIndex]);

  if (ocrResults.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No text detected
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="w-full h-full overflow-y-auto p-4 space-y-2"
    >
      {ocrResults.map((result, index) => {
        const isSelected = index === selectedIndex;
        
        return (
          <div
            key={index}
            ref={isSelected ? selectedItemRef : null}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
              "hover:bg-muted/50",
              isSelected && "bg-accent/20 border-2 border-accent shadow-sm"
            )}
            onClick={() => {
              console.log('[TextList] Text item clicked:', index);
              onTextSelect(index, null); // TextList doesn't have access to cropped image
            }}
          >
            {/* 颜色指示器 */}
            <div
              className="w-4 h-4 rounded-full flex-shrink-0 border border-border"
              style={{ backgroundColor: result.color }}
            />
            
            {/* 文字内容 */}
            <span className={cn(
              "text-sm flex-1 break-words",
              isSelected && "font-medium"
            )}>
              {result.text}
            </span>

            {/* 置信度（如果有） */}
            {result.confidence !== undefined && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {Math.round(result.confidence * 100)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

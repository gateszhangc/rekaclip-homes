# Image Cropper Component

这是一个功能完整的图片裁剪组件，从test目录迁移而来，做了最小化的改动。

## 功能特性

- 拖拽上传图片
- 多种裁剪比例（16:9, 9:16, 1:1, 自由裁剪）
- 实时预览
- 下载裁剪后的图片
- 响应式设计

## 使用方法

```tsx
import ImageCropper from '@/components/image-cropper';

function MyPage() {
  return (
    <div>
      <ImageCropper />
    </div>
  );
}
```

## 组件结构

- `index.tsx` - 主组件，管理上传和编辑状态
- `UploadView.tsx` - 文件上传界面
- `EditorView.tsx` - 图片裁剪编辑界面
- `types.ts` - TypeScript 类型定义
- `utils/canvasUtils.ts` - Canvas 相关工具函数


## 依赖

- `react-image-crop` - 图片裁剪核心库
- `lucide-react` - 图标库

## 注意事项

- 组件使用项目现有的 `@/lib/r2-upload` 服务进行文件上传
- 组件使用了项目的 primary 颜色主题
- 支持的图片格式：JPEG, PNG, WebP
- 最大文件大小：40MB
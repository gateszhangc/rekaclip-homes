# AI图像扩展器组件

AI图像扩展器是一个React组件，允许用户上传图像并使用人工智能将其扩展到选定的宽高比。

## 功能特性

- ✅ 图像上传和验证（支持JPEG、PNG、GIF、WebP格式）
- ✅ 多种宽高比选择（1:1、2:3、3:2、16:9、9:16、3:4、4:3）
- ✅ 实时尺寸计算和显示
- ✅ 视觉预览反馈（宽高比框架和扩展区域预览）
- ✅ AI图像生成（基于现有的gen-outfit API）
- ✅ 积分系统集成
- ✅ 图像下载功能
- ✅ 原图/扩展图比较功能
- ✅ 响应式设计（移动端友好）
- ✅ 明暗主题支持
- ✅ 错误处理和用户反馈
- ✅ 加载状态指示器

## 使用方法

```tsx
import AIImageExpander from '@/components/ai-image-expander';

export default function MyPage() {
  return (
    <AIImageExpander 
      onImageGenerated={(imageUrl) => console.log('Generated:', imageUrl)}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

## 组件属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `className` | `string` | `''` | 额外的CSS类名 |
| `onImageGenerated` | `(imageUrl: string) => void` | `undefined` | 图像生成成功回调 |
| `onError` | `(error: string) => void` | `undefined` | 错误处理回调 |

## 技术实现

- **文件上传**: 使用R2存储服务
- **AI生成**: 复用现有的`/api/gen-outfit`接口
- **积分系统**: 集成`/api/get-user-credits`接口
- **下载功能**: 使用`/api/wallpaper/download`接口
- **主题支持**: 使用Tailwind CSS主题变量
- **响应式**: 基于Tailwind CSS网格系统

## 配置

组件使用以下配置常量：

```typescript
const CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  generationCost: 5, // 积分消耗
  maxImageDimension: 2048, // 最大图像尺寸
};
```

## 依赖项

- React 18+
- Next.js 14+
- Tailwind CSS
- Lucide React (图标)
- next-intl (国际化)
- 现有的UI组件库 (@/components/ui/*)

## 文件结构

```
src/components/ai-image-expander/
├── index.tsx          # 主组件文件
└── README.md          # 组件文档
```
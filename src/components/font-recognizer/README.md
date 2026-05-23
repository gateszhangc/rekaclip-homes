# Font Recognizer Component

图片文字识别和字体识别组件

## 目录结构

```
src/components/font-recognizer/
├── index.tsx                 # 主组件
├── ImageUpload.tsx          # 图片上传组件 (待实现)
├── ImageCanvas.tsx          # Canvas 图片显示和标注组件 (待实现)
├── TextList.tsx             # 文字列表组件 (待实现)
├── FontRecommendation.tsx   # 字体推荐组件 (待实现)
└── README.md                # 组件文档
```

## 类型定义

所有类型定义位于 `src/types/font-recognizer.ts`

## 国际化配置

- 英文: `src/i18n/pages/font-recognizer/en.json`
- 中文: `src/i18n/pages/font-recognizer/zh.json`

## 使用方法

```tsx
import FontRecognizer from "@/components/font-recognizer";
import config from "@/i18n/pages/font-recognizer/en.json";

<FontRecognizer config={config.fontRecognizer} />
```

## 开发状态

- [x] 项目结构和核心接口
- [x] 图片上传功能
- [x] OCR API 集成
- [x] Canvas 图片显示和标注
- [x] 文字列表展示
- [x] 字体推荐组件
- [x] 主组件和状态管理
- [ ] 字体识别 API 集成（ReplicateFontClient）
- [ ] 图片裁剪功能
- [ ] 错误处理和用户反馈优化
- [ ] 测试和样式优化

## 相关文档

- 需求文档: `.kiro/specs/image-text-font-recognition/requirements.md`
- 设计文档: `.kiro/specs/image-text-font-recognition/design.md`
- 任务列表: `.kiro/specs/image-text-font-recognition/tasks.md`

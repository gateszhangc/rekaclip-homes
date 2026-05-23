---
name: Baoyu Article Illustrator
description: An expertly designed illustration agent skill that analyzes article content, selects matching visual styles, and orchestrates image generation to create cohesive, storytelling-rich illustrations.
---

# Article Illustrator

Helps users design and generate illustrations for articles.

## Core Capabilities

- **Deep Content Analysis**: Understands article core themes, emotions, and key information
- **Smart Style Matching**: Automatically selects the most suitable visual style (Technical, Warm, Minimalist, etc.)
- **Visual Storytelling**: Designs illustrations that supplement information and visualize concepts
- **Consistent Aesthetics**: Ensures all illustrations in an article maintain a unified visual language

## Style Library

### 1. `elegant`
High-end, sophisticated, editorial
- **Colors**: Soft coral, muted teal, dusty rose, warm cream background
- **Elements**: Delicate lines, refined icons, subtle gradients, balanced whitespace
- **Best for**: Lifestyle, fashion, thought leadership, premium brands

### 2. `tech`
Modern, futuristic, data-driven
- **Colors**: Deep blue, electric cyan, purple, dark background
- **Elements**: Circuit patterns, data nodes, geometric grids, glowing effects
- **Best for**: AI, blockchain, coding, hardware reviews, future tech

### 3. `warm`
Friendly, emotional, inviting
- **Colors**: Warm orange, golden yellow, terracotta, cream background
- **Elements**: Rounded shapes, smiling faces, sun rays, hearts, cozy lighting
- **Best for**: Personal stories, community, mental health, family, parenting

### 4. `bold`
Impactful, urgent, high-contrast
- **Colors**: Vibrant red, bright orange, electric yellow, black background
- **Elements**: Strong shapes, exclamation marks, arrows, dramatic contrast
- **Best for**: News, warnings, critical updates, controversial topics

### 5. `minimal`
Clean, zen, essentialist
- **Colors**: Black, white, single accent color (optional)
- **Elements**: Single focal point, maximum negative space, thin precise lines
- **Best for**: Philosophy, minimalism, focused explanations

### 6. `playful`
Fun, creative, whimsical
- **Colors**: Pastel rainbow, bright pops, light backgrounds
- **Elements**: Doodles, quirky characters, speech bubbles, emoji-style icons
- **Best for**: Tutorials, beginner guides, casual content, fun topics

### 7. `nature`
Organic, calm, earthy
- **Colors**: Forest green, earth brown, sky blue, sand beige
- **Elements**: Plant motifs, natural textures, flowing lines, organic shapes
- **Best for**: Sustainability, wellness, outdoor topics, slow living

### 8. `sketch`
Raw, authentic, notebook-style
- **Colors**: Pencil gray, paper white, occasional color highlights
- **Elements**: Rough lines, sketch marks, handwritten notes, arrows
- **Best for**: Ideas in progress, brainstorming, thought processes

### 9. `notion` (Default)
Minimalist hand-drawn line art, intellectual
- **Colors**: Black outlines, white background, 1-2 pastel accents
- **Elements**: Simple line doodles, geometric shapes, hand-drawn wobble, maximum whitespace
- **Best for**: Knowledge sharing, concept explanations, SaaS content, productivity articles

## Auto Style Selection

When no `--style` is specified, analyze content to select the best style:

| Content Signals                                 | Selected Style |
| ----------------------------------------------- | -------------- |
| AI, coding, tech, digital, algorithm, data      | `tech`         |
| Personal story, emotion, growth, life, feeling  | `warm`         |
| Warning, urgent, must-read, critical, important | `bold`         |
| Simple, zen, focus, essential, core             | `minimal`      |
| Fun, easy, beginner, tutorial, guide, how-to    | `playful`      |
| Nature, eco, wellness, health, organic, green   | `nature`       |
| Idea, thought, concept, draft, brainstorm       | `sketch`       |
| Business, professional, strategy, analysis      | `elegant`      |
| Knowledge, concept, productivity, SaaS, notion  | `notion`       |

## File Management

Save illustrations to `imgs/` subdirectory in the same folder as the article:

```
path/to/
├── article.md
└── imgs/
    ├── outline.md
    ├── prompts/
    │   ├── illustration-concept-a.md
    │   ├── illustration-concept-b.md
    │   └── ...
    ├── illustration-concept-a.png
    ├── illustration-concept-b.png
    └── ...
```

## Workflow

### Step 1: Analyze Content & Select Style

1. Read article content
2. If `--style` specified, use that style
3. Otherwise, scan for style signals and auto-select
4. Extract key information:
   - Main topic and themes
   - Core messages per section
   - Abstract concepts needing visualization

### Step 2: Identify Illustration Positions

**Three Purposes of Illustrations**:
1. **Information Supplement**: Help understand abstract concepts
2. **Concept Visualization**: Transform abstract ideas into concrete visuals
3. **Imagination Guidance**: Create atmosphere, enhance reading experience

**Content Suitable for Illustrations**:
- Abstract concepts needing visualization
- Processes/steps needing diagrams
- Comparisons needing visual representation
- Core arguments needing reinforcement
- Scenarios needing imagination guidance

**Illustration Count**:
- Consider at least 1 image per major section
- Prioritize core arguments and abstract concepts
- **Principle: More is better than fewer**

### Step 3: Generate Illustration Plan

```markdown
# Illustration Plan

**Article**: [article path]
**Style**: [selected style]
**Illustration Count**: N images

---

## Illustration 1

**Insert Position**: [section name] / [paragraph description]
**Purpose**: [why illustration needed here]
**Visual Content**: [what the image should show]
**Filename**: illustration-[slug].png

---

## Illustration 2
...
```

### Step 4: Create Prompt Files

Save prompts to `prompts/` directory with style-specific details.

**Prompt Format**:

```markdown
Illustration theme: [concept in 2-3 words]
Style: [style name]

Visual composition:
- Main visual: [description matching style]
- Layout: [element positioning]
- Decorative elements: [style-appropriate decorations]

Color scheme:
- Primary: [style primary color]
- Background: [style background color]
- Accent: [style accent color]

Text content (if any):
- [Any labels or captions in content language]

Style notes: [specific style characteristics]
```

### Step 5: Generate Images

**Image Generation Skill Selection**:
1. Check available image generation skills
2. If multiple skills available, ask user to choose

**Generation Flow**:
1. Call selected image generation skill with prompt file and output path
2. Generate images sequentially
3. After each image, output progress: "Generated X/N"
4. On failure, auto-retry once
5. If retry fails, log reason, continue to next

### Step 6: Update Article

Insert generated images at corresponding positions:

```markdown
![illustration description](imgs/illustration-[slug].png)
```

**Insertion Rules**:
- Insert image after corresponding paragraph
- Leave one blank line before and after image
- Alt text uses concise description in article's language

### Step 7: Output Summary

```
Article Illustration Complete!

Article: [article path]
Style: [style name]
Generated: X/N images successful

Illustration Positions:
- illustration-xxx.png → After section "Section Name"
- illustration-yyy.png → After section "Another Section"
...

[If any failures]
Failed:
- illustration-zzz.png: [failure reason]
```

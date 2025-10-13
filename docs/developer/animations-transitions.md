# Animation & Transition Guidelines

A comprehensive guide for implementing smooth, natural animations inspired by Apple's design principles using Framer Motion.

## Table of Contents

- [Core Principles](#core-principles)
- [Animation Building Blocks](#animation-building-blocks)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Examples](#examples)

---

## Core Principles

### 1. **Natural Motion**

Animations should feel like they have real-world physics, not robotic or mechanical.

### 2. **Purposeful**

Every animation should serve a purpose: guide attention, provide feedback, or maintain context.

### 3. **Subtle but Noticeable**

Animations should be felt, not explicitly noticed. They should enhance UX without being distracting.

### 4. **Consistent Timing**

Use consistent duration and easing across similar interactions throughout the app.

---

## Animation Building Blocks

### The Apple-Inspired Toolkit

#### 1. **Blur + Opacity**

The foundation of smooth transitions. Combined, they create depth and polish.

```typescript
// ✅ GOOD: Smooth entrance
initial={{ opacity: 0, filter: 'blur(4px)' }}
animate={{ opacity: 1, filter: 'blur(0px)' }}
transition={{
  opacity: { duration: 0.2 },
  filter: { duration: 0.3 }
}}

// ❌ BAD: Abrupt change
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
```

**When to use:**

- Content appearing/disappearing
- State transitions
- Component mounting/unmounting

#### 2. **Spring Physics**

Natural, bouncy movement that feels responsive without being jarring.

```typescript
// ✅ GOOD: Natural spring
transition={{
  type: 'spring',
  stiffness: 300,  // Responsive but not too bouncy
  damping: 30      // Smooth settling
}}

// ❌ BAD: Too bouncy
transition={{
  type: 'spring',
  stiffness: 500,  // Too aggressive
  damping: 10      // Too much bounce
}}
```

**Parameters:**

- `stiffness: 300` - Default for most UI interactions
- `stiffness: 400` - Snappy interactions (dropdowns, tooltips)
- `stiffness: 200` - Heavier elements (modals, sidebars)
- `damping: 30` - Smooth settling without excessive bounce

#### 3. **Custom Easing Curves**

Apple-inspired bezier curves for linear transitions.

```typescript
// Apple-style easing
ease: [0.25, 0.1, 0.25, 1.0] // Default smooth
ease: [0.4, 0.0, 0.2, 1.0] // Material Design easing
ease: [0.17, 0.67, 0.83, 0.67] // Expo easing
```

**When to use:**

- Background color changes
- Size/scale adjustments
- Non-physics animations

#### 4. **Staggered Animations**

Sequential reveals that feel orchestrated, not random.

```typescript
// List items appearing one by one
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      delay: index * 0.03,  // 30ms between each
      duration: 0.2
    }}
  >
    {item.content}
  </motion.div>
))}
```

**Guidelines:**

- 30-50ms delay between items for lists
- 50-100ms for larger UI sections
- Never exceed 150ms per item

---

## Common Patterns

### Pattern 1: Content Replacement

Use `AnimatePresence` with `mode="wait"` for clean state transitions.

```typescript
import { motion, AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  {currentState === 'loading' ? (
    <motion.div
      key="loading"
      initial={{ opacity: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      transition={{ duration: 0.3 }}
    >
      <LoadingSpinner />
    </motion.div>
  ) : (
    <motion.div
      key="content"
      initial={{ opacity: 0, filter: 'blur(4px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(4px)' }}
      transition={{ duration: 0.3 }}
    >
      <Content />
    </motion.div>
  )}
</AnimatePresence>
```

### Pattern 2: List Item Entrance

Staggered reveal with vertical movement and blur.

```typescript
{projectLinks.map((project, index) => (
  <motion.div
    key={project.id}
    initial={{ opacity: 0, filter: 'blur(4px)', y: -10 }}
    animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
    exit={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
    transition={{
      type: 'spring',
      stiffness: 300,
      damping: 30,
      delay: index * 0.03,
      opacity: { duration: 0.2 },
      filter: { duration: 0.3 }
    }}
  >
    {project.content}
  </motion.div>
))}
```

### Pattern 3: Mode Transitions (Transparency, Theme)

Smooth background and style transitions.

```typescript
<motion.div
  initial={false}  // Don't animate on mount
  animate={{
    backgroundColor: useTransparentStyle
      ? 'rgba(255, 255, 255, 0.05)'
      : 'hsl(var(--background))'
  }}
  transition={{
    duration: 0.5,
    ease: [0.25, 0.1, 0.25, 1.0]
  }}
>
  {children}
</motion.div>
```

### Pattern 4: Hover Interactions

Subtle feedback that feels responsive.

```typescript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{
    type: 'spring',
    stiffness: 400,
    damping: 25
  }}
>
  Click Me
</motion.button>
```

---

## Best Practices

### ✅ DO

1. **Use `initial={false}` for persistent elements**

   ```typescript
   // Prevents animation on mount for always-visible elements
   <motion.div initial={false} animate={{ ... }}>
   ```

2. **Combine blur with opacity for depth**

   ```typescript
   // Creates a sense of depth and polish
   filter: 'blur(4px)' // During transition
   filter: 'blur(0px)' // At rest
   ```

3. **Match animation duration to element importance**

   ```typescript
   // Quick for small UI elements
   transition={{ duration: 0.2 }}

   // Slower for major UI changes
   transition={{ duration: 0.5 }}
   ```

4. **Use spring physics for interactive elements**

   ```typescript
   // Buttons, cards, draggable items
   transition={{ type: 'spring', stiffness: 300, damping: 30 }}
   ```

5. **Stagger list animations**
   ```typescript
   // Creates sense of flow and discovery
   delay: index * 0.03
   ```

### ❌ DON'T

1. **Don't overuse animations**

   ```typescript
   // ❌ Everything animating is distracting
   <motion.span animate={{ ... }}>Every</motion.span>
   <motion.span animate={{ ... }}>Single</motion.span>
   <motion.span animate={{ ... }}>Word</motion.span>
   ```

2. **Don't use long durations**

   ```typescript
   // ❌ Too slow, feels sluggish
   transition={{ duration: 1.5 }}

   // ✅ Snappy and responsive
   transition={{ duration: 0.3 }}
   ```

3. **Don't animate layout-shifting properties without reason**

   ```typescript
   // ❌ Can cause layout thrashing
   animate={{ marginTop: 100 }}

   // ✅ Use transforms instead
   animate={{ y: 100 }}
   ```

4. **Don't use excessive blur**

   ```typescript
   // ❌ Too blurry, looks buggy
   filter: 'blur(10px)'

   // ✅ Subtle and polished
   filter: 'blur(4px)'
   ```

5. **Don't mix animation styles inconsistently**

   ```typescript
   // ❌ Inconsistent
   Component A: transition={{ duration: 0.2 }}
   Component B: transition={{ duration: 0.8 }}

   // ✅ Consistent
   All interactive elements: transition={{ duration: 0.3 }}
   ```

---

## Performance Optimization

### 1. **Animate Transform Properties**

These are GPU-accelerated and performant:

- `x`, `y`, `z`
- `scale`, `scaleX`, `scaleY`
- `rotate`, `rotateX`, `rotateY`
- `opacity`

```typescript
// ✅ GOOD: GPU-accelerated
animate={{ x: 100, opacity: 0.5 }}

// ❌ BAD: Causes reflow
animate={{ marginLeft: 100 }}
```

### 2. **Use `will-change` for Complex Animations**

```typescript
<motion.div
  style={{ willChange: 'transform, opacity' }}
  animate={{ ... }}
>
```

### 3. **Avoid Animating During Scroll**

```typescript
// ❌ BAD: Can cause jank
<motion.div
  animate={{
    y: scrollY * 0.5  // Animates on every scroll event
  }}
/>

// ✅ GOOD: Use CSS for scroll-based animations
className="transform transition-transform"
style={{ transform: `translateY(${scrollY * 0.5}px)` }}
```

### 4. **Reduce Animation Complexity on Mobile**

```typescript
const isMobile = window.innerWidth < 768

<motion.div
  animate={{
    opacity: 1,
    ...(isMobile ? {} : { filter: 'blur(0px)' }) // Skip blur on mobile
  }}
/>
```

---

## Examples

### Example 1: Sidebar Mode Transition

```typescript
import { motion } from 'framer-motion'

export function Sidebar() {
  const { transparencyEnabled } = useTheme()

  return (
    <motion.aside
      initial={false}
      animate={{
        backgroundColor: transparencyEnabled
          ? 'rgba(255, 255, 255, 0.05)'
          : 'hsl(var(--background))'
      }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
    >
      {/* Content */}
    </motion.aside>
  )
}
```

### Example 2: Workspace Switcher

```typescript
import { motion, AnimatePresence } from 'framer-motion'

export function WorkspaceSelector({ workspace }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={workspace.id}
        initial={{ opacity: 0, filter: 'blur(4px)', x: -10 }}
        animate={{ opacity: 1, filter: 'blur(0px)', x: 0 }}
        exit={{ opacity: 0, filter: 'blur(4px)', x: 10 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          opacity: { duration: 0.2 },
          filter: { duration: 0.3 }
        }}
      >
        <WorkspaceBadge workspace={workspace} />
        <span>{workspace.name}</span>
      </motion.div>
    </AnimatePresence>
  )
}
```

### Example 3: Project List with Stagger

```typescript
import { motion, AnimatePresence } from 'framer-motion'

export function ProjectList({ projects }) {
  return (
    <AnimatePresence mode="wait">
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          initial={{ opacity: 0, filter: 'blur(4px)', y: -10 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, filter: 'blur(4px)', y: 10 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            delay: index * 0.03,
            opacity: { duration: 0.2 },
            filter: { duration: 0.3 }
          }}
        >
          <ProjectCard project={project} />
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
```

### Example 4: Loading States

```typescript
import { motion, AnimatePresence } from 'framer-motion'

export function ContentArea({ isLoading, error, data }) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.3 }}
        >
          <LoadingSpinner />
        </motion.div>
      ) : error ? (
        <motion.div
          key="error"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.3 }}
        >
          <ErrorMessage error={error} />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.3 }}
        >
          <Content data={data} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

---

## Animation Constants

For consistency across the app, consider defining animation constants:

```typescript
// src/lib/animation-constants.ts

export const ANIMATION = {
  // Durations
  DURATION: {
    INSTANT: 0.15,
    FAST: 0.2,
    NORMAL: 0.3,
    SLOW: 0.5,
  },

  // Spring configs
  SPRING: {
    SNAPPY: { type: 'spring', stiffness: 400, damping: 25 },
    SMOOTH: { type: 'spring', stiffness: 300, damping: 30 },
    GENTLE: { type: 'spring', stiffness: 200, damping: 30 },
  },

  // Easing curves
  EASE: {
    APPLE: [0.25, 0.1, 0.25, 1.0],
    MATERIAL: [0.4, 0.0, 0.2, 1.0],
    EXPO: [0.17, 0.67, 0.83, 0.67],
  },

  // Common transitions
  BLUR: {
    initial: { opacity: 0, filter: 'blur(4px)' },
    animate: { opacity: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, filter: 'blur(4px)' },
    transition: {
      opacity: { duration: 0.2 },
      filter: { duration: 0.3 }
    }
  },

  // Stagger delays
  STAGGER: {
    FAST: 0.03,
    NORMAL: 0.05,
    SLOW: 0.08,
  },
} as const

// Usage
import { ANIMATION } from '@/lib/animation-constants'

<motion.div
  {...ANIMATION.BLUR}
  transition={{
    ...ANIMATION.BLUR.transition,
    ...ANIMATION.SPRING.SMOOTH
  }}
/>
```

---

## Testing Animations

### Manual Testing Checklist

- [ ] Animations feel smooth at 60fps
- [ ] No janky or stuttering movement
- [ ] Timing feels consistent across similar elements
- [ ] No excessive or distracting motion
- [ ] Animations work on mobile devices
- [ ] Reduced motion preference is respected

### Respect User Preferences

```typescript
import { useReducedMotion } from 'framer-motion'

export function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={shouldReduceMotion ? false : { opacity: 1 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {/* Content */}
    </motion.div>
  )
}
```

---

## Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Apple Human Interface Guidelines - Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Material Design - Motion](https://m3.material.io/styles/motion)
- [Cubic Bezier Generator](https://cubic-bezier.com/)
- [Spring Animation Visualizer](https://www.react-spring.io/visualizer)

---

## Summary

**The Golden Rules:**

1. 🌫️ **Always combine blur with opacity** for depth
2. 🏃 **Use spring physics** for interactive elements
3. ⏱️ **Keep durations short** (0.2-0.5s max)
4. 🎭 **Stagger list items** for orchestrated reveals
5. ♿ **Respect reduced motion** preferences
6. ⚡ **Animate transforms**, not layout properties
7. 🎯 **Be purposeful** - every animation should serve UX

Remember: **Great animation is felt, not seen.** When done right, users won't explicitly notice the animations, but they'll feel the interface is polished, responsive, and delightful to use.

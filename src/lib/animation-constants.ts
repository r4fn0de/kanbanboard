// Animation constants following Apple-inspired design principles
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
    SNAPPY: { type: 'spring' as const, stiffness: 400, damping: 25 },
    SMOOTH: { type: 'spring' as const, stiffness: 300, damping: 30 },
    GENTLE: { type: 'spring' as const, stiffness: 200, damping: 30 },
  },

  // Easing curves
  EASE: {
    APPLE: [0.25, 0.1, 0.25, 1.0] as const,
    MATERIAL: [0.4, 0.0, 0.2, 1.0] as const,
    EXPO: [0.17, 0.67, 0.83, 0.67] as const,
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

  // Edit mode transition
  EDIT_MODE: {
    initial: { opacity: 0, filter: 'blur(4px)', y: -10 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
    exit: { opacity: 0, filter: 'blur(4px)', y: 10 },
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      opacity: { duration: 0.2 },
      filter: { duration: 0.3 }
    }
  },

  // View mode transition
  VIEW_MODE: {
    initial: { opacity: 0, filter: 'blur(4px)', y: 10 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
    exit: { opacity: 0, filter: 'blur(4px)', y: -10 },
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
      opacity: { duration: 0.2 },
      filter: { duration: 0.3 }
    }
  },

  // Button interactions
  BUTTON: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25
    }
  },

  // Color button interactions
  COLOR_BUTTON: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25
    }
  },

  // Stagger delays
  STAGGER: {
    FAST: 0.03,
    NORMAL: 0.05,
    SLOW: 0.08,
  },
} as const
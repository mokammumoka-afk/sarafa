import { motion } from 'framer-motion';

// Wraps page content so route changes get a soft fade+slide instead of an
// abrupt cut. Kept intentionally small/cheap (no AnimatePresence/exit
// animations across route changes, since React Router v7 + Suspense makes
// exit-animating outlets fiddly) — this still gives every page an entrance
// transition, which is what was actually missing.
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

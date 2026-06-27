import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Lightweight custom carousel (no extra dependency) — autoplays every 4.5s,
// pauses on hover/touch, and supports tap-to-open `link_url` per banner.
export default function BannerSlider({ banners }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(t);
  }, [banners.length, paused]);

  if (!banners.length) return null;
  const current = banners[index];

  const Slide = ({ banner }) => {
    const img = <img src={banner.image_url} alt={banner.title || ''} className="w-full h-36 object-cover rounded-2xl" />;
    return banner.link_url ? (
      <a href={banner.link_url} target="_blank" rel="noreferrer" className="block">{img}</a>
    ) : img;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="relative h-36 rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <Slide banner={current} />
          </motion.div>
        </AnimatePresence>
      </div>

      {banners.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIndex(i)}
              aria-label={`عرض الشريحة ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-accent-400' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function Preloader() {
  const preloaderVariants = {
    initial: { opacity: 1 },
    exit: { 
      opacity: 0, 
      transition: { duration: 0.8, ease: "easeInOut" } 
    },
  };

  const logoVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.6, 
        ease: "easeOut"
      } 
    },
  };
  
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
      initial="initial"
      exit="exit"
      variants={preloaderVariants}
    >
      <motion.div variants={logoVariants} initial="initial" animate="animate">
        {/* Simple loading indicator without the logo */}
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </motion.div>
    </motion.div>
  );
}


export function AppWithPreloader({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500); 
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading ? (
        <Preloader />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

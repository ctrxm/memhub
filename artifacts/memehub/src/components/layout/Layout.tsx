import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { motion, AnimatePresence } from "framer-motion";

export function Layout({ children, hideSidebar = false }: { children: ReactNode, hideSidebar?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-primary/30">
      <Navbar />
      
      <main className="flex-1 container mx-auto max-w-7xl px-4 py-6 flex gap-8 justify-center">
        <AnimatePresence mode="wait">
          <motion.div 
            className="flex-1 max-w-[640px] w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        
        {!hideSidebar && <Sidebar />}
      </main>
    </div>
  );
}

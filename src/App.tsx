import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Grid, LayoutGrid, ArrowUp, RefreshCw, AlertCircle, Search, Star, Zap, X } from 'lucide-react';

// --- Types ---
interface Episode {
  episode: number;
  title: string;
  imageUrls: string[];
  description?: string;
}

// --- Constants & Config ---
const APP_NAME = "Kilometres' WEBTOON";
const APP_ICON = "https://i.imghippo.com/files/yG6513BaA.jpg"; // USER: Replace with your actual icon URL
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx0mSpQT93qAojRBY_2gIVAf1JEQFRdnyM2bdysOQ9GhZc2ewk28i9k4WSlGO4f_hMNxw/exec"; 

const MOCK_DATA: Episode[] = [
  {
    episode: 1,
    title: "The Awakening",
    description: "In a world of shadows, one light begins to flicker. The journey of a thousand miles starts with a single step.",
    imageUrls: [
      "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1614850523592-7489623e1145?q=80&w=1000&auto=format&fit=crop",
    ]
  },
  {
    episode: 2,
    title: "Shadow Realm",
    description: "Deep within the abyss, secrets wait to be uncovered. But be careful—the void stares back.",
    imageUrls: [
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=1000&auto=format&fit=crop",
    ]
  },
  {
    episode: 3,
    title: "The Final Stand",
    description: "The horizon glows with the fire of battle. The end is near, but a new legend is born.",
    imageUrls: [
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop",
    ]
  }
];

export default function App() {
  const [view, setView] = useState<'home' | 'reader'>('home');
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState(DEFAULT_SCRIPT_URL);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then(() => setInstallPrompt(null));
  };
  
  // UI States
  const [searchQuery, setSearchQuery] = useState("");
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // --- Fetch Data ---
  const fetchData = useCallback(async (url: string) => {
    if (!url) {
      setEpisodes(MOCK_DATA.sort((a, b) => b.episode - a.episode));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch from Google Apps Script');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setEpisodes(data.sort((a: Episode, b: Episode) => b.episode - a.episode));
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Invalid data format received from API');
      }
    } catch (err) {
      console.error(err);
      setError("Using demo data. Hold 'N' logo for 5s to open API settings.");
      setEpisodes(MOCK_DATA.sort((a, b) => b.episode - a.episode));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(scriptUrl);
  }, [fetchData, scriptUrl]);

  // --- Derived State ---
  const featuredEpisode = useMemo(() => {
    if (episodes.length === 0) return null;
    return episodes[0]; // Newest first sorting
  }, [episodes]);

  const filteredEpisodes = useMemo(() => {
    return episodes.filter(ep => 
      ep.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ep.episode.toString() === searchQuery
    );
  }, [episodes, searchQuery]);

  // --- Long Press Logic ---
  const startLongPress = () => {
    const timer = setTimeout(() => {
      setShowApiSettings(true);
    }, 5000); 
    setLongPressTimer(timer);
  };

  const endLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // --- Handlers ---
  const openEpisode = (index: number) => {
    setCurrentEpisodeIndex(index);
    setView('reader');
    window.scrollTo(0, 0);
  };

  const nextEpisode = () => {
    if (currentEpisodeIndex > 0) { // Newest is at 0, so next (newer) is -1
      setCurrentEpisodeIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevEpisode = () => {
    if (currentEpisodeIndex < episodes.length - 1) {
      setCurrentEpisodeIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentEpisode = episodes[currentEpisodeIndex];

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500 selection:text-white">
      {/* App Initial Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-center p-6"
          >
            <motion.div 
              animate={{ 
                scale: [1, 1.05, 1],
              }} 
              transition={{ repeat: Infinity, duration: 3 }}
              className="relative w-32 h-32 mb-8 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)]"
            >
              <img 
                src={APP_ICON} 
                className="w-full h-full object-cover" 
                alt="App Icon"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tighter mb-2 italic">Kilometres' WEBTOON</h2>
            <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-8">Premium Originals</p>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-zinc-300">Please wait, baby! ❤️</h3>
              <p className="text-zinc-500 text-sm max-w-[200px] mx-auto">We are getting your library ready...</p>
              
              <div className="mt-8 w-48 h-1 bg-white/5 rounded-full overflow-hidden mx-auto relative border border-white/5">
                <motion.div 
                  animate={{ x: [-200, 200] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20 bg-white/5 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 md:px-8 shadow-2xl">
        <div 
          onMouseDown={startLongPress}
          onMouseUp={endLongPress}
          onMouseLeave={endLongPress}
          onTouchStart={startLongPress}
          onTouchEnd={endLongPress}
          onClick={() => setView('home')}
          className="flex items-center gap-2 md:gap-4 group cursor-pointer select-none"
          id="home-logo"
        >
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-indigo-500 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-indigo-500/20 group-active:scale-95 transition-transform overflow-hidden">
            <img 
              src={APP_ICON} 
              className="w-full h-full object-cover" 
              alt="Logo"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col items-start">
            <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white leading-none uppercase">Kilometres</h1>
            <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500">Premium Originals</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {installPrompt && (
            <button 
              onClick={handleInstall}
              className="hidden sm:flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white px-4 py-2 border border-indigo-500/30 rounded-full text-xs font-bold transition-all active:scale-95"
            >
              <Download className="w-3 h-3" />
              INSTALL APP
            </button>
          )}
          <div className="flex items-center gap-3 md:gap-6">
          {view === 'home' && (
            <div className="relative hidden md:block">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Find episodes..."
                className="bg-white/5 border border-white/5 rounded-full pl-10 pr-6 py-2 text-sm outline-none focus:border-white/20 transition-all w-64 text-zinc-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          {view === 'reader' && (
            <button 
              onClick={() => setView('home')}
              className="p-2 md:p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl md:rounded-2xl transition-all hover:scale-110 active:scale-95 group"
              id="grid-nav-btn"
            >
              <LayoutGrid size={18} className="text-zinc-400 group-hover:text-white transition-colors" />
            </button>
          )}
          {loading && (
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <RefreshCw size={16} className="animate-spin text-indigo-400" />
            </div>
          )}
        </div>
      </div>
    </header>

      {/* Main Content */}
      <main className="pt-24 md:pt-32 pb-12 px-4 md:px-6 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 md:space-y-12"
              id="home-view"
            >
              {/* Mobile Search Bar */}
              <div className="md:hidden relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Find episodes..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Hero Section: Newest Episode */}
              {!searchQuery && featuredEpisode && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => openEpisode(0)}
                  className="relative h-[300px] md:h-[450px] w-full rounded-[2rem] md:rounded-[3.5rem] overflow-hidden border border-white/10 group cursor-pointer shadow-2xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                  <img 
                    src={featuredEpisode.imageUrls[0]} 
                    alt={featuredEpisode.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
                  />
                  <div className="absolute bottom-0 left-0 p-6 md:p-12 z-20 max-w-2xl text-left">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1.5">
                        <Zap size={10} fill="currentColor" />
                        New Release
                      </span>
                      <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Ep. {featuredEpisode.episode}</span>
                    </div>
                    <h2 className="text-3xl md:text-6xl font-bold text-white tracking-tight mb-4 group-hover:translate-x-2 transition-transform duration-500">{featuredEpisode.title}</h2>
                    <p className="text-zinc-300 text-sm md:text-lg line-clamp-2 md:line-clamp-3 opacity-80 group-hover:opacity-100 transition-opacity">
                      {featuredEpisode.description || "The story continues as secrets are revealed. Don't miss this thrilling new chapter of our journey."}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Grid Header */}
              <header className="flex justify-between items-end">
                <div className="text-left">
                  <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                    {searchQuery ? "Search Results" : "Library"}
                  </h2>
                  <p className="text-zinc-500 mt-1 md:mt-2 uppercase text-[9px] md:text-xs tracking-[0.3em] font-medium">Digital Strip Collection</p>
                </div>
                <div className="hidden sm:flex items-center space-x-4">
                  <span className="text-sm text-zinc-500 font-medium tracking-tight">Sort: Newest</span>
                  <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                    <Grid size={20} className="text-zinc-300" />
                  </div>
                </div>
              </header>

              {error && (
                <div className="p-4 md:p-5 bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl md:rounded-3xl flex items-center gap-3 md:gap-4 text-indigo-200 text-xs md:text-sm shadow-xl">
                  <div className="p-2 bg-indigo-500/20 rounded-lg md:rounded-xl text-indigo-400">
                    <Star size={18} fill="currentColor" />
                  </div>
                  <span className="font-medium tracking-tight text-zinc-300">{error}</span>
                </div>
              )}

              {/* Episode Grid */}
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8" id="episodes-grid">
                {filteredEpisodes.map((ep) => (
                  <motion.div
                    key={ep.episode}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openEpisode(episodes.indexOf(ep))}
                    className="group cursor-pointer aspect-[3/4.5] relative overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-zinc-900 border border-white/10 shadow-2xl transition-all duration-300 md:duration-500"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"></div>
                    <img 
                      src={ep.imageUrls[0]} 
                      alt={ep.title}
                      className="w-full h-full object-cover opacity-80 md:opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 md:duration-1000 ease-out"
                    />
                    <div className="absolute bottom-0 left-0 p-3 md:p-8 z-20 w-full text-left">
                      <h3 className="text-sm md:text-3xl font-bold tracking-tight text-white group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform duration-300 md:duration-500 line-clamp-2 md:line-clamp-none leading-tight">{ep.title}</h3>
                      <p className="text-zinc-500 md:text-zinc-400 text-[9px] md:text-sm font-medium mt-0.5 md:mt-1 italic tracking-widest">EPISODE {ep.episode}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredEpisodes.length === 0 && (
                <div className="py-24 text-center space-y-4">
                  <div className="inline-flex p-6 rounded-full bg-white/5 border border-white/5 mb-4">
                    <Search size={48} className="text-zinc-700" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">No matches found</h3>
                  <p className="text-zinc-500 max-w-xs mx-auto">Try searching for a different title or chapter number.</p>
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="px-6 py-2 bg-indigo-500 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto -mx-4 md:mx-auto"
            >
              {/* Header Info */}
              <div className="mb-8 md:mb-16 text-center space-y-2 md:space-y-4 px-4 relative">
                <div className="absolute right-0 top-0">
                  <button 
                    onClick={() => {
                      episodes[currentEpisodeIndex].imageUrls.forEach((url, i) => {
                        window.open(url, '_blank');
                      });
                    }}
                    title="Download Chapter"
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-indigo-400 transition-all border border-white/5 hover:scale-110 active:scale-90"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-center gap-3">
                   <div className="h-[1px] w-8 md:w-12 bg-white/10"></div>
                   <span className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-bold text-indigo-400">Chapter {currentEpisode?.episode}</span>
                   <div className="h-[1px] w-8 md:w-12 bg-white/10"></div>
                </div>
                <h2 className="text-2xl md:text-5xl font-bold tracking-tight text-white italic leading-tight">{currentEpisode?.title}</h2>
              </div>

              {/* Vertical Strip Reader */}
              <div className="w-full bg-black md:bg-zinc-900 md:rounded-[3rem] md:border border-white/5 overflow-hidden shadow-2xl mb-8 md:mb-12 shadow-indigo-900/10">
                <div className="h-12 md:h-16 bg-black/40 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 md:px-8">
                  <span className="text-[9px] md:text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase">Strip Mode Active</span>
                  <div className="flex gap-1.5 md:gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500"></div>
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-indigo-500/30"></div>
                  </div>
                </div>
                
                <div className="flex flex-col w-full">
                  {currentEpisode?.imageUrls.map((url, i) => (
                    <motion.img 
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ duration: 0.6 }}
                      key={`${currentEpisode.episode}-${i}`}
                      src={url}
                      alt={`Panel ${i + 1}`}
                      className="w-full h-auto block"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>

              {/* Reader Navigation */}
              <div className="mt-8 md:mt-16 flex flex-col items-center gap-8 md:gap-12 pb-24 px-4">
                <div className="w-full max-w-sm p-1.5 md:p-2 bg-white/5 backdrop-blur-3xl rounded-[1.5rem] md:rounded-[2rem] border border-white/10 flex items-center justify-between gap-2 shadow-2xl">
                  <button
                    disabled={currentEpisodeIndex === episodes.length - 1}
                    onClick={prevEpisode}
                    className="p-4 md:p-6 rounded-2xl md:rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-5 disabled:cursor-not-allowed transition-all active:scale-90"
                    id="prev-btn"
                  >
                    <ChevronLeft size={20} className="text-white" />
                  </button>
                  
                  <div className="flex flex-col items-center px-2">
                    <span className="text-[8px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Progress</span>
                    <div className="text-sm md:text-xl font-bold tracking-tighter">
                      <span className="text-white">{episodes.length - currentEpisodeIndex}</span>
                      <span className="text-zinc-600 mx-1.5 md:mx-2">/</span>
                      <span className="text-zinc-400">{episodes.length}</span>
                    </div>
                  </div>

                  <button
                    disabled={currentEpisodeIndex === 0}
                    onClick={nextEpisode}
                    className="p-4 md:p-6 rounded-2xl md:rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-5 disabled:cursor-not-allowed transition-all active:scale-90"
                    id="next-btn"
                  >
                    <ChevronRight size={20} className="text-indigo-400" />
                  </button>
                </div>

                <div className="flex flex-col w-full max-w-sm gap-3">
                  <button 
                    onClick={() => setView('home')}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-3 text-sm tracking-tight shadow-xl"
                  >
                    <LayoutGrid size={18} />
                    Browse Library
                  </button>
                </div>
              </div>

              {/* Back to top FAB */}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed bottom-6 right-6 md:bottom-12 md:right-12 p-4 md:p-5 bg-indigo-600 md:bg-white/10 backdrop-blur-3xl border border-white/10 rounded-2xl md:rounded-3xl hover:bg-indigo-500 md:hover:bg-white/20 transition-all shadow-indigo-500/20 shadow-2xl hover:scale-110 active:scale-90 z-50 focus:outline-none"
              >
                <ArrowUp size={20} className="text-white" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Hidden Dev Footer Settings */}
      <AnimatePresence>
        {showApiSettings && (
          <motion.footer 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="py-16 md:py-32 border-t border-white/5 bg-black/80 backdrop-blur-3xl mt-12 px-6 relative z-40"
          >
            <button 
              onClick={() => setShowApiSettings(false)}
              className="absolute top-8 right-8 p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="max-w-4xl mx-auto flex flex-col items-center gap-8 md:gap-12">
              <div className="flex flex-col items-center gap-3 md:gap-4 text-center">
                <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-30 mb-2"></div>
                <span className="text-[9px] md:text-[11px] uppercase tracking-[0.4em] font-black text-indigo-400 italic">Developer Console</span>
                <p className="text-zinc-500 text-xs md:text-sm max-w-xs font-medium leading-relaxed">
                  Enter your GAS Web App URL to sync production data and connect your library.
                </p>
              </div>
              
              <div className="w-full max-w-md bg-white/5 backdrop-blur-md p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] border border-white/10 shadow-2xl">
                <label className="text-[9px] md:text-[10px] uppercase font-bold text-indigo-400 block mb-2 px-1 tracking-widest">Connect API (GAS)</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="https://script.google.com/..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm outline-none focus:border-indigo-500 transition-all pr-12 text-zinc-300 placeholder:text-zinc-700"
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600">
                    <RefreshCw size={16} />
                  </div>
                </div>
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}


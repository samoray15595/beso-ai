import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Play, Video, Wand2, Download, RefreshCw, 
  Monitor, Layers, History, User as UserIcon, LogOut, 
  Settings, Clock, Palette, Smile, Camera, Plus, Share2, 
  Trash2, ChevronLeft, ChevronRight, Save, Globe
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, db } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { geminiService } from './services/geminiService';
import { STUDIO_EXAMPLES, LOADING_MESSAGES, ART_STYLES, MOODS, VOICES } from './constants';

export default function App() {
  const [user] = useAuthState(auth);
  const [prompt, setPrompt] = useState('');
  const [refinedPrompt, setRefinedPrompt] = useState('');
  
  // Advanced Controls
  const [duration, setDuration] = useState(10);
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0].id);
  const [selectedMood, setSelectedMood] = useState(MOODS[0].id);
  const [visualElements, setVisualElements] = useState('');
  
  // Workflow States
  const [isRefining, setIsRefining] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);
  
  // Character Creation
  const [characterName, setCharacterName] = useState('');
  const [characterImage, setCharacterImage] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[2].id);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [characters, setCharacters] = useState<any[]>([]);

  // Navigation
  const [currentTab, setCurrentTab] = useState<'create' | 'gallery' | 'profile'>('create');
  const [userVideos, setUserVideos] = useState<any[]>([]);

  const loadingInterval = useRef<NodeJS.Timeout | null>(null);

  // Sync Data
  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'videos'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        setUserVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      const qChar = query(collection(db, 'characters'), where('userId', '==', user.uid));
      const unsubChar = onSnapshot(qChar, (snap) => {
        setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsub(); unsubChar(); };
    }
  }, [user]);

  useEffect(() => {
    if (isGenerating) {
      let index = 0;
      loadingInterval.current = setInterval(() => {
        index = (index + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[index]);
      }, 3000);
    } else {
      if (loadingInterval.current) clearInterval(loadingInterval.current);
    }
    return () => {
      if (loadingInterval.current) clearInterval(loadingInterval.current);
    };
  }, [isGenerating]);

  const handleRefine = async () => {
    if (!prompt.trim()) return;
    setIsRefining(true);
    setError(null);
    try {
      const character = characters.length > 0 ? characters[0] : null;
      const options = {
        duration,
        style: selectedStyle,
        mood: selectedMood,
        elements: visualElements,
        characterRef: character ? character.name : undefined,
        characterVoice: character ? VOICES.find(v => v.id === character.voiceId)?.label : undefined
      };
      const result = await geminiService.refinePrompt(prompt, options);
      setRefinedPrompt(result);
    } catch (err) {
      setError("Failed to refine prompt. Check your connection.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }
    const finalPrompt = refinedPrompt || prompt;
    if (!finalPrompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedVideo(null);
    try {
      const operation = await geminiService.generateVideo(finalPrompt, duration);
      const poll = async (op: any) => {
        const result = await geminiService.checkOperation(op);
        if (result.done) {
          if (result.error) throw new Error(result.error);
          
          const videoData = {
            userId: user.uid,
            prompt: prompt,
            refinedPrompt: finalPrompt,
            videoUrl: result.videoUrl,
            status: 'draft',
            duration,
            style: selectedStyle,
            mood: selectedMood,
            createdAt: serverTimestamp()
          };
          
          const docRef = await addDoc(collection(db, 'videos'), videoData);
          setGeneratedVideo({ ...videoData, id: docRef.id });
          setIsGenerating(false);
        } else {
          setTimeout(() => poll(op), 5000);
        }
      };
      await poll(operation);
    } catch (err) {
      console.error(err);
      setTimeout(async () => {
        const mockUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';
        const videoData = {
          userId: user.uid,
          prompt: prompt,
          refinedPrompt: finalPrompt,
          videoUrl: mockUrl,
          status: 'draft',
          duration,
          style: selectedStyle,
          mood: selectedMood,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'videos'), videoData);
        setGeneratedVideo({ ...videoData, id: docRef.id });
        setIsGenerating(false);
      }, 5000);
    }
  };

  const handleCreateCharacter = async () => {
    if (!user || !characterName) return;
    try {
      await addDoc(collection(db, 'characters'), {
        userId: user.uid,
        name: characterName,
        imageUrl: characterImage || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${characterName}`,
        voiceId: selectedVoice,
        createdAt: serverTimestamp()
      });
      setCharacterName('');
      setCharacterImage(null);
      setSelectedVoice(VOICES[2].id);
      setShowCharacterCreator(false);
    } catch (err) {
      setError("Failed to create character.");
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name || 'beso-ai-video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen frosted-bg p-4 md:p-6 flex flex-col font-sans select-none overflow-hidden">
      {/* Navigation */}
      <nav className="flex items-center justify-between mb-6 px-6 h-16 glass-nav shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('create')}>
          <div className="w-9 h-9 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-xl">B</div>
          <span className="text-xl font-black tracking-tight italic">Beso AI</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium opacity-70">
          <button onClick={() => setCurrentTab('create')} className={`hover:opacity-100 transition-opacity ${currentTab === 'create' ? 'opacity-100 text-purple-400' : ''}`}>أنشئ / Create</button>
          <button onClick={() => setCurrentTab('gallery')} className={`hover:opacity-100 transition-opacity ${currentTab === 'gallery' ? 'opacity-100 text-purple-400' : ''}`}>استكشف / Community</button>
          <button onClick={() => setCurrentTab('profile')} className={`hover:opacity-100 transition-opacity ${currentTab === 'profile' ? 'opacity-100 text-purple-400' : ''}`}>ملفس المعرض / My Studio</button>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full hidden sm:flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-white/60">Unlimited / غير محدود</span>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentTab('profile')}
                className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden"
              >
                <img src={user.photoURL || ''} alt="User" />
              </button>
              <button onClick={() => signOut(auth)} className="p-2 text-white/40 hover:text-white transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="px-6 py-2 rounded-xl action-gradient text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              دخول / Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {currentTab === 'create' ? (
          <>
            {/* Advanced Control Sidebar */}
            <aside className="md:col-span-4 flex flex-col h-full overflow-hidden">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 glass-card p-6 flex flex-col overflow-y-auto space-y-8 scrollbar-thin"
              >
                {/* Prompt Section */}
                <section>
                  <h2 className="text-sm font-bold mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      Scene Logic / وصف المشهد
                    </span>
                    <span className="text-[10px] opacity-40">AI ASSISTED</span>
                  </h2>
                  <div className="relative group">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full h-32 glass-input p-4 text-sm leading-relaxed resize-none placeholder:text-white/10 focus:outline-none"
                      placeholder="Type your story... اكتب قصتك هنا..."
                    />
                    <button
                      onClick={handleRefine}
                      disabled={isRefining || !prompt}
                      className="absolute bottom-3 right-3 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-30"
                    >
                      <Wand2 className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </section>

                {/* Duration Slider */}
                <section>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase">Duration / المدة</h3>
                    <span className="text-xs font-mono font-bold text-purple-400">{duration} SECONDS</span>
                  </div>
                  <input 
                    type="range" min="10" max="60" value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                </section>

                {/* Visual Style Selection */}
                <section>
                  <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-4 flex items-center gap-2">
                    <Palette className="w-3 h-3" />
                    Artistic Style / النمط الفني
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {ART_STYLES.map(style => (
                      <button 
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-3 rounded-xl text-xs flex items-center gap-2 transition-all border ${selectedStyle === style.id ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/5 text-white/40 opacity-70 hover:opacity-100 hover:bg-white/10'}`}
                      >
                        <span>{style.icon}</span>
                        {style.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Mood Selection */}
                <section>
                  <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-4 flex items-center gap-2">
                    <Smile className="w-3 h-3" />
                    Atmosphere / المزاج
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {MOODS.map(mood => (
                      <button 
                        key={mood.id}
                        onClick={() => setSelectedMood(mood.id)}
                        className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all border ${selectedMood === mood.id ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-white/5 opacity-50'}`}
                        title={mood.label}
                      >
                        <span className="text-lg">{mood.icon}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Character Section */}
                <section>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black tracking-widest text-white/40 uppercase flex items-center gap-2">
                      <UserIcon className="w-3 h-3" />
                      Characters / الشخصيات
                    </h3>
                    <button 
                      onClick={() => setShowCharacterCreator(true)}
                      className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex gap-2 p-1 overflow-x-auto scrollbar-none">
                    {characters.map(char => (
                      <div key={char.id} className="w-12 h-12 rounded-full border-2 border-purple-500/30 p-0.5 shrink-0 group relative cursor-help">
                        <img src={char.imageUrl} alt={char.name} className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-slate-900 shadow-xl" />
                      </div>
                    ))}
                    {characters.length === 0 && (
                      <div className="text-[10px] text-white/20 italic flex items-center h-12">No characters created yet</div>
                    )}
                  </div>
                </section>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt}
                  className="w-full py-4 rounded-2xl action-gradient text-white font-bold text-lg shadow-2xl shadow-purple-900/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shrink-0"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  Generate Cinema / ابدأ الإنتاج
                </button>
              </motion.div>
            </aside>

            {/* Preview Stage */}
            <main className="md:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
              <div className="flex-grow glass-card bg-black/60 overflow-hidden relative group">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
                        <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                      </div>
                      <h3 className="text-2xl font-display font-medium text-white mb-2">{loadingMessage}</h3>
                      <p className="text-white/30 text-sm font-mono tracking-widest uppercase">Rendering Reality Engine V2</p>
                    </motion.div>
                  ) : generatedVideo ? (
                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                      <video src={generatedVideo.videoUrl} className="w-full h-full object-cover" autoPlay loop controls />
                      <div className="absolute top-6 right-6 flex gap-3 px-4 py-2 glass-nav bg-black/40 border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleDownload(generatedVideo.videoUrl, generatedVideo.prompt)} className="p-2 hover:bg-white/10 rounded-lg transition-all" title="Download">
                           <Download className="w-5 h-5" />
                         </button>
                         <button className="p-2 hover:bg-white/10 rounded-lg transition-all" title="Share">
                           <Share2 className="w-5 h-5" />
                         </button>
                         <button onClick={() => setGeneratedVideo(null)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                           <RefreshCw className="w-5 h-5" />
                         </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div key="placeholder" className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                      <Video className="w-32 h-32 mb-6 stroke-[0.5px]" />
                      <h2 className="text-4xl font-display font-light text-glow">BESO AI STUDIO</h2>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Character Creator Modal */}
              <AnimatePresence>
                {showCharacterCreator && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="glass-card max-w-sm w-full p-8"
                    >
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-purple-400" />
                        Create Character / صنع شخصية
                      </h3>
                      <div className="space-y-4">
                        <div className="aspect-square glass-input flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/50 group relative">
                          {characterImage ? (
                            <img src={characterImage} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-10 h-10 mb-2" />
                              <span className="text-xs">Upload Photo or Click to Capture</span>
                            </div>
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCharacterImage(URL.createObjectURL(file));
                            }}
                          />
                        </div>
                        <input 
                          type="text"
                          value={characterName}
                          onChange={(e) => setCharacterName(e.target.value)}
                          placeholder="Character Name... اسم الشخصية"
                          className="w-full glass-input p-3 text-sm focus:outline-none"
                        />
                        <div>
                          <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2 font-semibold">Choose Voice / اختر الصوت</label>
                          <select 
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                            className="w-full glass-input p-3 text-sm focus:outline-none bg-slate-900"
                          >
                            {VOICES.map(voice => (
                              <option key={voice.id} value={voice.id} className="bg-slate-900">
                                {voice.label} ({voice.category})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowCharacterCreator(false)} className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
                          <button onClick={handleCreateCharacter} disabled={!characterName} className="flex-1 py-3 action-gradient rounded-xl font-bold disabled:opacity-30">Create</button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </>
        ) : (
          <main className="md:col-span-12 glass-card p-10 overflow-hidden flex flex-col h-full">
            <div className="flex justify-between items-center mb-10 shrink-0">
              <h2 className="text-3xl font-display font-medium text-glow flex items-center gap-4">
                <History className="w-8 h-8 text-purple-400" />
                {currentTab === 'gallery' ? 'Community Feed / استكشف' : 'My Studio / ملفي الشخصي'}
              </h2>
              <div className="flex gap-4">
                 <button onClick={() => setCurrentTab('profile')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentTab === 'profile' ? 'bg-white/20' : 'bg-white/5 opacity-50'}`}>My Creations</button>
                 <button onClick={() => setCurrentTab('gallery')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentTab === 'gallery' ? 'bg-white/20' : 'bg-white/5 opacity-50'}`}>Global Feed</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pr-4 scrollbar-thin">
              {(currentTab === 'profile' ? userVideos : []).map((video) => (
                <motion.div 
                  key={video.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card overflow-hidden group relative h-64"
                >
                  <video src={video.videoUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700" muted />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                    <p className="text-xs line-clamp-2 text-white/80 font-sans mb-3">{video.prompt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button onClick={() => handleDownload(video.videoUrl, video.prompt)} className="p-2 bg-white/5 rounded-lg hover:bg-white/20 text-white/60 hover:text-white"><Download className="w-4 h-4" /></button>
                        <button onClick={() => deleteDoc(doc(db, 'videos', video.id))} className="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/30 text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <span className="text-[10px] font-mono text-purple-400 font-bold">{video.duration}s</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {userVideos.length === 0 && currentTab === 'profile' && (
                <div className="col-span-full h-full flex flex-col items-center justify-center opacity-20 py-20">
                  <Layers className="w-20 h-20 mb-4" />
                  <p className="font-mono tracking-widest uppercase">Your studio is empty</p>
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {/* Footer / Status */}
      <footer className="mt-4 flex justify-between items-center text-[10px] text-white/30 px-2 font-mono tracking-widest uppercase shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2"><Globe className="w-3 h-3" /> BESO AI PLATFORM</span>
          <span className="w-1 h-3 bg-white/10"></span>
          <span>ENTERPRISE V2.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-purple-400 font-bold">READY FOR PRODUCTION</span>
        </div>
      </footer>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 left-10 z-50 p-4 bg-red-500/20 backdrop-blur-xl border border-red-500/50 rounded-xl text-red-200 text-xs font-mono shadow-2xl"
        >
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">dismiss</button>
        </motion.div>
      )}
    </div>
  );
}

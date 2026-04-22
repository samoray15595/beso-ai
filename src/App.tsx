import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Play, Video, Wand2, Download, RefreshCw, 
  Monitor, Layers, History, User as UserIcon, LogOut, 
  Settings, Clock, Palette, Smile, Camera, Plus, Share2, 
  Trash2, ChevronLeft, ChevronRight, Save, Globe, 
  Search, Compass, LayoutGrid, AlertTriangle, ShieldCheck,
  Volume2, Heart, MessageCircle, MoreVertical, Repeat,
  Mail, Lock, Chrome, Bell, Send
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  auth, signInWithGoogle, db, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile 
} from './lib/firebase';
import { signOut } from 'firebase/auth';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, 
  doc, updateDoc, deleteDoc, serverTimestamp, setDoc, getDocFromServer 
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
  const [selectedVoice, setSelectedVoice] = useState(VOICES && VOICES.length > 0 ? VOICES[0].id : '');
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [characters, setCharacters] = useState<any[]>([]);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [repostedVideos, setRepostedVideos] = useState<Set<string>>(new Set());
  const [showCommentsFor, setShowCommentsFor] = useState<string | null>(null);
  const [sharingVideoId, setSharingVideoId] = useState<string | null>(null);

  // Auth States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Generation Modes
  const [genMode, setGenMode] = useState<'text' | 'image' | 'character'>('text');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState<string | null>(null);

  const toggleLike = (id: string) => {
    setLikedVideos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRepost = (id: string) => {
    setRepostedVideos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = (id: string) => {
    setSharingVideoId(id);
    const videoUrl = `${window.location.origin}/?video=${id}`;
    navigator.clipboard.writeText(videoUrl).catch(() => {});
    setTimeout(() => setSharingVideoId(null), 2000);
  };
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await updateProfile(userCred.user, { displayName: authName });
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // Safety wrapper
  if (!VOICES || !ART_STYLES || !MOODS) {
    return <div className="h-screen w-screen bg-[#0f172a] text-white flex items-center justify-center">Loading Studio Constants...</div>;
  }

  // Navigation
  const [currentTab, setCurrentTab] = useState<'create' | 'gallery' | 'profile' | 'search' | 'admin' | 'inbox' | 'chat'>('gallery');
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [globalVideos, setGlobalVideos] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]); // For Admin
  const [userChats, setUserChats] = useState<any[]>([]);
  const [currentChatMessages, setCurrentChatMessages] = useState<any[]>([]);
  const [selectedChatPartner, setSelectedChatPartner] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const [commentText, setCommentText] = useState('');
  const [currentComments, setCurrentComments] = useState<any[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  const ADMIN_EMAIL = 'ibtisam.deeb95@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [profileSubTab, setProfileSubTab] = useState<'videos' | 'characters' | 'liked'>('videos');

  const loadingInterval = useRef<NodeJS.Timeout | null>(null);

  // Sync Data
  useEffect(() => {
    if (user) {
      // Inbox Sync
      const qChats = query(
        collection(db, 'chats'), 
        where('participants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      );
      const unsubChats = onSnapshot(qChats, (snap) => {
        setUserChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => unsubChats();
    }
  }, [user]);

  useEffect(() => {
    if (user && currentTab === 'chat' && lastChatIdRef.current) {
      const qMessages = query(
        collection(db, 'messages'),
        where('chatId', '==', lastChatIdRef.current),
        orderBy('createdAt', 'asc')
      );
      const unsubMsg = onSnapshot(qMessages, (snap) => {
        setCurrentChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubMsg();
    }
  }, [user, currentTab]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    }
  }, [user]);

  const addNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to add notification:", e);
    }
  };

  const lastChatIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      // User Profile Sync
      const userRef = doc(db, 'users', user.uid);
      const unsubProfile = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserProfile(data);
          setNewUsername(data.username || '');
          setNewDisplayName(data.displayName || '');
        } else {
          // Setup default user profile using setDoc (safe creation)
          import('firebase/firestore').then(({ setDoc }) => {
            const numericId = Math.floor(100000 + Math.random() * 900000).toString();
            setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'User',
              photoURL: user.photoURL,
              username: numericId,
              createdAt: serverTimestamp()
            });
          });
        }
      });

      const q = query(collection(db, 'videos'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        setUserVideos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      const qChar = query(collection(db, 'characters'), where('userId', '==', user.uid));
      const unsubChar = onSnapshot(qChar, (snap) => {
        setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsubProfile(); unsub(); unsubChar(); };
    }
  }, [user]);

  useEffect(() => {
    if (showCommentsFor) {
      const q = query(
        collection(db, 'comments'), 
        where('videoId', '==', showCommentsFor),
        orderBy('createdAt', 'desc')
      );
      const unsub = onSnapshot(q, (snap) => {
        setCurrentComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    } else {
      setCurrentComments([]);
    }
  }, [showCommentsFor]);

  // Search Logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const cleanQuery = searchQuery.replace('@', '').trim().toLowerCase();
    const q = query(
      collection(db, 'users'), 
      where('username', '>=', cleanQuery),
      where('username', '<=', cleanQuery + '\uf8ff')
    );
    
    const unsubSearch = onSnapshot(q, (snap) => {
      setSearchResults(snap.docs.map(d => d.data()));
    });
    
    return () => unsubSearch();
  }, [searchQuery]);

  useEffect(() => {
    if (user && isAdmin) {
      const qAll = query(collection(db, 'users'));
      const unsubAll = onSnapshot(qAll, (snap) => {
        setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsubAll();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    // Global Videos Sync
    const qGlobal = query(collection(db, 'videos'), where('status', '==', 'published'), orderBy('createdAt', 'desc'));
    const unsubGlobal = onSnapshot(qGlobal, (snap) => {
      const videos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (videos.length === 0) {
        setGlobalVideos([{
          id: 'sample-video',
          userId: 'BesoAI',
          creatorName: 'Beso AI',
          videoUrl: 'https://l.top4top.io/m_37642qbrg9.mp4',
          prompt: 'Welcome to Beso AI Studio Reality! Create your own cinematic stories for free. / أهلاً بك في بيسو! اصنع قصصك السينمائية الخاصة مجاناً الآن.',
          status: 'published',
          createdAt: new Date()
        }]);
      } else {
        setGlobalVideos(videos);
      }
    });
    return () => unsubGlobal();
  }, []);

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
      setShowAuthModal(true);
      return;
    }
    const rawPrompt = refinedPrompt || prompt;
    if (!rawPrompt.trim()) return;

    // Detect Character Mentions (@Name)
    let characterContext = "";
    const mentionMatch = rawPrompt.match(/@(\w+)/);
    if (mentionMatch) {
      const charName = mentionMatch[1];
      const char = characters.find(c => c.name.toLowerCase() === charName.toLowerCase());
      if (char) {
        characterContext = `Character Reference: ${char.name}. Description/Reference: ${char.imageUrl}`;
      }
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideo(null);

    // Advanced Safety Check with Gemini
    try {
      const moderationResponse = await geminiService.generateText(
        `System: AI Safety Filter. SAFE or BANNED. Rule: No sexual content. 
         Prompt: "${rawPrompt}"`
      );
      
      if (moderationResponse.includes('BANNED')) {
        setError(`Policy Violation Detected. / مخالفة لسياسات المحتوى.`);
        setIsGenerating(false);
        return;
      }
    } catch (e) {
      console.warn("Safety AI filter skipped.");
    }

    try {
      // Use refined prompt if available, else use original + character context
      const generationPrompt = characterContext ? `${rawPrompt}. [Context: ${characterContext}]` : rawPrompt;
      const operation = await geminiService.generateVideo(generationPrompt, duration, genMode === 'image' ? refImage || undefined : undefined);
      
      const poll = async (op: any) => {
        const result = await geminiService.checkOperation(op);
        if (result.done) {
          if (result.error) throw new Error(result.error);
          
          const videoData = {
            userId: user.uid,
            prompt: prompt,
            refinedPrompt: rawPrompt,
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
          addNotification(user.uid, 'فيديو جديد جاهز!', 'تم الانتهاء من توليد الفيديو الخاص بك بنجاح.', 'success');
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
          refinedPrompt: rawPrompt,
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
        addNotification(user.uid, 'فشل في الإنتاج الحقيقي', 'نعتذر، تم استخدام فيديو تجريبي بسبب ضغط الخوادم.', 'info');
      }, 5000);
    }
  };

  const handleCreateCharacter = async () => {
    if (!user || !characterName) return;
    try {
      if (editingCharacterId) {
        await updateDoc(doc(db, 'characters', editingCharacterId), {
          name: characterName,
          imageUrl: characterImage || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${characterName}`,
          voiceId: selectedVoice,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'characters'), {
          userId: user.uid,
          name: characterName,
          imageUrl: characterImage || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${characterName}`,
          voiceId: selectedVoice,
          createdAt: serverTimestamp()
        });
      }
      setCharacterName('');
      setCharacterImage(null);
      setSelectedVoice(VOICES[2].id);
      setEditingCharacterId(null);
      setShowCharacterCreator(false);
    } catch (err) {
      setError("Failed to process character.");
    }
  };

  const startEditCharacter = (char: any) => {
    setEditingCharacterId(char.id);
    setCharacterName(char.name);
    setCharacterImage(char.imageUrl);
    setSelectedVoice(char.voiceId);
    setShowCharacterCreator(true);
  };

  const handleUpdateDisplayName = async () => {
    if (!user || !newDisplayName.trim()) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: newDisplayName.trim()
      });
      setIsEditingDisplayName(false);
    } catch (err) {
      setError("Failed to update name.");
    }
  };

  const handleUpdateUsername = async () => {
    if (!user || !newUsername.trim()) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        username: newUsername.trim().toLowerCase()
      });
      setIsEditingUsername(false);
    } catch (err) {
      setError("Failed to update username.");
    }
  };

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        banned: isBanned
      });
    } catch (err) {
      setError("Admin action failed.");
    }
  };

  const startChat = async (partner: any) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setError(null);
    try {
      // Check if chat exists
      const chatId = [user.uid, partner.uid].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const chatSnap = await getDocFromServer(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, partner.uid],
          updatedAt: serverTimestamp(),
          lastMessage: ''
        });
      }

      lastChatIdRef.current = chatId;
      setSelectedChatPartner(partner);
      setCurrentTab('chat');
    } catch (err) {
      setError("Failed to start chat.");
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !user || !lastChatIdRef.current) return;
    const msgTerm = chatInput;
    setChatInput('');
    try {
      await addDoc(collection(db, 'messages'), {
        chatId: lastChatIdRef.current,
        senderId: user.uid,
        text: msgTerm,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'chats', lastChatIdRef.current), {
        lastMessage: msgTerm,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      setError("Failed to send message.");
    }
  };

  const playVoicePreview = (voiceId: string) => {
    const voice = VOICES.find(v => v.id === voiceId);
    if (!voice) return;

    setIsPlayingVoice(voiceId);
    
    // Check for explicit preview URL
    if (voice.previewUrl) {
      const audio = new Audio(voice.previewUrl);
      audio.onended = () => setIsPlayingVoice(null);
      audio.onerror = () => setIsPlayingVoice(null);
      audio.play().catch(() => setIsPlayingVoice(null));
      return;
    }

    // Fallback to Browser Speech Synthesis
    const utterance = new SpeechSynthesisUtterance("أهلاً بك في بيسو آي. أنا صوتك المختار للقصة.");
    utterance.lang = voice.category === 'Arabic' ? 'ar-SA' : 'en-US';
    utterance.onend = () => setIsPlayingVoice(null);
    utterance.onerror = () => setIsPlayingVoice(null);
    speechSynthesis.speak(utterance);
  };

  const handlePublish = async (videoId: string) => {
    try {
      await updateDoc(doc(db, 'videos', videoId), {
        status: 'published'
      });
    } catch (err) {
      setError("Failed to publish video.");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !showCommentsFor || !commentText.trim()) return;
    
    // Find the video and its owner to notify them
    const video = globalVideos.find(v => v.id === showCommentsFor);
    let replyToName = '';
    
    if (replyTo) {
      const parentComment = currentComments.find(c => c.id === replyTo);
      if (parentComment) {
        replyToName = parentComment.userName;
        // Notify the person being replied to
        if (parentComment.userId !== user.uid) {
          addNotification(
            parentComment.userId, 
            'رد جديد على تعليقك', 
            `قام @${userProfile?.displayName || 'مستخدم'} بالرد على تعليقك.`, 
            'info'
          );
        }
      }
    }

    const processedText = commentText.replace(`رد على @${replyToName} `, '').trim();
    if (!processedText) {
      setError("الرجاء كتابة نص للتعليق.");
      return;
    }

    try {
      console.log("Attempting to post comment for video:", showCommentsFor);
      await addDoc(collection(db, 'comments'), {
        videoId: showCommentsFor,
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || 'User',
        userPic: user.photoURL || null,
        text: processedText,
        replyToId: replyTo || null,
        replyToName: replyToName || null,
        createdAt: serverTimestamp()
      });
      console.log("Comment posted successfully!");

      // Notify video owner
      if (video && video.userId !== user.uid) {
        addNotification(
          video.userId, 
          'تعليق جديد على فيديوك', 
          `علق @${userProfile?.displayName || 'مستخدم'} على فيديوك: "${commentText.substring(0, 30)}..."`, 
          'info'
        );
      }

      setCommentText('');
      setReplyTo(null);
    } catch (err) {
      setError("Failed to post comment.");
    }
  };

  if (userProfile?.banned) {
    return (
      <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
          <ShieldCheck className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-black mb-4">ACCESS DENIED / تم حظر الحساب</h1>
        <p className="text-white/40 max-w-md">
          Your account has been suspended for violating our community guidelines. Contact support if you believe this is an error.
          <br /><br />
          لقد تم تعليق حسابك لمخالفة قوانين المنصة. يرجى التواصل مع الدعم إذا كنت تعتقد أن هذا خطأ.
        </p>
        <button onClick={() => signOut(auth)} className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-xl">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 frosted-bg flex flex-col font-sans select-none overflow-hidden safe-area-inset">
      {/* Top Banner (Hidden on mobile to save space) */}
      <div className="hidden md:flex flex-col items-center mb-4 pt-4">
        <h1 className="text-xl font-bold tracking-widest text-purple-400 font-display flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          تصميم فيديوهات بالذكاء الاصطناعي
          <Sparkles className="w-5 h-5" />
        </h1>
        <p className="text-[10px] text-white/20 tracking-widest uppercase mt-1">Free Unlimited AI Content Production</p>
      </div>

      {/* Navigation (Compact on mobile) */}
      <nav className="flex items-center justify-between px-4 md:px-6 h-16 md:h-20 glass-nav shrink-0 relative overflow-hidden md:mx-6 md:rounded-3xl md:mt-4">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-500/20 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex items-center gap-4 cursor-pointer group relative z-10" onClick={() => setCurrentTab('create')}>
          <div className="relative">
            <div className="w-11 h-11 bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform duration-500 shadow-2xl">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-inner shadow-white/20">
                B
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse border-2 border-slate-900" />
          </div>
          
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-black tracking-tighter text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-400 transition-all duration-500">
              BESO <span className="text-purple-500 italic">AI</span>
            </span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase pl-0.5">Studio Reality</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium opacity-70">
          <button onClick={() => setCurrentTab('create')} className={`hover:opacity-100 transition-opacity ${currentTab === 'create' ? 'opacity-100 text-purple-400' : ''}`}>أنشئ / Create</button>
          <button onClick={() => setCurrentTab('gallery')} className={`hover:opacity-100 transition-opacity ${currentTab === 'gallery' ? 'opacity-100 text-purple-400' : ''}`}>استكشف / Community</button>
          <button onClick={() => setCurrentTab('profile')} className={`hover:opacity-100 transition-opacity ${currentTab === 'profile' ? 'opacity-100 text-purple-400' : ''}`}>ملفس المعرض / My Studio</button>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <button 
              onClick={() => setCurrentTab('admin')}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${currentTab === 'admin' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/10 text-white/40'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold">ADMIN PANEL</span>
            </button>
          )}
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full hidden sm:flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-white/60">Unlimited / غير محدود</span>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 bg-white/5 rounded-full border border-white/10 text-white/60 hover:text-white transition-all relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 mt-4 w-72 max-h-[400px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[300] overflow-hidden flex flex-col"
                    >
                      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <span className="text-[10px] font-black tracking-widest uppercase">Notifications / الإشعارات</span>
                        {notifications.length > 0 && (
                          <button 
                            onClick={async () => {
                              for(const n of notifications.filter(n => !n.read)) {
                                await updateDoc(doc(db, 'notifications', n.id), { read: true });
                              }
                            }}
                            className="text-[9px] text-purple-400 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto scrollbar-none flex-1">
                        {notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={async () => {
                              if(!n.read) await updateDoc(doc(db, 'notifications', n.id), { read: true });
                            }}
                            className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${n.read ? 'opacity-50' : 'bg-purple-500/5'}`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold ${n.type === 'success' ? 'text-green-400' : n.type === 'error' ? 'text-red-400' : 'text-purple-400'}`}>
                                {n.title}
                              </span>
                              <span className="text-[8px] text-white/20">
                                {n.createdAt?.toDate ? new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(n.createdAt.toDate()) : '...'}
                              </span>
                            </div>
                            <p className="text-xs text-white/60 leading-tight">{n.message}</p>
                          </div>
                        ))}
                        {notifications.length === 0 && (
                          <div className="p-8 text-center opacity-20">
                            <Bell className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Quiet here...</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

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
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-2 rounded-xl action-gradient text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              دخول / Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-6 flex-1 overflow-hidden md:p-6">
        {currentTab === 'create' ? (
          <>
            {/* Advanced Control Sidebar */}
            <aside className="md:col-span-4 flex flex-col h-full overflow-hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 glass-card p-6 flex flex-col overflow-y-auto space-y-8 scrollbar-thin"
              >
                {/* Prompt Section */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      Scene Logic / وصف المشهد
                    </h2>
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 shrink-0">
                      {[
                        { id: 'text', icon: <Video className="w-3 h-3" /> },
                        { id: 'image', icon: <Camera className="w-3 h-3" /> },
                        { id: 'character', icon: <UserIcon className="w-3 h-3" /> }
                      ].map(mode => (
                        <button 
                          key={mode.id}
                          onClick={() => setGenMode(mode.id as any)}
                          className={`p-1.5 rounded-md transition-all ${genMode === mode.id ? 'bg-purple-500 text-white shadow-lg' : 'text-white/30 hover:text-white/60'}`}
                          title={`Mode: ${mode.id}`}
                        >
                          {mode.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {genMode === 'image' && (
                    <div className="mb-4">
                      <label className="block w-full aspect-video glass-card border-dashed border-2 border-white/10 hover:border-purple-500/50 cursor-pointer overflow-hidden transition-all group">
                         {refImage ? (
                           <img src={refImage} className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center opacity-30 group-hover:opacity-60">
                             <Camera className="w-8 h-8 mb-2" />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Select Reference Image</span>
                           </div>
                         )}
                         <input 
                           type="file" accept="image/*" className="hidden"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const reader = new FileReader();
                               reader.onloadend = () => setRefImage(reader.result as string);
                               reader.readAsDataURL(file);
                             }
                           }}
                         />
                      </label>
                    </div>
                  )}

                  {genMode === 'character' && (
                    <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <p className="text-[9px] font-bold text-purple-300 leading-relaxed uppercase tracking-tighter">
                        Tip: Mention characters by typing <span className="text-white">@Name</span> in your prompt to use their face and style.
                      </p>
                    </div>
                  )}

                  <div className="relative group">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full h-32 glass-input p-4 text-sm leading-relaxed resize-none placeholder:text-white/10 focus:outline-none"
                      placeholder={genMode === 'character' ? "A shot of @YourCharacter walking in snow..." : "Type your story... اكتب قصتك هنا..."}
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
                    <span className="text-xs font-mono font-bold text-purple-400 uppercase">{duration} SECONDS</span>
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
                      <div 
                        key={char.id} 
                        className="w-12 h-12 rounded-full border-2 border-purple-500/30 p-0.5 shrink-0 group relative cursor-pointer"
                        onClick={() => setPrompt(prev => prev + ` @${char.name} `)}
                      >
                        <img src={char.imageUrl} alt={char.name} className="w-full h-full rounded-full object-cover" />
                        <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-slate-900 shadow-xl" />
                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <div className="bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 whitespace-nowrap shadow-2xl">
                            @{char.name}
                          </div>
                        </div>
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
                  Generate Movie / ابدأ الإنتاج
                </button>
              </motion.div>
            </aside>

            {/* Preview Stage */}
            <main className="md:col-span-8 flex flex-col gap-6 h-full overflow-hidden md:rounded-3xl">
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
                      <p className="text-white/30 text-sm font-mono tracking-widest uppercase">Beso Reality Engine V2</p>
                    </motion.div>
                  ) : generatedVideo ? (
                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                      <video src={generatedVideo.videoUrl} className="w-full h-full object-contain bg-black" autoPlay loop controls />
                      <div className="absolute top-6 right-6 flex gap-3 px-4 py-2 glass-nav bg-black/40 border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handlePublish(generatedVideo.id)} className="p-2 hover:bg-white/10 rounded-lg transition-all text-purple-400" title="Publish">
                            <Share2 className="w-5 h-5" />
                         </button>
                         <button onClick={() => handleDownload(generatedVideo.videoUrl, generatedVideo.prompt)} className="p-2 hover:bg-white/10 rounded-lg transition-all" title="Download">
                           <Download className="w-5 h-5" />
                         </button>
                         <button onClick={() => setGeneratedVideo(null)} className="p-2 hover:bg-white/10 rounded-lg transition-all">
                           <RefreshCw className="w-5 h-5" />
                         </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div key="placeholder" className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                      <Video className="w-32 h-32 mb-6 stroke-[0.5px]" />
                      <h2 className="text-4xl font-display font-light tracking-[0.3em] overflow-hidden">
                        BESO AI
                      </h2>
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
                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      className="glass-card max-w-sm w-full p-8"
                    >
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-purple-400" />
                        {editingCharacterId ? 'Edit Character / تعديل شخصية' : 'Create Character / صنع شخصية'}
                      </h3>
                      <div className="space-y-4">
                        <div className="aspect-square glass-input flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-500/50 group relative">
                          {characterImage ? (
                            <img src={characterImage} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-10 h-10 mb-2" />
                              <span className="text-xs">Upload Photo</span>
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
                          <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-2 font-semibold">Voice / الصوت</label>
                          <div className="flex gap-2">
                            <select 
                              value={selectedVoice}
                              onChange={(e) => setSelectedVoice(e.target.value)}
                              className="flex-1 glass-input p-3 text-sm focus:outline-none bg-slate-900"
                            >
                              {VOICES.map(voice => (
                                <option key={voice.id} value={voice.id} className="bg-slate-900">
                                  {voice.label}
                                </option>
                              ))}
                            </select>
                            <button 
                              onClick={() => playVoicePreview(selectedVoice)}
                              disabled={isPlayingVoice !== null}
                              className={`p-3 rounded-xl transition-all border ${isPlayingVoice === selectedVoice ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/40'}`}
                              title="Listen Preview / استمع للتجربة"
                            >
                              {isPlayingVoice === selectedVoice ? (
                                <div className="flex gap-0.5 items-center">
                                  <div className="w-0.5 h-3 bg-current animate-bounce" />
                                  <div className="w-0.5 h-5 bg-current animate-bounce [animation-delay:0.1s]" />
                                  <div className="w-0.5 h-3 bg-current animate-bounce [animation-delay:0.2s]" />
                                </div>
                              ) : (
                                <Volume2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button onClick={() => {
                            setShowCharacterCreator(false);
                            setEditingCharacterId(null);
                            setCharacterName('');
                            setCharacterImage(null);
                          }} className="flex-1 py-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">Cancel</button>
                          <button onClick={handleCreateCharacter} disabled={!characterName} className="flex-1 py-3 action-gradient rounded-xl font-bold disabled:opacity-30">
                            {editingCharacterId ? 'Update' : 'Create'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </>
        ) : currentTab === 'gallery' ? (
          <main className="md:col-span-12 h-full relative overflow-hidden bg-black md:rounded-3xl">
            <div className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none">
              {globalVideos.map((video) => (
                <div key={video.id} className="h-full w-full snap-start snap-always relative flex items-center justify-center">
                  <video 
                    src={video.videoUrl} 
                    className="h-full w-full object-contain" 
                    autoPlay 
                    loop 
                    muted 
                  />

                  {/* Watermark */}
                  <div className="absolute top-6 right-6 z-30 pointer-events-none flex flex-col items-end group-hover:scale-110 transition-transform">
                    <div className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10">
                      <span className="text-white/90 font-black text-lg tracking-tighter drop-shadow-lg flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        Beso AI
                      </span>
                    </div>
                  </div>
                  
                  {/* Overlay Controls */}
                  <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-20">
                    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => toggleLike(video.id)}>
                      <div className={`w-11 h-11 backdrop-blur-md rounded-full flex items-center justify-center border transition-all ${likedVideos.has(video.id) ? 'bg-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10 border-white/20 group-hover:bg-red-500/80 group-hover:border-red-500/50'}`}>
                        <Heart className={`w-5 h-5 ${likedVideos.has(video.id) ? 'fill-white text-white' : 'text-white'}`} />
                      </div>
                      <span className={`text-[10px] font-bold drop-shadow-md transition-colors ${likedVideos.has(video.id) ? 'text-red-400' : 'text-white'}`}>
                        {likedVideos.has(video.id) ? '1.3k' : '1.2k'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => setShowCommentsFor(showCommentsFor === video.id ? null : video.id)}>
                      <div className={`w-11 h-11 backdrop-blur-md rounded-full flex items-center justify-center border transition-all ${showCommentsFor === video.id ? 'bg-blue-500 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-white/10 border-white/20 group-hover:bg-blue-500/80 group-hover:border-blue-500/50'}`}>
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-[10px] font-bold drop-shadow-md transition-colors ${showCommentsFor === video.id ? 'text-blue-400' : 'text-white'}`}>84</span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => toggleRepost(video.id)}>
                      <div className={`w-11 h-11 backdrop-blur-md rounded-full flex items-center justify-center border transition-all ${repostedVideos.has(video.id) ? 'bg-green-500 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/10 border-white/20 group-hover:bg-green-500/80 group-hover:border-green-500/50'}`}>
                        <Repeat className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-[10px] font-bold drop-shadow-md transition-colors ${repostedVideos.has(video.id) ? 'text-green-400' : 'text-white'}`}>
                        {repostedVideos.has(video.id) ? 'Reposted' : 'Repost'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => handleShare(video.id)}>
                      <div className={`w-11 h-11 backdrop-blur-md rounded-full flex items-center justify-center border transition-all ${sharingVideoId === video.id ? 'bg-purple-500 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/10 border-white/20 group-hover:bg-purple-500/80 group-hover:border-purple-500/50'}`}>
                        <Share2 className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-[10px] font-bold drop-shadow-md transition-colors ${sharingVideoId === video.id ? 'text-purple-400' : 'text-white'}`}>
                        {sharingVideoId === video.id ? 'Copied!' : 'Share'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={() => handleDownload(video.videoUrl, video.prompt)}>
                      <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:bg-slate-500/80 transition-all">
                        <Download className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-white drop-shadow-md">Save</span>
                    </div>
                  </div>

                  {/* Info Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full border-2 border-purple-500 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=${video.userId}`} alt="Avatar" />
                      </div>
                      <span className="font-bold text-sm tracking-tight text-white">{video.creatorName || 'Creator'}</span>
                    </div>
                    <p className="text-white/80 text-xs max-w-md line-clamp-2 leading-relaxed">
                      {video.prompt}
                    </p>
                  </div>
                </div>
              ))}

              {/* Comments Drawer (Fixed outside loop for better stability) */}
              <AnimatePresence>
                {showCommentsFor && (
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute inset-x-0 bottom-0 top-[20%] bg-slate-900 z-[200] rounded-t-[32px] flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.8)] border-t border-white/10"
                  >
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                      <h3 className="font-black text-sm tracking-widest uppercase flex items-center gap-2">
                         <MessageCircle className="w-4 h-4 text-purple-400" />
                         Comments / التعليقات
                      </h3>
                      <button 
                        onClick={() => {
                          setShowCommentsFor(null);
                          setReplyTo(null);
                        }}
                        className="p-2 hover:bg-white/5 rounded-full"
                      >
                         <Plus className="w-6 h-6 rotate-45 text-white/40" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                      {currentComments.map((comment) => (
                        <div key={comment.id} className="flex flex-col gap-2">
                          <div className="flex gap-4 group">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-white/10 shrink-0 overflow-hidden">
                              {comment.userPic ? <img src={comment.userPic} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-white/20" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs text-purple-400">@{comment.userName}</span>
                                <span className="text-[10px] text-white/20 font-mono italic">
                                  {comment.createdAt?.toDate ? new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(comment.createdAt.toDate()) : '...'}
                                </span>
                              </div>
                              <p className="text-sm text-white/80 leading-relaxed break-words">
                                {comment.replyToName && <span className="text-green-500 mr-1">@{comment.replyToName}</span>}
                                {comment.text}
                              </p>
                              <button 
                                onClick={() => {
                                  setReplyTo(comment.id);
                                  setCommentText(`رد على @${comment.userName} `);
                                }}
                                className="text-[10px] text-white/30 font-bold hover:text-purple-400 mt-2 flex items-center gap-1 transition-colors uppercase tracking-wider"
                              >
                                <Repeat className="w-3 h-3" />
                                Reply / رد
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {currentComments.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 py-12">
                           <MessageCircle className="w-12 h-12 mb-4" />
                           <p className="text-[10px] font-bold uppercase tracking-widest">No comments yet</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 pb-10 bg-slate-900 border-t border-white/10">
                      <form onSubmit={handleAddComment} className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 focus-within:border-purple-500/50 transition-all group shadow-xl">
                        <input 
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Write a comment... اكتب تعليقاً"
                          className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none text-white placeholder:text-white/20"
                        />
                        <button 
                          type="submit"
                          disabled={!commentText.trim()}
                          className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-white disabled:opacity-20 disabled:grayscale shadow-lg"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {globalVideos.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <Video className="w-16 h-16 mb-4" />
                  <p className="uppercase tracking-widest text-xs">No community videos yet</p>
                </div>
              )}
            </div>
          </main>
        ) : currentTab === 'search' ? (
          <main className="md:col-span-12 glass-card p-4 md:p-6 overflow-hidden flex flex-col h-full bg-slate-900/40 md:rounded-3xl">
            <div className="flex flex-col items-center gap-6 mb-8 mt-4">
              <div className="relative w-full max-w-2xl group">
                <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full group-focus-within:bg-purple-500/20 transition-all" />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-purple-400 z-10" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setSearchQuery('');
                      return;
                    }
                    if (!val.startsWith('@')) {
                      setSearchQuery('@' + val);
                    } else {
                      setSearchQuery(val);
                    }
                  }}
                  placeholder="@abed_ai"
                  className="w-full glass-input pl-16 pr-6 py-5 text-xl font-mono focus:outline-none relative z-10 border-white/20 focus:border-purple-500/50 transition-all rounded-3xl"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 md:px-0">
               <div className="max-w-2xl mx-auto space-y-3">
                 {searchResults.length > 0 ? (
                   searchResults.map((result) => (
                    <motion.div 
                      key={result.uid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-card hover:bg-white/10 p-4 transition-all flex items-center justify-between group cursor-pointer border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-2 border-purple-500/30 p-0.5 overflow-hidden">
                          <img src={result.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.uid}`} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-purple-400 transition-colors">{result.displayName}</span>
                          <span className="text-sm font-mono text-white/40 tracking-tight">@{result.username}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startChat({ uid: result.uid, displayName: result.displayName, photoURL: result.photoURL, username: result.username })}
                          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-purple-500/20 hover:border-purple-500/50 transition-all text-purple-400"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                        <button className="px-6 py-2 rounded-xl bg-white text-black text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all">
                          Follow
                        </button>
                      </div>
                    </motion.div>
                  ))
                 ) : searchQuery.length > 1 ? (
                   <div className="text-center py-20 opacity-30 flex flex-col items-center">
                     <AlertTriangle className="w-12 h-12 mb-4" />
                     <p className="font-bold uppercase tracking-widest text-xs">No users found with this handle</p>
                   </div>
                 ) : (
                   <div className="text-center py-24 opacity-20">
                     <LayoutGrid className="w-20 h-20 mx-auto mb-4" />
                     <p className="tracking-widest uppercase text-xs">Explore creators by their @handle</p>
                   </div>
                 )}
               </div>
            </div>
          </main>
        ) : currentTab === 'admin' ? (
          <main className="md:col-span-12 glass-card p-4 md:p-8 overflow-hidden flex flex-col h-full bg-black/40 md:rounded-3xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                <ShieldCheck className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-black">ADMIN MODERATION / لوحة الإشراف</h2>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Platform safety and user enforcement</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allUsers.map((u) => (
                  <div key={u.id} className="glass-card p-5 flex flex-col gap-5 border-white/5 relative group bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
                        {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-white/20" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-sm truncate">{u.displayName || 'Anonymous'}</h4>
                        <p className="text-[10px] text-white/40 truncate font-mono">@{u.username || 'user'}</p>
                        <p className="text-[9px] text-purple-400 truncate mt-1">{u.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-auto">
                      {u.banned ? (
                        <button 
                          onClick={() => handleBanUser(u.id, false)}
                          className="flex-1 py-3 bg-green-500/20 border border-green-500/40 text-green-400 text-[9px] font-black rounded-xl hover:bg-green-500/30 transition-all uppercase tracking-widest"
                        >
                          UNBAN / رفع الحظر
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleBanUser(u.id, true)}
                          className="flex-1 py-3 bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-black rounded-xl hover:bg-red-500/30 transition-all uppercase tracking-widest"
                        >
                          BAN USER / حظر المستخدم
                        </button>
                      )}
                      {u.email === ADMIN_EMAIL && (
                        <div className="absolute top-4 right-4 bg-purple-500/20 text-purple-400 text-[8px] font-bold px-2 py-1 rounded-md border border-purple-500/30 uppercase">
                          Root Admin
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        ) : currentTab === 'inbox' ? (
          <main className="md:col-span-12 glass-card p-4 md:p-8 overflow-hidden flex flex-col h-full bg-black/40 md:rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                <MessageCircle className="w-8 h-8 text-purple-500" />
                MESSAGES / الرسائل
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-none">
              {userChats.map((chat) => (
                <div 
                  key={chat.id} 
                  onClick={() => {
                    const partnerId = chat.participants.find((p: string) => p !== user?.uid);
                    const partner = allUsers.find(u => u.uid === partnerId) || { uid: partnerId, displayName: 'User', photoURL: '' };
                    startChat(partner);
                  }}
                  className="glass-card hover:bg-white/5 p-5 flex items-center gap-4 cursor-pointer transition-all border-white/5 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-white/10 overflow-hidden shrink-0 group-hover:border-purple-500/50 transition-all">
                    <UserIcon className="w-6 h-6 text-white/20" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-sm text-white transition-colors group-hover:text-purple-400 truncate">@{chat.id.split('_').find((p: string) => p !== user?.uid)?.substring(0, 8)}...</h4>
                      <span className="text-[9px] text-white/20 font-mono italic">
                        {chat.updatedAt?.toDate?.() ? new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(chat.updatedAt.toDate()) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 truncate leading-relaxed">
                      {chat.lastMessage || 'Start a conversation... ابدأ محادثة الآن'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
              
              {userChats.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center py-24 opacity-20">
                  <MessageCircle className="w-16 h-16 mb-4" />
                  <p className="uppercase tracking-widest text-xs font-bold">No active conversations</p>
                  <button onClick={() => setCurrentTab('search')} className="mt-4 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-white/10 transition-all">Find people to chat</button>
                </div>
              )}
            </div>
          </main>
        ) : currentTab === 'chat' ? (
          <main className="md:col-span-12 glass-card overflow-hidden flex flex-col h-full bg-black/60 md:rounded-3xl relative">
            <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <button onClick={() => setCurrentTab('inbox')} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                  <ChevronLeft className="w-6 h-6 text-white/40 hover:text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 overflow-hidden">
                    {selectedChatPartner?.photoURL ? <img src={selectedChatPartner.photoURL} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-purple-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{selectedChatPartner?.displayName || 'User'}</h3>
                    <p className="text-[10px] text-white/30 font-mono tracking-tight uppercase">@{selectedChatPartner?.username || 'user'}</p>
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-white/5 rounded-xl">
                <MoreVertical className="w-5 h-5 text-white/20" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-none flex flex-col">
              {currentChatMessages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-white/90 rounded-tl-none border border-white/5'}`}>
                      {msg.text}
                      <p className={`text-[8px] mt-2 opacity-40 font-mono ${isMe ? 'text-right' : 'text-left'}`}>
                        {msg.createdAt?.toDate ? new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' }).format(msg.createdAt.toDate()) : 'Now'}
                      </p>
                    </div>
                  </div>
                );
              })}
              {currentChatMessages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center opacity-10">
                  <MessageCircle className="w-12 h-12 mb-4" />
                  <p className="text-xs uppercase tracking-widest font-mono">End-to-end encrypted</p>
                </div>
              )}
            </div>

            <div className="p-4 md:p-6 bg-white/[0.02] border-t border-white/5">
              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/10 focus-within:border-purple-500/50 transition-all"
              >
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message... اكتب رسالة هنا"
                  className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-12 h-12 rounded-xl action-gradient flex items-center justify-center text-white shadow-xl disabled:opacity-30 active:scale-90 transition-all font-bold"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </form>
            </div>
          </main>
        ) : (
          <main className="md:col-span-12 glass-card p-4 md:p-8 overflow-hidden flex flex-col h-full relative md:rounded-3xl overflow-y-auto">
            {/* CTA Generate Free Button */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-4 md:absolute md:bottom-8">
              <button 
                onClick={() => setCurrentTab('create')}
                className="w-full py-4 rounded-2xl action-gradient text-white font-black text-sm shadow-[0_0_30px_rgba(168,85,247,0.5)] border border-white/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                قم بتوليد الفيديو مجاناً
                <span className="opacity-40 tracking-tighter">FREE</span>
              </button>
            </div>

            {/* TikTok Style Profile Header */}
            <div className="flex flex-col items-center mb-10 shrink-0">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-purple-500/30 p-1 bg-gradient-to-tr from-purple-500 to-pink-500">
                  <img 
                    src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'guest'}`} 
                    className="w-full h-full rounded-full object-cover border-2 border-slate-900" 
                    alt="Profile" 
                  />
                </div>
                <div className="absolute bottom-1 right-1 bg-purple-500 p-1.5 rounded-full border-2 border-slate-900">
                  <Plus className="w-3 h-3 text-white" />
                </div>
              </div>

              {isEditingDisplayName ? (
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="bg-white/10 border border-purple-500/50 rounded-xl px-4 py-1.5 text-sm outline-none text-center font-bold"
                    placeholder="Set Nickname..."
                    autoFocus
                  />
                  <button onClick={handleUpdateDisplayName} className="p-2 bg-green-500/20 text-green-400 rounded-xl">
                    <ShieldCheck className="w-4 h-4"/>
                  </button>
                </div>
              ) : (
                <h2 
                  className="text-xl font-bold text-white mb-1 cursor-pointer flex items-center gap-2 group"
                  onClick={() => user && setIsEditingDisplayName(true)}
                >
                  {userProfile?.displayName || user?.displayName || 'User'}
                  {user && <Settings className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                </h2>
              )}
              
              <div className="flex flex-col items-center">
                {isEditingUsername ? (
                  <div className="flex flex-col items-center gap-2 mt-2">
                     <div className="flex items-center gap-1 text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                       <Settings className="w-3 h-3" /> Change ID
                     </div>
                     <div className="flex items-center gap-2">
                       <input 
                         value={newUsername}
                         onChange={(e) => setNewUsername(e.target.value)}
                         className="bg-white/10 border border-purple-500/50 rounded-xl px-4 py-1.5 text-xs outline-none text-center font-mono"
                         placeholder="Enter new ID..."
                       />
                       <button onClick={handleUpdateUsername} className="p-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/40 transition-colors">
                         <ShieldCheck className="w-4 h-4"/>
                       </button>
                       <button onClick={() => setIsEditingUsername(false)} className="p-2 bg-white/5 text-white/40 rounded-xl hover:bg-white/10 transition-colors">
                         <Trash2 className="w-4 h-4"/>
                       </button>
                     </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group cursor-pointer" onClick={() => user && setIsEditingUsername(true)}>
                     <span className="text-sm font-medium text-white/60 font-mono tracking-tight">
                       <span className="text-purple-400/80 mr-1">ID:</span>
                       @{userProfile?.username || (user ? '123456' : '000000')}
                     </span>
                     {user && <Settings className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-all group-hover:rotate-90"/>}
                  </div>
                )}
              </div>

              <div className="flex gap-8 mt-6">
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-white">{userVideos.length}</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Following</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-white">0</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-white">0</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">Likes</span>
                </div>
              </div>
              
              <button className="mt-6 px-10 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm font-bold hover:bg-white/10 transition-all">
                Edit Profile
              </button>
            </div>

            {/* Tabs Toggle (Videos/Characters/Liked) */}
            <div className="flex border-b border-white/5 mb-4 shrink-0">
              <button 
                onClick={() => setProfileSubTab('videos')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${profileSubTab === 'videos' ? 'border-white text-white' : 'border-transparent text-white/30'}`}
              >
                <LayoutGrid className="w-4 h-4 mx-auto" />
              </button>
              <button 
                onClick={() => setProfileSubTab('characters')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${profileSubTab === 'characters' ? 'border-white text-white' : 'border-transparent text-white/30'}`}
              >
                <UserIcon className="w-4 h-4 mx-auto" />
              </button>
              <button 
                onClick={() => setProfileSubTab('liked')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${profileSubTab === 'liked' ? 'border-white text-white' : 'border-transparent text-white/30'}`}
              >
                <Heart className="w-4 h-4 mx-auto" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-1 pb-20 scrollbar-none content-start">
              {profileSubTab === 'videos' && userVideos.map((video) => (
                <motion.div 
                  key={video.id} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card overflow-hidden group relative aspect-[9/16] bg-black/40"
                >
                  <video src={video.videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" muted />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-3">
                    <p className="text-[10px] line-clamp-2 text-white/50 mb-2">{video.prompt}</p>
                    <div className="flex items-center justify-between pointer-events-auto">
                       <div className="flex gap-1">
                        <button onClick={() => handleDownload(video.videoUrl, video.prompt)} className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-white/50 hover:text-white"><Download className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handlePublish(video.id)} className="p-1.5 bg-purple-500/20 rounded-lg text-purple-400" title="Publish to Global Feed"><Share2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteDoc(doc(db, 'videos', video.id))} className="p-1.5 bg-red-500/10 rounded-lg text-red-500/40 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                       </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {profileSubTab === 'characters' && characters.map((char) => (
                <motion.div 
                  key={char.id} 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card overflow-hidden group relative aspect-[9/16] bg-black/40 flex flex-col items-center justify-center p-4"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-purple-500/30 overflow-hidden mb-3">
                    <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-bold text-white text-center line-clamp-1">{char.name}</span>
                  <span className="text-[8px] text-white/30 uppercase tracking-widest mt-1">Private Character</span>
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEditCharacter(char)}
                      className="p-1.5 bg-white/10 rounded-lg text-white/50 hover:text-white"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => deleteDoc(doc(db, 'characters', char.id))}
                      className="p-1.5 bg-red-500/10 rounded-lg text-red-500/40 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {profileSubTab === 'videos' && userVideos.length === 0 && (
                <div className="col-span-full h-full flex flex-col items-center justify-center opacity-10 py-32">
                  <LayoutGrid className="w-16 h-16 mb-4" />
                  <p className="text-xs uppercase tracking-widest">No Videos Found</p>
                </div>
              )}

              {profileSubTab === 'characters' && characters.length === 0 && (
                <div className="col-span-full h-full flex flex-col items-center justify-center opacity-10 py-32">
                  <UserIcon className="w-16 h-16 mb-4" />
                  <p className="text-xs uppercase tracking-widest">No Characters Found</p>
                </div>
              )}

              {profileSubTab === 'liked' && (
                <div className="col-span-full h-full flex flex-col items-center justify-center opacity-10 py-32">
                  <Heart className="w-16 h-16 mb-4" />
                  <p className="text-xs uppercase tracking-widest">No Liked Videos</p>
                </div>
              )}
            </div>
          </main>
        )}
      </div>

      {/* Mobile Bottom Tab Bar (Fixed for App feel) */}
      <div className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-around z-[100] shadow-2xl safe-area-bottom">
        <button 
          onClick={() => setCurrentTab('gallery')}
          className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all ${currentTab === 'gallery' ? 'text-white' : 'text-white/30'}`}
        >
          <Compass className={`w-6 h-6 ${currentTab === 'gallery' ? 'text-purple-400' : ''}`} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Explore</span>
        </button>
        <button 
          onClick={() => setCurrentTab('search')}
          className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all ${currentTab === 'search' ? 'text-white' : 'text-white/30'}`}
        >
          <Search className={`w-5 h-5 ${currentTab === 'search' ? 'text-purple-400' : ''}`} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Search</span>
        </button>
        <button 
          onClick={() => setCurrentTab('create')}
          className="relative -top-3 w-14 h-14 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_30px_rgba(168,85,247,0.5)] border-2 border-white/20 active:scale-95 transition-all"
        >
          <Plus className="w-8 h-8" />
        </button>
        <button 
          onClick={() => setCurrentTab('inbox')}
          className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all ${currentTab === 'inbox' ? 'text-white' : 'text-white/30'}`}
        >
          <MessageCircle className={`w-5 h-5 ${currentTab === 'inbox' ? 'text-purple-400' : ''}`} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Inbox</span>
        </button>
        <button 
          onClick={() => setCurrentTab('profile')}
          className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all ${currentTab === 'profile' ? 'text-white' : 'text-white/30'}`}
        >
          <UserIcon className={`w-5 h-5 ${currentTab === 'profile' ? 'text-purple-400' : ''}`} />
          <span className="text-[9px] font-bold uppercase tracking-tighter">Profile</span>
        </button>
      </div>

      {/* Desktop Footer (Hidden on mobile) */}
      <footer className="hidden md:flex mt-4 justify-between items-center text-[10px] text-white/30 px-6 font-mono tracking-widest uppercase shrink-0">
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

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card max-w-md w-full p-8 relative overflow-hidden"
            >
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                  {isSignUp ? 'Create Account / إنشاء حساب' : 'Welcome Back / مرحباً بعودتك'}
                </h2>
                <p className="text-white/40 text-xs uppercase tracking-widest leading-loose">
                  Connect to your Beso AI Studio
                </p>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest pl-1">Display Name / الاسم</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        required
                        type="text"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full glass-input pl-12 py-3 text-sm"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest pl-1">Email / البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      required
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full glass-input pl-12 py-3 text-sm"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest pl-1">Password / كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      required
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full glass-input pl-12 py-3 text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  disabled={authLoading}
                  className="w-full py-4 rounded-xl action-gradient text-white font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4"
                >
                  {authLoading ? 'PROCESSING...' : (isSignUp ? 'SIGN UP / إنشاء حساب' : 'SIGN IN / تسجيل دخول')}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-white/20"><span className="bg-[#0f172a] px-4">OR USE GMAIL</span></div>
              </div>

              <button 
                onClick={() => {
                  signInWithGoogle();
                  setShowAuthModal(false);
                }}
                className="w-full py-4 rounded-xl bg-white text-black font-black text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-3"
              >
                <Chrome className="w-5 h-5" />
                SIGN IN WITH GOOGLE
              </button>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-[10px] font-bold text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign In' : 'New to Beso? Create an account'}
                </button>
              </div>

              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-2 text-white/20 hover:text-white transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

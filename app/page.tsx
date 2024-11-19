'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Volume2, VolumeX, Pause, Play, Sun, Moon } from 'lucide-react'

interface PexelsPhoto {
  id: number;
  src: {
    original: string;
    large2x: string;
    large: string;
  };
  alt: string;
}

interface Story {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  imageUrl?: string;
  imageAlt?: string;
}

interface Voice {
  name: string;
  voice: SpeechSynthesisVoice;
  gender: 'male' | 'female';
}

export default function Home(): React.ReactElement {
  const [stories, setStories] = useState<Story[]>([])
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [speechState, setSpeechState] = useState<'stopped' | 'playing' | 'paused'>('stopped')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [currentParagraph, setCurrentParagraph] = useState<number>(-1);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  // Initialize speech synthesis and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      speechSynthesisRef.current = synth;

      const loadVoices = () => {
        const voices = synth.getVoices();
        if (voices.length > 0) {
          const englishVoices = voices
            .filter(voice => voice.lang.startsWith('en-'))
            .map(voice => ({
              name: voice.name,
              voice: voice,
              gender: voice.name.toLowerCase().includes('female') ? 'female' as const : 'male' as const
            }));

          if (englishVoices.length > 0) {
            setAvailableVoices(englishVoices);
            if (!selectedVoice) {
              setSelectedVoice(englishVoices[0]);
            }
          }
        }
      };

      loadVoices();
      synth.addEventListener('voiceschanged', loadVoices);

      return () => {
        synth.removeEventListener('voiceschanged', loadVoices);
        if (synth.speaking) {
          synth.cancel();
        }
      };
    }
  }, []);

  const handleSpeech = () => {
    const synth = speechSynthesisRef.current;
    if (!selectedStory || !synth || !selectedVoice) return;

    try {
      switch (speechState) {
        case 'stopped':
          // Split content into paragraphs
          const paragraphs = selectedStory.content.split('\n').filter(p => p.trim());
          setCurrentParagraph(0);

          // Cancel any ongoing speech
          synth.cancel();

          // Create new utterance
          const utterance = new SpeechSynthesisUtterance(selectedStory.content);
          
          // Configure speech settings
          utterance.voice = selectedVoice.voice;
          utterance.rate = speechRate;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = 'en-US';

          // Track progress through paragraphs
          let charCount = 0;
          let currentIndex = 0;

          utterance.onboundary = (event) => {
            if (event.name === 'sentence') {
              // Calculate which paragraph we're in based on character position
              while (charCount < event.charIndex && currentIndex < paragraphs.length) {
                charCount += paragraphs[currentIndex].length + 1; // +1 for newline
                currentIndex++;
              }
              setCurrentParagraph(currentIndex - 1);
            }
          };

          utterance.onstart = () => {
            setSpeechState('playing');
            setCurrentParagraph(0);
          };

          utterance.onend = () => {
            setSpeechState('stopped');
            setCurrentParagraph(-1);
          };

          utterance.onerror = () => {
            setSpeechState('stopped');
            setCurrentParagraph(-1);
            synth.cancel();
          };

          utterance.onpause = () => {
            setSpeechState('paused');
          };

          utterance.onresume = () => {
            setSpeechState('playing');
          };

          // Store reference and start speaking
          utteranceRef.current = utterance;
          synth.speak(utterance);
          break;

        case 'playing':
          synth.pause();
          setSpeechState('paused');
          break;

        case 'paused':
          synth.resume();
          setSpeechState('playing');
          break;
      }
    } catch (error) {
      setSpeechState('stopped');
      setCurrentParagraph(-1);
      synth.cancel();
    }
  };

  const stopSpeech = () => {
    const synth = speechSynthesisRef.current;
    if (synth) {
      synth.cancel();
      setSpeechState('stopped');
      setCurrentParagraph(-1);
      utteranceRef.current = null;
    }
  };

  // Add cleanup when switching stories
  useEffect(() => {
    stopSpeech();
  }, [selectedStory]);

  // Handle editing story title
  const startEditing = (story: Story, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(story.id);
    setEditTitle(story.title);
  };

  const handleEditSave = (id: string) => {
    if (editTitle.trim()) {
      setStories(stories.map(story => 
        story.id === id ? { ...story, title: editTitle.trim() } : story
      ));
      if (selectedStory?.id === id) {
        setSelectedStory(prev => prev ? { ...prev, title: editTitle.trim() } : null);
      }
    }
    setEditingId(null);
  };

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave(id);
    }
  };

  // Delete Modal Component
  const DeleteModal = ({ storyId }: { storyId: string }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${
        isDarkTheme ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } p-6 rounded-lg shadow-xl max-w-sm w-full mx-4`}>
        <h3 className={`text-xl font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'} mb-4`}>
          Delete Story
        </h3>
        <p className={isDarkTheme ? 'text-gray-300' : 'text-gray-600'}>
          Are you sure you want to delete this story? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-4 mt-6">
          <button
            onClick={() => setShowDeleteModal(null)}
            className={`px-4 py-2 rounded-lg ${
              isDarkTheme 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300'
            } transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const id = storyId;
              setStories(stories.filter(story => story.id !== id));
              if (selectedStory?.id === id) {
                setSelectedStory(null);
                stopSpeech();
              }
              setShowDeleteModal(null);
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  const fetchStoryImage = async (prompt: string): Promise<{ url: string; alt: string } | null> => {
    try {
      const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(prompt)}&per_page=1`, {
        headers: {
          'Authorization': '0SorgvgygNNHkdSXKGY6lwxiiISaictWKdea6yXa6heglnYb1YveHdnI'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch image');

      const data = await response.json();
      if (data.photos && data.photos.length > 0) {
        const photo: PexelsPhoto = data.photos[0];
        return {
          url: photo.src.large2x,
          alt: photo.alt
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
    }
  };

  const handleGenerateStory = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    try {
      // Generate story
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('Failed to generate story');

      const data = await response.json();
      
      // Fetch image based on the prompt
      const image = await fetchStoryImage(prompt);

      const newStory: Story = {
        id: Math.random().toString(36).substr(2, 9),
        title: prompt.slice(0, 30) + '...',
        content: data.story,
        createdAt: new Date(),
        imageUrl: image?.url,
        imageAlt: image?.alt
      };

      setStories([...stories, newStory]);
      setSelectedStory(newStory);
      setPrompt('');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate story. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && prompt.trim() && !isGenerating) {
      e.preventDefault();
      handleGenerateStory();
    }
  };

  // Add new function to play specific paragraph
  const playParagraph = (paragraphText: string, paragraphIndex: number) => {
    const synth = speechSynthesisRef.current;
    if (!synth || !selectedVoice) return;

    try {
      // Stop any ongoing speech
      stopSpeech();

      // Create new utterance for the paragraph
      const utterance = new SpeechSynthesisUtterance(paragraphText);
      
      // Configure speech settings
      utterance.voice = selectedVoice.voice;
      utterance.rate = speechRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      // Add event listeners
      utterance.onstart = () => {
        setSpeechState('playing');
        setCurrentParagraph(paragraphIndex);
      };

      utterance.onend = () => {
        setSpeechState('stopped');
        setCurrentParagraph(-1);
      };

      utterance.onpause = () => {
        setSpeechState('paused');
      };

      utterance.onresume = () => {
        setSpeechState('playing');
      };

      utterance.onerror = () => {
        setSpeechState('stopped');
        setCurrentParagraph(-1);
        synth.cancel();
      };

      // Store reference and start speaking
      utteranceRef.current = utterance;
      synth.speak(utterance);
    } catch (error) {
      setSpeechState('stopped');
      setCurrentParagraph(-1);
      synth.cancel();
    }
  };

  // Render paragraphs with highlighting
  const renderContent = () => {
    if (!selectedStory) return null;

    const paragraphs = selectedStory.content.split('\n').filter(p => p.trim());
    
    return (
      <>
        {/* Story Image */}
        {selectedStory.imageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={selectedStory.imageUrl}
              alt={selectedStory.imageAlt || 'Story illustration'}
              className="w-full h-[400px] object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Story Paragraphs */}
        {paragraphs.map((paragraph, index) => (
          <div
            key={index}
            className="group relative"
          >
            <p
              className={`leading-relaxed mb-4 rounded-lg transition-all duration-300 cursor-pointer ${
                index === currentParagraph && speechState !== 'stopped'
                  ? isDarkTheme 
                    ? 'bg-purple-900/30 text-purple-50' 
                    : 'bg-purple-200 text-purple-900'
                  : isDarkTheme
                    ? 'text-gray-300 hover:bg-gray-700/30'
                    : 'text-gray-800 hover:bg-gray-300/50'
              } px-4 py-3`}
              onClick={() => {
                playParagraph(paragraph, index);
              }}
            >
              <span className={`${
                index === currentParagraph && speechState !== 'stopped'
                  ? isDarkTheme
                    ? 'text-purple-50'
                    : 'text-purple-900'
                  : isDarkTheme
                    ? 'text-gray-300'
                    : 'text-gray-800'
              }`}>
                {paragraph}
              </span>
            </p>
            
            {/* Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className={`${
                isDarkTheme ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
              } text-xs px-2 py-1 rounded-full shadow-lg border whitespace-nowrap`}>
                Click to play this paragraph
              </div>
            </div>
          </div>
        ))}
      </>
    );
  };

  const updateSpeechRate = (newRate: number) => {
    // Clamp the rate between 0.5 and 2.0
    const rate = Math.max(0.5, Math.min(2.0, newRate));
    setSpeechRate(rate);
    
    // Update current utterance if it exists and is playing
    if (utteranceRef.current && speechSynthesisRef.current) {
      const synth = speechSynthesisRef.current;
      const currentText = utteranceRef.current.text;
      
      // Only update if actually speaking
      if (speechState === 'playing' || speechState === 'paused') {
        // Create new utterance with same text but updated rate
        const newUtterance = new SpeechSynthesisUtterance(currentText);
        newUtterance.voice = selectedVoice?.voice || null;
        newUtterance.rate = rate;
        newUtterance.pitch = 1.0;
        newUtterance.volume = 1.0;
        newUtterance.lang = 'en-US';

        // Copy over event listeners
        newUtterance.onstart = utteranceRef.current.onstart;
        newUtterance.onend = utteranceRef.current.onend;
        newUtterance.onerror = utteranceRef.current.onerror;
        newUtterance.onpause = utteranceRef.current.onpause;
        newUtterance.onresume = utteranceRef.current.onresume;
        newUtterance.onboundary = utteranceRef.current.onboundary;

        // Cancel current speech and start new one
        const wasPaused = speechState === 'paused';
        synth.cancel();
        utteranceRef.current = newUtterance;
        synth.speak(newUtterance);
        
        // If it was paused, pause the new utterance
        if (wasPaused) {
          setTimeout(() => synth.pause(), 0);
        }
      }
    }
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  return (
    <main className={`min-h-screen ${
      isDarkTheme 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-gray-100 to-white'
    }`}>
      {/* Fixed Header */}
      <div className={`fixed top-0 left-0 right-0 ${
        isDarkTheme 
          ? 'bg-gray-900/100' 
          : 'bg-white/100'
      } backdrop-blur-sm z-20 p-1 border-b ${
        isDarkTheme ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="max-w-[1920px] mx-auto flex justify-between items-center px-4">
          <h1 className={`text-3xl font-bold ${
            isDarkTheme ? 'text-white' : 'text-gray-900'
          }`}>
            AI Story Generator
          </h1>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-all duration-200 ${
              isDarkTheme
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-[72px]">
        <div className="max-w-[1920px] mx-auto px-8">
          <div className="grid grid-cols-3 gap-8">
            {/* Left Panel - Fixed */}
            <div className="fixed w-[400px]">
              <div className={`${
                isDarkTheme ? 'bg-gray-800' : 'bg-gray-100'
              } rounded-lg p-4`}>
                <div className="flex flex-col h-full">
                  {/* Prompt Input Section */}
                  <div className="space-y-2 mb-4">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handlePromptKeyDown}
                      placeholder="Enter your story prompt..."
                      className={`w-full p-2 rounded-lg ${
                        isDarkTheme 
                          ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                          : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                      } border focus:border-blue-500 focus:outline-none`}
                    />
                    <button
                      onClick={handleGenerateStory}
                      disabled={isGenerating || !prompt.trim()}
                      className={`w-full p-2 rounded-lg ${
                        isGenerating || !prompt.trim()
                          ? 'bg-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white transition-colors`}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Story'}
                    </button>
                  </div>

                  {/* Stories List - Scrollable */}
                  <div className="overflow-y-auto h-[calc(100vh-300px)] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
                    <div className="space-y-3">
                      {stories.map(story => (
                        <div
                          key={story.id}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            selectedStory?.id === story.id
                              ? 'bg-blue-600 text-white'
                              : isDarkTheme
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-white hover:bg-gray-50 text-gray-900 shadow-sm'
                          }`}
                          onClick={() => setSelectedStory(story)}
                        >
                          <div className="flex justify-between items-center">
                            {editingId === story.id ? (
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={() => handleEditSave(story.id)}
                                onKeyDown={(e) => handleKeyDown(story.id, e)}
                                className="flex-1 bg-gray-700 text-white rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <h3 className="text-white font-medium">{story.title}</h3>
                            )}
                            <div className="flex space-x-2">
                              <button 
                                onClick={(e) => startEditing(story, e)}
                                className="text-gray-300 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-600/50"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteModal(story.id);
                                }}
                                className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-gray-600/50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            {new Date(story.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Story Content */}
            <div className="md:col-span-2 md:ml-[430px] w-[calc(100vw-500px)]">
              <div className={`${
                isDarkTheme ? 'bg-gray-800' : 'bg-gray-100'
              } rounded-lg flex flex-col h-full`}>
                {selectedStory ? (
                  <>
                    {/* Story Header - Fixed */}
                    <div className={`fixed top-[44px] ${
                      isDarkTheme ? 'bg-gray-800' : 'bg-gray-100'
                    } p-6 border-b ${
                      isDarkTheme ? 'border-gray-700' : 'border-gray-200'
                    } z-10 w-[calc(100vw-500px)]`}>
                      <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-white flex-1">{selectedStory.title}</h2>
                        <div className="flex items-center gap-4">
                          <select
                            value={selectedVoice?.name || ''}
                            onChange={(e) => {
                              const voice = availableVoices.find(v => v.name === e.target.value);
                              if (voice) setSelectedVoice(voice);
                            }}
                            className={`${
                              isDarkTheme 
                                ? 'bg-gray-700 text-white' 
                                : 'bg-white text-gray-900'
                            } rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-[200px]`}
                          >
                            {availableVoices.map(voice => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.gender})
                              </option>
                            ))}
                          </select>
                          
                          <div className="flex items-center gap-2">
                            {/* Speed Control */}
                            <div className="flex items-center gap-1 mr-2">
                              <button
                                onClick={() => updateSpeechRate(speechRate - 0.1)}
                                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                                title="Decrease Speed"
                              >
                                <span className="font-bold">-</span>
                              </button>
                              <span className={`${
                                isDarkTheme ? 'text-gray-400' : 'text-gray-600'
                              } min-w-[40px] text-center`}>
                                {speechRate.toFixed(1)}x
                              </span>
                              <button
                                onClick={() => updateSpeechRate(speechRate + 0.1)}
                                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                                title="Increase Speed"
                              >
                                <span className="font-bold">+</span>
                              </button>
                            </div>

                            {/* Play/Pause/Stop Controls */}
                            <button
                              onClick={handleSpeech}
                              className={`p-2 rounded-full transition-all duration-200 ${
                                speechState !== 'stopped'
                                  ? 'bg-purple-600 text-white' 
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                              title={
                                speechState === 'stopped' 
                                  ? 'Start Reading' 
                                  : speechState === 'playing'
                                    ? 'Pause'
                                    : 'Resume'
                              }
                            >
                              {speechState === 'stopped' ? (
                                <Volume2 size={20} />
                              ) : speechState === 'playing' ? (
                                <Pause size={20} />
                              ) : (
                                <Play size={20} />
                              )}
                            </button>
                            {speechState !== 'stopped' && (
                              <button
                                onClick={stopSpeech}
                                className="p-2 rounded-full transition-all duration-200 text-gray-400 hover:text-white hover:bg-gray-700"
                                title="Stop Reading"
                              >
                                <VolumeX size={20} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Content - Add padding top to account for fixed header */}
                    <div className="flex-1 overflow-y-auto pt-[88px] p-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
                      <div className={`text-gray-300 max-w-[1200px] ${
                        isDarkTheme ? 'text-gray-300' : 'text-gray-800'
                      }`}>
                        {renderContent()}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-gray-400 p-6">
                    <h3 className="text-xl font-medium mb-2">No Story Selected</h3>
                    <p>Enter a prompt and generate a story, or select an existing story to view it.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && <DeleteModal storyId={showDeleteModal} />}
    </main>
  )
} 
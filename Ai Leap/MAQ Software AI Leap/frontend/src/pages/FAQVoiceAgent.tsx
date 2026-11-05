import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Bot, User, AlertCircle } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
const FAQVoiceAgent = () => {
  const [selectedScope, setSelectedScope] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [browserSupportsSpeechRecognition, setBrowserSupportsSpeechRecognition] = useState(false);
  const [isMicrophoneAvailable, setIsMicrophoneAvailable] = useState(true);
  const recognitionRef = useRef(null);
  const chatContainerRef = useRef(null);

 
  // Update input message when transcript changes
  useEffect(() => {
    if (transcript && transcript.length <= 1000) {
      setInputMessage(transcript);
    }
  }, [transcript]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const resetTranscript = () => {
    setTranscript('');
  };

  const toggleVoiceInput = async () => {
    if (!selectedScope || !browserSupportsSpeechRecognition || !isMicrophoneAvailable) {
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // Clear previous transcript and start fresh
      resetTranscript();
      setInputMessage('');
      
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const simulateAPICall = async (message, scope) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Generate dummy responses based on scope
    const responses = {
      HR: [
        "Based on HR policies, I can help you with employee benefits, leave policies, and workplace guidelines.",
        "For HR-related queries, please note that our standard leave policy allows 20 days of annual leave per year.",
        "HR procedures require manager approval for time-off requests submitted at least 48 hours in advance."
      ],
      IT: [
        "For IT support, I can assist with technical issues, software access, and system troubleshooting.",
        "Please ensure you've restarted your system before escalating technical issues to the IT helpdesk.",
        "IT security protocols require password changes every 90 days and use of multi-factor authentication."
      ],
      Policy: [
        "Company policies are designed to ensure compliance and maintain a positive work environment.",
        "All policy updates are communicated via email and posted on the company intranet within 24 hours.",
        "Policy violations should be reported to your immediate supervisor or HR department."
      ]
    };

    const scopeResponses = responses[scope] || ["Please select a valid scope (HR, IT, or Policy) to get specific assistance."];
    return scopeResponses[Math.floor(Math.random() * scopeResponses.length)];
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Stop listening when sending message
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    
    if (!selectedScope) {
      alert('Please select a scope (HR, IT, or Policy) before asking questions.');
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    resetTranscript();
    setIsLoading(true);

    try {
      const response = await simulateAPICall(inputMessage, selectedScope);
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm experiencing technical difficulties. Please try again later.",
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    if (!newValue) {
      setInputMessage('');
      if (isListening) {
        resetTranscript();
      }
    } else if (newValue.length <= 1000) {
      setInputMessage(newValue);
      // If user types while listening, stop voice input
      if (isListening && newValue !== transcript) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[76vh] bg-gray-50">
      {/* Left Panel - Scope Selection */}
      <div className="w-1/3 bg-white border-r border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">FAQ Voice Agent</h2>
          <p className="text-gray-600 text-sm">Select a scope to get started</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-2">
              Select Scope
            </label>
            <select
              id="scope"
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Choose a scope...</option>
              <option value="HR">HR</option>
              <option value="IT">IT</option>
              <option value="Policy">Policy</option>
            </select>
          </div>
          
          {selectedScope && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800 mb-2">Selected: {selectedScope}</h3>
              <p className="text-xs text-red-600">
                You can now ask questions related to {selectedScope} in the chat panel.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 via-red-50 to-gray-100">
        {/* Chat Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-red-100/50 px-6 py-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgb(186, 20, 26)' }}>
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">FAQ Voice Agent</h3>
              <p className="text-xs text-gray-500">
                {selectedScope ? `${selectedScope} Support` : 'Select a scope to begin'}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent via-white/30 to-transparent"
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Welcome! Select a scope from the left panel and start asking questions.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md ${
                    message.sender === 'user'
                      ? 'text-white shadow-red-200/50'
                      : 'bg-white/90 backdrop-blur-sm text-gray-800 shadow-gray-200/50'
                  }`}
                  style={message.sender === 'user' ? { backgroundColor: 'rgb(186, 20, 26)' } : {}}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                    <span className="text-xs opacity-75">{message.timestamp}</span>
                  </div>
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/90 backdrop-blur-sm text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs">Typing...</span>
                </div>
                <div className="flex space-x-1 mt-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-red-100/50 p-4 shadow-lg">
          {/* Voice Input Status Messages */}
          {!browserSupportsSpeechRecognition && (
            <div className="mb-3 px-3 py-2 text-xs text-gray-600 bg-gray-50 rounded-md flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Voice input not supported in this browser</span>
            </div>
          )}
          
          {browserSupportsSpeechRecognition && !isMicrophoneAvailable && (
            <div className="mb-3 px-3 py-2 text-xs text-red-700 bg-red-50 rounded-md flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>Microphone not available. Please check permissions.</span>
            </div>
          )}
          
          <div className="flex space-x-3">
            <div className="flex-1 flex space-x-2">
              <textarea
                value={inputMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={selectedScope ? `Ask a question about ${selectedScope}...` : 'Select a scope first...'}
                disabled={!selectedScope}
                maxLength={1000}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={1}
              />
              <button
                onClick={toggleVoiceInput}
                disabled={!selectedScope || !browserSupportsSpeechRecognition || !isMicrophoneAvailable}
                className={`px-3 py-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isListening 
                    ? 'bg-red-100 text-red-600 border-2 border-red-300 shadow-md' 
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-red-300'
                }`}
                title={
                  !browserSupportsSpeechRecognition 
                    ? 'Voice input not supported' 
                    : !isMicrophoneAvailable 
                      ? 'Microphone not available'
                      : isListening 
                        ? 'Stop recording' 
                        : 'Start voice input'
                }
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !selectedScope || isLoading}
              className="px-4 py-2 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: 'rgb(186, 20, 26)' }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {isListening && (
            <div className="mt-3 text-sm text-red-600 flex items-center space-x-2 px-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>Listening... Speak clearly into your microphone</span>
            </div>
          )}
          
          {inputMessage.length > 900 && (
            <div className="mt-2 text-xs text-gray-500 px-2">
              {inputMessage.length}/1000 characters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQVoiceAgent;
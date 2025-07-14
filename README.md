### Versions

# 0.1

-Landing Page created

# 0.2

-Telegram Login Feature added
-Added fully functional Telegram Client will the users chats and ability to send messages

# 0.3

- Implemented real-time messaging using WebSockets, so new messages appear instantly.
- The chat list now updates in real-time with the latest message and unread counts.
- Added connection status indicators to the UI to show if the real-time connection is active.

# 0.4

- Added chat filtering functionality to hide archived chats and read-only channels by default.
- Implemented Settings modal with toggles for "Show Archived Chats" and "Show Read-Only Channels".
- Added visual badges to indicate archived chats (📦) and read-only channels (🔒) in the chat list.
- Settings are automatically saved to localStorage and persist between sessions.
- Enhanced backend API to support filtering parameters for better chat management.

# 0.4.1

- Implemented "Show Group Chats" in the Settings.
- Group chats can now be filtered in/out based on user preference through the settings panel.
- Fixed group chat filtering to properly handle supergroups and community chats.
- Implemented real-time chat list reordering - active chats now move to the top instantly.
- Both incoming and outgoing messages trigger chat reordering for better UX.
- Chat list now behaves like modern messaging apps with recent conversations at the top.

# 0.5

- 🤖 **AI Message Suggestions** - Added OpenAI-powered smart message suggestions
- AI analyzes conversation context and your writing style to suggest relevant responses
- Suggestions appear in gray text in the message input field
- Press TAB to quickly accept AI suggestions, or click the star button
- Configurable AI settings: memory limit (5-100 messages), suggestion delay (0-5 seconds)
- AI learns from your previous messages to match your communication style and tone
- Supports both casual and formal conversation detection
- AI suggestions work in real-time as new messages arrive
- Privacy-focused: messages are only processed for suggestions, not permanently stored
- Easy AI settings management through the Settings panel

# 0.5.1

- 🎨 **Major UI/UX Improvements** - Completely redesigned Settings and AI Settings interfaces
- **Sticky Headers**: Settings modals now have fixed headers that stay visible while scrolling
- **Better AI Controls**: Replaced memory limit slider with clear dropdown options (5/10/20/30 messages)
- **Sound-bar Style Slider**: New visual delay slider with gradient background and better interaction
- **Modern Toggle Switches**: Upgraded all toggles with smooth animations and better visual feedback
- **Enhanced Visual Design**: Added gradients, hover effects, better spacing, and modern styling
- **Improved Responsiveness**: Better mobile experience with optimized layouts
- **Better Error Handling**: Enhanced error messages and loading states for AI settings
- **Visual Indicators**: Added emojis and better typography for clearer section identification

# 0.5.2

- 🔧 **UI Fixes** - Fixed dark text on dark background in settings information sections
- **Placeholder Fix**: Resolved placeholder text overlapping with AI suggestions in message input
- 🤖 **Smart Regenerate Button** - Added intelligent AI suggestion regeneration functionality
- **Context-Aware Behavior**: Button restores last suggestion when user typed something, generates new when input is empty
- **Last Suggestion Storage**: System now remembers the last AI suggestion for easy restoration
- **Visual Feedback**: Different icons (🔄 for restore, 🤖✨ for new) to indicate button function
- **Improved UX**: Enhanced message input experience with better AI suggestion handling

# 0.5.3

- ✨ **Natural Input Control** - Users can now type directly without pressing TAB first
- **Smart Dismissal**: AI suggestions automatically disappear when user starts typing (no forced acceptance)
- **Full Input Freedom**: No more losing control over the input field - type naturally anytime
- **Better AI Status Position**: Moved AI loading indicator to top-right header, left of Home button
- **Enhanced Visual Design**: AI suggestions now have purple gradient styling with dashed border
- **Improved UX Flow**: Users can accept suggestions with TAB/click or simply type to dismiss naturally
- **Clearer Instructions**: Updated hint text to explain both acceptance and dismissal options
- 🎮 **Quick AI Toggle** - AI status button in header now functions as a one-click toggle for AI suggestions
- **Creative Visual States**: AI button shows different emojis (🤖✨ when ON, 🤖💤 when OFF) with beautiful animations
- **Smart UI Hiding**: AI regenerate button and suggestion overlays automatically hide when AI is disabled
- **Intelligent Placeholder**: Input placeholder "Введите сообщение" only shows when AI is OFF to prevent overlap
- **Pulsing Animations**: AI button pulses when enabled and has rotating rainbow glow effect for visual feedback
- **Hover Preview**: Disabled AI button shows green preview on hover to indicate toggle availability
- **Seamless Integration**: All AI-related UI elements respond instantly to the toggle state

# 0.5.4

- **Transition from simple CSS to Shadcn** - all the CSS files were removed and
  Shadcn UI was implemented. Absolutely new version of design.
- 🛠️ **Major Bug Fixes & UX Improvements** - Addressed several UI and functionality issues.
- **Persistent AI Suggestions**: AI suggestions now remain visible even when the user starts typing. A dismissed suggestion can be easily restored with a dedicated button or keyboard shortcuts.
- **Enhanced Keyboard Controls**: Added intuitive keyboard shortcuts for AI suggestions (`Tab` to accept, `Esc` to dismiss, `F1`/`Ctrl+Space` to regenerate/restore).
- **Better Chat Switching**: AI suggestion state is now properly reset when switching between chats, preventing irrelevant suggestions from appearing.

# 0.5.5

- 🧠 **Major AI Intelligence Upgrade** - Completely overhauled AI system to be smarter and more helpful
- **Proactive AI**: AI suggests conversation starters and follow-ups when chats go quiet
- **Smart Context Analysis**: AI now handles three types of suggestions:
  - **Response Mode**: Suggests replies to incoming messages
  - **Conversation Starter**: Suggests opening messages for new/quiet chats
  - **Proactive Mode**: Suggests follow-ups when you've sent the last message and there's no response
- **Fallback Intelligence**: Even without OpenAI API, AI provides basic conversation starters
- **Enhanced Prompts**: Completely rewritten AI prompts to generate more natural, user-like responses
- **New API Endpoints**: Added `/ai/suggest/continuous` for always-on AI suggestions
- **Enhanced Settings**: New toggles for "Continuous Suggestions" and "Proactive Suggestions"
- **Smarter Detection**: AI distinguishes between formal/casual conversations and responds appropriately
- **User Style Learning**: Improved analysis of user writing patterns for more authentic suggestions
- 🎛️ **Flexible AI Modes** - Added proper manual vs automatic AI suggestion modes
- **AI Disabled = No AI Features**: When AI is turned OFF, all AI elements disappear (buttons, suggestions, shortcuts)
- **Automatic Mode**: Toggle to auto-suggest responses when you receive messages (like the old behavior)
- **Manual Mode**: Use the robot button (🤖) to request suggestions only when you want them

# 0.5.6

- Pre Version of implementing NEW AI
- Small bug fixes

# 0.6.0

- 🧠 **RAG (Retrieval-Augmented Generation) System Implementation** - Complete AI overhaul with vector-based memory
- **Vector Storage**: Implemented Qdrant vector database for intelligent message storage and retrieval
- **Semantic Search**: AI can now find similar past conversations to enhance suggestion quality
- **Enhanced Memory**: Messages are converted to embeddings using SentenceTransformers for deep semantic understanding
- **RAG API Endpoints**: New `/api/rag/*` routes for vector operations, similarity search, and enhanced suggestions
- **Auto-Sync**: Chat history automatically syncs with RAG when selecting chats (rate-limited to 1 hour)
- **Smart Context**: AI suggestions now use both recent messages AND semantically similar historical context
- **Visual RAG Indicators**: Green "RAG" badge appears when AI suggestions are enhanced with vector search
- **Similar Context Display**: Shows snippets of past similar messages that influenced the current suggestion
- **Background Processing**: RAG operations happen asynchronously to maintain UI responsiveness
- **Fallback Support**: Graceful degradation to traditional AI when RAG is unavailable
- **Developer Tools**: Added RAG statistics endpoint and chat history clearing functionality
- 🔧 **Backend Enhancements**:
  - Added `TelegramRAGEngine` class with full vector search capabilities
  - Integrated with existing `MessageAnalyzer` for hybrid AI approach
  - Enhanced message processing pipeline to include RAG storage
  - Added lazy initialization for vector collections
- 📱 **Frontend Integration**:
  - New `RAGService` TypeScript class for frontend-backend communication
  - Automatic message syncing when switching chats
  - RAG-enhanced AI suggestions with visual feedback
  - Smart caching of sync operations to prevent overloading
- 🔒 **Secure RAG System with OpenAI Embeddings** - Major security and performance upgrade
- **OpenAI Integration**: Migrated from SentenceTransformers to OpenAI `text-embedding-3-small` for superior embedding quality
- **Privacy-First Design**: Raw message text is NEVER stored - only embeddings and safe metadata
- **Secure Storage**: Messages are hashed and anonymized before storage in Qdrant vector database
- **Text-to-Hash Mapping**: Content hashing prevents duplicate storage without exposing raw text
- **Auto-Expiration**: Built-in data retention with configurable expiration (30 days default)
- **Secure API Endpoints**: Updated `/api/rag/*` routes with privacy-focused responses
- 🔧 **Technical Improvements**:
  - **SecureTelegramRAGEngine**: New privacy-focused RAG engine class
  - **1536-dimensional vectors**: Higher quality embeddings with OpenAI's latest model
  - **Optimized Qdrant collections**: HNSW indexing and INT8 quantization for memory efficiency
  - **Metadata-only searches**: Similar message search returns context hints, never raw text
  - **Session isolation**: Each user session has secure, isolated data storage
- 🛡️ **Security Features**:
  - Raw text deletion after embedding creation
  - SHA-256 content hashing for deduplication
  - Secure message ID generation
  - Automatic cleanup of expired data
  - Privacy-protected search results
- 📊 **Enhanced Monitoring**: New stats endpoints showing storage metrics without exposing sensitive data

# 0.6.1

- 🤖 **Advanced RAG Pipeline for Smart Suggestions** - Complete RAG-enhanced AI suggestion system
- **LangChain Integration**: Implemented professional RAG pipeline architecture for enterprise-grade AI suggestions
- **Intelligent Message Generation**: AI now uses RAG context to generate more relevant, personalized responses
- **Enhanced Style Analysis**: User communication style analysis enhanced with RAG pattern recognition
- **Smart Context Retrieval**: System finds similar past conversations to inform current suggestion generation
- **Direct OpenAI Integration**: Streamlined RAG pipeline using OpenAI Chat Completions for suggestion generation
- **Privacy-Protected RAG**: Context retrieval provides semantic hints without exposing raw message content
- 🔧 **RAG Pipeline Features**:
  - **RAGPipeline Class**: Professional implementation with async support and error handling
  - **Context-Aware Prompts**: Sophisticated prompt engineering using retrieved conversation patterns
  - **Style-Enhanced Suggestions**: User writing style integrated into RAG context for authentic responses
  - **Confidence Scoring**: AI suggestions include confidence scores based on context relevance
  - **Multi-Type Support**: Handles response, proactive, and conversation starter suggestion types
- 🛡️ **Enhanced Security & Performance**:
  - **Metadata-Only Context**: RAG search results provide contextual hints without raw text exposure
  - **Intelligent Filtering**: Smart similarity thresholds prevent irrelevant context inclusion
  - **Efficient Processing**: Streamlined pipeline for fast suggestion generation
  - **Error Resilience**: Graceful fallback to traditional AI when RAG is unavailable
- 📡 **Updated API Endpoints**:

  - `/ai/suggest/rag-enhanced`: New endpoint for maximum quality RAG-powered suggestions
  - Enhanced `/ai/suggest` with automatic RAG integration
  - Updated suggestion responses include RAG metadata and confidence scores

# 0.6.2

- Bug fixes
- Fixed error with posting new messages

# 0.6.3

- MultiAgent System Release
- Significant AI upgrade

# 0.6.4

- 📱 **WhatsApp Integration** - Complete WhatsApp Web integration with real-time messaging
- **WhatsApp Web Client**: Full integration with whatsapp-web.js for seamless messaging
- **Real-time Messaging**: Live message updates using Socket.IO with instant chat synchronization
- **QR Code Authentication**: Secure WhatsApp login via QR code scanning
- **Session Management**: Persistent WhatsApp sessions with automatic reconnection
- **Unified Messaging Interface**: WhatsApp and Telegram now share the same modern UI/UX
- **Profile Integration**: WhatsApp connection status now shows in Profile page like Telegram
- **Database Integration**: Added `is_whatsapp_connected` field to user model for persistent status tracking
- **Auto-scroll & Focus**: WhatsApp messages auto-scroll to bottom and input auto-focuses like Telegram
- **Chat Sorting**: WhatsApp chats sort by last message timestamp with real-time updates
- **Message History**: Full message history loading with proper pagination
- **Typing Indicators**: Real-time typing status for better user experience
- **Search Functionality**: WhatsApp chat search with instant filtering
- **Loading States**: Proper loading indicators and error handling throughout
- **Cross-platform Support**: Works on both desktop and mobile browsers

# 0.6.4

- Landing Redesign
- Enhaced animations

# 0.6.5

- 🧠 **Smart Context Break Detection** - Fixed AI giving inappropriate suggestions for greetings after long conversations
- **Time-Aware AI**: AI now detects when someone sends a greeting after a long pause (2+ hours) and treats it as a fresh conversation start - **Greeting Pattern Recognition**: System recognizes common greeting patterns ("привет", "как дела", "hi", "hey", etc.) to identify conversation restarts
- **Context Reset**: When greeting after long pause is detected, AI ignores old conversation topics and responds appropriately to the greeting - **Smart Caching**: Updated suggestion caching to ensure fresh responses for context breaks
  - **Enhanced Response Logic**: AI system now differentiates between:
    - **Continuous conversation**: Uses full context for relevant suggestions
    - **Fresh greeting**: Responds naturally to greeting without referencing old topics
    - **Context break**: Treats as new conversation start after significant time gap
  - 🔧 **Technical Improvements**:
    - Added `_detect_context_break()` method for intelligent conversation flow analysis
    - Enhanced `_generate_response_suggestion()` with context-aware processing
    - Updated cache key generation to handle context breaks properly
    - Improved time gap analysis for more accurate conversation state detection

# 0.6.6

- Completely new Landing Page
- Small Bug fixes
- Searching added to the Telegram Client
- Settings Page updated

# 0.6.6.1

- Fixed bug with auto-scroll
- Fixed the bug of loading old messages and auto-scroll to new messages
- Added button "Scroll to down"

# 0.6.7

- Landing redesign
- Small Bug fixes with navigation

# 0.6.8

- 🎨 **Complete Cyberpunk UI Redesign** - Transformed the entire landing page with futuristic aesthetics
- **Project Rebranding**: Official name change to "chathut" with cyberpunk styling
- Account System added
  -- Registration
  -- Log In
  -- Connected Messangers (for now only Telegram)
- Thousands of small bugs fixed

# 0.6.9

- Now Telegram session is storing within the account

# 0.7.0

- Nav Redesign in telegram Client
  -- Cyberpunk Nav design
  -- Added Brand logo "chathut"
  -- Changed buttons
  --- Added "profile" button
  --- Deleted button "Logout"
- Domain chathut.net bought!
- Deployed to Digital Ocean

# 0.7.1

- Switched from OpenAI to Google Gemini for AI features
- Updated AI message suggestions to use Gemini API
- Updated documentation and setup instructions for Gemini
- Improved embedding generation with Gemini's embedding model

# 0.7.2

- Fixed bugs with input focus
- Fixed bugs with scroll
- 🛡️ **Security & Transparency Page** - Added comprehensive "How It Works" page accessible from the landing page

# 0.7.2a

- Bugs fixed
- Profile page slightly changed
- NavBar Redisgned

# 0.7.2b

- **Improved Navigation UX**: Enhanced navigation bar with better user experience
  - Removed redundant home button (logo now serves as home button)
  - Added user dropdown menu with profile, settings and logout options
  - Moved user avatar to the right side for better accessibility
  - Improved platform switcher button placement
  - Enhanced mobile responsiveness with compact dropdown

# 0.7.3

- 🚀 **WhatsApp Integration** - Complete WhatsApp Web integration with unified messaging architecture
- **Unified Messaging System**: Created abstract messaging provider interface supporting both Telegram and WhatsApp
- **WhatsApp Web Service**: Separate Node.js service using whatsapp-web.js for WhatsApp connectivity
- **Provider Architecture**: Clean separation between Telegram and WhatsApp with shared interfaces
- **Real-time Messaging**: WebSocket support for both platforms with unified event handling
- **Unified Store**: Zustand-based messaging store that manages both Telegram and WhatsApp data
- **Feature Flag System**: Prepared foundation for future unified client view
- **Backend Integration**: New WhatsApp API endpoints and client manager in FastAPI backend
- **Frontend Components**: Complete WhatsApp UI components (auth, chat list, message area)
- **Session Management**: Secure session handling for both messaging platforms
- **Future-Ready**: Architecture prepared for merging Telegram and WhatsApp into single client view

# 0.7.4

- 📱 **WhatsApp UX Enhancement** - Upgraded WhatsApp interface to match Telegram UX patterns
- **Auto-Focus Input**: Input field automatically focuses when opening chats, like in Telegram
- **Smart Scrolling**: Instant scroll to bottom when switching chats, smooth scroll for new messages
- **Scroll-to-Bottom Button**: Animated floating button appears when scrolled up, with hover effects
- **Textarea with Auto-Resize**: Replaced simple input with multi-line textarea that grows with content
- **Message Layout**: Improved message bubbles with better spacing and rounded corners
- **Last Message Display**: Chat list now shows last message preview and timestamps like Telegram
- **Search Functionality**: Added search bar to filter chats with real-time results
- **Loading States**: Proper loading indicators and empty states throughout the interface
- **Backend Enrichment**: WhatsApp backend now fetches and includes last message for each chat
- **Avatar Styling**: Consistent avatar styling with proper fallbacks and colors
- **Time Formatting**: Smart time display (today: HH:MM, yesterday: "вчера", older: weekday/date)
- **Chat Sorting**: Chats automatically sorted by last message timestamp for better organization
- **Keyboard Navigation**: Full keyboard support for sending messages (Enter to send, Shift+Enter for new line)
- **Visual Polish**: Improved spacing, borders, and visual hierarchy throughout WhatsApp interface

# 0.7.5

- Working version of Whatsapp available
- Whatsapp session stores in the profile
- Whatsapp session info display in the profile UI

# 0.7.6

- WhatsApp AI integrations works now succesfully
- Copied existing Telegram UI to WhatsAPP

# 0.7.7

- Redesigned Profile Page
- WhatsApp session storage fixed

# 0.7.8

- Complete Redesign - Bye Cyberpunk, Hello Chat Hut!
- Floating Messages Background: New animated background with real chat messages floating across the screen (Telegram blue, WhatsApp green, AI orange)
- Cozy Chat Hut Branding: Repositioned chathut as "your cozy messaging home" rather than cyberpunk neural matrix
- Multi-Language Support: Added full Russian/English language support with context-based translations
  - Language switcher component with flag indicators
  - Persistent language preference stored in localStorage
  - Complete translation system with React context
  - Redesigned Security page with language support
- Profile Page Redesign: Complete profile page redesign to match new messaging theme
  - Replaced cyberpunk elements with modern chat-focused design
  - Added floating message bubbles background with platform-specific colors
  - Implemented multi-language support with Russian/English translations
  - Redesigned platform connection cards with cleaner messaging aesthetic
  - Updated user information display with modern card layout
  - Enhanced responsive design for better mobile experience
  - Improved loading and error states with consistent styling
- NavBar UX Changed

# 0.7.9

- OpenAI was replaced with Gemini AI
- New feature - AI Chat Panel
- Universal AI Assistant - Dedicated AI panel that opens on the right side of any chat (Telegram/WhatsApp)
- **Context-Aware Analysis**: AI understands the entire conversation context and can answer specific questions about it
- **Smart Query Interface**: Ask AI anything about the current chat:
  - "О чём мы говорили вчера?" - Conversation timeline analysis
  - "Сделай краткий пересказ переписки" - Smart summarization
  - "Найди упоминания адреса или встречи" - Information extraction
  - "Как лучше ответить на это сообщение?" - Response suggestions
- **Quick Suggestions**: Pre-built question templates for common analysis tasks
- **Beautiful UI**: Smooth animations, typing indicators, and modern chat bubble design
- **Multi-Platform Support**: Works seamlessly in both Telegram and WhatsApp conversations
- 🛠️ **Technical Implementation**:
  - **Universal AIPanel Component**: Reusable across all messaging platforms
  - **New API Endpoint**: `/ai/chat-context` for contextual conversation analysis
  - **RAG Integration**: Uses existing RAG system for enhanced context understanding
  - **Real-time Context**: Automatically includes last 15 messages for accurate analysis
  - **Session Isolation**: Each chat conversation has its own AI context and memory
- Privacy & Performance enhanced
  - **Contextual Processing**: Only processes current chat messages, maintains conversation privacy
  - **Secure Context Passing**: Messages sent securely to AI for analysis without permanent storage
    - **Smart Memory**: Automatically limits context to prevent overwhelming AI with too much data

# 0.8.0

- Google Analytics Added

## 0.8.0a

- Some bugs fixed, unused variables deleted

## 0.8.0c

- localstorate websocket fix

## 0.8.0d

- Handle error 400 added
- Some logs added for debugging
- Chatid validation added

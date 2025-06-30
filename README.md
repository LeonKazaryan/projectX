### Versions

#0.1

-Landing Page created

#0.2

-Telegram Login Feature added
-Added fully functional Telegram Client will the users chats and ability to send messages

#0.3

- Implemented real-time messaging using WebSockets, so new messages appear instantly.
- The chat list now updates in real-time with the latest message and unread counts.
- Added connection status indicators to the UI to show if the real-time connection is active.

#0.4

- Added chat filtering functionality to hide archived chats and read-only channels by default.
- Implemented Settings modal with toggles for "Show Archived Chats" and "Show Read-Only Channels".
- Added visual badges to indicate archived chats (📦) and read-only channels (🔒) in the chat list.
- Settings are automatically saved to localStorage and persist between sessions.
- Enhanced backend API to support filtering parameters for better chat management.

#0.4.1

- Implemented "Show Group Chats" in the Settings.
- Group chats can now be filtered in/out based on user preference through the settings panel.
- Fixed group chat filtering to properly handle supergroups and community chats.
- Implemented real-time chat list reordering - active chats now move to the top instantly.
- Both incoming and outgoing messages trigger chat reordering for better UX.
- Chat list now behaves like modern messaging apps with recent conversations at the top.

#0.5

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

#0.5.1

- 🎨 **Major UI/UX Improvements** - Completely redesigned Settings and AI Settings interfaces
- **Sticky Headers**: Settings modals now have fixed headers that stay visible while scrolling
- **Better AI Controls**: Replaced memory limit slider with clear dropdown options (5/10/20/30 messages)
- **Sound-bar Style Slider**: New visual delay slider with gradient background and better interaction
- **Modern Toggle Switches**: Upgraded all toggles with smooth animations and better visual feedback
- **Enhanced Visual Design**: Added gradients, hover effects, better spacing, and modern styling
- **Improved Responsiveness**: Better mobile experience with optimized layouts
- **Better Error Handling**: Enhanced error messages and loading states for AI settings
- **Visual Indicators**: Added emojis and better typography for clearer section identification

#0.5.2

- 🔧 **UI Fixes** - Fixed dark text on dark background in settings information sections
- **Placeholder Fix**: Resolved placeholder text overlapping with AI suggestions in message input
- 🤖 **Smart Regenerate Button** - Added intelligent AI suggestion regeneration functionality
- **Context-Aware Behavior**: Button restores last suggestion when user typed something, generates new when input is empty
- **Last Suggestion Storage**: System now remembers the last AI suggestion for easy restoration
- **Visual Feedback**: Different icons (🔄 for restore, 🤖✨ for new) to indicate button function
- **Improved UX**: Enhanced message input experience with better AI suggestion handling

#0.5.3

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

#0.5.4

- **Transition from simple CSS to Shadcn** - all the CSS files were removed and
  Shadcn UI was implemented. Absolutely new version of design.
- 🛠️ **Major Bug Fixes & UX Improvements** - Addressed several UI and functionality issues.
- **Persistent AI Suggestions**: AI suggestions now remain visible even when the user starts typing. A dismissed suggestion can be easily restored with a dedicated button or keyboard shortcuts.
- **Enhanced Keyboard Controls**: Added intuitive keyboard shortcuts for AI suggestions (`Tab` to accept, `Esc` to dismiss, `F1`/`Ctrl+Space` to regenerate/restore).
- **Better Chat Switching**: AI suggestion state is now properly reset when switching between chats, preventing irrelevant suggestions from appearing.

#0.5.5

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

#0.5.6

- Pre Version of implementing NEW AI
- Small bug fixes

#0.6

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

#0.6.1

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

  #0.6.2

  - Bug fixes
  - Fixed error with posting new messages

  #0.6.3

- MultiAgent System Release
- Significant AI upgrade

  #0.6.4

  - 🎨 **Revolutionary Landing Page Redesign** - Completely overhauled landing page with stunning modern design
  - **Dark Theme Excellence**: Beautiful dark gradient background with purple-to-slate color scheme
  - **Interactive Animations**: Mouse-following gradient effects, hover animations, and smooth transitions
  - **Glassmorphism UI**: Modern glass-like components with backdrop blur and transparency effects
  - **Advanced Typography**: Gradient text effects, large modern fonts, and perfect spacing
  - **Floating Elements**: Subtle floating animations and rotating hover effects on feature cards
  - **Professional Presentation**: Premium visual design with glow effects, shadows, and modern aesthetics
  - **Mobile Responsive**: Fully optimized for all device sizes with adaptive layouts
  - **Accessibility First**: Respects user motion preferences and provides excellent contrast
  - **Unique Visual Identity**: Custom color scheme and animations that stand out from template designs
  - **Interactive Features**: Smooth scrolling, animated CTA buttons, and engaging hover states
  - **Modern CSS**: Advanced CSS animations, keyframes, and responsive design patterns

  #0.6.5

  - 🧠 **Smart Context Break Detection** - Fixed AI giving inappropriate suggestions for greetings after long conversations
  - **Time-Aware AI**: AI now detects when someone sends a greeting after a long pause (2+ hours) and treats it as a fresh conversation start
  - **Greeting Pattern Recognition**: System recognizes common greeting patterns ("привет", "как дела", "hi", "hey", etc.) to identify conversation restarts
  - **Context Reset**: When greeting after long pause is detected, AI ignores old conversation topics and responds appropriately to the greeting
  - **Smart Caching**: Updated suggestion caching to ensure fresh responses for context breaks
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

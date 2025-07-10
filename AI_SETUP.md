# 🤖 AI Message Suggestions Setup Guide

This guide explains how to set up and use the AI-powered message suggestions feature in your Telegram web client.

## Prerequisites

1. **Google Gemini API Key** - You need a Google Gemini API key
2. **Python Dependencies** - Make sure `google-generativeai>=0.8.0` is installed
3. **Environment Configuration** - Properly configured environment variables

## Setup Steps

### 1. Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign up or log in to your Google account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `AIzaSy`)

### 2. Configure Environment

Add your Gemini API key to your environment file:

```bash
# In back/.env file
GEMINI_API_KEY=AIzaSy-your-actual-api-key-here
```

Or copy from the example:

```bash
cp back/envcopy.txt back/.env
```

Then edit the `.env` file with your actual API key.

### 3. Install Dependencies

```bash
cd back
pip install -r requirements.txt
```

### 4. Start the Application

Make sure both backend and frontend are running:

```bash
# Backend
cd back
python main.py

# Frontend (in another terminal)
cd front
npm run dev
```

## How to Use AI Suggestions

### Basic Usage

1. **Enable AI**: Go to Settings → AI Assistant → Configure
2. **Start Chatting**: Open any conversation
3. **Receive Suggestions**: When someone sends you a message, wait for the AI suggestion to appear in gray text
4. **Accept Suggestion**: Press `TAB` key or click the ⭐ button to use the suggestion
5. **Customize**: Type your own message to override the suggestion

### AI Settings

Access AI settings through: **Settings → AI Assistant → 🤖 Configure**

#### Available Settings

- **Enable AI Suggestions**: Turn AI on/off
- **Memory Limit**: 5-100 messages (how much conversation context AI remembers)
- **Suggestion Delay**: 0-5 seconds (delay before showing suggestions)

#### Recommended Settings

- **For Quick Responses**: Memory: 10-20, Delay: 0.5-1s
- **For Detailed Context**: Memory: 50-100, Delay: 1-2s
- **For Slower Connections**: Memory: 10-20, Delay: 2-3s

## How AI Suggestions Work

### Learning Your Style

The AI analyzes your previous messages to understand:

- Your formality level (casual vs formal)
- Emoji and slang usage
- Average message length
- Punctuation patterns
- Vocabulary preferences

### Context Analysis

For each suggestion, AI considers:

- Recent conversation history
- The relationship tone (formal/casual)
- The last message received
- Your typical response patterns

### Privacy & Security

- Messages are sent to OpenAI's API for processing
- No messages are permanently stored by our AI system
- Context is only kept temporarily for suggestions
- You can clear AI context anytime in settings

## Troubleshooting

### No Suggestions Appearing

1. **Check API Key**: Ensure `OPENAI_API_KEY` is correctly set
2. **Check Settings**: Make sure AI is enabled in settings
3. **Check Console**: Look for errors in browser console
4. **Check Logs**: Backend logs will show API issues

### Suggestions Are Poor Quality

1. **Increase Memory Limit**: More context = better suggestions
2. **Chat More**: AI learns from your message history
3. **Check Conversation**: AI works better with active conversations
4. **Language**: AI works best with English conversations

### API Rate Limits

If you hit OpenAI rate limits:

1. **Increase Delay**: Set suggestion delay to 2-3 seconds
2. **Reduce Memory**: Lower memory limit to 10-20 messages
3. **Upgrade Plan**: Consider upgrading your OpenAI plan

## API Endpoints

The AI system adds these new endpoints:

- `POST /api/ai/suggest` - Get AI suggestion for current context
- `POST /api/ai/message/add` - Add message to AI context
- `GET /api/ai/settings` - Get user AI settings
- `POST /api/ai/settings` - Update AI settings
- `DELETE /api/ai/context` - Clear conversation context
- `GET /api/ai/health` - Check AI system status

## Keyboard Shortcuts

- `TAB` - Accept AI suggestion (when suggestion is visible)
- `ESC` - Clear/dismiss suggestion
- Start typing - Automatically clears suggestion

## Tips for Better Suggestions

1. **Chat Naturally**: The more you chat, the better AI learns your style
2. **Consistent Style**: Try to maintain consistent communication patterns
3. **Context Matters**: Longer conversations provide better context
4. **Review Suggestions**: Always review before sending - AI isn't perfect!
5. **Customize**: Feel free to modify suggestions to match your exact intent

## Cost Considerations

AI suggestions use OpenAI's API which has costs:

- Typical cost: $0.001-0.005 per suggestion
- Depends on memory limit and conversation length
- Monitor usage on OpenAI dashboard
- Consider setting usage limits on your OpenAI account

## Future Enhancements

Planned features:

- Multiple suggestion options
- Emotion-based suggestions
- Language-specific optimizations
- Local AI model support
- Suggestion quality feedback

---

**Need Help?** Check the logs in your browser console and backend terminal for detailed error messages.

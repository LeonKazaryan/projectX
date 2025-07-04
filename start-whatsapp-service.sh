#!/bin/bash

echo "🚀 Starting WhatsApp Service..."

# Navigate to WhatsApp service directory
cd back/whatsapp-service

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing WhatsApp service dependencies..."
    npm install
fi

# Start the WhatsApp service
echo "🔧 Starting WhatsApp service on port 3000..."
npm start 
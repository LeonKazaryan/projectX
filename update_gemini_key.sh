#!/bin/bash

# Script to update the .env file with the Gemini API key

# Check if the .env file exists
if [ ! -f "back/.env" ]; then
    echo "Error: back/.env file not found. Creating from envcopy.txt..."
    cp back/envcopy.txt back/.env
fi

# Check if the GEMINI_API_KEY is provided as an argument
if [ -z "$1" ]; then
    echo "Error: No API key provided."
    echo "Usage: ./update_gemini_key.sh YOUR_GEMINI_API_KEY"
    exit 1
fi

GEMINI_API_KEY=$1

# Check if OPENAI_API_KEY exists in the .env file
if grep -q "OPENAI_API_KEY" back/.env; then
    # Replace OPENAI_API_KEY with GEMINI_API_KEY
    sed -i '' "s/OPENAI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_API_KEY/" back/.env
    echo "Replaced OPENAI_API_KEY with GEMINI_API_KEY in back/.env"
else
    # Check if GEMINI_API_KEY already exists
    if grep -q "GEMINI_API_KEY" back/.env; then
        # Update the existing GEMINI_API_KEY
        sed -i '' "s/GEMINI_API_KEY=.*/GEMINI_API_KEY=$GEMINI_API_KEY/" back/.env
        echo "Updated GEMINI_API_KEY in back/.env"
    else
        # Add GEMINI_API_KEY to the .env file
        echo "GEMINI_API_KEY=$GEMINI_API_KEY" >> back/.env
        echo "Added GEMINI_API_KEY to back/.env"
    fi
fi

echo "Done! GEMINI_API_KEY has been set to $GEMINI_API_KEY" 
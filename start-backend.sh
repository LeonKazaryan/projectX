#!/bin/bash
# Start FastAPI backend
cd back && uvicorn main:app --reload &
# Start WhatsApp Node.js service
cd back/whatsapp && npm run dev

#!/bin/bash

# Navigate to frontend directory and start dev server with cache clearing
(cd frontend && npm install && npm cache clean --force && VITE_CJS_TRACE=1 npm run dev)

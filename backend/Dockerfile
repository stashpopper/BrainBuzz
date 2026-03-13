FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --legacy-peer-deps

# Copy app source code
COPY . .

# Ensure uploads directory exists (temp PDF storage before Cloudinary upload)
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 5001

# Start the application (NODE_ENV is injected via docker-compose/Render env vars)
CMD ["node", "server.js"]
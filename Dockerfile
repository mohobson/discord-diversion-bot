# Use an official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Expose a port if needed (for optional health check)
EXPOSE 3000

# Run your bot
CMD ["node", "bot.js"]

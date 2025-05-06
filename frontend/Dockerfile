# Use Node.js image for React
FROM node:18-alpine AS build

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the React app code
COPY . .

# Build the React app
RUN npm run build

# Serve the React app using a simple static server
FROM nginx:alpine

# Copy the build files to the nginx container
COPY --from=build /app/build /usr/share/nginx/html

# Expose the port the app will run on
EXPOSE 80

# Start nginx to serve the React app
CMD ["nginx", "-g", "daemon off;"]

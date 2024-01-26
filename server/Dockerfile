# Use an official Node runtime as the parent image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install any needed packages specified in package.json and PM2
RUN npm install --force
RUN npm install pm2 -g

# Use an argument to specify environment (development or production)
ARG NODE_ENV=production

# Install nodemon for development environment
RUN if [ "$NODE_ENV" = "development" ]; then npm install -g nodemon; fi



# Bundle the app source inside the Docker image
COPY . .

# The application's default port
EXPOSE 8080

# Use PM2 to run the app
CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]
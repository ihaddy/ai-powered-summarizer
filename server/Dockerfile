# Use an official Node runtime as the parent image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install --force

# Bundle the app source inside the Docker image
COPY . .

# The application's default port
EXPOSE 8080

# Define the command to run the app
CMD [ "node", "server.js" ]

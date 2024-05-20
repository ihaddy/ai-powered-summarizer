# Use an official Node runtime as the parent image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json from the worker directory to the working directory
COPY worker/package.json ./package.json
COPY yarn.lock ./yarn.lock

# Install any needed packages specified in package.json
RUN yarn install

# Copy the rest of the worker directory contents to the working directory
COPY worker/ .

# The application's default port
EXPOSE 3000

# Start the application
CMD ["yarn", "start"]
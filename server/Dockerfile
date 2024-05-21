# Use an official Node runtime as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the entire server directory including package.json
COPY server/ ./

# Copy the yarn.lock from the project root
# Change to the server directory and install dependencies
WORKDIR /usr/src/app/
RUN yarn install

# Set the environment to development
ENV NODE_ENV=development

# The application's default port
EXPOSE 3002

# Start the server using nodemon
CMD ["yarn", "start:dev"]

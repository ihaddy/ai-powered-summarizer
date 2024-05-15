# Use an official Node runtime as the base image
FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and yarn.lock files
COPY server/package.json  ./

# Install dependencies
RUN yarn install

# Copy the rest of the server project files
COPY server/ .

# Set the environment to development
ENV NODE_ENV=development

# The application's default port
EXPOSE 3002

# Start the server using nodemon
CMD ["yarn", "start:dev"]
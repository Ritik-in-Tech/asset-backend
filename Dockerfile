FROM node:alpine3.18
WORKDIR /src
COPY package.json ./
RUN npm install
COPY . .

# Create secure_files directory
RUN mkdir -p secure_files

# Use build args to receive file contents
ARG SERVICE_KEY_CONTENT
ARG OPENSSL_CNF_CONTENT
ARG SSL_KEY_CONTENT
ARG SSL_CERT_CONTENT


# Create files with content from build args
RUN echo "$SERVICE_KEY_CONTENT" > ./secure_files/service_key.json && \
    echo "$OPENSSL_CNF_CONTENT" > ./secure_files/openssl.cnf && \
    echo "$SSL_KEY_CONTENT" > ./secure_files/localhost.key && \
    echo "$SSL_CERT_CONTENT" > ./secure_files/localhost.crt

    
# Set environment variables with relative paths
ENV SERVICE_KEY="./secure_files/service_key.json"
ENV OPENSSL_CNF_PATH="./secure_files/openssl.cnf"
ENV SSL_KEY_PATH="./secure_files/localhost.key"
ENV SSL_CERT_PATH="./secure_files/localhost.crt"

EXPOSE 443
EXPOSE 80

CMD ["npm", "run", "dev"]

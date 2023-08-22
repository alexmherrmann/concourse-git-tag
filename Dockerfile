# Use the aws cli to deploy to beanstalk
FROM --platform=linux/amd64 alpine:3
# FROM --platform=linux/arm64 alpine:3

# Install jq
RUN apk add --no-cache jq git nodejs npm bash openssh zip tar gzip
RUN npm install -g ts-node

RUN mkdir /app
WORKDIR /app

# Install from the package.json
ADD package.json .
RUN npm install

ADD tsconfig.json /app

ADD run.sh /opt/resource/in
ADD run.sh /opt/resource/out
ADD run.sh /opt/resource/check

ADD *.ts /app
RUN npm run build

# ENTRYPOINT [ "node" ]

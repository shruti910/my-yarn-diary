#!/bin/bash

# Configuration
AWS_USER="ubuntu"
AWS_IP=$1
PEM_FILE=$2

if [ -z "$AWS_IP" ] || [ -z "$PEM_FILE" ]; then
  echo "Usage: ./deploy.sh <AWS_INSTANCE_IP> <PATH_TO_PEM_FILE>"
  echo "Example: ./deploy.sh 54.123.45.67 ~/.ssh/my-key.pem"
  exit 1
fi

echo "Deploying to AWS Instance at $AWS_IP..."

# Step 1: Copy necessary files to the EC2 instance
# Note: '~/backend/' is the directory that will be created ON the remote EC2 server.
# It does not need to exist on your local Mac.
echo "Copying files to EC2..."
rsync -avz -e "ssh -i $PEM_FILE -o StrictHostKeyChecking=no" \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'node_modules' \
  --exclude 'frontend' \
  --exclude '.vscode' \
  --exclude '**/target/' \
  --exclude 'crochet_db.json' \
  --exclude 'postgres_data' \
  --exclude 'docker-compose.override.yml' \
  --exclude '.env' \
  --exclude '.env.prod' \
  --exclude 'secrets/firebase-credentials-dev.json' \
  ./ $AWS_USER@$AWS_IP:~/backend/

if [ $? -ne 0 ]; then
  echo "Failed to copy files. Check your connection or PEM file."
  exit 1
fi

echo "Copying .env.prod to EC2 as .env..."
scp -i "$PEM_FILE" -o StrictHostKeyChecking=no .env.prod $AWS_USER@$AWS_IP:~/backend/.env
if [ $? -ne 0 ]; then
  echo "Failed to copy .env.prod. Ensure .env.prod exists in your root folder."
  exit 1
fi

# Step 2: Connect to EC2 and deploy via Docker Compose
echo "Starting services on EC2..."
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no $AWS_USER@$AWS_IP << 'EOF'
  cd ~/backend
  
  # Ensure Docker is running (fails gracefully if already running)
  sudo systemctl start docker || true

  # Export the domain environment variable from .env
  export $(grep -v '^#' .env | xargs)

  # Pull the latest base images and build our custom services
  sudo -E docker compose -f docker-compose.yml -f docker-compose.prod.yml pull
  sudo -E docker compose -f docker-compose.yml -f docker-compose.prod.yml build
  
  # Start the services in detached mode
  sudo -E docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

  # Clean up old images to save space
  sudo -E docker image prune -f
EOF

echo "Deployment completed successfully!"

# Development container for Noa Server
FROM node:20.17.0-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.12 \
    python3-pip \
    python3-venv \
    build-essential \
    git \
    curl \
    wget \
    vim \
    postgresql-client \
    redis-tools \
    mongodb-clients \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@9.11.0

# Install Python tools
RUN pip3 install --no-cache-dir \
    black \
    flake8 \
    mypy \
    pytest \
    pytest-asyncio

# Set up workspace
WORKDIR /workspace

# Create non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Configure git
RUN git config --system core.autocrlf input && \
    git config --system pull.rebase false

# Set up shell
RUN echo 'alias ll="ls -alF"' >> /home/$USERNAME/.bashrc && \
    echo 'alias la="ls -A"' >> /home/$USERNAME/.bashrc && \
    echo 'alias l="ls -CF"' >> /home/$USERNAME/.bashrc

# Keep container running
CMD ["sleep", "infinity"]

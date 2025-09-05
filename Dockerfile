# Use official Node 20 image (Debian Bullseye)
FROM node:20-bullseye

# Install system dependencies needed for VS Code & Xvfb
RUN apt-get update && apt-get install -y \
    xvfb \
    git \
    sudo \
    dbus-x11 \
    xauth \
    gvfs \
    xdg-utils \
    x11-utils \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxtst6 \
    libnss3 \
    libgbm1 \
    libxss1 \
    libasound2 \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libxkbfile1 \
    libsecret-1-0 \
    libdrm2 \
    libxshmfence1 \
    libegl1 \
    libgl1 \
    libnotify4 \
    fonts-liberation \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update && apt-get install -y sudo \
    && echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME



# export HOME=/home/runner
# export USER=runner
# export VSCODE_USER_DATA_DIR=/tmp/vscode-test-user-data
# export XDG_CONFIG_HOME=/home/runner/.config
# export XDG_DATA_HOME=/home/runner/.local/share
# export DISPLAY=:99
# export TEST_RESOURCES=/tmp/test-resources

# Set working directory
WORKDIR /home/$USERNAME

USER $USERNAME


# Copy package.json and package-lock.json and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Make node_modules a separate volume to avoid conflicts with host
VOLUME /home/vscode/node_modules

# Default command: start a bash shell
CMD ["bash"]

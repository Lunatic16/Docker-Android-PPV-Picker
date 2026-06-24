# Dockerfile — PPVPicker Android builder
# Ubuntu 22.04 + Java 17 + Node 20 + Android SDK 28/34 + NDK
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=C.UTF-8

# ── System packages ───────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    curl wget unzip zip git file \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$PATH:$JAVA_HOME/bin

# ── Node 20 ───────────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Android SDK command-line tools ────────────────────────────────────────────
ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
         -O /tmp/cmdline-tools.zip && \
    unzip -q /tmp/cmdline-tools.zip -d /tmp/ct && \
    mv /tmp/ct/cmdline-tools $ANDROID_HOME/cmdline-tools/latest && \
    rm -rf /tmp/cmdline-tools.zip /tmp/ct

# ── Accept licences and install SDK components ────────────────────────────────
RUN yes | sdkmanager --licenses > /dev/null 2>&1 && \
    sdkmanager \
        "platform-tools" \
        "platforms;android-34" \
        "platforms;android-28" \
        "build-tools;34.0.0" \
        "ndk;26.1.10909125"

# ── Pre-warm Gradle so first build doesn't re-download the wrapper ────────────
# React Native 0.74 uses Gradle 8.6
RUN wget -q https://services.gradle.org/distributions/gradle-8.6-all.zip \
         -O /tmp/gradle-8.6-all.zip && \
    mkdir -p /root/.gradle/wrapper/dists/gradle-8.6-all/*/  && \
    mv /tmp/gradle-8.6-all.zip \
       /root/.gradle/wrapper/dists/gradle-8.6-all/ && \
    echo "Gradle zip cached"

# ── Bump npm's network timeout for slow CI environments ───────────────────────
RUN npm config set fetch-timeout 120000

WORKDIR /app

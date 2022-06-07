FROM debian:buster

ENV DEBIAN_FRONTEND noninteractive

RUN apt-get update
RUN apt-get install -y \
    wget \
    libcanberra-gtk-module \
    libcanberra-gtk3-module
RUN apt-get clean

RUN cd /tmp && apt-get install -y chromium

CMD ["chromium", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] 

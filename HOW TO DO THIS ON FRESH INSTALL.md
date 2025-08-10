# Hardware

-   Raspberry Pi 4 (maybe a 3, definitely a 4, NOT A ZERO OR 5)
-   https://www.adafruit.com/product/2279 or similar led matrix
-   https://www.adafruit.com/product/3211 to connect the pi and matrix
-   https://www.adafruit.com/product/1466 power supply for the hat/matrix also powers the pi
-   mini hdmi to hdmi to connect pi to a monitor, usb keyboard to use with pi if need
-   sd card, 16gb is fine
-   alejandros 3d models for it

# Use Ubuntu

Whatever latest version should probably be fine idk

# Cleanup things

First
`sudo apt upgrade`
Do this just in case
`sudo apt-get remove bluez bluez-firmware pi-bluetooth triggerhappy pigpio`
Switch off on board audio `dtparam=audio=off` in `/boot/firmware/config.txt` (might be in `/boot` directly)
Check for sound module
`lsmod | grep snd_bcm2835`
If any results (aka it exists) run this

```sh
cat <<EOF | sudo tee /etc/modprobe.d/blacklist-rgb-matrix.conf
blacklist snd_bcm2835
EOF

sudo update-initramfs -u
```

Reboot the pi
`sudo reboot`

# Things you need on the pi

-   Install unzip, its required for bun `sudo apt-get install unzip`
-   Install gcc/g++/make `sudo apt install build-essential`
-   Install bun `curl -fsSL https://bun.sh/install | bash`
    -   Add bun to sudo path
    -   `sudo visudo`
    -   Find the secure_path and add to the end (before the closing quote)
    -   `/home/${username of the pi, been defaulting to "pi"}/.bun/bin/bun`
    -   save and exit with ctrl+x and then Y and enter
-   Install git if not already installed `sudo apt-get install git`
-   Make sure git is configured with credentials
    Generate a key following these steps: more details

`ssh-keygen -t rsa -b 4096 -C "yourEmail@something.com"`

set a passphrase that protects the key and store it locally

Copy the contents of the id_rsa.pub file to your clipboard for next step
(Can also cat it and copy)
clip < ~/.ssh/id_rsa.pub

Go to github.com → Settings → SSH and GPG keys → New SSH Key. Paste they key and save it

If the private key is saved as id_rsa in the `~/.ssh/` directory, we add it for authentication as such:

`eval "$(ssh-agent -s)"`
`ssh-add ~/.ssh/id_rsa`

-   Clone this repo USING THE SSH LINK since we setup that key

# How to run

-   theoretically just `bun index.ts` cuz bun does typescript?

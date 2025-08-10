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
Switch off on board audio `dtparam=audio=off` in `/boot/config.txt`
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

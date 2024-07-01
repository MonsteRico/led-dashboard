cd node_modules/rpi-led-matrix/src
cp ../../../fixPackage/led-matrix.addon.cc .
cp ../../../fixPackage/types.ts .
npm run build
cd ../../../
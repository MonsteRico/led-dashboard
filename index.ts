import {
  LedMatrix,
  GpioMapping,
  LedMatrixUtils,
  PixelMapperType,
  Font,
} from "rpi-led-matrix";

const matrix = new LedMatrix(
  {
    ...LedMatrix.defaultMatrixOptions(),
    rows: 32,
    cols: 64,
    hardwareMapping: GpioMapping.AdafruitHatPwm,
  },
  {
    ...LedMatrix.defaultRuntimeOptions(),
    gpioSlowdown: 2,
  }
);

  

 matrix.afterSync((mat, dt, t) => {
  matrix.clear()

    matrix.drawText("Hello World", 1, 1);

	 setTimeout(() => matrix.sync(), 0);
});

matrix.sync()

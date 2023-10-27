"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var rpi_led_matrix_1 = require("rpi-led-matrix");
var matrix = new rpi_led_matrix_1.LedMatrix(__assign(__assign({}, rpi_led_matrix_1.LedMatrix.defaultMatrixOptions()), { rows: 32, cols: 64, hardwareMapping: rpi_led_matrix_1.GpioMapping.AdafruitHatPwm }), __assign({}, rpi_led_matrix_1.LedMatrix.defaultRuntimeOptions()));
matrix
    .clear() // clear the display
    .brightness(100) // set the panel brightness to 100%
    .fgColor(0x0000ff) // set the active color to blue
    .fill() // color the entire diplay blue
    .fgColor(0xffff00) // set the active color to yellow
    // draw a yellow circle around the display
    .drawCircle(matrix.width() / 2, matrix.height() / 2, matrix.width() / 2 - 1)
    // draw a yellow rectangle
    .drawRect(matrix.width() / 4, matrix.height() / 4, matrix.width() / 2, matrix.height() / 2)
    // sets the active color to red
    .fgColor({ r: 255, g: 0, b: 0 })
    // draw two diagonal red lines connecting the corners
    .drawLine(0, 0, matrix.width(), matrix.height())
    .drawLine(matrix.width() - 1, 0, 0, matrix.height() - 1);
matrix.afterSync(function (mat, dt, t) {
    setTimeout(function () { return matrix.sync(); }, 0);
});
matrix.sync();

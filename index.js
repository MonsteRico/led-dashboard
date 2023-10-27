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
var matrix = new rpi_led_matrix_1.LedMatrix(__assign(__assign({}, rpi_led_matrix_1.LedMatrix.defaultMatrixOptions()), { rows: 32, cols: 64, hardwareMapping: rpi_led_matrix_1.GpioMapping.AdafruitHatPwm }), __assign(__assign({}, rpi_led_matrix_1.LedMatrix.defaultRuntimeOptions()), { gpioSlowdown: 2 }));
matrix.afterSync(function (mat, dt, t) {
    matrix.font(new rpi_led_matrix_1.Font("Comic Sans MS", "/usr/share/fonts/truetype/msttcorefonts/Comic_Sans_MS.ttf"));
    matrix.drawText("Hello World", 1, 1);
    setTimeout(function () { return matrix.sync(); }, 0);
});
matrix.sync();

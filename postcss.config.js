export default {
  plugins: {
    'postcss-px-to-viewport': {
      viewportWidth: 1440,
      viewportHeight: 900,
      unitToConvert: 'px',
      viewportUnit: 'vw',
      fontViewportUnit: 'vw',
      minPixelValue: 1,
      propList: ['width', 'height', 'min-height', 'max-height', 'padding', 'margin', 'gap', 'top', 'left', 'right', 'bottom'],
      exclude: [/border/, /box-shadow/, /border-radius/],
      mediaQuery: false,
    },
  },
};

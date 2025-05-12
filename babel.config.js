module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@': './src',
        '@components': './src/components',
        '@screens': './src/screens',
        '@hooks': './src/hooks',
        '@services': './src/services',
        '@navigation': './src/navigation',
        '@assets': './assets'
      }
    }]
  ]
};

export default [
  {
    rules: {
      // Ban Math.random() in server code (security risk)
      'no-restricted-globals': [
        'warn',
        {
          name: 'Math.random',
          message: 'Use crypto.randomBytes() or crypto.randomInt() instead of Math.random() in server code.',
        },
      ],
    },
  },
];

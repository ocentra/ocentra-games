export default {
  env: {
    node: true,
    es6: true,
  },
  globals: {
    __ENV: 'readonly',
    k6: 'readonly',
    http: 'readonly',
    check: 'readonly',
    sleep: 'readonly',
    Rate: 'readonly',
  },
};

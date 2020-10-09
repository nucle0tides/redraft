const defaultOptions = {
  joinOutput: false,
  cleanup: {
    after: ['atomic'],
    types: ['unstyled'],
    trim: false,
    split: true,
  },
  blockFallback: 'unstyled',
  blockStyleFn: undefined,
  customStyleFn: undefined,
};

export default defaultOptions;

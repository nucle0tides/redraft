/**
 * Returns a single style object provided styleArray and stylesMap
 */
const reduceStyles = (styleArray, stylesMap) => styleArray
  .map(style => stylesMap[style])
  .reduce((prev, next) => {
    const mergedStyles = {};
    if (next !== undefined) {
      const key = 'text-decoration' in next ? 'text-decoration' : 'textDecoration';
      if (next[key] !== prev[key]) {
        // .trim() is necessary for IE9/10/11 and Edge
        mergedStyles[key] = [prev[key], next[key]].join(' ').trim();
      }
    }
    return Object.assign(prev, next, mergedStyles);
  }, {});


/**
 * Returns a styleRenderer from a customStyleMap and a wrapper callback (Component)
 */
const createStyleRenderer = (wrapper, stylesMap) => (children, styleArray, params) => {
  let style = reduceStyles(styleArray, stylesMap);

  return (customStyleFn) => {
    if (customStyleFn && typeof customStyleFn === 'function') {
      const customStyles = customStyleFn(styleArray);
      style = Object.assign(style, customStyles);
    }

    return wrapper(Object.assign({}, { children }, params, { style }));
  };
};

export default createStyleRenderer;

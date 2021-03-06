import RawParser from './RawParser';
import warn from './helpers/warn';
import checkCleanup from './helpers/checkCleanup';
import getKeyGenerator from './helpers/getKeyGenerator';
import checkJoin from './helpers/checkJoin';
import pushString from './helpers/pushString';
import defaultOptions from './defaultOptions';
import withDecorators from './withDecorators';

const KEY_DELIMITER = '.';

/**
 * Recursively renders a node with nested nodes with given callbacks
 */
export const renderNode = (
  node,
  inlineRenderers,
  entityRenderers,
  styleRenderers,
  entityMap,
  options,
  keyGenerator,
) => {
  if (node.styles && styleRenderers) {
    return styleRenderers(
      checkJoin(node.content, options),
      node.styles, { key: keyGenerator() },
    )(options.customStyleFn);
  }
  let children = [];
  let index = 0;
  node.content.forEach((part) => {
    if (typeof part === 'string') {
      children = pushString(part, children, index);
    } else {
      index += 1;
      children[index] = renderNode(
        part,
        inlineRenderers,
        entityRenderers,
        styleRenderers,
        entityMap,
        options,
        keyGenerator,
      );
      index += 1;
    }
  });
  if (node.style && inlineRenderers[node.style]) {
    return inlineRenderers[node.style](
      checkJoin(children, options), { key: keyGenerator() },
    );
  }
  if (node.entity !== null) {
    const entity = entityMap[node.entity];
    if (entity && entityRenderers[entity.type]) {
      return entityRenderers[entity.type](checkJoin(children, options), entity.data, {
        key: node.entity,
      });
    }
  }
  if (node.decorator !== null) {
    // FIXME: few props are missing see https://github.com/facebook/draft-js/blob/0c609d9d3671fdbbe2a290ed160a0537f846f08e/src/component/contents/DraftEditorBlock.react.js#L196-L205
    const decoratorOffsetKey = [node.block.key, node.start, 0].join(KEY_DELIMITER);
    return node.decorator(
      Object.assign(
        {
          children: checkJoin(children, options),
          decoratedText: node.decoratedText,
          contentState: node.contentState,
          entityKey: node.entity,
          offsetKey: decoratorOffsetKey,
          key: decoratorOffsetKey,
        },
        node.decoratorProps,
      ),
    );
  }
  return children;
};

/**
 * Nests blocks by depth as children
 */
const byDepth = (blocks) => {
  let group = [];
  const depthStack = [];
  let prevDepth = 0;
  const unwind = (targetDepth) => {
    let i = prevDepth - targetDepth;
    // in case depthStack is too short for target depth
    if (depthStack.length < i) {
      i = depthStack.length;
    }
    for (i; i > 0; i -= 1) {
      const tmp = group;
      group = depthStack.pop();
      group[group.length - 1].children = tmp;
    }
  };

  blocks.forEach((block) => {
    // if type of the block has changed render the block and clear group
    if (prevDepth < block.depth) {
      depthStack.push(group);
      group = [];
    } else if (prevDepth > block.depth) {
      unwind(block.depth);
    }
    prevDepth = block.depth;
    group.push(Object.assign({}, block));
  });
  if (prevDepth !== 0) {
    unwind(0);
  }
  return group;
};

/**
 * Conditionaly render a group if its not empty,
 * pass all the params to the renderers
 */
const renderGroup = (group, blockRenderers, rendered, params, options) => {
  const {
    type, depth, key, keys, data, className,
  } = params;
  // in case current group is empty it should not be rendered
  if (group.length === 0) {
    return;
  }
  const renderCb = blockRenderers[type] || blockRenderers[options.blockFallback];
  if (renderCb) {
    const props = {
      depth,
      key,
      keys,
      data,
      className: className && className.length ? className : undefined,
    };

    rendered.push(renderCb(group, props));
    return;
  }
  rendered.push(group);
};

/**
 * Renders blocks grouped by type using provided blockStyleRenderers
 */
const renderBlocks = (
  blocks,
  inlineRenderers = {},
  blockRenderers = {},
  entityRenderers = {},
  stylesRenderer,
  entityMap = {},
  userOptions = {},
) => {
  // initialize
  const options = Object.assign({}, defaultOptions, userOptions);
  const rendered = [];
  let group = [];
  let prevType = null;
  let prevDepth = 0;
  let prevKeys = [];
  let prevData = [];
  let splitGroup = false;
  let className;
  const Parser = new RawParser({ flat: !!stylesRenderer });
  blocks.forEach((block) => {
    if (options.blockStyleFn && typeof options.blockStyleFn === 'function') {
      className = options.blockStyleFn(block);
    }
    if (checkCleanup(block, prevType, options)) {
      // Set the split flag if enabled
      if (options.cleanup.split === true) {
        splitGroup = true;
      }
      return;
    }
    const node = Parser.parse(block);
    const renderedNode = renderNode(
      node,
      inlineRenderers,
      entityRenderers,
      stylesRenderer,
      entityMap,
      options,
      getKeyGenerator(),
    );
    // if type of the block has changed or the split flag is set
    // render and clear group
    if ((prevType && prevType !== block.type) || splitGroup) {
      renderGroup(
        group,
        blockRenderers,
        rendered,
        {
          type: prevType, depth: prevDepth, keys: prevKeys, data: prevData, className,
        },
        options,
      );
      // reset group vars
      // IDEA: might be worth to group those into an instance and just newup a new one
      prevData = [];
      prevKeys = [];
      group = [];
      splitGroup = false;
      className = undefined;
    }
    // handle children
    if (block.children) {
      const children = renderBlocks(
        block.children,
        inlineRenderers,
        blockRenderers,
        entityRenderers,
        stylesRenderer,
        entityMap,
        options,
      );
      renderedNode.push(children);
    }
    // push current node to group
    group.push(renderedNode);

    // lastly save current type for reference
    prevType = block.type;
    prevDepth = block.depth;
    prevKeys.push(block.key);
    prevData.push(block.data);
  });
  // render last group
  renderGroup(
    group,
    blockRenderers,
    rendered,
    {
      type: prevType, depth: prevDepth, keys: prevKeys, data: prevData, className,
    },
    options,
  );
  return checkJoin(rendered, options);
};

// come up w/ a better name/way of handling this
// don't particularly care to rework the entire lib and tests right now
const renderBlocksWithoutCleanup = (
  blocks,
  inlineRenderers = {},
  blockRenderers = {},
  entityRenderers = {},
  stylesRenderer,
  emptyBlockRenderer,
  entityMap = {},
  userOptions = {},
) => {
  const options = Object.assign({}, defaultOptions, userOptions);
  const rendered = [];

  let className;
  const Parser = new RawParser({ flat: !!stylesRenderer });

  blocks.forEach((block, idx) => {
    // if block is empty, render a <br />
    if (emptyBlockRenderer && block.type === 'unstyled' && (!block.text || !block.text.trim().length)) {
      const { key } = block;
      rendered.push(emptyBlockRenderer(key));
      return;
    }

    // otherwise, render
    if (options.blockStyleFn && typeof options.blockStyleFn === 'function') {
      const blockClass = options.blockStyleFn(block);
      className = blockClass && blockClass.length ? blockClass : undefined;
    }

    const node = Parser.parse(block);
    const renderedNode = renderNode(
      node,
      inlineRenderers,
      entityRenderers,
      stylesRenderer,
      entityMap,
      options,
      getKeyGenerator(),
    );

    if (block.children) {
      const childNodes = children.map(
        renderBlocks(
          block.children,
          inlineRenderers,
          blockRenderers,
          entityRenderers,
          stylesRenderer,
          entityMap,
          options,
        ),
      );
      renderedNode.push(children);
    }

    const { type, data, key, depth } = block;
    renderGroup(
      [renderedNode],
      blockRenderers,
      rendered,
      {
        type,
        data,
        key: `${key}-${idx}-${block.type}`,
        depth,
        className
      },
      options,
    );
  });

  return checkJoin(rendered, options);
};

/**
 * Converts and renders each block of Draft.js rawState
 */
export const render = (raw, renderers = {}, options = {}) => {
  if (!raw || !Array.isArray(raw.blocks)) {
    warn('invalid raw object');
    return null;
  }
  // If the lenght of the blocks array is 0 its should not log a warning but still return a null
  if (!raw.blocks.length) {
    return null;
  }
  const {
    inline: inlineRenderers,
    blocks: blockRenderers,
    entities: entityRenderers,
    styles: stylesRenderer,
    emptyBlocks: emptyBlockRenderer,
    decorators,
  } = renderers;
  // If decorators are present, they are maped with the blocks array
  const blocksWithDecorators = decorators ? withDecorators(raw, decorators, options) : raw.blocks;
  // Nest blocks by depth
  const blocks = byDepth(blocksWithDecorators);

  // figure out a better way to do this
  // or just redo all the tests since you're only using this for work anyway
  if (options.renderWithoutCleanup) {
    return renderBlocksWithoutCleanup(
      blocks,
      inlineRenderers,
      blockRenderers,
      entityRenderers,
      stylesRenderer,
      emptyBlockRenderer,
      raw.entityMap,
      options,
    );
  }
  return renderBlocks(
    blocks,
    inlineRenderers,
    blockRenderers,
    entityRenderers,
    stylesRenderer,
    raw.entityMap,
    options,
  );
};

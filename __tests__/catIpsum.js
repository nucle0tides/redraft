import React from 'react';
import cx from 'classnames';
import { render } from '@testing-library/react';
import redraft from '../src';
import { catIpsum } from './utils/raws';
import createBlockRenderer from '../src/createBlockRenderer';
import createStylesRenderer from '../src/createStyleRenderer';

const HEADER_ONE = 'header-one';
const HEADER_TWO = 'header-two';
const HEADER_THREE = 'header-three';
const HEADER_FOUR = 'header-four';
const HEADER_FIVE = 'header-five';
const HEADER_SIX = 'header-six';

const UNORDERED_LIST_ITEM = 'unordered-list-item';
const ORDERED_LIST_ITEM = 'ordered-list-item';

const ATOMIC = 'atomic';
const BLOCKQUOTE = 'blockquote';
const UNSTYLED = 'unstyled';

const BOLD = 'BOLD';
const ITALIC = 'ITALIC';
const UNDERLINE = 'UNDERLINE';
const STRIKETHROUGH = 'STRIKETHROUGH';

const TEXT_TRANSFORM = 'TEXT_TRANSFORM';

const FONT_SIZE = 'FONT_SIZE';
const FONT_FAMILY = 'FONT_FAMILY';
const FONT_WEIGHT = 'FONT_WEIGHT';

const COLOR = 'COLOR';
const BACKGROUND_COLOR = 'BACKGROUND_COLOR';

const inlineStyleMap = {
  [STRIKETHROUGH]: {
    textDecoration: 'line-through',
  },
  [UNDERLINE]: {
    textDecoration: 'underline',
  },
  [BOLD]: {
    fontWeight: 'bold',
  },
  [ITALIC]: {
    fontStyle: 'italic',
  },
};

const UL_WRAP = 'ul';
const OL_WRAP = 'ol';

const blockRenderMap = {
  [HEADER_ONE]: {
    element: 'h1',
  },
  [HEADER_TWO]: {
    element: 'h2',
  },
  [HEADER_THREE]: {
    element: 'h3',
  },
  [HEADER_FOUR]: {
    element: 'h4',
  },
  [HEADER_FIVE]: {
    element: 'h5',
  },
  [HEADER_SIX]: {
    element: 'h6',
  },
  [UNORDERED_LIST_ITEM]: {
    element: 'li',
    wrapper: UL_WRAP,
  },
  [ORDERED_LIST_ITEM]: {
    element: 'li',
    wrapper: OL_WRAP,
  },
  [ATOMIC]: {
    element: 'figure',
  },
  [BLOCKQUOTE]: {
    element: 'blockquote',
  },
  [UNSTYLED]: {
    element: 'div',
  },
};

const applyInlineStyles = (draftInlineStyle) => {
  const inlineStyle = {};

  const fontSize = draftInlineStyle.find(value => value.startsWith(FONT_SIZE));
  const fontWeight = draftInlineStyle.find(value => value.startsWith(FONT_WEIGHT));
  const textTransform = draftInlineStyle.find(value => value.startsWith(TEXT_TRANSFORM));
  const color = draftInlineStyle.find(value => value.startsWith(COLOR));
  const backgroundColor = draftInlineStyle.find(value => value.startsWith(BACKGROUND_COLOR));

  if (fontSize) {
    const [, size] = fontSize.split(':');
    const lineHeight = parseInt(size, 10) * 1.5;

    inlineStyle.fontSize = `${size}px`;
    inlineStyle.lineHeight = `${lineHeight}px`;
  }

  if (fontWeight) {
    const [, weight] = fontWeight.split(':');

    inlineStyle.fontWeight = weight;
  }

  if (textTransform) {
    const [, transformation] = textTransform.split(':');

    inlineStyle.textTransform = transformation;
  }

  if (color) {
    const [, hex] = color.split(':');

    inlineStyle.color = hex;
  }

  if (backgroundColor) {
    const [, hex] = backgroundColor.split(':');

    inlineStyle.backgroundColor = hex;
  }

  return inlineStyle;
};

const applyBlockStyles = (contentBlock) => {
  const type = contentBlock.type;
  const data = contentBlock.data;
  const align = contentBlock.align;

  return cx(
    type === UNSTYLED && 'paragraph',
    align && `${align}`,
  );
};

const Inline = ({
  children,
  style,
  key,
}) => React.createElement('span', { key, style }, children);

const BlockWrapper = (type, { key, className, style }, children) => React.createElement(
  'div',
  { key },
  React.createElement(type, { key, style, className }, children),
);

const entities = {
  LINK: (children, { href, target }) => <a href={href} target={target} rel={(target === '_blank') ? 'noopener noreferrer' : undefined}>{children}</a>,
  FILE: (children, { href }) => <a href={href}>{children}</a>,
};

const renderers = {
  styles: createStylesRenderer(Inline, inlineStyleMap),
  blocks: createBlockRenderer(BlockWrapper, blockRenderMap),
  entities,
};

const options = {
  blockStyleFn: applyBlockStyles,
  customStyleFn: applyInlineStyles,
  cleanup: {
    types: 'all',
    after: 'all',
  },
};
const Content = ({ rawContentState }) => (
  <React.Fragment>
    {redraft(rawContentState, renderers, options)}
  </React.Fragment>
);

it('renders correctly', () => {
  const component = render(<Content rawContentState={catIpsum} />)
  /* component.debug(); */
  expect(component.asFragment()).toMatchSnapshot();
});

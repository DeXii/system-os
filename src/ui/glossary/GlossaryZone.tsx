import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { GlossaryText } from './GlossaryText';

const SKIP_TAGS = new Set([
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'label',
  'option',
]);

const WRAP_TAGS = new Set(['p', 'span', 'li']);

type ElementProps = { children?: ReactNode; 'data-glossary-skip'?: boolean };

function shouldSkip(el: ReactElement<ElementProps>): boolean {
  if (el.props['data-glossary-skip'] != null) return true;
  const tag = typeof el.type === 'string' ? el.type.toLowerCase() : '';
  return SKIP_TAGS.has(tag);
}

function processNode(node: ReactNode, context?: string): ReactNode {
  if (typeof node === 'string') {
    return <GlossaryText context={context}>{node}</GlossaryText>;
  }

  if (!isValidElement<ElementProps>(node)) return node;

  if (shouldSkip(node)) return node;

  const tag = typeof node.type === 'string' ? node.type.toLowerCase() : '';

  if (WRAP_TAGS.has(tag)) {
    const child = node.props.children;
    if (typeof child === 'string') {
      return cloneElement(node, node.props, <GlossaryText context={context}>{child}</GlossaryText>);
    }
    if (Array.isArray(child) && child.every((c) => typeof c === 'string')) {
      return cloneElement(
        node,
        node.props,
        <GlossaryText context={context}>{child.join('')}</GlossaryText>
      );
    }
  }

  if (node.props.children != null) {
    return cloneElement(node, node.props, processChildren(node.props.children, context));
  }

  return node;
}

function processChildren(children: ReactNode, context?: string): ReactNode {
  return Children.map(children, (child) => processNode(child, context));
}

interface Props {
  children: ReactNode;
  context?: string;
}

export function GlossaryZone({ children, context }: Props) {
  return <div className="glossary-zone">{processChildren(children, context)}</div>;
}

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Link } from 'react-router-dom';

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, unknown> };
}

const CALLOUTS: Record<string, string> = { TIP: 'tip', NOTE: 'note', WARNING: 'warning', IMPORTANT: 'important', QA: 'qa' };

/** Turns `> [!TIP] text` blockquotes into styled callouts. */
function remarkCallouts() {
  const walk = (node: MdNode) => {
    if (node.type === 'blockquote') {
      const first = node.children?.[0];
      const text = first?.type === 'paragraph' ? first.children?.[0] : undefined;
      if (text?.type === 'text' && text.value) {
        const m = /^\[!(\w+)\][ \t]*\n?/.exec(text.value);
        const kind = m ? CALLOUTS[m[1].toUpperCase()] : undefined;
        if (m && kind) {
          text.value = text.value.slice(m[0].length);
          node.data = { ...node.data, hProperties: { className: ['callout', `callout-${kind}`] } };
        }
      }
    }
    node.children?.forEach(walk);
  };
  return (tree: MdNode) => walk(tree);
}

const components: Components = {
  a: ({ href, children }) => {
    if (href && href.startsWith('/')) return <Link to={href}>{children}</Link>;
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  },
};

export function Markdown({ children, compact, className }: { children: string; compact?: boolean; className?: string }) {
  return (
    <div className={`prose-lesson ${compact ? 'prose-compact' : ''} ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkCallouts]} rehypePlugins={[rehypeHighlight]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function CodeBlock({ code, lang = 'ts' }: { code: string; lang?: string }) {
  return <Markdown compact>{'```' + lang + '\n' + code.trimEnd() + '\n```'}</Markdown>;
}

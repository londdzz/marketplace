import type { ReactNode } from 'react';

/**
 * Enough Markdown for a policy, rendered as elements.
 *
 * Headings, paragraphs, lists, bold, links and rules — which is everything the
 * policies in /docs use. Deliberately not dangerouslySetInnerHTML and
 * deliberately not a Markdown library: this renders our own files, the subset
 * is small, and producing elements rather than a string means there is no way
 * for markup to be injected even if the source ever stopped being ours.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`/g;
  let at = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > at) {
      out.push(text.slice(at, match.index));
    }

    if (match[1]) {
      out.push(<strong key={`${keyBase}-b${n}`}>{match[1]}</strong>);
    } else if (match[2]) {
      const href = match[3];
      const external = href.startsWith('http') || href.startsWith('mailto:');

      out.push(
        <a
          key={`${keyBase}-a${n}`}
          href={href}
          {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      out.push(<code key={`${keyBase}-c${n}`}>{match[4]}</code>);
    }

    at = match.index + match[0].length;
    n++;
  }

  if (at < text.length) {
    out.push(text.slice(at));
  }

  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split('\n');
  let list: string[] = [];
  let paragraph: string[] = [];

  const flushList = () => {
    if (list.length === 0) {
      return;
    }

    const items = list;

    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {items.map((item, at) => (
          <li key={at}>{inline(item, `li-${blocks.length}-${at}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    const text = paragraph.join(' ');

    blocks.push(<p key={`p-${blocks.length}`}>{inline(text, `p-${blocks.length}`)}</p>);
    paragraph = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('---')) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} />);
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);

    if (heading) {
      flushParagraph();
      flushList();

      const level = heading[1].length;
      const Tag = (['h1', 'h2', 'h3', 'h4'] as const)[level - 1];

      blocks.push(<Tag key={`h-${blocks.length}`}>{inline(heading[2], `h-${blocks.length}`)}</Tag>);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);

    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();

  return <div className="prose">{blocks}</div>;
}

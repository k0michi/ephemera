import type { RichText, RichTextNode } from "@ephemera/shared/api/api";
import RichTextUtil from "@ephemera/shared/lib/rich_text_util";

export function RichTextRenderer({ nodes }: { nodes: RichText }) {
  return (
    <>
      {nodes.map((node, index) => (
        <RichTextNodeRenderer key={index} node={node} />
      ))}
    </>
  );
};

function RichTextNodeRenderer({ node }: { node: RichTextNode }) {
  if (typeof node === 'string') {
    return <>{node}</>;
  }

  const [elementName, attributes, childNodes] = node;

  switch (elementName) {
    case 'bold':
      return (
        <strong>
          <RichTextRenderer nodes={childNodes} />
        </strong>
      );

    case 'italic':
      return (
        <em>
          <RichTextRenderer nodes={childNodes} />
        </em>
      );

    case 'strikethrough':
      return (
        <del>
          <RichTextRenderer nodes={childNodes} />
        </del>
      );

    case 'anchor': {
      const urls = RichTextUtil.getAttributes(node, "url");
      const firstUrl = urls.length > 0 ? urls[0] : "#";

      return (
        <a href={firstUrl}>
          {firstUrl}
        </a>
      );
    }

    default:
      return null;
  }
};
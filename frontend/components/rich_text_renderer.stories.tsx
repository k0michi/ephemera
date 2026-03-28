import type { RichTextNode } from "@ephemera/shared/api/api";
import type { Story } from "@ladle/react";
import { RichTextRenderer } from "./rich_text_renderer";

export const RichTextRendererStory: Story = () => {
  const nodes: RichTextNode[] = [
    'normal, ',
    ['bold', [], ['bold, ']],
    ['italic', [], ['italic, ']],
    ['strikethrough', [], ['strikethrough, ']],
    ['anchor', [['url', 'https://example.com'], ['alt', 'https://example.com']], []],
  ];

  return <RichTextRenderer nodes={nodes} />;
}
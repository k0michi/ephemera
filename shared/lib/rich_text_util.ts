import type { RichTextElement, RichTextNode } from "../api/api.js";

export default class RichTextUtil {
  static getAttributes<
    T extends RichTextElement,
    K extends T[1][number][0]
  >(
    element: T,
    key: K
  ): Extract<T[1][number], [K, any]>[1][] {
    const attributes = element[1];

    return (attributes as Array<[string, any]>)
      .filter((attr): attr is Extract<T[1][number], [K, any]> => attr[0] === key)
      .map((attr) => attr[1]);
  }

  static toPlainText(nodes: RichTextNode[]): string {
    let result = "";

    for (const node of nodes) {
      if (typeof node === "string") {
        result += node;
      } else {
        const alts = this.getAttributes(node, "alt");

        if (alts.length > 0) {
          result += alts[0];
        } else {
          result += this.toPlainText(node[2]);
        }
      }
    }

    return result;
  }
}
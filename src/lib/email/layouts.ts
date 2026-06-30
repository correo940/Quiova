import { Header, Footer, HelpBlock, Wrap } from './components';

// BetaLayout wraps content rows with the standard header, help block, and footer.
// Pass pre-built <tr>…</tr> strings as content.
export function BetaLayout(content: string): string {
    return Wrap(`
  ${Header()}
  ${content}
  ${HelpBlock()}
  ${Footer()}
`);
}

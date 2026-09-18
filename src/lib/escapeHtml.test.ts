import { escapeHtml } from './escapeHtml';

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>&"\'')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;&amp;&quot;&#39;',
    );
  });
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const IconText = require('./helpers/load-typescript.cjs').load('components/ui/IconText.tsx').default;
test('emoji sequences render as SVG icons while caption words and numbers stay intact', () => {
  const original = 'Launch 🎉 Look 👀 Great 👍🏽 Team 👩‍💻 🇳🇬';
  const html = renderToStaticMarkup(React.createElement(IconText, { text: original }));
  assert.ok(html.includes('Launch') && html.includes('Look') && html.includes('Great') && html.includes('Team'));
  assert.ok(!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(html));
  assert.equal((html.match(/<svg/g) || []).length, 5);
  assert.equal(original, 'Launch 🎉 Look 👀 Great 👍🏽 Team 👩‍💻 🇳🇬');
});
test('plain captions remain text with punctuation and dates preserved', () => {
  const html = renderToStaticMarkup(React.createElement(IconText, { text: 'New work: 21 October, 50% complete.' }));
  assert.equal(html, 'New work: 21 October, 50% complete.');
});

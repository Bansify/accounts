(function () {
  var theme = 'light';
  try {
    theme = localStorage.getItem('gothwad-theme') === 'dark' ? 'dark' : 'light';
  } catch (e) { /* light default */ }

  document.documentElement.setAttribute('data-theme', theme);

  // Android paints the status bar from this meta tag, including inside the TWA,
  // so it must be correct before the first paint (not only after a toggle).
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', theme === 'dark' ? '#131314' : '#ffffff');
})();

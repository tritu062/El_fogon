/**
 * Escapa caracteres HTML especiales para evitar vulnerabilidades XSS en textos libres.
 * @param {string} val Texto a sanitizar.
 * @returns {string} Texto sanitizado.
 */
function escapeHtml(val) {
  if (typeof val !== 'string') return val;
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };
  return val.replace(/[&<>"'/]/g, (s) => entityMap[s]);
}

module.exports = {
  escapeHtml
};

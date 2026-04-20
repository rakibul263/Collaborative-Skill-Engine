const normalize = (s = "") =>
  s
    .toLowerCase()
    .replace(/\.js/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "");

module.exports = { normalize };

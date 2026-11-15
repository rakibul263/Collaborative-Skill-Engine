const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const buildExactEmailRegex = (email = "") =>
  new RegExp(`^${escapeRegex(normalizeEmail(email))}$`, "i");

const buildEmailQuery = (email) => ({
  email: { $regex: buildExactEmailRegex(email) },
});

const findUserByEmail = (collection, email) =>
  collection.findOne(buildEmailQuery(email));

module.exports = {
  escapeRegex,
  normalizeEmail,
  buildExactEmailRegex,
  buildEmailQuery,
  findUserByEmail,
};

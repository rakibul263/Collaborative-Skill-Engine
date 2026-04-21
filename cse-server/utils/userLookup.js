const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const buildEmailQuery = (email) => ({
  email: { $regex: new RegExp(`^${escapeRegex(normalizeEmail(email))}$`, "i") },
});

const findUserByEmail = (collection, email) =>
  collection.findOne(buildEmailQuery(email));

module.exports = {
  normalizeEmail,
  buildEmailQuery,
  findUserByEmail,
};

const { normalize } = require("../utils/skillNormalize");

const findMentorSuggestions = async ({
  usersCollection,
  currentUser,
  limit = 5,
}) => {
  const email = currentUser.email;
  const learnSkills =
    currentUser.learnSkills?.map((s) => ({
      original: s,
      normalized: normalize(s),
    })) || [];

  if (learnSkills.length === 0) {
    return [];
  }

  const otherUsers = await usersCollection
    .find({
      email: { $ne: email },
      teachSkills: { $exists: true, $ne: [] },
    })
    .limit(80)
    .toArray();

  const results = [];

  for (const user of otherUsers) {
    const teachSkills =
      user.teachSkills?.map((s) => ({
        original: s,
        normalized: normalize(s),
      })) || [];

    if (teachSkills.length === 0) continue;

    const teachSet = new Set(teachSkills.map((t) => t.normalized));
    const matchCount = learnSkills.filter((l) => teachSet.has(l.normalized)).length;

    if (matchCount > 0) {
      results.push({
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage,
        teachLevel: user.teachLevel,
        teachSkills: user.teachSkills,
        matchCount,
        matchPercentage: Math.round((matchCount / learnSkills.length) * 100),
        matchedSkills: [],
        reason: `Teaches ${matchCount} skill(s) you want to learn`,
      });
    }
  }

  return results
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit);
};

module.exports = { findMentorSuggestions };

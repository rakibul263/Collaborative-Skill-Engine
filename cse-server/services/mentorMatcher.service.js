const Fuse = require("fuse.js");
const { normalize } = require("../utils/skillNormalize");

const createFuse = (skills) =>
  new Fuse(skills, {
    includeScore: true,
    threshold: 0.4,
  });

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

    const fuse = createFuse(teachSkills.map((s) => s.normalized));
    let matchCount = 0;
    const matchedSkills = [];

    for (const learn of learnSkills) {
      const exact = teachSkills.find((t) => t.normalized === learn.normalized);
      if (exact) {
        matchCount++;
        matchedSkills.push({
          learnSkill: learn.original,
          matchedWith: exact.original,
        });
        continue;
      }
      const matches = fuse.search(learn.normalized);
      if (matches.length > 0 && matches[0].score < 0.4) {
        const matchedSkill = teachSkills[matches[0].refIndex];
        matchCount++;
        matchedSkills.push({
          learnSkill: learn.original,
          matchedWith: matchedSkill.original,
        });
      }
    }

    if (matchCount > 0) {
      results.push({
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage,
        teachLevel: user.teachLevel,
        teachSkills: user.teachSkills,
        matchCount,
        matchPercentage: Math.round((matchCount / learnSkills.length) * 100),
        matchedSkills,
        reason: `Teaches ${matchCount} skill(s) you want to learn`,
      });
    }
  }

  return results
    .sort((a, b) => b.matchCount - a.matchCount)
    .slice(0, limit);
};

module.exports = { findMentorSuggestions };

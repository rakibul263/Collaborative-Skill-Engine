/**
 * Unified Profile Completion Service (Backend)
 * Evaluates profile completeness from MongoDB user documents.
 * Standardized across Dashboard, Profile, Studio, Course Creation, and API responses.
 *
 * Rules:
 *  - Empty strings, whitespace-only strings, null, undefined, and empty arrays ([]) MUST NOT count.
 *  - Course Creation Threshold: Profile Completion >= 50%
 */

const MIN_COURSE_CREATION_COMPLETION = 50;

const calculateProfileCompletion = (userDoc = {}) => {
  if (!userDoc) userDoc = {};

  const isNonEmptyString = (str) => typeof str === "string" && str.trim().length > 0;
  const isNonEmptyArray = (arr) => Array.isArray(arr) && arr.some((item) => {
    if (typeof item === "string") return item.trim().length > 0;
    if (typeof item === "object" && item !== null) return Object.keys(item).length > 0;
    return Boolean(item);
  });

  const photoValid = Boolean(
    isNonEmptyString(userDoc.profileImage || userDoc.photoURL) &&
    !(userDoc.profileImage || userDoc.photoURL).includes("placeholder") &&
    !(userDoc.profileImage || userDoc.photoURL).includes("avatar.png")
  );

  const nameValid = Boolean(
    isNonEmptyString(userDoc.fullName || userDoc.name || userDoc.displayName) &&
    (userDoc.fullName || userDoc.name || userDoc.displayName).trim().length >= 2
  );

  const headlineValid = Boolean(
    isNonEmptyString(userDoc.headline) && userDoc.headline.trim().length >= 5
  );

  const bioValid = Boolean(
    isNonEmptyString(userDoc.bio) && userDoc.bio.trim().length >= 10
  );

  const teachSkillsValid = Boolean(isNonEmptyArray(userDoc.teachSkills));

  const linksValid = Boolean(
    isNonEmptyString(userDoc.github) ||
    isNonEmptyString(userDoc.linkedin) ||
    isNonEmptyString(userDoc.website) ||
    isNonEmptyString(userDoc.portfolio)
  );

  const projectsValid = Boolean(isNonEmptyArray(userDoc.projects));

  const certsOrEduValid = Boolean(
    isNonEmptyArray(userDoc.certificates) ||
    isNonEmptyString(userDoc.education) ||
    isNonEmptyString(userDoc.location)
  );

  const requirements = [
    {
      id: "photo",
      title: "Profile Avatar Photo",
      description: "Upload a real profile picture so peers and students can identify you.",
      points: 15,
      fulfilled: photoValid,
      why: "Profiles with an avatar receive 9x higher trust & connection rates.",
    },
    {
      id: "name",
      title: "Full Display Name",
      description: "Provide your verified full name.",
      points: 10,
      fulfilled: nameValid,
      why: "Ensures legitimate instructor identification across the platform.",
    },
    {
      id: "headline",
      title: "Professional Headline",
      description: "Add a clear headline (e.g. Senior Full-Stack Engineer).",
      points: 15,
      fulfilled: headlineValid,
      why: "Communicates your core engineering expertise within 3 seconds.",
    },
    {
      id: "bio",
      title: "Instructor Bio",
      description: "Write a short summary (at least 10 characters) detailing your background.",
      points: 15,
      fulfilled: bioValid,
      why: "Explains your teaching background to prospective learners.",
    },
    {
      id: "teachSkills",
      title: "Teaching Expertise Skills",
      description: "Add at least 1 skill you are qualified to teach.",
      points: 15,
      fulfilled: teachSkillsValid,
      why: "Unlocks course publishing rights and peer mentoring matches.",
    },
    {
      id: "links",
      title: "GitHub / LinkedIn Link",
      description: "Add your GitHub, LinkedIn, or personal portfolio website.",
      points: 10,
      fulfilled: linksValid,
      why: "Provides empirical proof of your real-world software contributions.",
    },
    {
      id: "projects",
      title: "Featured Projects",
      description: "Showcase at least 1 completed software project.",
      points: 10,
      fulfilled: projectsValid,
      why: "Serves as live evidence of your technical execution capability.",
    },
    {
      id: "certsOrEdu",
      title: "Certificates or Education",
      description: "Add a verified certificate or educational background.",
      points: 10,
      fulfilled: certsOrEduValid,
      why: "Reinforces credentials for creator standing.",
    },
  ];

  const completion = requirements.reduce(
    (acc, req) => acc + (req.fulfilled ? req.points : 0),
    0
  );

  const completedItems = requirements.filter((r) => r.fulfilled).length;
  const totalItems = requirements.length;
  const remainingItems = totalItems - completedItems;
  const missingItems = requirements.filter((r) => !r.fulfilled);
  const canCreateCourse = completion >= MIN_COURSE_CREATION_COMPLETION;

  return {
    completion,
    completedItems,
    remainingItems,
    totalItems,
    canCreateCourse,
    minRequiredCompletion: MIN_COURSE_CREATION_COMPLETION,
    requirements,
    missingItems,
  };
};

module.exports = {
  calculateProfileCompletion,
  MIN_COURSE_CREATION_COMPLETION,
};

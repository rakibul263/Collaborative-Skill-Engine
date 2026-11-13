const geoip = require("geoip-lite");

/**
 * Great-circle distance using Haversine formula (km)
 */
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 0;
  }
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Clean and normalize incoming client IP
 */
const sanitizeIp = (rawIp) => {
  if (!rawIp) return "127.0.0.1";
  let ip = String(rawIp).trim();
  if (ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }
  if (ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }
  return ip;
};

/**
 * Check if IP is loopback, local, or private network
 */
const isPrivateOrLocalIp = (ip) => {
  if (!ip || ip === "::1" || ip === "localhost" || ip === "127.0.0.1") return true;
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  return false;
};

/**
 * Resolve geo coordinates, city, and country from IP
 */
const resolveGeoLocation = (rawIp) => {
  const ip = sanitizeIp(rawIp);
  if (isPrivateOrLocalIp(ip)) {
    return {
      ip,
      city: "Dhaka (Dev Node)",
      region: "Dhaka",
      country: "BD",
      timezone: "Asia/Dhaka",
      ll: [23.8103, 90.4125], // Dhaka coordinates
      isPrivate: true,
    };
  }

  const lookup = geoip.lookup(ip);
  if (!lookup || !lookup.ll) {
    return {
      ip,
      city: "Unknown",
      region: "",
      country: "Unknown",
      timezone: "UTC",
      ll: [0, 0],
      isPrivate: false,
    };
  }

  return {
    ip,
    city: lookup.city || lookup.region || lookup.country || "Detected City",
    region: lookup.region || "",
    country: lookup.country || "Detected Country",
    timezone: lookup.timezone || "UTC",
    ll: lookup.ll,
    isPrivate: false,
  };
};

/**
 * Impossible Travel Detector
 * Checks if velocity between current and previous logins exceeds 800 km/h (speed of commercial aircraft)
 */
const detectImpossibleTravel = (currentLogin, previousLogin) => {
  if (!currentLogin || !previousLogin) return null;

  const curTime = new Date(currentLogin.timestamp || Date.now()).getTime();
  const prevTime = new Date(previousLogin.timestamp).getTime();
  const timeDiffMs = Math.abs(curTime - prevTime);

  // If gap is more than 36 hours, normal travel is feasible worldwide
  if (timeDiffMs > 36 * 60 * 60 * 1000) return null;

  const curCoords = currentLogin.location?.ll || [23.8103, 90.4125];
  const prevCoords = previousLogin.location?.ll || [23.8103, 90.4125];

  const distanceKm = haversineDistanceKm(
    prevCoords[0],
    prevCoords[1],
    curCoords[0],
    curCoords[1]
  );

  // Ignore negligible distances (< 250 km) which could just be cell tower jumps / ISP routing changes
  if (distanceKm < 250) return null;

  // Convert time difference to hours (minimum 1 minute to prevent divide-by-zero on immediate clicks)
  const timeDiffHours = Math.max(timeDiffMs / (1000 * 60 * 60), 0.0166);
  const speedKmh = distanceKm / timeDiffHours;

  // Max commercial flight speed is ~850-900 km/h. Exceeding 800 km/h in short intervals is impossible
  if (speedKmh > 800) {
    const timeDiffMinutes = Math.max(1, Math.round(timeDiffMs / (1000 * 60)));
    const prevLocationStr = `${previousLogin.location?.city || "Unknown City"}, ${previousLogin.location?.country || "BD"}`;
    const curLocationStr = `${currentLogin.location?.city || "Unknown City"}, ${currentLogin.location?.country || "BD"}`;

    return {
      isAnomaly: true,
      anomalyType: "IMPOSSIBLE_TRAVEL",
      distanceKm: Math.round(distanceKm),
      timeDiffMinutes,
      speedKmh: Math.round(speedKmh),
      previousLocation: {
        city: previousLogin.location?.city || "Unknown",
        country: previousLogin.location?.country || "BD",
        ip: previousLogin.ip,
        ll: prevCoords,
        timestamp: previousLogin.timestamp,
      },
      currentLocation: {
        city: currentLogin.location?.city || "Unknown",
        country: currentLogin.location?.country || "BD",
        ip: currentLogin.ip,
        ll: curCoords,
        timestamp: currentLogin.timestamp,
      },
      severity: speedKmh > 2000 ? "CRITICAL" : "HIGH",
      reason: `Account accessed from ${curLocationStr} only ${timeDiffMinutes} min after a login from ${prevLocationStr}. Required velocity: ${Math.round(speedKmh).toLocaleString()} km/h (Physically impossible travel limit: 800 km/h).`,
    };
  }

  return null;
};

/**
 * Review Fraud / Sybil Ring Detector
 * Checks if multiple different accounts from the same IP submit 5-star reviews for the same target
 */
const detectReviewFraud = async ({
  ratingsCollection,
  courseReviewsCollection,
  ip,
  reviewerEmail,
  targetIdOrEmail,
  rating,
  isCourse = false,
}) => {
  const numericRating = Number(rating);
  if (numericRating < 4.5) {
    return { isFraud: false };
  }

  const cleanIp = sanitizeIp(ip);
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

  let existingFromIp = [];
  if (isCourse && courseReviewsCollection) {
    existingFromIp = await courseReviewsCollection
      .find({
        courseId: targetIdOrEmail,
        reviewerIp: cleanIp,
        reviewerEmail: { $ne: reviewerEmail },
        createdAt: { $gte: seventyTwoHoursAgo },
        rating: { $gte: 4.5 },
      })
      .toArray();
  } else if (ratingsCollection) {
    existingFromIp = await ratingsCollection
      .find({
        targetEmail: targetIdOrEmail,
        reviewerIp: cleanIp,
        reviewerEmail: { $ne: reviewerEmail },
        createdAt: { $gte: seventyTwoHoursAgo },
        rating: { $gte: 4.5 },
      })
      .toArray();
  }

  // If 1 or more distinct accounts have already posted 5-star reviews for this same target from this same IP
  if (existingFromIp.length >= 1) {
    const ringAccounts = Array.from(
      new Set([...existingFromIp.map((r) => r.reviewerEmail), reviewerEmail])
    );
    return {
      isFraud: true,
      fraudStatus: "QUARANTINED",
      severity: ringAccounts.length >= 3 ? "CRITICAL" : "HIGH",
      ringAccounts,
      distinctAccountsCount: ringAccounts.length,
      reason: `Sybil review ring detected: ${ringAccounts.length} distinct accounts submitted 5-star reviews for the same ${isCourse ? "course" : "mentor"} from identical IP (${cleanIp}) within 72 hours. Automatically quarantined.`,
    };
  }

  return { isFraud: false };
};

module.exports = {
  haversineDistanceKm,
  sanitizeIp,
  resolveGeoLocation,
  detectImpossibleTravel,
  detectReviewFraud,
};


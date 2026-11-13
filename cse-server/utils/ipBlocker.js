let blockedIpsCollection = null;
const blockedIpsSet = new Set();

/**
 * Initializes the in-memory blocked IP cache from MongoDB.
 */
async function initIpBlocker(collection) {
  blockedIpsCollection = collection;
  try {
    const records = await blockedIpsCollection.find({}).toArray();
    blockedIpsSet.clear();
    records.forEach((doc) => {
      if (doc.ip) {
        blockedIpsSet.add(doc.ip.trim());
      }
    });
    console.log(`[IP Blocker] Initialized with ${blockedIpsSet.size} restricted IP(s).`);
  } catch (err) {
    console.error("[IP Blocker] Initialization error:", err.message);
  }
}

/**
 * Checks whether an IP is currently blocked.
 */
function isIpBlocked(ip) {
  if (!ip) return false;
  const cleanIp = ip.trim().replace(/^::ffff:/, "");
  return blockedIpsSet.has(cleanIp) || blockedIpsSet.has(ip.trim());
}

/**
 * Blocks an IP address in MongoDB and updates the in-memory cache.
 */
async function blockIp(ip, reason = "Manual administrative block", adminEmail = "Admin") {
  if (!ip) throw new Error("IP address is required.");
  const cleanIp = ip.trim().replace(/^::ffff:/, "");

  blockedIpsSet.add(cleanIp);

  if (blockedIpsCollection) {
    await blockedIpsCollection.updateOne(
      { ip: cleanIp },
      {
        $set: {
          ip: cleanIp,
          reason,
          blockedBy: adminEmail,
          blockedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  return { ip: cleanIp, blocked: true };
}

/**
 * Unblocks an IP address from MongoDB and updates the in-memory cache.
 */
async function unblockIp(ip) {
  if (!ip) throw new Error("IP address is required.");
  const cleanIp = ip.trim().replace(/^::ffff:/, "");

  blockedIpsSet.delete(cleanIp);
  blockedIpsSet.delete(ip.trim());

  if (blockedIpsCollection) {
    await blockedIpsCollection.deleteOne({
      $or: [{ ip: cleanIp }, { ip: ip.trim() }],
    });
  }

  return { ip: cleanIp, blocked: false };
}

/**
 * Returns all currently blocked IPs.
 */
async function getBlockedIpsList() {
  if (!blockedIpsCollection) return [];
  return blockedIpsCollection.find({}).sort({ blockedAt: -1 }).toArray();
}

module.exports = {
  initIpBlocker,
  isIpBlocked,
  blockIp,
  unblockIp,
  getBlockedIpsList,
};


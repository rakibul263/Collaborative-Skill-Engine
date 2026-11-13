const { ObjectId } = require("mongodb");
const { verifyJWT } = require("../middleware/verifyJWT");
const {
  runGeneticSquadFormation,
  ROLE_DEFINITIONS,
  analyzeProjectTitleAndIdea,
} = require("../services/squadFormation.service");

const registerTeamsRoutes = (
  app,
  {
    usersCollection,
    schedulesCollection,
    teamsCollection,
    conversationsCollection,
    messagesCollection,
    userNotificationsCollection,
    io,
  }
) => {
  // GET /api/teams/roles — list available project roles
  app.get("/api/teams/roles", async (_req, res) => {
    res.json(Object.values(ROLE_DEFINITIONS));
  });

  // POST /api/teams/analyze-project — AI analysis of project title & idea
  app.post("/api/teams/analyze-project", verifyJWT, async (req, res) => {
    try {
      const { projectTitle = "", projectDescription = "" } = req.body;
      const analysis = analyzeProjectTitleAndIdea(projectTitle, projectDescription);
      res.json(analysis);
    } catch (err) {
      console.error("[analyze-project]", err.message);
      res.status(500).json({ message: "Failed to analyze project", error: err.message });
    }
  });

  // POST /api/teams/squad-formation — run multi-objective squad matching with strict domain filtering
  app.post("/api/teams/squad-formation", verifyJWT, async (req, res) => {
    try {
      const {
        targetSquadSize = 4,
        requiredRoles = ["frontend", "backend", "designer", "aiml"],
        projectTitle = "",
        projectDescription = "",
        requesterEmail,
        generations = 25,
        populationSize = 40,
      } = req.body;

      if (!requesterEmail) {
        return res.status(400).json({ message: "requesterEmail is required" });
      }

      // Fetch candidate pool from user_list (active users with skills)
      const candidates = await usersCollection
        .find({
          isDeactivated: { $ne: true },
          $or: [
            { teachSkills: { $exists: true, $ne: [] } },
            { learnSkills: { $exists: true, $ne: [] } },
          ],
        })
        .limit(120)
        .toArray();

      if (candidates.length < targetSquadSize) {
        return res.status(400).json({
          message: `Insufficient candidate pool. Available candidates: ${candidates.length}, requested: ${targetSquadSize}.`,
        });
      }

      // Fetch active accepted schedules to evaluate conflict harmony
      const candidateEmails = candidates.map((c) => c.email);
      const activeSchedules = await schedulesCollection
        ? await schedulesCollection
            .find({
              status: "accepted",
              schedulerEmail: { $in: candidateEmails },
            })
            .toArray()
        : [];

      const schedulesByUser = {};
      activeSchedules.forEach((s) => {
        if (!schedulesByUser[s.schedulerEmail]) {
          schedulesByUser[s.schedulerEmail] = [];
        }
        schedulesByUser[s.schedulerEmail].push(s);
      });

      // Run Squad Optimization with strict domain filtering
      const result = runGeneticSquadFormation({
        candidates,
        targetSquadSize,
        requiredRoles,
        projectTitle,
        projectDescription,
        schedulesByUser,
        requesterEmail,
        generations,
        populationSize,
      });

      res.json(result);
    } catch (err) {
      console.error("[squad-formation]", err.message);
      res.status(500).json({ message: "Squad formation failed", error: err.message });
    }
  });

  // POST /api/teams/create-squad — save official project team and auto-create Messenger Group Chat
  app.post("/api/teams/create-squad", verifyJWT, async (req, res) => {
    try {
      const {
        teamName,
        projectTopic,
        description,
        members = [],
        metrics = {},
        leaderEmail,
      } = req.body;

      if (!teamName || !leaderEmail || members.length < 2) {
        return res.status(400).json({
          message: "teamName, leaderEmail, and at least 2 members are required.",
        });
      }

      const allMemberEmails = members.map((m) => m.email);
      if (!allMemberEmails.includes(leaderEmail)) {
        allMemberEmails.unshift(leaderEmail);
      }

      // 1. Create team document in teamsCollection
      const newSquadDoc = {
        teamName,
        projectTopic: projectTopic || "Collaborative Project",
        description: description || `Project squad for "${teamName}"`,
        leaderEmail,
        members: members.map((m) => ({
          email: m.email,
          fullName: m.fullName || m.name || m.email.split("@")[0],
          profileImage: m.profileImage || m.photoURL || "",
          role: m.designatedRole || "Developer",
          roleTitle: m.roleTitle || "Specialist",
          fitPercent: m.fitPercent || 90,
          matchingSkills: m.matchingSkills || [],
          status: m.email === leaderEmail ? "accepted" : "invited",
          joinedAt: m.email === leaderEmail ? new Date() : null,
        })),
        metrics,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await teamsCollection.insertOne(newSquadDoc);
      const teamId = result.insertedId;

      // 2. Automatically create Project Group Conversation in Messenger (conversationsCollection)
      let conversationId = null;
      if (conversationsCollection) {
        const now = new Date().toISOString();
        const unreadCounts = {};
        allMemberEmails.forEach((e) => {
          unreadCounts[e] = 0;
        });

        const groupConversationDoc = {
          isGroup: true,
          groupName: teamName, // Project Title as Group Name!
          groupTopic: projectTopic || "Project Workspace",
          teamId,
          leaderEmail,
          participants: allMemberEmails,
          unreadCounts,
          lastMessage: {
            text: `🚀 Project squad formed for: "${teamName}". Welcome to your team workspace! You can collaborate, share code, and start video meetings anytime.`,
            senderEmail: leaderEmail,
            createdAt: now,
          },
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now,
        };

        const convResult = await conversationsCollection.insertOne(groupConversationDoc);
        conversationId = convResult.insertedId.toString();

        // 3. Insert initial welcome message into messagesCollection
        if (messagesCollection) {
          await messagesCollection.insertOne({
            conversationId: convResult.insertedId,
            senderEmail: leaderEmail,
            receiverEmail: "group",
            isGroup: true,
            groupName: teamName,
            text: `🚀 Project squad formed for: "${teamName}". Welcome to your team workspace! You can collaborate, share code, and start video meetings anytime.`,
            status: "delivered",
            createdAt: now,
            updatedAt: now,
            seenAt: null,
          });
        }

        // Link conversationId to team document
        await teamsCollection.updateOne(
          { _id: teamId },
          { $set: { conversationId } }
        );

        // Emit real-time conversation updates to all squad members
        allMemberEmails.forEach((email) => {
          io?.to(`user:${email}`).emit("conversation:updated");
          io?.to(`user:${email.toLowerCase()}`).emit("conversation:updated");
        });
      }

      // 4. Notify invited members via userNotificationsCollection
      if (userNotificationsCollection) {
        for (const member of members) {
          if (member.email !== leaderEmail) {
            const notifDoc = {
              recipientEmail: member.email,
              type: "team_invite",
              title: `Squad Invitation: ${teamName}`,
              message: `${leaderEmail} invited you to join the "${teamName}" project squad. Click to review details and accept or decline.`,
              teamId: teamId.toString(),
              conversationId,
              teamName,
              projectTopic: projectTopic || "Collaborative Project",
              role: member.designatedRole || "Developer",
              roleTitle: member.roleTitle || "Specialist",
              fitPercent: member.fitPercent || 90,
              isRead: false,
              responded: null,
              createdAt: new Date().toISOString(),
            };
            const insertResult = await userNotificationsCollection.insertOne(notifDoc);
            const serializedNotif = { ...notifDoc, _id: insertResult.insertedId.toString() };

            io?.to(`user:${member.email.toLowerCase()}`)?.emit("user-notification:new", serializedNotif);
            io?.to(`user:${member.email.toLowerCase()}`)?.emit("notification:new", {
              title: `Squad Invitation: ${teamName}`,
              message: `${leaderEmail} invited you to join "${teamName}".`,
            });
          }
        }
      }

      res.status(201).json({
        ok: true,
        message: "Squad successfully formed and Project Messenger Group created!",
        squadId: teamId,
        conversationId,
      });
    } catch (err) {
      console.error("[create-squad]", err.message);
      res.status(500).json({ message: "Failed to create squad", error: err.message });
    }
  });

  // GET /api/teams/my-squads — list squads where user is leader or invited
  app.get("/api/teams/my-squads", verifyJWT, async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ message: "email query parameter is required" });
      }

      const squads = await teamsCollection
        .find({
          $or: [{ leaderEmail: email }, { "members.email": email }],
        })
        .sort({ createdAt: -1 })
        .toArray();

      res.json(squads);
    } catch (err) {
      console.error("[my-squads]", err.message);
      res.status(500).json({ message: "Failed to fetch squads", error: err.message });
    }
  });

  // GET /api/teams/:teamId — get single team details for modal & preview
  app.get("/api/teams/:teamId", verifyJWT, async (req, res) => {
    try {
      const { teamId } = req.params;
      if (!ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const team = await teamsCollection.findOne({ _id: new ObjectId(teamId) });
      if (!team) {
        return res.status(404).json({ message: "Team not found or has been disbanded." });
      }

      // Enrich leader info from usersCollection if available
      let leaderUser = null;
      if (usersCollection && team.leaderEmail) {
        leaderUser = await usersCollection.findOne(
          { email: team.leaderEmail },
          { projection: { fullName: 1, name: 1, profileImage: 1, photoURL: 1, headline: 1, title: 1 } }
        );
      }

      res.json({
        ...team,
        leader: {
          email: team.leaderEmail,
          fullName: leaderUser?.fullName || leaderUser?.name || team.leaderEmail.split("@")[0],
          profileImage: leaderUser?.profileImage || leaderUser?.photoURL || "",
          headline: leaderUser?.headline || leaderUser?.title || "Team Leader",
        },
      });
    } catch (err) {
      console.error("[get-team]", err.message);
      res.status(500).json({ message: "Failed to fetch team details", error: err.message });
    }
  });

  // POST /api/teams/:teamId/respond-invite — Accept or reject a team invitation
  app.post("/api/teams/:teamId/respond-invite", verifyJWT, async (req, res) => {
    try {
      const { teamId } = req.params;
      const { action } = req.body; // "accept" | "reject"
      const userEmail = (req.user?.email || req.body.email || "").toLowerCase();

      if (!ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      if (!["accept", "reject"].includes(action)) {
        return res.status(400).json({ message: 'Action must be either "accept" or "reject"' });
      }

      const team = await teamsCollection.findOne({ _id: new ObjectId(teamId) });
      if (!team) {
        return res.status(404).json({ message: "Team not found or has been disbanded." });
      }

      // Check if user is in members list
      const memberIndex = (team.members || []).findIndex(
        (m) => (m.email || "").toLowerCase() === userEmail
      );

      if (memberIndex === -1) {
        return res.status(403).json({ message: "You are not listed as a member of this team." });
      }

      const member = team.members[memberIndex];
      const memberName = member.fullName || member.name || userEmail.split("@")[0];
      const now = new Date();
      const nowIso = now.toISOString();

      if (action === "accept") {
        // 1. Update member status to 'accepted' in teamsCollection
        await teamsCollection.updateOne(
          { _id: new ObjectId(teamId), "members.email": member.email },
          {
            $set: {
              "members.$.status": "accepted",
              "members.$.joinedAt": now,
              updatedAt: now,
            },
          }
        );

        // 2. Ensure user is in Messenger group conversation participants
        if (conversationsCollection && team.conversationId) {
          const convId = ObjectId.isValid(team.conversationId)
            ? new ObjectId(team.conversationId)
            : team.conversationId;

          await conversationsCollection.updateOne(
            { _id: convId },
            {
              $addToSet: { participants: userEmail },
              $set: {
                [`unreadCounts.${userEmail}`]: 0,
                updatedAt: nowIso,
              },
            }
          );

          // 3. Post a welcome message into the group chat
          if (messagesCollection) {
            await messagesCollection.insertOne({
              conversationId: convId,
              senderEmail: userEmail,
              receiverEmail: "group",
              isGroup: true,
              groupName: team.teamName,
              text: `👋 ${memberName} accepted the invitation and joined the "${team.teamName}" squad as ${member.roleTitle || member.role || "Specialist"}!`,
              status: "delivered",
              createdAt: nowIso,
              updatedAt: nowIso,
              seenAt: null,
            });

            // Update conversation lastMessage
            await conversationsCollection.updateOne(
              { _id: convId },
              {
                $set: {
                  lastMessage: {
                    text: `👋 ${memberName} joined the squad!`,
                    senderEmail: userEmail,
                    createdAt: nowIso,
                  },
                  lastMessageAt: nowIso,
                },
              }
            );
          }

          // Emit real-time conversation updates
          io?.to(`conversation:${team.conversationId}`).emit("conversation:updated");
          io?.to(`user:${userEmail}`).emit("conversation:updated");
          io?.to(`user:${team.leaderEmail.toLowerCase()}`).emit("conversation:updated");
        }

        // 4. Update the user notification to mark as responded: 'accepted'
        if (userNotificationsCollection) {
          await userNotificationsCollection.updateMany(
            {
              recipientEmail: new RegExp(`^${userEmail}$`, "i"),
              teamId: teamId.toString(),
              type: "team_invite",
            },
            {
              $set: {
                isRead: true,
                responded: "accepted",
                respondedAt: nowIso,
              },
            }
          );

          // Notify the team leader that user accepted
          const leaderNotifDoc = {
            recipientEmail: team.leaderEmail,
            type: "team_update",
            title: `Invitation Accepted: ${team.teamName}`,
            message: `${memberName} accepted your invitation and joined "${team.teamName}" as ${member.roleTitle || member.role || "Member"}!`,
            teamId: teamId.toString(),
            conversationId: team.conversationId,
            isRead: false,
            createdAt: nowIso,
          };
          const leaderNotifRes = await userNotificationsCollection.insertOne(leaderNotifDoc);
          const serializedLeaderNotif = { ...leaderNotifDoc, _id: leaderNotifRes.insertedId.toString() };

          io?.to(`user:${team.leaderEmail.toLowerCase()}`)?.emit("user-notification:new", serializedLeaderNotif);
          io?.to(`user:${team.leaderEmail.toLowerCase()}`)?.emit("notification:new", {
            title: `Invitation Accepted: ${team.teamName}`,
            message: `${memberName} joined "${team.teamName}"!`,
          });
        }

        // 5. Emit socket events to update team views
        io?.to(`team:${teamId}`).emit("team:updated", { teamId, memberEmail: userEmail, status: "accepted" });
        io?.to(`user:${userEmail}`).emit("team:updated", { teamId, status: "accepted" });
        io?.to(`user:${team.leaderEmail.toLowerCase()}`).emit("team:updated", { teamId, status: "accepted" });

        return res.json({
          ok: true,
          status: "accepted",
          message: `Congratulations! You have joined "${team.teamName}". Your group workspace is ready.`,
          conversationId: team.conversationId,
        });
      } else {
        // action === "reject"
        // 1. Update member status to 'declined'
        await teamsCollection.updateOne(
          { _id: new ObjectId(teamId), "members.email": member.email },
          {
            $set: {
              "members.$.status": "declined",
              "members.$.declinedAt": now,
              updatedAt: now,
            },
          }
        );

        // 2. Remove user from conversation participants if present
        if (conversationsCollection && team.conversationId) {
          const convId = ObjectId.isValid(team.conversationId)
            ? new ObjectId(team.conversationId)
            : team.conversationId;

          await conversationsCollection.updateOne(
            { _id: convId },
            {
              $pull: { participants: userEmail },
              $set: { updatedAt: nowIso },
            }
          );
          io?.to(`user:${userEmail}`).emit("conversation:updated");
          io?.to(`conversation:${team.conversationId}`).emit("conversation:updated");
        }

        // 3. Mark notification as responded: 'declined'
        if (userNotificationsCollection) {
          await userNotificationsCollection.updateMany(
            {
              recipientEmail: new RegExp(`^${userEmail}$`, "i"),
              teamId: teamId.toString(),
              type: "team_invite",
            },
            {
              $set: {
                isRead: true,
                responded: "declined",
                respondedAt: nowIso,
              },
            }
          );

          // Notify leader
          const leaderNotifDoc = {
            recipientEmail: team.leaderEmail,
            type: "team_update",
            title: `Invitation Declined: ${team.teamName}`,
            message: `${memberName} declined the invitation to join "${team.teamName}".`,
            teamId: teamId.toString(),
            isRead: false,
            createdAt: nowIso,
          };
          const leaderNotifRes = await userNotificationsCollection.insertOne(leaderNotifDoc);
          const serializedLeaderNotif = { ...leaderNotifDoc, _id: leaderNotifRes.insertedId.toString() };

          io?.to(`user:${team.leaderEmail.toLowerCase()}`)?.emit("user-notification:new", serializedLeaderNotif);
          io?.to(`user:${team.leaderEmail.toLowerCase()}`)?.emit("notification:new", {
            title: `Invitation Declined: ${team.teamName}`,
            message: `${memberName} declined the invitation to join "${team.teamName}".`,
          });
        }

        // 4. Emit team updated
        io?.to(`team:${teamId}`).emit("team:updated", { teamId, memberEmail: userEmail, status: "declined" });
        io?.to(`user:${userEmail}`).emit("team:updated", { teamId, status: "declined" });
        io?.to(`user:${team.leaderEmail.toLowerCase()}`).emit("team:updated", { teamId, status: "declined" });

        return res.json({
          ok: true,
          status: "declined",
          message: `You declined the invitation to join "${team.teamName}".`,
        });
      }
    } catch (err) {
      console.error("[respond-invite]", err.message);
      res.status(500).json({ message: "Failed to respond to team invitation", error: err.message });
    }
  });

  // DELETE /api/teams/:teamId/members/:memberEmail — Admin removes a member from the squad and messenger group
  app.delete("/api/teams/:teamId/members/:memberEmail", verifyJWT, async (req, res) => {
    try {
      const { teamId, memberEmail } = req.params;
      const requesterEmail = req.user?.email || req.query.requesterEmail;

      if (!ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const team = await teamsCollection.findOne({ _id: new ObjectId(teamId) });
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Only the leader can remove members
      if (team.leaderEmail !== requesterEmail) {
        return res.status(403).json({ message: "Only the team leader can remove members" });
      }

      if (memberEmail === team.leaderEmail) {
        return res.status(400).json({ message: "Team leader cannot be removed from the team" });
      }

      // Remove from team members array
      await teamsCollection.updateOne(
        { _id: new ObjectId(teamId) },
        {
          $pull: { members: { email: memberEmail } },
          $set: { updatedAt: new Date() },
        }
      );

      // Remove from Messenger group participants if group exists
      if (conversationsCollection && team.conversationId) {
        await conversationsCollection.updateOne(
          { _id: new ObjectId(team.conversationId) },
          {
            $pull: { participants: memberEmail },
            $set: { updatedAt: new Date().toISOString() },
          }
        );

        io?.to(`user:${memberEmail}`).emit("conversation:updated");
      }

      // Notify the removed member
      if (userNotificationsCollection) {
        await userNotificationsCollection.insertOne({
          recipientEmail: memberEmail,
          type: "team_update",
          title: "Team Update",
          message: `You were removed from project team "${team.teamName}".`,
          teamId,
          isRead: false,
          createdAt: new Date(),
        });

        io?.to(`user:${memberEmail.toLowerCase()}`)?.emit("notification:new", {
          title: "Team Update",
          message: `You were removed from project team "${team.teamName}".`,
        });
      }

      // Realtime event to team members
      io?.to(`team:${teamId}`).emit("team:member_removed", { teamId, memberEmail });

      res.json({
        ok: true,
        message: `Member ${memberEmail} removed from squad and project chat.`,
      });
    } catch (err) {
      console.error("[remove-member]", err.message);
      res.status(500).json({ message: "Failed to remove member", error: err.message });
    }
  });

  // DELETE /api/teams/:teamId — Team Leader permanently deletes the squad, its group conversation, and all messages
  app.delete("/api/teams/:teamId", verifyJWT, async (req, res) => {
    try {
      const { teamId } = req.params;
      const requesterEmail = (
        req.user?.email ||
        req.body?.requesterEmail ||
        req.query?.requesterEmail ||
        ""
      ).toLowerCase();

      if (!ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const team = await teamsCollection.findOne({ _id: new ObjectId(teamId) });
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const leaderEmail = (team.leaderEmail || "").toLowerCase();

      // Only the team leader can delete the team
      if (!requesterEmail || leaderEmail !== requesterEmail) {
        return res.status(403).json({
          message: "Permission denied. Only the team leader can delete this project team.",
        });
      }

      const teamObjectId = new ObjectId(teamId);

      // 1. Identify all related conversations and conversation IDs
      const convObjectIds = [];
      const convStringIds = [];

      if (team.conversationId) {
        convStringIds.push(team.conversationId.toString());
        if (ObjectId.isValid(team.conversationId)) {
          convObjectIds.push(new ObjectId(team.conversationId));
        }
      }

      let relatedConversations = [];
      if (conversationsCollection) {
        relatedConversations = await conversationsCollection
          .find({
            $or: [
              { teamId: teamObjectId },
              { teamId: teamId },
              ...(convObjectIds.length ? [{ _id: { $in: convObjectIds } }] : []),
            ],
          })
          .toArray();

        relatedConversations.forEach((c) => {
          const sId = c._id.toString();
          if (!convStringIds.includes(sId)) {
            convStringIds.push(sId);
          }
          if (!convObjectIds.some((oid) => oid.equals(c._id))) {
            convObjectIds.push(c._id);
          }
        });
      }

      // 2. Permanently delete all messages belonging to these conversation(s)
      let deletedMessagesCount = 0;
      if (messagesCollection && (convObjectIds.length > 0 || convStringIds.length > 0)) {
        const deleteMsgResult = await messagesCollection.deleteMany({
          $or: [
            { conversationId: { $in: convObjectIds } },
            { conversationId: { $in: convStringIds } },
          ],
        });
        deletedMessagesCount = deleteMsgResult.deletedCount || 0;
      }

      // 3. Permanently delete the group conversation(s)
      let deletedConvCount = 0;
      if (conversationsCollection && (convObjectIds.length > 0 || convStringIds.length > 0)) {
        const deleteConvResult = await conversationsCollection.deleteMany({
          $or: [
            { _id: { $in: convObjectIds } },
            { teamId: teamObjectId },
            { teamId: teamId },
          ],
        });
        deletedConvCount = deleteConvResult.deletedCount || 0;
      }

      // 4. Delete the team document from teamsCollection
      await teamsCollection.deleteOne({ _id: teamObjectId });

      // 5. Collect all member emails for realtime events and notifications
      const allMemberEmails = Array.from(
        new Set([
          team.leaderEmail,
          ...(team.members || []).map((m) => m.email),
          ...relatedConversations.flatMap((c) => c.participants || []),
        ].filter(Boolean))
      );

      // 6. Emit real-time Socket.io events
      allMemberEmails.forEach((email) => {
        io?.to(`user:${email}`).emit("conversation:updated");
        io?.to(`user:${email.toLowerCase()}`).emit("conversation:updated");
        convStringIds.forEach((cId) => {
          io?.to(`user:${email}`).emit("conversation:deleted", { conversationId: cId });
          io?.to(`user:${email.toLowerCase()}`).emit("conversation:deleted", { conversationId: cId });
        });
        io?.to(`user:${email}`).emit("team:deleted", { teamId, teamName: team.teamName });
        io?.to(`user:${email.toLowerCase()}`).emit("team:deleted", { teamId, teamName: team.teamName });
      });

      convStringIds.forEach((cId) => {
        io?.to(`conversation:${cId}`).emit("conversation:deleted", { conversationId: cId });
      });
      io?.to(`team:${teamId}`).emit("team:deleted", { teamId, teamName: team.teamName });

      // 7. Send in-app notification to all squad members except leader
      if (userNotificationsCollection) {
        for (const memberEmail of allMemberEmails) {
          if (memberEmail.toLowerCase() !== leaderEmail) {
            await userNotificationsCollection.insertOne({
              recipientEmail: memberEmail,
              type: "team_disbanded",
              title: `Squad Disbanded: ${team.teamName}`,
              message: `Team "${team.teamName}" and its messenger workspace have been deleted by the team leader (${team.leaderEmail}).`,
              teamId,
              isRead: false,
              createdAt: new Date(),
            });

            io?.to(`user:${memberEmail.toLowerCase()}`)?.emit("notification:new", {
              title: `Squad Disbanded: ${team.teamName}`,
              message: `Team "${team.teamName}" was deleted by the team leader.`,
            });
          }
        }
      }

      res.json({
        ok: true,
        message: `Project team "${team.teamName}", group chat, and ${deletedMessagesCount} message(s) deleted permanently.`,
        deletedTeamId: teamId,
        deletedMessagesCount,
        deletedConvCount,
      });
    } catch (err) {
      console.error("[delete-team]", err.message);
      res.status(500).json({ message: "Failed to delete team", error: err.message });
    }
  });

  // POST /api/teams/:teamId/video-call — start instant project video call
  app.post("/api/teams/:teamId/video-call", verifyJWT, async (req, res) => {
    try {
      const { teamId } = req.params;
      const callerEmail = req.body.callerEmail || req.user?.email;

      if (!ObjectId.isValid(teamId)) {
        return res.status(400).json({ message: "Invalid team ID" });
      }

      const team = await teamsCollection.findOne({ _id: new ObjectId(teamId) });
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const callerUser = await usersCollection.findOne({ email: callerEmail });
      const callerName = callerUser?.fullName || callerUser?.name || callerEmail.split("@")[0];

      // Broadcast meeting announcement into group conversation
      if (messagesCollection && team.conversationId) {
        const now = new Date().toISOString();
        await messagesCollection.insertOne({
          conversationId: new ObjectId(team.conversationId),
          senderEmail: callerEmail,
          receiverEmail: "group",
          isGroup: true,
          groupName: team.teamName,
          text: `📹 ${callerName} started an instant project video meeting! Join anytime from the team card or chat header.`,
          status: "delivered",
          createdAt: now,
          updatedAt: now,
          seenAt: null,
        });

        io?.to(`conversation:${team.conversationId}`).emit("conversation:updated");
      }

      // Notify team members with call popup
      (team.members || []).forEach((m) => {
        if (m.email !== callerEmail) {
          io?.to(`user:${m.email}`).emit("team:call_started", {
            teamId,
            teamName: team.teamName,
            callerEmail,
            callerName,
            conversationId: team.conversationId,
          });
        }
      });

      res.json({
        ok: true,
        teamId,
        teamName: team.teamName,
        conversationId: team.conversationId,
        message: "Instant video meeting initiated",
      });
    } catch (err) {
      console.error("[team-video-call]", err.message);
      res.status(500).json({ message: "Failed to initiate video call", error: err.message });
    }
  });
};

module.exports = { registerTeamsRoutes };


const { ObjectId } = require("mongodb");
const Stripe = require("stripe");
const { verifyJWT } = require("../middleware/verifyJWT");
const { paymentLimiter } = require("../middleware/rateLimiter");
const {
  CURRENCY_CODE,
  fromPoisha,
  splitRevenuePoisha,
  generateNewInvoiceNumber,
} = require("../utils/money");

const getStripe = () => {
  const secretKey = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secretKey) return null;
  return new Stripe(secretKey);
};

const registerPaymentRoutes = (app, {
  coursesCollection,
  courseEnrollmentsCollection,
  userNotificationsCollection,
  io,
}) => {
  // Shared fulfillment helper (called on checkout verification or webhook)
  async function fulfillCourseEnrollment({
    courseId,
    learnerEmail,
    stripeSessionId = "",
    stripePaymentIntentId = "",
    amountPaid = 0,
    currency = "BDT",
    paymentMethod = "stripe",
  }) {
    if (!ObjectId.isValid(courseId)) {
      throw new Error("Invalid courseId for fulfillment");
    }

    const course = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
    if (!course) {
      throw new Error("Course not found for fulfillment");
    }

    // Check if already enrolled (idempotency guard)
    const existing = await courseEnrollmentsCollection.findOne({
      courseId: new ObjectId(courseId),
      learnerEmail: learnerEmail.toLowerCase(),
    });

    if (existing) {
      return { alreadyEnrolled: true, enrollment: existing };
    }

    const coursePriceBdt = Number.isFinite(course.pricePoisha) && course.pricePoisha > 0
      ? Math.round(course.pricePoisha / 100)
      : Number(course.price || 0) >= 50000 && Number(course.price) % 100 === 0
      ? Math.round(Number(course.price) / 100)
      : Math.round(Number(course.price || 0));

    const split = splitRevenuePoisha(coursePriceBdt);
    const nowDate = new Date();
    const now = nowDate.toISOString();
    const invoiceNumber = generateNewInvoiceNumber(nowDate);

    const enrollmentDoc = {
      courseId: new ObjectId(courseId),
      courseTitle: course.title,
      instructorEmail: course.instructorEmail,
      learnerEmail: learnerEmail.toLowerCase(),
      invoiceNumber,
      currency: currency || split.currency || CURRENCY_CODE,
      price: split.price,
      pricePoisha: split.pricePoisha,
      commission: split.commission,
      commissionPoisha: split.commissionPoisha,
      instructorEarnings: split.instructorEarnings,
      instructorEarningsPoisha: split.instructorEarningsPoisha,
      paymentMethod,
      stripeSessionId,
      stripePaymentIntentId,
      amountPaid,
      createdAt: now,
      enrolledAt: now,
      status: "active",
      refunded: false,
      banned: false,
      suspended: false,
    };

    const result = await courseEnrollmentsCollection.insertOne(enrollmentDoc);
    const inserted = { ...enrollmentDoc, _id: result.insertedId };

    // Update course total enrollment counter
    await coursesCollection.updateOne(
      { _id: new ObjectId(courseId) },
      { $inc: { enrollmentCount: 1 } }
    ).catch(() => {});

    // Send notifications to student & instructor
    try {
      if (userNotificationsCollection) {
        // Notification for student
        const studentNotif = {
          recipientEmail: learnerEmail.toLowerCase(),
          type: "COURSE_ENROLLED",
          title: "🎉 Enrollment Confirmed!",
          message: `You have successfully enrolled in "${course.title}". Full lifetime access is now active.`,
          extra: {
            courseId: course._id.toString(),
            invoiceNumber,
            courseTitle: course.title,
          },
          isRead: false,
          createdAt: now,
        };
        await userNotificationsCollection.insertOne(studentNotif);
        if (io) {
          io.to(`user:${learnerEmail.toLowerCase()}`).emit("user-notification:new", studentNotif);
        }

        // Notification for instructor
        if (course.instructorEmail) {
          const instructorNotif = {
            recipientEmail: course.instructorEmail.toLowerCase(),
            type: "COURSE_NEW_STUDENT",
            title: "💰 New Student Enrollment!",
            message: `${learnerEmail} has just enrolled in your course "${course.title}". Earnings credited: ৳${split.instructorEarnings.toLocaleString()}.`,
            extra: {
              courseId: course._id.toString(),
              studentEmail: learnerEmail,
              earnings: split.instructorEarnings,
              invoiceNumber,
            },
            isRead: false,
            createdAt: now,
          };
          await userNotificationsCollection.insertOne(instructorNotif);
          if (io) {
            io.to(`user:${course.instructorEmail.toLowerCase()}`).emit("user-notification:new", instructorNotif);
          }
        }
      }
    } catch (notifErr) {
      console.warn("[Payment Notif Warning]:", notifErr.message);
    }

    return { alreadyEnrolled: false, enrollment: inserted };
  }

  // 1. GET /payments/config — public config for frontend
  app.get("/payments/config", (req, res) => {
    const isConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
    res.json({
      isConfigured,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      currency: (process.env.STRIPE_CURRENCY || "bdt").toLowerCase(),
    });
  });

  // 2. POST /payments/create-checkout-session (requires login & rate-limited)
  app.post("/payments/create-checkout-session", verifyJWT, paymentLimiter, async (req, res) => {
    try {
      const { courseId } = req.body;
      if (!courseId || !ObjectId.isValid(courseId)) {
        return res.status(400).json({ message: "Invalid or missing course id." });
      }

      const course = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
      if (!course || course.status !== "approved") {
        return res.status(404).json({ message: "Course not found or not active." });
      }

      const userEmail = (req.user?.email || "").toLowerCase().trim();
      if (!userEmail) {
        return res.status(401).json({ message: "User email not found in token." });
      }

      if ((course.instructorEmail || "").toLowerCase() === userEmail) {
        return res.status(400).json({ message: "You cannot purchase your own course." });
      }

      // Check if already enrolled
      const existing = await courseEnrollmentsCollection.findOne({
        courseId: new ObjectId(courseId),
        learnerEmail: userEmail,
      });

      if (existing) {
        return res.status(409).json({
          message: "You are already enrolled in this course.",
          enrolled: true,
          enrollmentId: existing._id.toString(),
        });
      }

      const rawPrice = Number.isFinite(course.pricePoisha) && course.pricePoisha > 0
        ? Math.round(course.pricePoisha / 100)
        : Number(course.price || 0) >= 50000 && Number(course.price) % 100 === 0
        ? Math.round(Number(course.price) / 100)
        : Math.round(Number(course.price || 0));

      // If free course (price 0)
      if (rawPrice <= 0) {
        const { enrollment } = await fulfillCourseEnrollment({
          courseId,
          learnerEmail: userEmail,
          paymentMethod: "free",
          amountPaid: 0,
        });
        return res.status(200).json({
          free: true,
          enrolled: true,
          enrollmentId: enrollment._id.toString(),
          message: "Successfully enrolled in free course!",
        });
      }

      // Check if Stripe is configured
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({
          message: "Stripe payment gateway is not yet configured on this server. Please provide STRIPE_SECRET_KEY.",
          code: "STRIPE_NOT_CONFIGURED",
        });
      }

      // Determine client origin for redirect URLs
      const origin = req.headers.origin || process.env.CLIENT_URL || "http://localhost:5173";
      const currency = (process.env.STRIPE_CURRENCY || "bdt").toLowerCase();

      // Amount in cents / poisha (Stripe expects integer minor units: 1 BDT = 100 poisha, 1 USD = 100 cents)
      const unitAmount = Math.round(rawPrice * 100);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: userEmail,
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: course.title,
                description: course.description
                  ? course.description.slice(0, 200)
                  : "Collaborative Skill Engine Technical Course",
                images: course.thumbnailUrl && course.thumbnailUrl.startsWith("http")
                  ? [course.thumbnailUrl]
                  : [],
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          courseId: courseId.toString(),
          courseTitle: course.title,
          learnerEmail: userEmail,
          instructorEmail: course.instructorEmail || "",
          price: String(rawPrice),
        },
        success_url: `${origin}/courses/${courseId}?payment_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/courses/${courseId}?payment_status=cancelled`,
      });

      return res.status(200).json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (err) {
      console.error("[Create Stripe Session Error]:", err.message);
      return res.status(500).json({
        message: err.message || "Failed to initialize Stripe checkout session.",
      });
    }
  });

  // 3. POST /payments/verify-session — verifies and fulfills enrollment immediately after redirect
  app.post("/payments/verify-session", verifyJWT, async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId || typeof sessionId !== "string") {
        return res.status(400).json({ message: "Invalid sessionId." });
      }

      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ message: "Stripe not configured on server." });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Stripe checkout session not found." });
      }

      if (session.payment_status !== "paid") {
        return res.status(400).json({
          message: `Payment status is ${session.payment_status}. Enrollment requires paid status.`,
          status: session.payment_status,
        });
      }

      const courseId = session.metadata?.courseId;
      const learnerEmail = session.metadata?.learnerEmail || session.customer_email || req.user?.email;

      if (!courseId || !learnerEmail) {
        return res.status(400).json({ message: "Session metadata missing course or learner info." });
      }

      const { alreadyEnrolled, enrollment } = await fulfillCourseEnrollment({
        courseId,
        learnerEmail,
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id || ""),
        amountPaid: session.amount_total ? session.amount_total / 100 : 0,
        currency: (session.currency || "bdt").toUpperCase(),
      });

      return res.json({
        success: true,
        alreadyEnrolled,
        enrollmentId: enrollment._id.toString(),
        invoiceNumber: enrollment.invoiceNumber,
        courseTitle: enrollment.courseTitle,
      });
    } catch (err) {
      console.error("[Verify Stripe Session Error]:", err.message);
      return res.status(500).json({ message: err.message || "Failed to verify Stripe payment." });
    }
  });

  // 4. POST /payments/webhook — asynchronous Stripe Webhook handler
  app.post("/payments/webhook", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) return res.status(400).send("Stripe not configured.");

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    let event;

    try {
      if (webhookSecret && sig) {
        const payload = req.rawBody || req.body;
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
      } else if (isProduction) {
        console.error("[Stripe Webhook Blocked]: Missing webhookSecret or stripe-signature in production.");
        return res.status(400).send("Webhook signature verification required in production.");
      } else {
        // Fallback strictly for local non-production developer test mode
        event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      }
    } catch (err) {
      console.error("[Stripe Webhook Signature Error]:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      if (session && session.payment_status === "paid") {
        try {
          const courseId = session.metadata?.courseId;
          const learnerEmail = session.metadata?.learnerEmail || session.customer_email;
          if (courseId && learnerEmail) {
            await fulfillCourseEnrollment({
              courseId,
              learnerEmail,
              stripeSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id || ""),
              amountPaid: session.amount_total ? session.amount_total / 100 : 0,
              currency: (session.currency || "bdt").toUpperCase(),
            });
          }
        } catch (fulfillErr) {
          console.error("[Webhook Fulfillment Error]:", fulfillErr.message);
        }
      }
    }

    return res.json({ received: true });
  });
};

module.exports = { registerPaymentRoutes };


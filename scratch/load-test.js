const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

const prisma = new PrismaClient({
  log: ['error']
});

async function runClientScenario(prisma, userId, recipientId, username) {
  // Simulates a single user interaction session requesting core views in parallel:
  const start = performance.now();
  try {
    const [unreadCounts, feed, reels, chat, profile] = await Promise.all([
      // 1. Unread counts
      Promise.all([
        prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
        prisma.message.count({ where: { recipientId: userId, isRead: false } })
      ]),
      // 2. Feed posts query
      prisma.post.findMany({
        where: {
          authorId: { notIn: [] },
          author: { profile: { isPrivate: false } }
        },
        take: 20,
        orderBy: { createdAt: "desc" }
      }),
      // 3. Reels query
      prisma.reel.findMany({
        where: {
          author: { profile: { isPrivate: false } }
        },
        take: 10,
        orderBy: { createdAt: "desc" }
      }),
      // 4. Chat messages history query
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, recipientId },
            { senderId: recipientId, recipientId: userId }
          ]
        },
        take: 50,
        orderBy: { createdAt: "desc" }
      }),
      // 5. User Profile details query
      prisma.profile.findUnique({
        where: { username }
      })
    ]);
    const duration = performance.now() - start;
    return { success: true, duration };
  } catch (error) {
    const duration = performance.now() - start;
    return { success: false, duration, error: error.message };
  }
}

async function simulateLoad(concurrency) {
  console.log(`\n==========================================`);
  console.log(`Simulating ${concurrency} concurrent user sessions...`);
  console.log(`==========================================`);

  // Fetch sample ids from DB to make mock queries realistic
  const users = await prisma.user.findMany({ take: 3, select: { id: true } });
  const profiles = await prisma.profile.findMany({ take: 1, select: { username: true } });
  
  if (users.length < 2 || profiles.length === 0) {
    console.log("No seed users or profiles found to run simulated load test. Please seed first.");
    return;
  }

  const userId = users[0].id;
  const recipientId = users[1].id;
  const username = profiles[0].username;

  const startBatch = performance.now();
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(runClientScenario(prisma, userId, recipientId, username));
  }

  const results = await Promise.all(promises);
  const totalBatchDuration = performance.now() - startBatch;

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const latencies = successful.map(r => r.duration).sort((a, b) => a - b);

  const avgLatency = latencies.reduce((sum, val) => sum + val, 0) / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log(`Results:`);
  console.log(`- Attempts: ${concurrency}`);
  console.log(`- Success: ${successful.length}`);
  console.log(`- Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log(`- Sample error: ${failed[0].error}`);
  }
  console.log(`- Total execution time: ${totalBatchDuration.toFixed(2)}ms`);
  console.log(`- Average request time: ${avgLatency.toFixed(2)}ms`);
  console.log(`- p50 (Median) latency: ${p50.toFixed(2)}ms`);
  console.log(`- p95 (95% percentile): ${p95.toFixed(2)}ms`);
  console.log(`- p99 (99% percentile): ${p99.toFixed(2)}ms`);
}

async function runAll() {
  try {
    await simulateLoad(100);
    await simulateLoad(500);
    await simulateLoad(1000);
  } catch (err) {
    console.error("Load simulation error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runAll();

const prisma = require("../db/prisma");

async function getUserAnalytics(req, res) {
  // Create and export a method named getUserAnalytics for GET /api/analytics/users/:id that returns user statistics.

  // expected route is GET /api/analytics/users/:id
  // :id is a parameter available through req.params

  // Parse and validate user ID
  const userId = Number(req.params.id);
  // Check if valid ID #
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({
      message: "Not a valid user ID",
    });
  }
  // Check if user ID # exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  // If no user ID # exists
  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  // Use groupBy to count tasks by completion status
  const taskStats = await prisma.task.groupBy({
    by: ["isCompleted"],
    where: { userId },
    _count: {
      id: true,
    },
  });

  // Include recent task activity with eager loading
  const recentTasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      userId: true,
      User: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Calculate weekly progress using groupBy
  // First, calculate the date from one week ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Then use groupBy with a where clause filtering by createdAt >= oneWeekAgo
  const weeklyProgress = await prisma.task.groupBy({
    by: ["createdAt"],
    where: {
      userId,
      createdAt: { gte: oneWeekAgo },
    },
    _count: { id: true },
  });

  // Return response with taskStats, recentTasks, and weeklyProgress
  res.status(200).json({
    taskStats,
    recentTasks,
    weeklyProgress,
  });
  return;
}

async function getUsersWithStats(req, res) {
  // Route should be GET /api/analytics/users

  // Parse pagination parameters (similar to how you did in the task index method in section 3 above)
  // Hint: Parse page and limit from req.query, calculate skip
  const rawPage = req.query.page;
  const page = rawPage === undefined ? 1 : Number(rawPage);

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({
      message: "Page must be a positive integer",
    });
  }

  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? 10 : Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: "Limit must be an integer between 1 and 100",
    });
  }
  const skip = (page - 1) * limit;

  // Get users with task counts using _count aggregation
  // Note: In Prisma, you need to use include for relations, then transform the result
  const usersRaw = await prisma.user.findMany({
    include: {
      Task: {
        where: { isCompleted: false },
        select: { id: true },
        take: 5,
      },
      _count: {
        select: {
          Task: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  // Transform to only include the fields we want
  const users = usersRaw.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    _count: user._count,
    Task: user.Task,
  }));

  // Get total count for pagination
  const totalUsers = await prisma.user.count();

  // Build pagination object with page, limit, total, pages, hasNext, hasPrev
  // Hint: Use Math.ceil() for pages, compare page * limit with total for hasNext
  const pagination = {
    page,
    limit,
    total: totalUsers,
    pages: Math.ceil(totalUsers / limit),
    hasNext: page * limit < totalUsers,
    hasPrev: page > 1,
  }; // ... you need to build this object

  // Return users and pagination
  res.status(200).json({
    users,
    pagination,
  });
}

async function searchTasks(req, res) {
  const searchQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";

  // Validate search query
  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.status(400).json({
      error: "Search query must be at least 2 characters long",
    });
  }

  // Get limit from query (default to 20)
  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: "Limit must be an integer between 1 and 100",
    });
  }

  // Construct search patterns outside the query for proper parameterization
  const searchPattern = `%${searchQuery}%`;
  const exactMatch = searchQuery;
  const startsWith = `${searchQuery}%`;

  // Use raw SQL for complex text search with parameterized queries
  const searchResults = await prisma.$queryRaw`
  SELECT 
    t.id,
    t.title,
    t.is_completed as "isCompleted",
    t.priority,
    t.created_at as "createdAt",
    t.user_id as "userId",
    u.name as "user_name"
  FROM tasks t
  JOIN users u ON t.user_id = u.id
  WHERE t.title ILIKE ${searchPattern} 
     OR u.name ILIKE ${searchPattern}
  ORDER BY 
    CASE 
      WHEN t.title ILIKE ${exactMatch} THEN 1
      WHEN t.title ILIKE ${startsWith} THEN 2
      WHEN t.title ILIKE ${searchPattern} THEN 3
      ELSE 4
    END,
    t.created_at DESC
  LIMIT ${limit}
`;

  // Return results with query and count
  // Hint: The test expects results array, query string, and count number
  res.status(200).json({
    results: searchResults,
    query: searchQuery,
    count: searchResults.length,
  });
}

module.exports = { getUserAnalytics, getUsersWithStats, searchTasks };

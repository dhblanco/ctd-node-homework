const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

const whereClause = (query) => {
  // helper function whereClause prepares instructions
  //  for prisma
  //  about which tasks to retrieve
  const filters = [{ userId: global.user_id }];

  if (query.find) {
    filters.push({ title: { contains: query.find, mode: "insensitive" } });
  }
  if (query.isCompleted) {
    const boolToFind = query.isCompleted === "true";
    filters.push({ isCompleted: boolToFind });
  }
  if (query.priority) {
    filters.push({ priority: query.priority });
  }
  if (query.max_date) {
    filters.push({ createdAt: { lte: new Date(query.max_date) } });
  }
  if (query.min_date) {
    filters.push({ createdAt: { gte: new Date(query.min_date) } });
  }

  return { AND: filters };
};

async function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: `Task creation error: ${error.message}`,
    });
  }

  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      userId: global.user_id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
    },
  });

  return res.status(201).json({
    id: task.id,
    title: task.title,
    isCompleted: task.isCompleted,
  });
}

// Bulk create with validation
async function bulkCreate(req, res, next) {
  const tasks = req.body?.tasks;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(400).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: global.user_id,
    });
  }

  // Use createMany for batch insertion
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    return res.status(201).json({
      message: "Bulk task creation successful",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
}

async function index(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = whereClause(req.query);

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  if (tasks.length === 0) {
    return res.status(404).json({
      message: "No tasks found for this user",
    });
  }

  const totalTasks = await prisma.task.count({
    where,
  });

  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  return res.status(200).json({
    tasks,
    pagination,
  });
}

async function show(req, res) {
  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "Not a valid ID",
    });
  }
  const foundTask = await prisma.task.findUnique({
    where: {
      id: taskId,
      userId: global.user_id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
    },
  });

  if (!foundTask) {
    return res.status(404).json({
      message: "No task with that ID exists",
    });
  }

  return res.status(200).json(foundTask);
}

async function update(req, res, next) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Invalid task",
      errors: error.details.map((detail) => detail.message),
    });
  }

  if (Object.keys(value).length === 0) {
    return res.status(400).json({
      message: "No fields provided to update",
    });
  }

  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "Invalid task ID",
    });
  }

  try {
    const task = await prisma.task.update({
      data: value,
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: { id: true, title: true, isCompleted: true },
    });
    return res.status(200).json(task);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "No matching task exists",
      });
    } else {
      return next(err);
    }
  }
}

async function deleteTask(req, res, next) {
  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "Invalid task ID",
    });
  }
  try {
    const deletedTask = await prisma.task.delete({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });
    return res.status(200).json(deletedTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "No existing tasks match this task ID",
      });
    } else {
      return next(err);
    }
  }
}

module.exports = {
  create,
  bulkCreate,
  index,
  show,
  update,
  deleteTask,
};

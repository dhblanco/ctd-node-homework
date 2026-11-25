const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

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

async function index(req, res) {
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: { title: true, isCompleted: true, id: true },
  });

  if (tasks.length === 0) {
    return res.status(404).json({
      message: "No tasks found for this user",
    });
  }

  return res.status(200).json(tasks);
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
  index,
  show,
  update,
  deleteTask,
};
